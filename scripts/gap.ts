/** Competitor gap for one business. Run: NODE_USE_ENV_PROXY=1 npx tsx --tsconfig tsconfig.scripts.json scripts/gap.ts <domain> <name> <city> <state> <niche> */
import { computeGap, storeGapSuggestions } from "../src/lib/competitive/gap";
import type { CanonicalBusiness } from "../src/lib/domain/types";

(async () => {
  const [domain, name, city, state, niche] = process.argv.slice(2);
  const biz: CanonicalBusiness = { id: "gap", name, city, state, country: "US", website: `https://${domain}`, domain, categories: ["home_services"], niche, hideAddress: false };
  const gap = await computeGap(biz, { maxCompetitors: 10, budgetUsd: 0.6 });
  const ourRank = gap.ourRank ? String(gap.ourRank) : "not on page 1";
  console.log(`keyword "${gap.keyword}" | our Maps rank: ${ourRank} | our referring domains: ${gap.ourReferringDomains} | competitors analyzed: ${gap.competitors.length} | cost $${gap.costUsd}`);
  console.log("competitors:", gap.competitors.map((c) => `${c.rank}. ${c.name} (${c.reviews} reviews)`).join(" | "));
  console.log("\ncandidates:");
  for (const c of gap.candidates.slice(0, 30)) {
    const known = c.known ? `[${c.known.kind}: ${c.known.name}]` : "";
    console.log(`  ${c.alreadyLinks ? "has" : "   "} rank ${String(c.rank).padStart(3)}  ${String(c.coverage).padStart(2)}/${gap.competitors.length}  ${c.domain.padEnd(34)} ${known}`);
  }
  const stored = await storeGapSuggestions(biz, gap);
  console.log(`\nstored ${stored.length} probe-validated suggestions:`);
  for (const s of stored) console.log(`  ${s.kind.padEnd(11)} ${s.who.padEnd(6)} ${s.host.padEnd(32)} ${(s.probe?.signals ?? []).slice(0, 3).join(", ")}`);
})().catch((e) => { console.error(e); process.exit(1); });
