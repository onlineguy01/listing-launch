import { getStore } from "@/lib/data";
import { formatCents } from "@/lib/scan/quote";
import { getDirectory } from "@/lib/directories/registry";

export const dynamic = "force-dynamic";

/** Pilot scorecard: the numbers that decide pricing. */
export default async function MetricsPage() {
  const store = getStore();
  const [scans, orders, subs] = await Promise.all([store.listAllScans(), store.listAllOrders(), store.listAllSubmissions()]);
  const complete = scans.filter((s) => s.status === "complete");
  const bizIds = [...new Set(scans.map((s) => s.businessId))];
  const bizList = await Promise.all(bizIds.map((id) => store.getBusiness(id)));
  const bizById = new Map(bizIds.map((id, i) => [id, bizList[i]]));
  const unlocked = complete.filter((s) => s.requesterEmail || bizById.get(s.businessId)?.ownerEmail).length;
  const paid = orders.filter((o) => ["paid", "in_progress", "complete"].includes(o.status));
  const revenue = paid.reduce((a, o) => a + o.quote.totalCents, 0);
  const items = paid.reduce((a, o) => a + o.quote.items.length, 0);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
  const byStatus = subs.reduce<Record<string, number>>((m, s) => ((m[s.status] = (m[s.status] ?? 0) + 1), m), {});
  const terminal = subs.filter((s) => ["published", "rejected", "failed", "not_eligible"].includes(s.status));
  const published = byStatus.published ?? 0;
  const byDir = subs.reduce<Record<string, { total: number; published: number; verified: number; refunded: number }>>((m, s) => {
    const d = (m[s.directoryId] ??= { total: 0, published: 0, verified: 0, refunded: 0 }); d.total++;
    if (s.status === "published") d.published++; if (s.billingStatus === "verified") d.verified++; if (s.billingStatus === "refunded") d.refunded++; return m;
  }, {});
  const refundedCents = orders.reduce((a, o) => a + o.refundedCents, 0);
  const verifiedLines = subs.filter((s) => s.billingStatus === "verified").length;
  const refundedLines = subs.filter((s) => s.billingStatus === "refunded").length;
  const humanMinutes = subs.reduce((a, s) => a + s.humanMinutes, 0);

  const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="card p-4"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted">{label}</div>{sub && <div className="text-xs text-muted mt-1">{sub}</div>}</div>
  );

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pilot scorecard</p>
        <h1 className="text-2xl font-semibold">Funnel and fulfillment</h1>
        <p className="text-sm text-muted">The numbers that set the price: scan → purchase conversion, human minutes per verified listing, and refund rate. A directory refunding more than a third of the time (highlighted) should leave the paid packages.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Scans completed" value={String(complete.length)} sub={`${scans.filter((s) => s.mode === "mock").length} in demo mode`} />
        <Tile label="Reports unlocked" value={String(unlocked)} sub={`${pct(unlocked, complete.length)} of completed scans`} />
        <Tile label="Paid orders" value={String(paid.length)} sub={`${pct(paid.length, complete.length)} scan → purchase`} />
        <Tile label="Net revenue" value={formatCents(revenue - refundedCents)} sub={paid.length ? `${formatCents(revenue)} gross · ${formatCents(refundedCents)} refunded · ${items} listings` : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Submissions" value={String(subs.length)} />
        <Tile label="Published" value={String(published)} sub={`${pct(published, terminal.length)} of finished jobs`} />
        <Tile label="Verified live" value={String(verifiedLines)} sub={`${pct(verifiedLines, subs.length)} of lines · ${refundedLines} refunded (${pct(refundedLines, subs.length)})`} />
        <Tile label="Human minutes logged" value={String(humanMinutes)} sub={published ? `${(humanMinutes / published).toFixed(1)} per published listing` : "log minutes on jobs to track"} />
      </div>
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Directory</th><th className="px-4 py-2">Jobs</th><th className="px-4 py-2">Verified live</th><th className="px-4 py-2">Refunded</th><th className="px-4 py-2">Refund rate</th></tr></thead>
          <tbody>
            {Object.entries(byDir).sort((a, b) => b[1].refunded / b[1].total - a[1].refunded / a[1].total).map(([id, v]) => (
              <tr key={id} className={`border-t border-border ${v.total >= 3 && v.refunded / v.total > 1 / 3 ? "bg-warn/5" : ""}`}><td className="px-4 py-2 font-medium">{getDirectory(id).name}</td><td className="px-4 py-2">{v.total}</td><td className="px-4 py-2">{v.verified}</td><td className="px-4 py-2">{v.refunded}</td><td className="px-4 py-2">{pct(v.refunded, v.total)}</td></tr>
            ))}
            {!subs.length && <tr><td colSpan={5} className="px-4 py-3 text-muted">No submissions yet.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="card p-4 text-sm text-muted">
        <div className="font-medium text-foreground mb-1">Status mix</div>
        {Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(" · ") || "–"}
      </section>
    </div>
  );
}
