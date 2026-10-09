"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapPoint } from "../../components/LocationMap";

type ScheduleItem = { id: string; zoneBlockId: string; date: string; startTime: string; endTime: string; stage: number; source: string };
type ZoneOption = { id: string; name: string; suburbName?: string; areaName?: string; cityName?: string; provinceName?: string; latitude?: number | null; longitude?: number | null };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const LocationMap = dynamic(() => import("../../components/LocationMap"), { ssr: false, loading: () => <div className="map-placeholder">Loading map preview...</div> });

export default function AdminSchedules() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createCollapsed, setCreateCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [form, setForm] = useState({ zoneBlockId: "", date: "", startTime: "18:00", endTime: "20:30", stage: "4", source: "ADMIN" });
  const publishedSchedulesRef = useRef<HTMLDivElement>(null);

  const loadSchedules = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem("powertrack_token");
    if (!token) {
      router.replace("/admin/login");
      return false;
    }

    try {
      const [response, zonesResponse] = await Promise.all([
        fetch(`${API}/admin/schedules`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/locations/zones`),
      ]);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("powertrack_token");
        router.replace("/admin/login");
        return false;
      }
      if (!response.ok || !zonesResponse.ok) throw new Error("Could not load schedules and available zones.");
      const [scheduleData, zoneData]: [ScheduleItem[], ZoneOption[]] = await Promise.all([response.json(), zonesResponse.json()]);
      setSchedules(scheduleData);
      setZones(zoneData);
      setForm((current) => ({
        ...current,
        zoneBlockId: zoneData.some((zone) => zone.id === current.zoneBlockId) ? current.zoneBlockId
          : zoneData.find((zone) => zone.id === new URLSearchParams(window.location.search).get("zoneBlockId"))?.id || zoneData[0]?.id || "",
      }));
      setLoading(false);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load schedules.");
      setLoading(false);
      return false;
    }
  }, [router]);

  useEffect(() => {
    const task = window.setTimeout(() => { void loadSchedules(); }, 0);
    return () => window.clearTimeout(task);
  }, [loadSchedules]);

  useEffect(() => {
    if (!editingId) return;
    const editForm = document.querySelector<HTMLFormElement>("#outage-schedule-form form");
    editForm?.scrollIntoView({ block: "start" });
    editForm?.querySelector("select")?.focus({ preventScroll: true });
  }, [editingId]);

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("powertrack_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setSaving(true);
    setError("");
    const isCreating = !editingId;

    try {
      const response = await fetch(editingId ? `${API}/admin/schedules/${editingId}` : `${API}/admin/schedules`, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          zoneBlockId: form.zoneBlockId,
          stage: Number(form.stage),
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          source: form.source,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create schedule.");
      setNotice(editingId ? "Schedule updated." : "Outage published to the shared schedule.");
      setEditingId(null);
      setForm((current) => ({ ...current, date: "", startTime: "18:00", endTime: "20:30", stage: "4", source: "ADMIN" }));
      const refreshed = await loadSchedules();
      if (isCreating && refreshed) {
        setCreateCollapsed(true);
        publishedSchedulesRef.current?.scrollIntoView({ block: "start" });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create schedule.");
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    localStorage.removeItem("powertrack_token");
    router.replace("/admin/login");
  }

  function startEditing(item: ScheduleItem) {
    setCreateCollapsed(false);
    setEditingId(item.id);
    setForm({ zoneBlockId: item.zoneBlockId, date: item.date, startTime: item.startTime, endTime: item.endTime, stage: String(item.stage), source: item.source });
    setError("");
    setNotice("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm((current) => ({ ...current, date: "", startTime: "18:00", endTime: "20:30", stage: "4", source: "ADMIN" }));
    setError("");
    setNotice("");
  }

  async function deleteSchedule(id: string) {
    if (!window.confirm("Delete this outage schedule?")) return;
    const token = localStorage.getItem("powertrack_token");
    if (!token) { router.replace("/admin/login"); return; }
    try {
      const response = await fetch(`${API}/admin/schedules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete schedule.");
      setNotice("Schedule deleted.");
      await loadSchedules();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete schedule.");
    }
  }

  const selectedZone = zones.find((zone) => zone.id === form.zoneBlockId);
  const selectedZonePoints: MapPoint[] = selectedZone && Number.isFinite(selectedZone.latitude) && Number.isFinite(selectedZone.longitude)
    ? [{ id: selectedZone.id, label: selectedZone.name, latitude: selectedZone.latitude as number, longitude: selectedZone.longitude as number, kind: "selected" }]
    : [];

  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link>
      <nav className="admin-nav" aria-label="Admin navigation">
        <Link className="nav" href="/admin/dashboard">Dashboard</Link>
        <Link className="nav" href="/admin/locations">Locations</Link>
        <Link className="nav" href="/admin/schedules" aria-current="page">Schedules</Link>
        <button className="nav" onClick={signOut}>Sign out</button>
      </nav>
    </header>
    <section className="admin-wrap">
      <div className="eyebrow">Schedule management</div>
      <h1 style={{ fontSize: 56 }}>Outage schedule.</h1>
      <p className="intro">Choose a saved location, publish its outage window, then confirm it in Published schedules.</p>
      {error && <div className="card error" style={{ marginTop: 30 }} role="alert">{error}</div>}
      {loading ? <div className="card loading" style={{ marginTop: 30 }}>Checking admin access...</div> : <>
        <section className="schedule-location-preview" aria-labelledby="schedule-location-heading">
          <div>
            <div className="status-label">Step 1 · Choose a location</div>
            <h2 className="section-title" id="schedule-location-heading">Where will the outage happen?</h2>
            <label htmlFor="schedule-zone">Zone / block</label>
            <select id="schedule-zone" value={form.zoneBlockId} onChange={(event) => setForm({ ...form, zoneBlockId: event.target.value })} required>
              {zones.length === 0 ? <option value="">No zones available</option> : zones.map((zone) => <option key={zone.id} value={zone.id}>{[zone.name, zone.suburbName, zone.areaName, zone.cityName, zone.provinceName].filter(Boolean).join(" · ")}</option>)}
            </select>
            {selectedZone ? <p className="muted">Selected: <strong>{selectedZone.name}</strong>{[selectedZone.suburbName, selectedZone.areaName, selectedZone.cityName, selectedZone.provinceName].filter(Boolean).length > 0 && <> · {[selectedZone.suburbName, selectedZone.areaName, selectedZone.cityName, selectedZone.provinceName].filter(Boolean).join(" → ")}</>}</p> : <p className="muted">No saved locations yet. <Link href="/admin/locations">Add a location</Link> to get started.</p>}
          </div>
          {selectedZonePoints.length > 0
            ? <div className="schedule-map"><LocationMap points={selectedZonePoints} focusId={selectedZone?.id || ""} selectedPoint={selectedZonePoints[0] || null} onSelect={() => {}} onMapClick={() => {}} /></div>
            : <p className="geo-warning" role="status">{selectedZone ? "This location has no coordinates. Add its OpenStreetMap place in Location Management before scheduling an outage." : "Select a saved location with coordinates to publish an outage."}</p>}
        </section>
        <div className="card" id="outage-schedule-form" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h2 className="section-title">{editingId ? "Edit outage window" : "Step 2 · Add outage details"}</h2>
            <button className="nav" type="button" onClick={() => setCreateCollapsed((collapsed) => !collapsed)} aria-controls="outage-schedule-form" aria-expanded={!createCollapsed} disabled={Boolean(editingId)}>{createCollapsed ? "Add outage" : "Collapse"}</button>
          </div>
          {!createCollapsed && <form className="admin-form" onSubmit={submitSchedule}>
            <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label>
            <div className="schedule-time-fields">
              <label>Start time<input className="schedule-time-input" type="time" lang="en-GB" step={60} value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /></label>
              <label>End time<input className="schedule-time-input" type="time" lang="en-GB" step={60} value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></label>
            </div>
            <label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
              <option value="1">Stage 1</option><option value="2">Stage 2</option><option value="3">Stage 3</option><option value="4">Stage 4</option>
              <option value="5">Stage 5</option><option value="6">Stage 6</option><option value="7">Stage 7</option><option value="8">Stage 8</option>
            </select></label>
            <label>Source<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
              <option value="ADMIN">Official</option><option value="EXTERNAL">External</option><option value="PREDICTED">Predicted</option>
            </select></label>
            <button className="button admin-button" type="submit" disabled={saving || (!editingId && selectedZonePoints.length === 0)}>{saving ? "Saving..." : editingId ? "Save changes" : "Publish outage"}</button>
            {editingId && <button className="nav" type="button" onClick={cancelEditing}>Cancel edit</button>}
          </form>}
        </div>
        {notice && <div className="geo-notice" role="status">{notice}</div>}
        <div className="card" style={{ marginTop: 18 }} ref={publishedSchedulesRef}>
          <h2 className="section-title">Step 3 · Published schedules</h2>
          <div className="admin-list">{schedules.length === 0 ? <div className="admin-row"><span>No outage windows yet.</span><strong>Waiting for the first schedule</strong></div> : schedules.map((item) => {
            const zone = zones.find((option) => option.id === item.zoneBlockId);
            const hierarchy = zone ? [zone.suburbName, zone.areaName, zone.cityName, zone.provinceName].filter(Boolean).join(" → ") : "";
            return <div className="admin-row" key={item.id}>
              <span><strong>{zone?.name || "Unknown location"}</strong>{hierarchy && <><br /><small>{hierarchy}</small></>}<br />{item.date} · {item.startTime} – {item.endTime}</span>
              <strong>Stage {item.stage} · {item.source}</strong>
              <div className="schedule-actions"><button type="button" className="saved-open" onClick={() => startEditing(item)}>Edit</button><button type="button" className="saved-remove" onClick={() => void deleteSchedule(item.id)} aria-label={`Delete ${item.date} Stage ${item.stage}`}>×</button></div>
            </div>;
          })}</div>
        </div>
      </>}
    </section>
  </main>;
}
