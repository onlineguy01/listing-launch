"use client";

import { useState } from "react";

export function CheckoutButton({ scanId, packageId, defaultEmail, label }: { scanId: string; packageId: string; defaultEmail?: string; label: string }) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanId, email, packageId }) });
    const j = await r.json();
    if (!r.ok) { setError(j.error ?? "Could not start checkout"); setBusy(false); return; }
    window.location.href = j.url;
  }

  return (
    <div className="grid gap-2">
      {!defaultEmail && (
        <>
          <label className="label" htmlFor={`email-${packageId}`}>Email for your receipt and listing report</label>
          <input id={`email-${packageId}`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
        </>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary" onClick={go} disabled={busy || !email}>{busy ? "Redirecting…" : label}</button>
    </div>
  );
}
