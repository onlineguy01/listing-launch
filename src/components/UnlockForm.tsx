"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnlockForm({ scanId, hidden }: { scanId: string; hidden: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await fetch("/api/report/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scanId, email }) });
    if (!r.ok) { setError((await r.json()).error ?? "Try again"); setBusy(false); return; }
    router.refresh();
  }

  return (
    <form onSubmit={go} className="card grid gap-3 p-6 text-center">
      <h2 className="text-lg font-semibold">See all {hidden} remaining directories and your fix-it package</h2>
      <p className="text-sm text-muted">Enter your email and we&apos;ll unlock the full report here and send you a copy with evidence links.</p>
      <div className="mx-auto flex w-full max-w-md gap-2">
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
        <button className="btn btn-primary whitespace-nowrap" disabled={busy}>{busy ? "Unlocking…" : "Unlock report"}</button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <p className="text-xs text-muted">No spam. One report email and order updates only.</p>
    </form>
  );
}
