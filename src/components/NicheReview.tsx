"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NicheSite } from "@/lib/domain/types";
import { CATEGORIES } from "@/lib/directories/categories";

export function NicheReview({ groups }: { groups: { niche: string; sites: NicheSite[] }[] }) {
  const router = useRouter();
  const [niche, setNiche] = useState(""); const [industry, setIndustry] = useState("other"); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null);

  async function update(id: string, patch: Record<string, string>) {
    await fetch("/api/admin/niches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    router.refresh();
  }
  async function discover(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/niches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ niche, industry }) });
    const j = await r.json(); setMsg(r.ok ? `${j.count} reachable sites stored for review.` : j.error ?? "Failed"); setBusy(false); router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={discover} className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div><label className="label">Niche</label><input className="input" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="mobile dog grooming" required /></div>
        <div><label className="label">Industry</label><select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Researching…" : "Discover sites"}</button>
        {msg && <p className="text-xs text-muted md:col-span-3">{msg}</p>}
      </form>
      {groups.map((g) => (
        <details key={g.niche} className="card p-4" open>
          <summary className="cursor-pointer font-medium">{g.niche} <span className="text-muted text-sm font-normal">· {g.sites.filter((s) => s.status === "approved").length} approved / {g.sites.filter((s) => s.status === "suggested").length} suggested</span></summary>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">Site</th><th>Kind</th><th>Who</th><th>Probe</th><th>Note</th><th>Status</th></tr></thead>
            <tbody>
              {g.sites.map((s) => (
                <tr key={s.id} className="border-t border-border align-top">
                  <td className="py-2 pr-2 font-medium">{s.name}<a href={s.url} target="_blank" rel="noreferrer" className="block text-xs text-accent hover:underline">{s.host} ↗</a></td>
                  <td className="py-2 pr-2"><select className="input py-1" defaultValue={s.kind} onChange={(e) => update(s.id, { kind: e.target.value })}>{["directory", "marketplace", "profile", "association"].map((k) => <option key={k}>{k}</option>)}</select></td>
                  <td className="py-2 pr-2"><select className="input py-1" defaultValue={s.who} onChange={(e) => update(s.id, { who: e.target.value })}>{["we", "you", "manual"].map((k) => <option key={k}>{k}</option>)}</select></td>
                  <td className="py-2 pr-2 text-xs text-muted">{s.probe?.ok ? `ok ${s.probe.status}` : "unreachable"}{s.probe?.signals?.length ? ` · ${s.probe.signals.slice(0, 2).join(", ")}` : ""}</td>
                  <td className="py-2 pr-2 text-xs text-muted max-w-xs">{s.note}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <button onClick={() => update(s.id, { status: "approved" })} className={`rounded px-2 py-0.5 text-xs ${s.status === "approved" ? "bg-ok/10 text-ok" : "border border-border"}`}>Approve</button>
                      <button onClick={() => update(s.id, { status: "rejected" })} className={`rounded px-2 py-0.5 text-xs ${s.status === "rejected" ? "bg-bad/10 text-bad" : "border border-border"}`}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
      {!groups.length && <p className="text-sm text-muted">No niches discovered yet. Run a website intake, or discover one above.</p>}
    </div>
  );
}
