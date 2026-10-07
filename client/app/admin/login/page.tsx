"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function AdminLogin() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationKey, setRegistrationKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const endpoint = registering ? "register" : "login";
      const body = registering ? { email, password, registrationKey } : { email, password };
      const response = await fetch(`${API}/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (registering) { setRegistering(false); setRegistrationKey(""); setError("Registration complete. Sign in with your new administrator account."); return; }
      localStorage.setItem("powertrack_token", data.token); router.push("/admin/dashboard");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to complete the request."); } finally { setLoading(false); }
  }
  return <main className="app-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span><span>POWERTRACK</span></Link><Link className="nav" href="/">Back to dashboard</Link></header><section className="admin-wrap"><div className="eyebrow">Administrator access</div><div className="card admin-panel"><h1 style={{ fontSize: 42 }}>{registering ? "Create administrator." : "Welcome back."}</h1><p className="intro">{registering ? "Registration requires a server-configured key and database. Contact the PowerTrack operator if you need access." : "Sign in to see schedule health and recent updates."}</p><form className="admin-form" onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} aria-label="Password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={registering ? 12 : undefined} autoComplete={registering ? "new-password" : "current-password"} /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div></label>{registering && <label>Registration key<input type="password" value={registrationKey} onChange={(event) => setRegistrationKey(event.target.value)} required autoComplete="off" /></label>}{error && <div className="error">{error}</div>}<button className="button admin-button" disabled={loading}>{loading ? "Please wait..." : registering ? "Register administrator" : "Sign in"}</button></form><button className="nav" style={{ marginTop: 18 }} type="button" onClick={() => { setRegistering(!registering); setError(""); }}>{registering ? "Back to sign in" : "Register an administrator"}</button></div></section></main>;
}