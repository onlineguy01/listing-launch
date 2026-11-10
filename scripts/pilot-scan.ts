/** Pilot: read a client website, scan live, assemble packs, write a markdown report. Run: NODE_USE_ENV_PROXY=1 npx tsx --tsconfig tsconfig.scripts.json scripts/pilot-scan.ts <url> [city] [state] */
import { writeFileSync } from "node:fs";
import { analyzeWebsite } from "../src/lib/intake/website";
import { runScan } from "../src/lib/scan/runner";
import { createLiveContext } from "../src/lib/scan/context";
import { assemblePacks, WHO_LABEL } from "../src/lib/pricing/packs";
import { buildPackages, formatCents } from "../src/lib/pricing/packages";
import { normalizeNiche } from "../src/lib/niche/discover";
import { getStore } from "../src/lib/data";
import { seedNiches } from "./seed-niches";
import { normalizeDomain } from "../src/lib/scan/normalize";
import { STATE_LABEL } from "../src/components/StateBadge";
import type { CanonicalBusiness } from "../src/lib/domain/types";

(async () => {
  const [url, cityArg, stateArg, nicheArg] = process.argv.slice(2);
  await seedNiches();
  const a = await analyzeWebsite(url);
  const niche = nicheArg ?? a.niche;
  const biz: CanonicalBusiness = {
    id: "pilot", name: a.name ?? url, street: a.street, city: cityArg ?? a.city ?? "", state: stateArg ?? a.state ?? "TX", postalCode: a.postalCode, country: "US",
    phoneE164: a.phone, website: a.url, domain: normalizeDomain(a.url), categories: [a.industry], niche, hideAddress: !a.street,
  };
  console.log("canonical:", JSON.stringify({ name: biz.name, phone: biz.phoneE164, street: biz.street, city: biz.city, state: biz.state, industry: a.industry, niche, source: a.source }));
  const t = Date.now();
  const findings = await runScan(biz, createLiveContext(), { concurrency: 3 });
  const secs = ((Date.now() - t) / 1000).toFixed(0);
  const nicheSites = await getStore().listNicheSites(normalizeNiche(niche));
  const packs = assemblePacks(biz, findings, nicheSites);
  const pk = buildPackages(findings);

  const row = (r: (typeof packs.core)[number]) => `| ${r.name} | ${r.kindLabel} | ${r.checked && r.state ? STATE_LABEL[r.state] : r.suggested ? "Suggested" : "Not checked"} | ${WHO_LABEL[r.who]} | ${r.listingUrl ? `[listing](${r.listingUrl})` : `[site](${r.url})`} ${r.diffs?.length ? "· " + r.diffs.map((d) => `${d.field}: “${d.observed}” → “${d.expected}”`).join("; ") : ""} |`;
  const table = (rows: typeof packs.core) => rows.length ? `| Site | Type | Status | Who | Link / diffs |\n|---|---|---|---|---|\n${rows.map(row).join("\n")}` : "_(none)_";
  const md = `# ${biz.name}\n\n${biz.website} · ${[biz.street, biz.city, biz.state, biz.postalCode].filter(Boolean).join(", ")} · ${biz.phoneE164 ?? "no phone found"}\n\nIndustry: **${packs.categoryLabel}** · Niche: **${niche}** (${a.source}) · Live scan of ${findings.length} directories in ${secs}s\n\n## Core pack\n\n${table(packs.core)}\n\n## Industry pack: ${packs.categoryLabel}\n\n${table(packs.industry)}\n\n## Niche pack: ${niche}\n\n${table(packs.nicheRows)}\n\n## Local pack${packs.local.metroName ? `: ${packs.local.metroName}` : ""}\n\n${table(packs.local.rows)}\n\n## Packages\n\n${pk.map((p) => `- **${p.name}** ${formatCents(p.totalCents)}${p.recommended ? " (recommended)" : ""}: ${p.lines.filter((l) => l.action !== "none").map((l) => `${l.directoryName} (${l.action})`).join(", ") || "nothing to do"}`).join("\n")}\n`;
  const file = `pilot/${(biz.domain ?? "client").replace(/\W+/g, "-")}.md`;
  writeFileSync(file, md);
  console.log(`wrote ${file}`);
  console.log(packs.core.map((r) => `${r.name}: ${r.checked ? r.state : "unchecked"} (${r.who})`).join(" | "));
})().catch((e) => { console.error(e); process.exit(1); });
