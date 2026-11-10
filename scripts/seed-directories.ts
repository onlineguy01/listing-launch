/** Generates supabase/seed.sql from the TypeScript directory registry. Run: npm run seed:sql */
import { writeFileSync } from "node:fs";
import { DIRECTORIES } from "../src/lib/directories/registry";

const q = (s: string | undefined | null) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (a: string[] | undefined | null, type = "text") => (a == null ? "null" : `array[${a.map(q).join(",")}]::${type}[]`);

const rows = DIRECTORIES.map((d) => `(
  ${q(d.id)}, ${q(d.name)}, ${q(d.homepage)}, ${arr(d.domains)}, ${q(d.tier)}, ${q(d.discovery)}::discovery_method, ${q(d.submission)}::submission_method,
  ${arr(d.ownerActions, "owner_task_type")}, ${arr(d.eligibleCategories)}, ${arr(d.eligibleCountries)}, ${d.allowsHiddenAddress},
  ${d.externalFeeCents}, ${d.basePriceCents}, ${d.estHumanMinutes}, ${d.active}, ${q(d.notes)}
)`);

const sql = `-- Generated from src/lib/directories/registry.ts. Do not edit by hand; run npm run seed:sql.
insert into directories (id, name, homepage, domains, tier, discovery, submission, owner_actions, eligible_categories, eligible_countries,
  allows_hidden_address, external_fee_cents, base_price_cents, est_human_minutes, active, notes)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name, homepage = excluded.homepage, domains = excluded.domains, tier = excluded.tier,
  discovery = excluded.discovery, submission = excluded.submission, owner_actions = excluded.owner_actions,
  eligible_categories = excluded.eligible_categories, eligible_countries = excluded.eligible_countries,
  allows_hidden_address = excluded.allows_hidden_address, external_fee_cents = excluded.external_fee_cents,
  base_price_cents = excluded.base_price_cents, est_human_minutes = excluded.est_human_minutes,
  active = excluded.active, notes = excluded.notes;
`;
writeFileSync("supabase/seed.sql", sql);
console.log(`wrote supabase/seed.sql with ${DIRECTORIES.length} directories`);
