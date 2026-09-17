"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try { const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); localStorage.setItem("powertrack_token", data.token); router.push("/admin/dashboard"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in."); } finally { setLoading(false); }
  }
  return <main className="app-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><Link className="nav" href="/">Back to dashboard</Link></header><section className="admin-wrap"><div className="eyebrow">Administrator access</div><div className="card admin-panel"><h1 style={{ fontSize: 42 }}>Welcome back.</h1><p className="intro">Sign in to see schedule health and recent updates.</p><form className="admin-form" onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>{error && <div className="error">{error}</div>}<button className="button admin-button" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button></form></div></section></main>;
}