"use client";

import { useState } from "react";
import type { SubmissionRecord } from "@/lib/data/store";
import type { CanonicalBusiness, DirectoryDefinition } from "@/lib/domain/types";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

interface Row { sub: SubmissionRecord; biz: CanonicalBusiness | null; dir: DirectoryDefinition }

const STATUSES = ["prepared", "submitted", "verification_required", "published", "rejected", "failed"] as const;

export function OpsQueue({ rows }: { rows: Row[] }) {
  const [state, setState] = useState(rows);

  async function update(id: string, status: string, listingUrl?: string) {
    const r = await fetch("/api/admin/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, listingUrl }) });
    if (r.ok) setState((s) => s.map((x) => (x.sub.id === id ? { ...x, sub: { ...x.sub, status: status as SubmissionRecord["status"], listingUrl: listingUrl || x.sub.listingUrl } } : x)));
  }

  if (!state.length) return <p className="text-muted text-sm">No submissions yet. Complete a scan and checkout to populate the queue.</p>;

  return (
    <div className="grid gap-4">
      {state.map(({ sub, biz, dir }) => (
        <details key={sub.id} className="card p-4">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{dir.name} · {sub.action} · <span className="text-muted">{biz?.name}</span></span>
            <span className="text-xs rounded-full bg-background px-2 py-0.5">{sub.status}</span>
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <div className="text-xs font-semibold text-muted">Task card (click a value to copy)</div>
              {biz && [
                ["Name", biz.name], ["Phone", formatPhoneDisplay(biz.phoneE164)], ["Website", biz.website ?? ""],
                ["Street", biz.hideAddress ? "(hidden: service-area business)" : biz.street ?? ""],
                ["City", biz.city], ["State", biz.state], ["ZIP", biz.postalCode ?? ""], ["Category", biz.categories.join(", ")],
                ["Owner email", biz.ownerEmail ?? ""],
              ].map(([k, v]) => (
                <button key={k} type="button" onClick={() => navigator.clipboard.writeText(v)} className="flex justify-between rounded border border-border px-2 py-1 text-left hover:bg-background">
                  <span className="text-muted">{k}</span><span className="font-mono text-xs">{v}</span>
                </button>
              ))}
              <a className="btn btn-ghost mt-2" href={dir.submitUrl ?? dir.homepage} target="_blank" rel="noreferrer">Open {dir.name} submission page ↗</a>
              {dir.notes && <p className="text-xs text-muted">{dir.notes}</p>}
              <p className="text-xs text-muted">Owner actions expected: {dir.ownerActions.length ? dir.ownerActions.join(", ") : "none"} · est. {dir.estHumanMinutes} min</p>
            </div>
            <form
              className="grid gap-2 text-sm"
              onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); update(sub.id, String(fd.get("status")), String(fd.get("listingUrl") || "")); }}
            >
              <label className="label">Set status</label>
              <select name="status" className="input" defaultValue={sub.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="label">Listing URL (once published)</label>
              <input name="listingUrl" className="input" defaultValue={sub.listingUrl ?? ""} placeholder="https://…" />
              <button className="btn btn-primary">Save</button>
              <div className="text-xs text-muted">
                {sub.log.map((l, i) => <div key={i}>{new Date(l.at).toLocaleString()} · {l.event}</div>)}
              </div>
            </form>
          </div>
        </details>
      ))}
    </div>
  );
}
