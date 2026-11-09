import { getStore } from "@/lib/data";
import { getDirectory } from "@/lib/directories/registry";
import { OpsQueue } from "@/components/OpsQueue";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const store = getStore();
  const subs = await store.listAllSubmissions();
  const bizIds = [...new Set(subs.map((s) => s.businessId))];
  const bizList = await Promise.all(bizIds.map((id) => store.getBusiness(id)));
  const bizById = new Map(bizIds.map((id, i) => [id, bizList[i]]));
  const rows = subs.map((sub) => ({ sub, biz: bizById.get(sub.businessId) ?? null, dir: getDirectory(sub.directoryId) }));
  const open = subs.filter((s) => !["published", "rejected", "not_eligible"].includes(s.status)).length;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Ops queue</p>
        <h1 className="text-2xl font-semibold">{open} open submission{open === 1 ? "" : "s"}</h1>
        <p className="text-sm text-muted">Human-assisted fulfillment. Each card has the exact fields to paste and a link to the directory&apos;s submission page.</p>
      </div>
      <OpsQueue rows={rows} />
    </div>
  );
}
