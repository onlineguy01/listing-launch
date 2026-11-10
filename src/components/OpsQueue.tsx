"use client";

import { useState } from "react";
import type { SubmissionRecord } from "@/lib/data/store";
import type { CanonicalBusiness, DirectoryDefinition } from "@/lib/domain/types";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

interface Row { sub: SubmissionRecord; biz: CanonicalBusiness | null; dir: DirectoryDefinition }

function formatHours(h?: CanonicalBusiness["hours"]): string {
  if (!h) return "";
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  return order.map((d) => { const v = h[d]; return v === undefined ? null : `${d[0].toUpperCase()}${d.slice(1)} ${v.length ? v.map(([a, b]) => `${a}-${b}`).join(", ") : "closed"}`; }).filter(Boolean).join("; ");
}

const STATUSES = ["prepared", "submitted", "verification_required", "published", "rejected", "failed"] as const;

export function OpsQueue({ rows }: { rows: Row[] }) {
  const [state, setState] = useState(rows);

  const [notice, setNotice] = useState<string | null>(null);

  async function update(id: string, status: string, listingUrl?: string, ownerInstructions?: string) {
    const r = await fetch("/api/admin/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, listingUrl, ownerInstructions }) });
    if (r.ok) {
      const j = await r.json();
      setNotice(status === "verification_required" ? "Saved. Owner emailed with instructions." : status === "published" ? "Saved. Re-checks scheduled at 3, 14 and 30 days." : j.completionSent ? "Saved. Order complete, completion report emailed." : "Saved.");
    }
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
                ["Services", (biz.services ?? []).join(", ")],
                ["Service area", (biz.serviceArea ?? []).join(", ")],
                ["Founded", biz.yearFounded ? String(biz.yearFounded) : ""],
                ["Payments", (biz.paymentMethods ?? []).join(", ")],
                ["Hours", formatHours(biz.hours)],
                ["Logo URL", biz.logoUrl ?? ""],
                ["Short description", biz.descriptionShort ?? ""],
                ["Long description", biz.descriptionLong ?? ""],
                ["Google connected", biz.googleRefreshTokenEnc ? `yes (${biz.googleAccountEmail ?? "email unknown"})${biz.googleLocationName ? ", existing profile found" : ""}` : "no"],
              ].filter(([, v]) => v !== "").map(([k, v]) => (
                <button key={k} type="button" onClick={() => navigator.clipboard.writeText(v)} className="flex justify-between rounded border border-border px-2 py-1 text-left hover:bg-background">
                  <span className="text-muted shrink-0 mr-3">{k}</span><span className="font-mono text-xs text-right break-words">{v}</span>
                </button>
              ))}
              <a className="btn btn-ghost mt-2" href={dir.submitUrl ?? dir.homepage} target="_blank" rel="noreferrer">Open {dir.name} submission page ↗</a>
              {dir.notes && <p className="text-xs text-muted">{dir.notes}</p>}
              <p className="text-xs text-muted">Owner actions expected: {dir.ownerActions.length ? dir.ownerActions.join(", ") : "none"} · est. {dir.estHumanMinutes} min</p>
            </div>
            <form
              className="grid gap-2 text-sm"
              onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); update(sub.id, String(fd.get("status")), String(fd.get("listingUrl") || ""), String(fd.get("ownerInstructions") || "")); }}
            >
              <label className="label">Set status</label>
              <select name="status" className="input" defaultValue={sub.status}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="label">Listing URL (once published)</label>
              <input name="listingUrl" className="input" defaultValue={sub.listingUrl ?? ""} placeholder="https://…" />
              <label className="label">Instructions for the owner (sent when status is “verification_required”)</label>
              <textarea name="ownerInstructions" className="input" rows={2} placeholder="Yelp emailed a confirmation link to your business address; click it within 48 hours." />
              <button className="btn btn-primary">Save</button>
              {notice && <p className="text-xs text-ok">{notice}</p>}
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
