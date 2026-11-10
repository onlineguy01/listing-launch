"use client";

import { useState } from "react";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/magic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setSent(true); setBusy(false);
  }
  if (sent) return <div className="card p-6 text-sm"><p className="font-medium">Check your email</p><p className="text-muted mt-1">If {email} has scans or orders with us, a sign-in link is on its way. It expires in 15 minutes.</p></div>;
  return (
    <form onSubmit={go} className="card grid gap-3 p-6">
      <label className="label" htmlFor="email">Email you used for your scan or order</label>
      <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
      <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
      <p className="text-xs text-muted">No password. We email you a link each time.</p>
    </form>
  );
}
