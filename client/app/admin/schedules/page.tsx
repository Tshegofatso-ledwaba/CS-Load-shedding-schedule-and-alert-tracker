"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useState } from "react";
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
  const [notice, setNotice] = useState("");
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [form, setForm] = useState({ zoneBlockId: "", date: "", startTime: "18:00", endTime: "20:30", stage: "4", source: "ADMIN" });

  const loadSchedules = useCallback(async () => {
    const token = localStorage.getItem("powertrack_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    try {
      const [response, zonesResponse] = await Promise.all([
        fetch(`${API}/admin/schedules`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/locations/zones`),
      ]);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("powertrack_token");
        router.replace("/admin/login");
        return;
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load schedules.");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const task = window.setTimeout(() => { void loadSchedules(); }, 0);
    return () => window.clearTimeout(task);
  }, [loadSchedules]);

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("powertrack_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setSaving(true);
    setError("");

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
      await loadSchedules();
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
    setEditingId(item.id);
    setForm({ zoneBlockId: item.zoneBlockId, date: item.date, startTime: item.startTime, endTime: item.endTime, stage: String(item.stage), source: item.source });
    setError("");
    setNotice("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm((current) => ({ ...current, date: "", startTime: "18:00", endTime: "20:30", stage: "4", source: "ADMIN" }));
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

  return <main className="app-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><div style={{ display: "flex", alignItems: "center", gap: 12 }}><Link className="nav" href="/admin/dashboard">Back to dashboard</Link><button className="nav" onClick={signOut}>Sign out</button></div></header><section className="admin-wrap"><div className="eyebrow">Schedule management</div><h1 style={{ fontSize: 56 }}>Outage schedule.</h1><p className="intro">Add a planned outage window and keep the public status view in sync with real admin updates.</p>{error ? <div className="card error" style={{ marginTop: 30 }}>{error}</div> : null}{loading ? <div className="card loading" style={{ marginTop: 30 }}>Checking admin access...</div> : <><div className="card" style={{ marginTop: 18 }}><h2 className="section-title">{editingId ? "Edit outage window" : "Create outage window"}</h2><form className="admin-form" onSubmit={submitSchedule}><label>Zone / block<select value={form.zoneBlockId} onChange={(event) => setForm({ ...form, zoneBlockId: event.target.value })} required>{zones.length === 0 ? <option value="">No zones available</option> : zones.map((zone) => <option key={zone.id} value={zone.id}>{[zone.name, zone.suburbName, zone.areaName, zone.cityName, zone.provinceName].filter(Boolean).join(" · ")}</option>)}</select></label><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}><label>Start time<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /></label><label>End time<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></label></div><label>Stage<select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}><option value="1">Stage 1</option><option value="2">Stage 2</option><option value="3">Stage 3</option><option value="4">Stage 4</option><option value="5">Stage 5</option><option value="6">Stage 6</option><option value="7">Stage 7</option><option value="8">Stage 8</option></select></label><label>Source<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}><option value="ADMIN">Official</option><option value="EXTERNAL">External</option><option value="PREDICTED">Predicted</option></select></label><button className="button admin-button" type="submit" disabled={saving || selectedZonePoints.length === 0}>{saving ? "Saving..." : editingId ? "Save changes" : "Save schedule"}</button>{editingId && <button className="nav" type="button" onClick={cancelEditing}>Cancel edit</button>}
    </form></div>{notice && <div className="geo-notice" role="status">{notice}</div>}<section className="schedule-location-preview"><div><div className="status-label">Selected PowerTrack location</div><strong>{selectedZone ? selectedZone.name : "Choose a saved Zone/Block"}</strong><p className="muted">{selectedZone ? [selectedZone.suburbName, selectedZone.areaName, selectedZone.cityName, selectedZone.provinceName].filter(Boolean).join(" → ") : "Schedules can only be attached to an existing location."}</p></div>{selectedZonePoints.length > 0 ? <div className="schedule-map"><LocationMap points={selectedZonePoints} focusId={selectedZone?.id || ""} selectedPoint={selectedZonePoints[0] || null} onSelect={() => {}} onMapClick={() => {}} /></div> : <p className="muted">Coordinates are not available for this saved zone yet.</p>}
    {selectedZonePoints.length === 0 && <p className="geo-warning" role="status">This Zone/Block has no coordinates. Add its OpenStreetMap place in Location Management before scheduling an outage.</p>}
    </section><div className="card" style={{ marginTop: 18 }}><h2 className="section-title">Published schedules</h2><div className="admin-list">{schedules.length === 0 ? <div className="admin-row"><span>No outage windows yet.</span><strong>Waiting for the first schedule</strong></div> : schedules.map((item) => <div className="admin-row" key={item.id}><span>{item.date} · {item.startTime} – {item.endTime}</span><strong>Stage {item.stage} · {item.source}</strong><div className="schedule-actions"><button type="button" className="saved-open" onClick={() => startEditing(item)}>Edit</button><button type="button" className="saved-remove" onClick={() => void deleteSchedule(item.id)} aria-label={`Delete ${item.date} Stage ${item.stage}`}>×</button></div></div>)}</div></div></>}</section></main>;
}
