/** Seed curated niche sites as approved. Probes each host. Run: npm run seed:niches (needs the same env as the app). */
import { getStore } from "../src/lib/data";
import { NICHE_SEEDS } from "../src/lib/niche/seeds";
import { probeHost } from "../src/lib/niche/discover";

export async function seedNiches() {
  const store = getStore();
  const rows = await Promise.all(NICHE_SEEDS.map(async (s) => ({ ...s, status: "approved" as const, source: "ops" as const, probe: await probeHost(s.host) })));
  const out = await store.upsertNicheSites(rows);
  for (const r of rows) console.log(`${r.probe?.ok ? "ok " : "!! "} ${r.niche.padEnd(26)} ${r.name}`);
  return out;
}

if (process.argv[1]?.endsWith("seed-niches.ts")) seedNiches().then((r) => console.log(`${r.length} niche sites seeded`));
