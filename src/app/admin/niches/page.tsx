import { getStore } from "@/lib/data";
import { NicheReview } from "@/components/NicheReview";
import { discoveryEnabled } from "@/lib/niche/discover";

export const dynamic = "force-dynamic";

export default async function NichesPage() {
  const store = getStore();
  const niches = await store.listNiches();
  const groups = await Promise.all(niches.map(async (n) => ({ niche: n.niche, sites: await store.listNicheSites(n.niche) })));
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Niche directories</p>
        <h1 className="text-2xl font-semibold">Review discovered sites</h1>
        <p className="text-sm text-muted">Sites are found with web search for each new niche, probed for reachability, and stored as suggestions. Approve the ones worth showing customers; set who does the submission. {!discoveryEnabled() && <span className="text-warn">Discovery needs ANTHROPIC_API_KEY.</span>}</p>
      </div>
      <NicheReview groups={groups} />
    </div>
  );
}
