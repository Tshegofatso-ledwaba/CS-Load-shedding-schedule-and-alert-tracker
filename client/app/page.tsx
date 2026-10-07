"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LocationPicker, { type NominatimPlace, type PowerTrackMatch } from "./components/LocationPicker";

type Schedule = { id: string; date: string; startTime: string; endTime: string; stage: number; source?: string | null };
type SearchResult = { id: string; name: string; zoneBlockId?: string; zoneBlockName?: string; suburbName?: string; city: { name: string }; province: { name: string }; latitude?: number; longitude?: number; displayName?: string; address?: NominatimPlace["address"]; geocoderPlaceId?: string | null; osmType?: string | null; osmId?: string | null };
type SavedLocation = SearchResult & { slot: "Home" | "Work" };
type StatusKey = "NO_SCHEDULE" | "OUTAGE_ACTIVE" | "UPCOMING_OUTAGE" | "POWER_AVAILABLE";
type Status = { status: string; label: string; stage: number | null; source?: string | null; nextOutage: Schedule | null; activeOutage: Schedule | null; countdownTarget: string | null; timezone: string; lastUpdated: string; area: { name: string; suburb: string; city: string; province: string } };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function formatDate(date: string) { return new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)); }
function countdown(target: string | null, now: number) { if (!target) return "--"; const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}h ${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}m ${String(seconds % 60).padStart(2, "0")}s`; }
async function readJson(response: Response) { if (!response.ok) throw new Error("The API returned an error."); return response.json(); }
function isStatus(value: unknown): value is Status { return typeof value === "object" && value !== null && "status" in value && "area" in value && typeof value.area === "object" && value.area !== null && "suburb" in value.area; }

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedArea, setSelectedArea] = useState<SearchResult | null>(null);
  const [pendingAddress, setPendingAddress] = useState<NominatimPlace | null>(null);
  const [zoneBlockId, setZoneBlockId] = useState("zone-2");
  const locationRequest = useRef(0);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("powertrack_saved_locations") || "[]"); } catch { return []; }
  });
  const [saveMessage, setSaveMessage] = useState("");

  const statusSummaryText = status ? {
    NO_SCHEDULE: "PowerTrack does not currently have schedule data for this location.",
    OUTAGE_ACTIVE: "Power is currently off in this zone.",
    UPCOMING_OUTAGE: "A scheduled outage is approaching.",
    POWER_AVAILABLE: "Power is available right now.",
  }[status.status as StatusKey] ?? "PowerTrack status is unavailable." : "";

  const nextChangeLabel = status ? {
    NO_SCHEDULE: "No outage schedule available",
    OUTAGE_ACTIVE: "Power returns at",
    UPCOMING_OUTAGE: "Next outage",
    POWER_AVAILABLE: "Next interruption",
  }[status.status as StatusKey] ?? "Next change" : "Next change";

  const nextChangeTime = status ? (status.status === "NO_SCHEDULE" ? "--:--" : status.activeOutage?.endTime || status.nextOutage?.startTime || "--:--") : "--:--";

  const detailTitle = status ? {
    NO_SCHEDULE: "Schedule unavailable",
    OUTAGE_ACTIVE: "Expected return",
    UPCOMING_OUTAGE: "Next scheduled outage",
    POWER_AVAILABLE: "Next change",
  }[status.status as StatusKey] ?? "Next change" : "Next change";

  const detailBody = status && status.status === "NO_SCHEDULE" ? "Try another location or check back when a schedule is available." : status && status.countdownTarget ? new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(status.countdownTarget)) : "No scheduled change";

  useEffect(() => {
    if (!zoneBlockId) return;
    let isActive = true;
    const refreshData = async () => {
      try {
        const [current, upcoming] = await Promise.all([
          fetch(`${API}/status/${encodeURIComponent(zoneBlockId)}`).then(readJson),
          fetch(`${API}/schedules/upcoming?zoneBlockId=${encodeURIComponent(zoneBlockId)}`).then(readJson),
        ]);
        if (!isActive) return;
        if (!isStatus(current) || !Array.isArray(upcoming)) throw new Error("The API returned an invalid schedule response.");
        setStatus(current);
        setSchedules(upcoming);
        setError("");
      } catch {
        if (isActive) setError("The schedule could not be loaded. Check that the API is running and try again.");
      }
    };

    void refreshData();
    const timer = window.setInterval(() => { void refreshData(); }, 15000);
    return () => { isActive = false; window.clearInterval(timer); };
  }, [zoneBlockId]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  async function chooseLocation(result: SearchResult) {
    const requestId = ++locationRequest.current;
    setSelectedArea(result);
    setPendingAddress(null);
    setError("");
    if (Number.isFinite(result.latitude) && Number.isFinite(result.longitude)) {
      setPendingAddress({
        geocoderPlaceId: result.geocoderPlaceId || null,
        osmType: result.osmType || null,
        osmId: result.osmId || null,
        displayName: result.displayName || result.name,
        latitude: result.latitude as number,
        longitude: result.longitude as number,
        address: result.address || { province: result.province.name || null, municipality: result.city.name || null, city: result.city.name || null, town: null, area: result.name || null, suburb: result.suburbName || null, road: null, postcode: null, zoneBlock: result.zoneBlockName || null },
      });
      setStatus(null);
      setSchedules([]);
      setZoneBlockId(result.zoneBlockId || "");
      return;
    }
    try {
      const locationId = result.zoneBlockId || result.id;
      const location = await fetch(`${API}/locations/${encodeURIComponent(locationId)}`).then(readJson);
      if (requestId !== locationRequest.current) return;
      if (!location || typeof location.id !== "string") throw new Error("The API returned an invalid location.");
      if (location.id === zoneBlockId) return;
      setStatus(null);
      setSchedules([]);
      setZoneBlockId(location.id);
    } catch {
      if (requestId === locationRequest.current) setError("The selected area could not be loaded. Choose another area and try again.");
    }
  }
  function confirmPhysicalLocation(place: NominatimPlace, match: PowerTrackMatch | null) {
    const selected: SearchResult = {
      id: match?.zoneBlockId || `${place.osmType || "point"}/${place.osmId || place.geocoderPlaceId || `${place.latitude},${place.longitude}`}`,
      name: match?.areaName || place.address.area || place.address.suburb || place.displayName,
      zoneBlockId: match?.zoneBlockId,
      zoneBlockName: match?.zoneBlockName,
      suburbName: match?.suburbName || place.address.suburb || undefined,
      city: { name: match?.cityName || place.address.city || place.address.town || place.address.municipality || "" },
      province: { name: match?.provinceName || place.address.province || "" },
      latitude: place.latitude,
      longitude: place.longitude,
      displayName: place.displayName,
      address: place.address,
      geocoderPlaceId: place.geocoderPlaceId,
      osmType: place.osmType,
      osmId: place.osmId,
    };
    setSelectedArea(selected);
    setPendingAddress(place);
    setZoneBlockId(match?.zoneBlockId || "");
    setStatus(null);
    setSchedules([]);
    setError("");
  }
  function updatePendingAddress(place: NominatimPlace) {
    setPendingAddress(place);
    setSelectedArea(null);
    setZoneBlockId("");
    setStatus(null);
    setSchedules([]);
    setError("");
  }
  function saveLocation(slot: "Home" | "Work") {
    if (!selectedArea) return;
    const next = [...savedLocations.filter((item) => item.slot !== slot), { ...selectedArea, slot }];
    setSavedLocations(next); window.localStorage.setItem("powertrack_saved_locations", JSON.stringify(next));
    setSaveMessage(`${slot} location saved.`);
  }
  function removeLocation(slot: "Home" | "Work") {
    const next = savedLocations.filter((item) => item.slot !== slot);
    setSavedLocations(next); window.localStorage.setItem("powertrack_saved_locations", JSON.stringify(next));
  }
  return (
    <main className="app-shell">
      <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><nav className="nav"><a href="#schedule">Schedule</a></nav></header>
      <section className="dashboard">
        <div className="eyebrow">Live local electricity status</div>
        <h1>Know what your power is doing.</h1>
        <p className="intro">A clear, local view of load-shedding for the places that matter to you.</p>
        <LocationPicker value={pendingAddress} onChange={updatePendingAddress} onConfirm={confirmPhysicalLocation} />
        {selectedArea && <section className="card selected-location-save" aria-label="Save confirmed location">
          <div><div className="status-label">Confirmed location</div><strong>{selectedArea.displayName || selectedArea.name}</strong></div>
          <div className="save-actions">{(["Home", "Work"] as const).map((slot) => {
            const isSaved = savedLocations.some((item) => item.slot === slot && item.id === selectedArea.id);
            return <button className="save-button" type="button" key={slot} aria-pressed={isSaved} onClick={() => saveLocation(slot)}>{isSaved ? `Saved as ${slot}` : `Save ${slot}`}</button>;
          })}</div>
          {saveMessage && <p className="save-feedback" role="status" aria-live="polite">{saveMessage}</p>}
        </section>}
        {selectedArea && !selectedArea.zoneBlockId ? <article className="card location-unmatched" role="status"><div className="status-label">Physical location selected</div><h2 className="section-title">No verified PowerTrack schedule match</h2><p className="muted">{selectedArea.displayName || selectedArea.name} is saved locally, but its coordinates are not close to a verified Zone/Block. No outage schedule is shown for this address.</p></article> : pendingAddress && !selectedArea ? <div className="card loading" style={{ marginTop: 24 }}>Confirm the selected pin to check its PowerTrack schedule area.</div> : error ? <div className="card error" role="alert" style={{ marginTop: 24 }}>{error}</div> : !status ? <div className="card loading" style={{ marginTop: 24 }}>Reading the grid...</div> : <>
          <div className="layout-grid">
            <article className={`card status-card ${status.status === "OUTAGE_ACTIVE" ? "active" : ""}`}>
              <div><div className="status-label">Current power status</div><div className={`status-value ${status.status === "OUTAGE_ACTIVE" ? "active" : ""}`}>{status.label}</div><p className="status-summary">{statusSummaryText}</p></div>
              <div><div className="status-meta"><span className="status-dot" /> {status.status === "NO_SCHEDULE" ? "Schedule unavailable" : `Stage ${status.stage || "none"}`} <span className="muted">| {status.status === "NO_SCHEDULE" ? "No outage schedule available" : `${nextChangeLabel} ${nextChangeTime}`}</span></div><div className="status-detail"><span className="status-detail-icon">{status.status === "OUTAGE_ACTIVE" ? "↗" : status.status === "NO_SCHEDULE" ? "—" : "→"}</span><span><strong>{status.status === "NO_SCHEDULE" ? "Schedule unavailable" : detailTitle}</strong><br /><span className="muted">{detailBody}</span></span></div><div className="status-source">{status.status === "NO_SCHEDULE" ? "No schedule data available" : status.source ? (status.source === "PREDICTED" ? "Predicted schedule" : status.source === "EXTERNAL" ? "External schedule" : "Official schedule") : "Live schedule"} · {status.timezone}</div></div>
            </article>
            <div className="side-stack">
              <article className="card location-card"><div className="status-label">Verified PowerTrack Zone/Block</div><div className="location-name">{selectedArea?.zoneBlockName || status.area.suburb}</div><div className="location-path">{selectedArea ? [selectedArea.suburbName, selectedArea.name, selectedArea.city.name, selectedArea.province.name].filter(Boolean).join(" · ") : `${status.area.city} · ${status.area.province} · ${status.area.name}`}</div>{selectedArea?.latitude !== undefined && selectedArea.longitude !== undefined && <p className="muted geo-coordinates">{selectedArea.latitude.toFixed(5)}, {selectedArea.longitude.toFixed(5)}</p>}</article>
              <article className="card saved-card"><div className="saved-header"><div><div className="status-label">Pinned places</div><h2 className="section-title">Quick check</h2></div><span className="pin-mark">•</span></div><div className="saved-list">{(["Home", "Work"] as const).map((slot) => { const saved = savedLocations.find((item) => item.slot === slot); return <div className="saved-row" key={slot}><span className="saved-icon">{slot === "Home" ? "⌂" : "▣"}</span><span className="saved-copy"><strong>{slot}</strong><small>{saved ? saved.displayName || saved.name : "Not saved yet"}</small></span>{saved ? <><button className="saved-open" onClick={() => void chooseLocation(saved)}>Check</button><button className="saved-remove" onClick={() => removeLocation(slot)} aria-label={`Remove ${slot}`}>×</button></> : <span className="muted">—</span>}</div>; })}</div></article>
              <article className="card next-card"><div><div className="status-label">Up next</div><div className="next-time">{status.status === "NO_SCHEDULE" ? "No outage scheduled" : status.nextOutage ? `${status.nextOutage.startTime} – ${status.nextOutage.endTime}` : "No outage planned"}</div><div className="muted">{status.status === "NO_SCHEDULE" ? "PowerTrack does not currently have schedule data for this location." : status.nextOutage ? `${formatDate(status.nextOutage.date)} · Stage ${status.nextOutage.stage}${status.nextOutage.source ? ` · ${status.nextOutage.source === "PREDICTED" ? "Predicted" : status.nextOutage.source === "EXTERNAL" ? "External" : "Official"}` : ""}` : "Your power is clear"}</div></div><div className="countdown"><div className="status-label">Countdown</div><div className="countdown-value">{status.status === "NO_SCHEDULE" ? "--" : countdown(status.countdownTarget, now)}</div></div></article>
            </div>
          </div>
          <section className="schedule-section" id="schedule"><div className="schedule-header"><h2 className="section-title">Upcoming schedule</h2><span className="muted">{status.area.name} · Africa/Johannesburg</span></div><div className="schedule-list">{schedules.length === 0 ? <div className="card muted">{status.status === "NO_SCHEDULE" ? "No outage schedule available for this location." : "No schedules available for this area."}</div> : schedules.slice(0, 6).map((item) => <article className="schedule-item" key={item.id}><div className="schedule-date">{formatDate(item.date)}</div><div className="schedule-time">{item.startTime} – {item.endTime}</div><div className="stage">Stage {item.stage}</div>{item.source && <div className="stage source">{item.source === "PREDICTED" ? "Predicted" : item.source === "EXTERNAL" ? "External" : "Official"}</div>}</article>)}</div></section>
        </>}
        <p className="footer-note">Schedules are manually maintained and may change. Last checked {status ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(status.lastUpdated)) : "not available"} (South African time).</p>
      </section>
    </main>
  );
}
