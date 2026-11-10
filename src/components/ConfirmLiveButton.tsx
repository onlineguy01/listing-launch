"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmLiveButton({ orderId, submissionId }: { orderId: string; submissionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/orders/${orderId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId }) });
    if (!r.ok) { setErr((await r.json()).error ?? "Could not confirm"); setBusy(false); return; }
    router.refresh();
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button onClick={go} disabled={busy} className="rounded-md border border-accent px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50">{busy ? "Saving…" : "Yes, it's live"}</button>
      {err && <span className="text-xs text-bad">{err}</span>}
    </span>
  );
}
