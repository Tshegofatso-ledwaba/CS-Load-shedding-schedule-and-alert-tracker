"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DashboardData = { stats: { totalAreas: number; totalZones: number; totalSchedules: number; upcomingSchedules: number }; recentUpdates: ScheduleItem[] };
type ScheduleItem = { id: string; zoneBlockId?: string; date: string; startTime: string; endTime: string; stage: number; source?: string };
type AreaItem = { id: string; name: string; cityId?: string; city?: { name: string }; province?: { name: string } };
type ZoneItem = { zoneBlockId: string; zoneBlockName: string; suburbName: string; areaName: string; cityName: string; provinceName: string };
type Metric = "Areas" | "Zones" | "Schedules" | "Upcoming";
type DetailState = { status: "idle" | "loading" | "empty" } | { status: "success"; items: Array<AreaItem | ZoneItem | ScheduleItem> } | { status: "error"; message: string };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function AdminDashboard() {
  const router = useRouter(); const dialogRef = useRef<HTMLDialogElement>(null); const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState(""); const [activeMetric, setActiveMetric] = useState<Metric | null>(null); const [details, setDetails] = useState<DetailState>({ status: "idle" });
  useEffect(() => { const token = localStorage.getItem("powertrack_token"); if (!token) { router.replace("/admin/login"); return; } fetch(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => { if (response.status === 401 || response.status === 403) { localStorage.removeItem("powertrack_token"); router.replace("/admin/login"); return; } if (!response.ok) throw new Error("Could not load dashboard."); setData(await response.json()); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard.")); }, [router]);
  useEffect(() => {
    if (!activeMetric) return;
    const metric = activeMetric;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    let isActive = true;
    async function loadDetails() {
      setDetails({ status: "loading" });
      const token = localStorage.getItem("powertrack_token");
      if (!token) { router.replace("/admin/login"); return; }
      const endpoints: Record<Metric, string> = {
        Areas: "/locations/areas",
        Zones: "/admin/locations",
        Schedules: "/admin/schedules",
        Upcoming: "/schedules/upcoming",
      };
      try {
        const response = await fetch(`${API}${endpoints[metric]}`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("powertrack_token");
          router.replace("/admin/login");
          return;
        }
        if (!response.ok) throw new Error("Could not load these dashboard details.");
        const items = await response.json();
        if (!Array.isArray(items)) throw new Error("The API returned invalid dashboard details.");
        if (isActive) setDetails(items.length ? { status: "success", items } : { status: "empty" });
      } catch (reason) {
        if (isActive) setDetails({ status: "error", message: reason instanceof Error ? reason.message : "Could not load these dashboard details." });
      }
    }
    void loadDetails();
    return () => { isActive = false; };
  }, [activeMetric, router]);
  function signOut() { localStorage.removeItem("powertrack_token"); router.replace("/admin/login"); }
  const metricCards: Array<[Metric, number]> = data ? [["Areas", data.stats.totalAreas], ["Zones", data.stats.totalZones], ["Schedules", data.stats.totalSchedules], ["Upcoming", data.stats.upcomingSchedules]] : [];
  const detailTitle = activeMetric ? `${activeMetric} details` : "Dashboard details";
  const closeDetails = () => dialogRef.current?.close();

  return <main className="app-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><div className="admin-nav"><Link className="nav" href="/admin/locations">Manage locations</Link><button className="nav" onClick={signOut}>Sign out</button></div></header><section className="admin-wrap"><div className="eyebrow">Operations overview</div><h1 style={{ fontSize: 56 }}>Dashboard.</h1><p className="intro">A small, useful pulse check on the schedule data your community sees.</p>{error ? <div className="card error" style={{ marginTop: 30 }}>{error}</div> : !data ? <div className="card loading" style={{ marginTop: 30 }}>Loading statistics...</div> : <><div className="stats-grid">{metricCards.map(([label, value]) => <button className="card stats-card" key={label} type="button" onClick={() => setActiveMetric(label)} aria-haspopup="dialog"><span className="status-label">{label}</span><strong className="stat-number">{value}</strong><span className="stats-card-hint">View details</span></button>)}</div><div className="card" style={{ marginTop: 18 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h2 className="section-title">Schedule controls</h2><button className="button admin-button" type="button" onClick={() => router.push("/admin/schedules")}>Manage schedules</button></div><p className="intro" style={{ marginTop: 8 }}>Open the outage schedule workflow and review the next operational updates.</p></div><div className="card" style={{ marginTop: 18 }}><h2 className="section-title">Recent schedule updates</h2><div className="admin-list">{data.recentUpdates.map((item) => <div className="admin-row" key={item.id}><span>{item.date} · {item.startTime} – {item.endTime}</span><strong>Stage {item.stage} · {item.source || "Unknown source"}</strong></div>)}</div></div></>}</section>
    <dialog ref={dialogRef} className="admin-detail-dialog" aria-labelledby="admin-detail-title" onClose={() => { setActiveMetric(null); setDetails({ status: "idle" }); }}>
      <div className="admin-detail-header"><div><div className="eyebrow">Operations overview</div><h2 id="admin-detail-title" className="section-title">{detailTitle}</h2></div><button className="saved-remove" type="button" onClick={closeDetails} aria-label="Close details">×</button></div>
      <div className="admin-detail-content" aria-live="polite">
        {details.status === "loading" && <p className="muted" role="status">Loading {activeMetric?.toLowerCase()}...</p>}
        {details.status === "empty" && <p className="muted" role="status">No {activeMetric?.toLowerCase()} records to show.</p>}
        {details.status === "error" && <p className="error" role="alert">{details.message}</p>}
        {details.status === "success" && activeMetric === "Areas" && <div className="admin-list">{(details.items as AreaItem[]).map((item) => <div className="admin-row" key={item.id}><strong>{item.name}</strong><span>{item.city?.name || `City ID: ${item.cityId || "unavailable"}`} · {item.province?.name || "Province unavailable"}</span></div>)}</div>}
        {details.status === "success" && activeMetric === "Zones" && <div className="admin-list">{(details.items as ZoneItem[]).map((item) => <div className="admin-row" key={item.zoneBlockId}><strong>{item.zoneBlockName}</strong><span>{item.suburbName} · {item.areaName} · {item.cityName} · {item.provinceName}</span></div>)}</div>}
        {details.status === "success" && (activeMetric === "Schedules" || activeMetric === "Upcoming") && <div className="admin-list">{(details.items as ScheduleItem[]).map((item) => <div className="admin-row" key={item.id}><span>{item.date} · {item.startTime} – {item.endTime}{item.zoneBlockId ? ` · Zone ${item.zoneBlockId}` : ""}</span><strong>Stage {item.stage} · {item.source === "PREDICTED" ? "Predicted" : item.source === "EXTERNAL" ? "External" : item.source === "ADMIN" ? "Official" : "Unknown source"}</strong></div>)}</div>}
      </div>
    </dialog>
  </main>;
}