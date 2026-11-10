"use client";

import { useState } from "react";

export function AdminLoginForm({ next }: { next: string }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    if (!r.ok) { setError("Wrong token"); return; }
    // Full navigation: the router may have prefetched /admin before login and cached its redirect.
    window.location.href = next.startsWith("/") ? next : "/admin";
  }
  return (
    <form onSubmit={go} className="card grid gap-3 p-6">
      <label className="label" htmlFor="token">Admin token</label>
      <input id="token" className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoFocus />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary">Sign in</button>
    </form>
  );
}
