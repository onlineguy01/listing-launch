import { getStore } from "@/lib/data";
import type { CanonicalBusiness, NicheSite } from "@/lib/domain/types";
import { DIRECTORIES } from "@/lib/directories/registry";
import { INDUSTRY_SITES } from "@/lib/directories/industryPacks";
import { LOCAL_SITES } from "@/lib/directories/localPacks";
import { normalizeNiche, probeHost } from "@/lib/niche/discover";
import { normalizeDomain } from "@/lib/scan/normalize";

/**
 * Competitor citation gap.
 *
 * 1. Page 1 of Google Maps for "<niche> <city> <state>" = the competitors that rank.
 * 2. Referring domains for each competitor (DataForSEO backlinks, ~3¢ each).
 * 3. Aggregate: which domains link to several of them, that do not link to our business.
 * 4. Throw out scraper farms (link to nearly every competitor with zero authority),
 *    link sellers and junk TLDs. Keep domains with authority or moderate coverage.
 * 5. Classify against what we already know (registry, industry pack, local pack);
 *    probe the rest and store them as niche-site suggestions tagged competitor_gap.
 */

export interface Competitor { name: string; domain: string; rank: number; reviews: number; address?: string }
export interface GapCandidate {
  domain: string;
  coverage: number;        // how many competitors it links to
  competitors: string[];
  rank: number;            // DataForSEO domain rank (0 = none)
  known?: { kind: "registry" | "industry" | "local"; id: string; name: string };
  alreadyLinks: boolean;   // links to our business already
}
export interface GapResult {
  keyword: string;
  competitors: Competitor[];
  ourReferringDomains: number;
  ourRank?: number;        // where we appear on Maps page 1, if at all
  candidates: GapCandidate[];
  costUsd: number;
  skipped?: string;
}

const auth = () => "Basic " + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
export const gapEnabled = () => !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);

async function dfs<T>(path: string, task: Record<string, unknown>): Promise<{ result: T | undefined; cost: number }> {
  const r = await fetch(`https://api.dataforseo.com/v3/${path}`, { method: "POST", headers: { Authorization: auth(), "Content-Type": "application/json" }, body: JSON.stringify([task]), signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`dataforseo ${path} ${r.status}`);
  const j = (await r.json()) as { tasks?: { status_code: number; status_message?: string; cost?: number; result?: T[] }[] };
  const t = j.tasks?.[0];
  if (!t || t.status_code !== 20000) throw new Error(`dataforseo ${path}: ${t?.status_code} ${t?.status_message}`);
  return { result: t.result?.[0], cost: t.cost ?? 0 };
}

interface MapsItem { type: string; rank_group: number; title: string; domain?: string; address?: string; rating?: { votes_count?: number } }
interface RefDomains { total_count: number; items?: { domain: string; rank?: number; backlinks?: number }[] }

/** Page-1 Maps competitors for the niche in this city. */
export async function findCompetitors(biz: CanonicalBusiness, max = 10): Promise<{ keyword: string; competitors: Competitor[]; ourRank?: number; cost: number }> {
  const niche = biz.niche ? normalizeNiche(biz.niche) : (biz.categories[0] ?? "business").replace(/_/g, " ");
  const keyword = `${niche} ${biz.city} ${biz.state}`.toLowerCase();
  const { result, cost } = await dfs<{ items?: MapsItem[] }>("serp/google/maps/live/advanced", { keyword, location_code: 2840, language_code: "en", depth: 20 });
  const items = (result?.items ?? []).filter((i) => i.type === "maps_search");
  const ours = biz.domain;
  const ourRank = items.find((i) => i.domain && ours && normalizeDomain(i.domain) === ours)?.rank_group;
  const competitors = items
    .filter((i) => i.domain && (!ours || normalizeDomain(i.domain) !== ours))
    .map((i) => ({ name: i.title, domain: normalizeDomain(i.domain)!, rank: i.rank_group, reviews: i.rating?.votes_count ?? 0, address: i.address }))
    .filter((c, idx, arr) => arr.findIndex((x) => x.domain === c.domain) === idx)
    .slice(0, max);
  return { keyword, competitors, ourRank, cost };
}

export async function referringDomains(domain: string, limit = 300): Promise<{ domains: { domain: string; rank: number }[]; total: number; cost: number }> {
  const { result, cost } = await dfs<RefDomains>("backlinks/referring_domains/live", { target: domain, limit, order_by: ["rank,desc"] });
  return { domains: (result?.items ?? []).map((i) => ({ domain: i.domain, rank: i.rank ?? 0 })), total: result?.total_count ?? 0, cost };
}

const JUNK = /\.(xyz|shop|cyou|party|fyi|info|online|website|site|top|click|club|icu|buzz|world|lol|store|link|cv|pages\.dev)$|blogspot|wordpress\.com|weebly|wixsite|godaddysites|backlink|seo|shorten|short-?url|casino|poker|bet|pharma|dapoxetine|clonidine/i;

function knownFor(domain: string): GapCandidate["known"] | undefined {
  const bare = domain.replace(/^www\./, "");
  const reg = DIRECTORIES.find((d) => d.domains.some((h) => bare === h || bare.endsWith("." + h)));
  if (reg) return { kind: "registry", id: reg.id, name: reg.name };
  const ind = INDUSTRY_SITES.find((s) => { const h = s.host.replace(/^www\./, ""); return bare === h || bare.endsWith("." + h); });
  if (ind) return { kind: "industry", id: ind.id, name: ind.name };
  const loc = LOCAL_SITES.find((s) => { const h = s.host.replace(/^www\./, ""); return bare === h || bare.endsWith("." + h); });
  if (loc) return { kind: "local", id: loc.id, name: loc.name };
  return undefined;
}

/**
 * Pure selection logic. A domain survives when it is one we already know (registry,
 * industry or local pack), or has authority (rank >= 20), or has some authority and
 * links to at least two competitors. Zero-authority unknowns are dropped outright:
 * in practice they are scraper farms that copy Google Maps listings and link to
 * every business in town, which no real directory does. Competitors, junk TLDs
 * and link sellers are always dropped.
 */
export function filterCandidates(coverage: Map<string, { competitors: string[]; rank: number }>, analyzed: number, compSet: Set<string>, ourSet: Set<string>): GapCandidate[] {
  const out: GapCandidate[] = [];
  for (const [domain, v] of coverage) {
    if (compSet.has(domain) || JUNK.test(domain)) continue;
    const n = v.competitors.length;
    const known = knownFor(domain);
    const keep = !!known || v.rank >= 20 || (v.rank > 0 && n >= 2);
    if (!keep) continue;
    out.push({ domain, coverage: n, competitors: v.competitors, rank: v.rank, known, alreadyLinks: ourSet.has(domain) });
  }
  void analyzed;
  return out.sort((a, b) => (b.rank + b.coverage * 10) - (a.rank + a.coverage * 10));
}

export async function computeGap(biz: CanonicalBusiness, opts: { maxCompetitors?: number; budgetUsd?: number } = {}): Promise<GapResult> {
  if (!gapEnabled()) return { keyword: "", competitors: [], ourReferringDomains: 0, candidates: [], costUsd: 0, skipped: "DataForSEO not configured" };
  if (!biz.city) return { keyword: "", competitors: [], ourReferringDomains: 0, candidates: [], costUsd: 0, skipped: "city needed" };
  const budget = opts.budgetUsd ?? 0.6;
  let cost = 0;
  const found = await findCompetitors(biz, opts.maxCompetitors ?? 10);
  cost += found.cost;

  const ours = biz.domain ? await referringDomains(biz.domain).catch(() => ({ domains: [], total: 0, cost: 0 })) : { domains: [], total: 0, cost: 0 };
  cost += ours.cost;
  const ourSet = new Set(ours.domains.map((d) => d.domain));

  const coverage = new Map<string, { competitors: string[]; rank: number }>();
  let analyzed = 0;
  for (const c of found.competitors) {
    if (cost >= budget) break;
    try {
      const rd = await referringDomains(c.domain);
      cost += rd.cost; analyzed++;
      for (const d of rd.domains) {
        const cur = coverage.get(d.domain) ?? { competitors: [], rank: 0 };
        cur.competitors.push(c.domain); cur.rank = Math.max(cur.rank, d.rank);
        coverage.set(d.domain, cur);
      }
    } catch (e) { console.error("referring domains failed", c.domain, e); }
  }
  const candidates = filterCandidates(coverage, analyzed, new Set(found.competitors.map((c) => c.domain)), ourSet);
  return { keyword: found.keyword, competitors: found.competitors.slice(0, analyzed), ourReferringDomains: ours.total, ourRank: found.ourRank, candidates, costUsd: Number(cost.toFixed(3)) };
}

/**
 * Persist unknown gap domains as niche-site suggestions (probe-validated) so they show
 * on the report and land in ops review. Known ones already live in a pack.
 */
export async function storeGapSuggestions(biz: CanonicalBusiness, gap: GapResult, max = 15): Promise<NicheSite[]> {
  const niche = biz.niche ? normalizeNiche(biz.niche) : (biz.categories[0] ?? "other");
  const unknown = gap.candidates.filter((c) => !c.known && !c.alreadyLinks).slice(0, max);
  const probed = await Promise.all(unknown.map(async (c) => ({ c, probe: await probeHost(c.domain) })));
  const rows = probed.filter((p) => p.probe.ok).map(({ c, probe }) => ({
    niche, name: c.domain.replace(/^www\./, ""), host: c.domain, url: `https://${c.domain}/`,
    kind: /chamber|\.org$/.test(c.domain) ? ("association" as const) : ("directory" as const),
    who: /chamber|\.org$/.test(c.domain) ? ("you" as const) : ("manual" as const),
    note: `Links to ${c.coverage} of ${gap.competitors.length} page-1 competitors (${c.competitors.slice(0, 3).map((d) => d.split(".")[0]).join(", ")}). Domain rank ${c.rank}.`,
    status: "suggested" as const, probe, source: "web_search" as const,
  }));
  return getStore().upsertNicheSites(rows);
}
