import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getStore } from "@/lib/data";
import { getDirectory } from "@/lib/directories/registry";
import { buildQuote, formatCents } from "@/lib/scan/quote";
import { StateBadge, STATE_LABEL } from "@/components/StateBadge";
import { CheckoutButton } from "@/components/CheckoutButton";
import { UnlockForm } from "@/components/UnlockForm";
import type { Finding, FindingState } from "@/lib/domain/types";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

export const dynamic = "force-dynamic";

const ORDER: FindingState[] = ["incorrect", "not_found", "possible_match", "verified_accurate", "unable_to_verify", "not_eligible"];
/** Rows shown before the email gate. */
const PREVIEW_ROWS = 3;

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const scan = await store.getScan(id);
  if (!scan) notFound();
  if (scan.status !== "complete") redirect(`/scan/${id}`);
  const biz = await store.getBusiness(scan.businessId);
  if (!biz) notFound();
  const findings = (await store.listFindings(id)).sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
  const quote = buildQuote(findings);
  const count = (s: FindingState) => findings.filter((f) => f.state === s).length;

  const jar = await cookies();
  const unlocked = !!biz.ownerEmail || !!jar.get("ll_email")?.value || process.env.REPORT_GATE === "off";
  const visible = unlocked ? findings : findings.slice(0, PREVIEW_ROWS);
  const hiddenCount = findings.length - visible.length;

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Your listing report</p>
        <h1 className="text-3xl font-bold">{biz.name}</h1>
        <p className="text-muted">{[biz.street, biz.city, biz.state, biz.postalCode].filter(Boolean).join(", ")}{biz.phoneE164 ? ` · ${formatPhoneDisplay(biz.phoneE164)}` : ""}</p>
        {scan.mode === "mock" && (
          <p className="mt-2 inline-block rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">Demo mode: simulated results, not a real scan.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([["verified_accurate", "text-ok"], ["incorrect", "text-warn"], ["not_found", "text-bad"], ["unable_to_verify", "text-neutral"]] as [FindingState, string][]).map(([s, c]) => (
          <div key={s} className="card p-4">
            <div className={`text-3xl font-bold ${c}`}>{count(s)}</div>
            <div className="text-xs text-muted">{STATE_LABEL[s]}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="grid gap-4">
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background text-left text-xs text-muted">
                <tr><th className="px-4 py-2">Directory</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Details</th></tr>
              </thead>
              <tbody>
                {visible.map((f) => <FindingRow key={f.directoryId} f={f} />)}
                {!unlocked && hiddenCount > 0 && (
                  <tr className="border-t border-border">
                    <td colSpan={3} className="px-4 py-3 text-center text-xs text-muted">+ {hiddenCount} more directories, unlock below</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!unlocked && <UnlockForm scanId={id} hidden={hiddenCount} />}
        </div>

        <aside className="card p-6 grid gap-4 lg:sticky lg:top-6">
          <div>
            <h2 className="text-lg font-semibold">{quote.packageName}</h2>
            <p className="text-sm text-muted">One-time payment. We create missing listings, submit corrections, and send you live links.</p>
          </div>
          {quote.items.length ? (
            unlocked ? (
              <>
                <ul className="grid gap-1 text-sm">
                  {quote.items.map((i) => (
                    <li key={i.directoryId} className="flex justify-between">
                      <span>{i.action === "create" ? "Create" : "Correct"} · {i.directoryName}</span>
                      <span className="text-muted">{formatCents(i.priceCents + i.feeCents)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-border pt-3 font-semibold">
                  <span>Total</span><span>{formatCents(quote.totalCents)}</span>
                </div>
                <CheckoutButton scanId={id} defaultEmail={biz.ownerEmail} label={`Fix ${quote.items.length} listing${quote.items.length === 1 ? "" : "s"} for ${formatCents(quote.totalCents)}`} />
                <p className="text-xs text-muted">Prices shown are pilot placeholders. Some directories require you to confirm an email or text code; we will walk you through each one.</p>
              </>
            ) : (
              <p className="text-sm text-muted">
                We found <strong className="text-foreground">{quote.items.length} listing{quote.items.length === 1 ? "" : "s"}</strong> we can create or correct for you. Unlock the report to see the exact directories and one-time price.
              </p>
            )
          ) : (
            <p className="text-sm text-ok">Nothing to fix. Your listings look complete on the directories we could verify.</p>
          )}
          {unlocked && quote.excluded.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">Why aren&apos;t the other {quote.excluded.length} included?</summary>
              <ul className="mt-2 grid gap-1">
                {quote.excluded.map((e) => <li key={e.directoryId}>{getDirectory(e.directoryId).name}: {e.reason}</li>)}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const d = getDirectory(f.directoryId);
  const show = (field: string, v: string) => (field === "phone" ? formatPhoneDisplay(v) : v);
  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3 font-medium">
        {d.name}
        {f.listingUrl && (
          <a href={f.listingUrl} target="_blank" rel="noreferrer" className="block text-xs text-accent hover:underline">View listing ↗</a>
        )}
      </td>
      <td className="px-4 py-3"><StateBadge state={f.state} /></td>
      <td className="px-4 py-3 text-muted">
        {f.state === "incorrect" && f.diffs.map((x) => (
          <div key={x.field}><span className="font-medium text-foreground">{x.field}</span>: shows “{show(x.field, x.observed)}”, should be “{show(x.field, x.expected)}”</div>
        ))}
        {f.state === "not_found" && "No listing matched your name, phone or website."}
        {f.state === "possible_match" && "A similar listing exists. We review this by hand before quoting it."}
        {f.state === "verified_accurate" && "Name, phone and address match."}
        {f.state === "unable_to_verify" && "We could not check this directory right now."}
        {f.state === "not_eligible" && (f.evidence.notes ?? "Not applicable to your business type.")}
      </td>
    </tr>
  );
}
