"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Schedule = { id: string; date: string; startTime: string; endTime: string; stage: number };
type SearchResult = { id: string; name: string; city: { name: string }; province: { name: string } };
type Status = { status: string; label: string; stage: number | null; nextOutage: Schedule | null; activeOutage: Schedule | null; countdownTarget: string | null; area: { name: string; suburb: string; city: string; province: string } };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function formatDate(date: string) { return new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)); }
function countdown(target: string | null, now: number) { if (!target) return "--"; const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}h ${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}m ${String(seconds % 60).padStart(2, "0")}s`; }

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedArea, setSelectedArea] = useState<SearchResult | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => { Promise.all([fetch(`${API}/status/zone-2`).then((response) => response.json()), fetch(`${API}/schedules/upcoming?zoneBlockId=zone-2`).then((response) => response.json())]).then(([current, upcoming]) => { setStatus(current); setSchedules(upcoming); }).catch(() => setError("The schedule could not be loaded. Check that the API is running and try again.")); }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!query.trim()) return; const timer = window.setTimeout(() => fetch(`${API}/locations/search?q=${encodeURIComponent(query)}`).then((response) => response.json()).then(setResults).catch(() => setResults([])), 250); return () => window.clearTimeout(timer); }, [query]);

  return <main className="app-shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><nav className="nav"><a href="#schedule">Schedule</a><Link href="/admin/login">Admin</Link></nav></header>
    <section className="dashboard"><div className="eyebrow">Live local electricity status</div><h1>Know what your power is doing.</h1><p className="intro">A clear, local view of load-shedding for the places that matter to you.</p>
      {error ? <div className="card error" style={{ marginTop: 48 }}>{error}</div> : !status ? <div className="card loading" style={{ marginTop: 48 }}>Reading the grid...</div> : <>
        <div className="layout-grid"><article className={`card status-card ${status.status === "OUTAGE_ACTIVE" ? "active" : ""}`}><div><div className="status-label">Current power status</div><div className={`status-value ${status.status === "OUTAGE_ACTIVE" ? "active" : ""}`}>{status.label}</div></div><div className="status-meta"><span className="status-dot" /> Stage {status.stage || "none"} <span className="muted">| {status.status === "OUTAGE_ACTIVE" ? "Power returns at" : "Next interruption"} {status.activeOutage?.endTime || status.nextOutage?.startTime || "--:--"}</span></div></article>
          <div className="side-stack"><article className="card location-card"><div className="status-label">Where are you checking from?</div><div className="location-name">{selectedArea?.name || status.area.suburb}</div><div className="location-path">{selectedArea?.city.name || status.area.city} · {selectedArea?.province.name || status.area.province} · {status.area.name}</div><div className="search-row"><input aria-label="Search for an area" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search another area" /><button className="button" onClick={() => setQuery("")}>Clear</button></div>{query.trim() && results.length > 0 && <div className="results">{results.map((result) => <button className="result" key={result.id} onClick={() => { setSelectedArea(result); setQuery(result.name); setResults([]); }}>{result.name}<br /><span className="muted">{result.city.name} · {result.province.name}</span></button>)}</div>}</article><article className="card next-card"><div><div className="status-label">Up next</div><div className="next-time">{status.nextOutage ? `${status.nextOutage.startTime} – ${status.nextOutage.endTime}` : "No outage planned"}</div><div className="muted">{status.nextOutage ? formatDate(status.nextOutage.date) : "Your power is clear"} · Stage {status.nextOutage?.stage || "-"}</div></div><div className="countdown"><div className="status-label">Countdown</div><div className="countdown-value">{countdown(status.countdownTarget, now)}</div></div></article></div></div>
        <section className="schedule-section" id="schedule"><div className="schedule-header"><h2 className="section-title">Upcoming schedule</h2><span className="muted">Zone 2 · Africa/Johannesburg</span></div><div className="schedule-list">{schedules.length === 0 ? <div className="card muted">No schedules available for this area.</div> : schedules.slice(0, 6).map((item) => <article className="schedule-item" key={item.id}><div className="schedule-date">{formatDate(item.date)}</div><div className="schedule-time">{item.startTime} – {item.endTime}</div><div className="stage">Stage {item.stage}</div></article>)}</div></section>
      </>}
      <p className="footer-note">Schedules are manually maintained and may change. Last checked just now.</p>
    </section>
  </main>;
}
