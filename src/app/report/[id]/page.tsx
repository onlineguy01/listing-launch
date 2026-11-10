import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getStore } from "@/lib/data";
import { getDirectory } from "@/lib/directories/registry";
import { buildPackages, formatCents, GUARANTEE_DAYS, ownerManagedRows, type PackageLine } from "@/lib/pricing/packages";
import { StateBadge, STATE_LABEL } from "@/components/StateBadge";
import { CheckoutButton } from "@/components/CheckoutButton";
import { UnlockForm } from "@/components/UnlockForm";
import type { Finding, FindingState } from "@/lib/domain/types";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

export const dynamic = "force-dynamic";

const ORDER: FindingState[] = ["incorrect", "not_found", "possible_match", "verified_accurate", "unable_to_verify", "not_eligible"];
const PREVIEW_ROWS = 3;

const ACTION_LABEL: Record<PackageLine["action"], string> = {
  create: "Create listing", correct: "Fix listing", verify: "Submit and verify", review: "Review, then fix", none: "Already accurate",
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const scan = await store.getScan(id);
  if (!scan) notFound();
  if (scan.status !== "complete") redirect(`/scan/${id}`);
  const biz = await store.getBusiness(scan.businessId);
  if (!biz) notFound();
  const findings = (await store.listFindings(id)).sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
  const count = (s: FindingState) => findings.filter((f) => f.state === s).length;

  const jar = await cookies();
  const unlocked = !!biz.ownerEmail || !!jar.get("ll_email")?.value || process.env.REPORT_GATE === "off";

  const ownerRows = ownerManagedRows(findings);
  const packages = buildPackages(findings);
  const sellableIds = new Set(packages.flatMap((p) => p.lines.map((l) => l.directoryId)));
  const sellableFindings = findings.filter((f) => sellableIds.has(f.directoryId) || getDirectory(f.directoryId).sellable);
  const visible = unlocked ? sellableFindings : sellableFindings.slice(0, PREVIEW_ROWS);
  const hiddenCount = sellableFindings.length - visible.length;

  return (
    <div className="grid gap-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Your listing report</p>
        <h1 className="text-3xl font-bold">{biz.name}</h1>
        <p className="text-muted">{[biz.street, biz.city, biz.state, biz.postalCode].filter(Boolean).join(", ")}{biz.phoneE164 ? ` · ${formatPhoneDisplay(biz.phoneE164)}` : ""}</p>
        {scan.mode === "mock" && <p className="mt-2 inline-block rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">Demo mode: simulated results, not a real scan.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["verified_accurate", "text-ok"], ["incorrect", "text-warn"], ["not_found", "text-bad"], ["unable_to_verify", "text-neutral"]] as [FindingState, string][]).map(([s, c]) => (
          <div key={s} className="card p-4"><div className={`text-3xl font-bold ${c}`}>{count(s)}</div><div className="text-xs text-muted">{STATE_LABEL[s]}</div></div>
        ))}
      </div>

      {/* Owner-managed profiles: report only, never sold */}
      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold">Your core profiles</h2>
          <p className="text-sm text-muted">Only the owner can create or claim these. We check them for you and tell you exactly what to do. We never charge for them.</p>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Profile</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">What to do</th></tr></thead>
            <tbody>
              {ownerRows.map((r) => (
                <tr key={r.directoryId} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-medium">{r.directoryName}{r.listingUrl && <a href={r.listingUrl} target="_blank" rel="noreferrer" className="block text-xs text-accent hover:underline">View listing ↗</a>}</td>
                  <td className="px-4 py-3"><StateBadge state={r.state} /></td>
                  <td className="px-4 py-3 text-muted">
                    {r.state === "verified_accurate" && "Nothing to do. Name, phone and address match."}
                    {r.state === "incorrect" && <>{r.diffs.map((x) => <div key={x.field}><span className="font-medium text-foreground">{x.field}</span>: shows “{x.field === "phone" ? formatPhoneDisplay(x.observed) : x.observed}”, should be “{x.field === "phone" ? formatPhoneDisplay(x.expected) : x.expected}”</div>)}<div className="mt-1">{r.howTo}</div></>}
                    {r.state === "not_found" && <>We could not find a listing. {r.howTo} {r.claimUrl && <a className="text-accent hover:underline" href={r.claimUrl} target="_blank" rel="noreferrer">Start here ↗</a>}</>}
                    {r.state === "possible_match" && "A similar listing exists. Check whether it is yours before creating a new one."}
                    {r.state === "unable_to_verify" && <>We could not check this one automatically. {r.howTo}</>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sellable directories + packages */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">Directories we can handle for you</h2>
            <p className="text-sm text-muted">We create, correct and verify these on your behalf. Anything we cannot confirm live within {GUARANTEE_DAYS} days is refunded.</p>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Directory</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Details</th></tr></thead>
              <tbody>
                {visible.map((f) => <FindingRow key={f.directoryId} f={f} />)}
                {!unlocked && hiddenCount > 0 && <tr className="border-t border-border"><td colSpan={3} className="px-4 py-3 text-center text-xs text-muted">+ {hiddenCount} more directories, unlock below</td></tr>}
              </tbody>
            </table>
          </div>
          {!unlocked && <UnlockForm scanId={id} hidden={hiddenCount} />}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-6">
          {packages.map((p) => (
            <div key={p.id} className={`card p-6 grid gap-3 ${p.recommended ? "border-accent" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="text-lg font-semibold">{p.name}</h3><p className="text-sm text-muted">{p.blurb}</p></div>
                {p.recommended && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Recommended</span>}
              </div>
              <div className="text-3xl font-bold">{formatCents(p.totalCents)} <span className="text-sm font-normal text-muted">one-time</span></div>
              {unlocked ? (
                <>
                  <ul className="grid gap-1 text-sm">
                    {p.lines.filter((l) => l.action !== "none").map((l) => <li key={l.directoryId} className="flex justify-between gap-2"><span>{l.directoryName}</span><span className="text-muted">{ACTION_LABEL[l.action]}</span></li>)}
                    {p.alreadyAccurate > 0 && <li className="text-muted">{p.alreadyAccurate} already accurate, included in your report at no charge</li>}
                  </ul>
                  {p.feesCents > 0 && <p className="text-xs text-muted">Includes {formatCents(p.feesCents)} in directory fees passed through at cost.</p>}
                  {p.actionable ? <CheckoutButton scanId={id} packageId={p.id} defaultEmail={biz.ownerEmail} label={`Get ${p.name}: ${p.actionable} listing${p.actionable === 1 ? "" : "s"}`} /> : <p className="text-sm text-ok">Nothing to do in this package.</p>}
                </>
              ) : (
                <p className="text-sm text-muted"><strong className="text-foreground">{p.actionable} listing{p.actionable === 1 ? "" : "s"}</strong> we can create, fix or verify. Unlock the report to see which.</p>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">Pilot pricing. {GUARANTEE_DAYS}-day guarantee: any listing we cannot confirm live is refunded automatically. <Link href="/terms" className="text-accent hover:underline">Terms</Link>.</p>
        </aside>
      </section>
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const d = getDirectory(f.directoryId);
  const show = (field: string, v: string) => (field === "phone" ? formatPhoneDisplay(v) : v);
  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3 font-medium">{d.name}{f.listingUrl && <a href={f.listingUrl} target="_blank" rel="noreferrer" className="block text-xs text-accent hover:underline">View listing ↗</a>}</td>
      <td className="px-4 py-3"><StateBadge state={f.state} /></td>
      <td className="px-4 py-3 text-muted">
        {f.state === "incorrect" && f.diffs.map((x) => <div key={x.field}><span className="font-medium text-foreground">{x.field}</span>: shows “{show(x.field, x.observed)}”, should be “{show(x.field, x.expected)}”</div>)}
        {f.state === "not_found" && "No listing matched your name, phone or website."}
        {f.state === "possible_match" && "A similar listing exists. We review this by hand before touching it."}
        {f.state === "verified_accurate" && "Name, phone and address match."}
        {f.state === "unable_to_verify" && "We could not check this directory automatically. We submit, then verify it live."}
        {f.state === "not_eligible" && (f.evidence.notes ?? "Not applicable to your business type.")}
      </td>
    </tr>
  );
}
