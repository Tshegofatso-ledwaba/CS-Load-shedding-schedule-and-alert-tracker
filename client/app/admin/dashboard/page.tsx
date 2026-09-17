"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DashboardData = { stats: { totalAreas: number; totalZones: number; totalSchedules: number; upcomingSchedules: number }; recentUpdates: { id: string; date: string; startTime: string; endTime: string; stage: number }[] };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function AdminDashboard() {
  const router = useRouter(); const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState("");
  useEffect(() => { const token = localStorage.getItem("powertrack_token"); if (!token) { router.replace("/admin/login"); return; } fetch(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => { if (response.status === 401) { localStorage.removeItem("powertrack_token"); router.replace("/admin/login"); return; } if (!response.ok) throw new Error("Could not load dashboard."); setData(await response.json()); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard.")); }, [router]);
  function signOut() { localStorage.removeItem("powertrack_token"); router.replace("/admin/login"); }
  return <main className="app-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><button className="nav" onClick={signOut}>Sign out</button></header><section className="admin-wrap"><div className="eyebrow">Operations overview</div><h1 style={{ fontSize: 56 }}>Dashboard.</h1><p className="intro">A small, useful pulse check on the schedule data your community sees.</p>{error ? <div className="card error" style={{ marginTop: 30 }}>{error}</div> : !data ? <div className="card loading" style={{ marginTop: 30 }}>Loading statistics...</div> : <><div className="stats-grid">{[["Areas", data.stats.totalAreas], ["Zones", data.stats.totalZones], ["Schedules", data.stats.totalSchedules], ["Upcoming", data.stats.upcomingSchedules]].map(([label, value]) => <div className="card" key={label as string}><span className="status-label">{label}</span><strong className="stat-number">{value}</strong></div>)}</div><div className="card" style={{ marginTop: 18 }}><h2 className="section-title">Recent schedule updates</h2><div className="admin-list">{data.recentUpdates.map((item) => <div className="admin-row" key={item.id}><span>{item.date} · {item.startTime} – {item.endTime}</span><strong>Stage {item.stage}</strong></div>)}</div></div></>}</section></main>;
}