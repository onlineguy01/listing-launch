import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getStore } from "@/lib/data";
import { buildPackages, formatCents, GUARANTEE_DAYS, type PackageLine } from "@/lib/pricing/packages";
import { assemblePacks } from "@/lib/pricing/packs";
import { PackTable } from "@/components/PackTable";
import { STATE_LABEL } from "@/components/StateBadge";
import { CheckoutButton } from "@/components/CheckoutButton";
import { UnlockForm } from "@/components/UnlockForm";
import type { FindingState } from "@/lib/domain/types";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

export const dynamic = "force-dynamic";

const ORDER: FindingState[] = ["incorrect", "not_found", "possible_match", "verified_accurate", "unable_to_verify", "not_eligible"];

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

  const packs = assemblePacks(biz, findings);
  const packages = buildPackages(findings);

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

      {/* Core pack */}
      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold">Core pack: every business</h2>
          <p className="text-sm text-muted">The profiles and directories customers and search engines check first. Core profiles can only be claimed by the owner; we check them and tell you what to do, free. The rest we handle for you.</p>
        </div>
        <PackTable rows={packs.core} />
      </section>

      {/* Industry pack */}
      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold">Industry pack: {packs.categoryLabel}</h2>
          <p className="text-sm text-muted">Where customers in your industry look. <span className="text-warn">Marketplaces</span> need merchant onboarding and <span className="text-neutral">professional profiles</span> are tied to a licensed person, so you sign up for those; we tell you whether you are there. Plain directories we can submit for you.</p>
        </div>
        <PackTable rows={packs.industry} emptyText="No industry-specific sites for this category yet. The core pack still applies." />
      </section>

      {/* Local pack */}
      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-semibold">Local pack{packs.local.metroName ? `: ${packs.local.metroName}` : ""}</h2>
          <p className="text-sm text-muted">Chambers, tourism bureaus and regional directories. The most relevant links a local business can earn. Most involve a membership fee, which we pass through at cost.</p>
        </div>
        <PackTable rows={packs.local.rows} emptyText="We have not built a local pack for your city yet. Tell us your chamber and we will add it." />
      </section>

      {/* Packages */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold">Fix it once</h2>
            <p className="text-sm text-muted">We create, correct and verify every directory marked “Directory” above, on your behalf. Anything we cannot confirm live within {GUARANTEE_DAYS} days of purchase is refunded automatically. Core profiles, marketplaces and professional profiles are yours to claim; we have told you exactly what to do with each.</p>
          </div>
          {!unlocked && <UnlockForm scanId={id} hidden={packages[1]?.actionable ?? 0} />}
          {unlocked && <p className="text-sm text-muted">A copy of this report with evidence links is in your inbox. Pick a package to get started.</p>}
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
