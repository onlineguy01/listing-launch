import type { CanonicalBusiness, DirectoryDefinition, Finding, ObservedListing } from "@/lib/domain/types";
import type { AdapterContext } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { extractBest, extractJsonLdAll } from "@/lib/scan/extract";
import { classify, matchListing, nameSimilarity, type MatchResult } from "@/lib/scan/match";

/**
 * Configuration for a directory whose own public search page we can read.
 * This is more reliable than `site:` web search and costs nothing.
 */
export interface SiteSearchConfig {
  /** Build the directory's search results URL for this business. */
  searchUrl: (biz: CanonicalBusiness) => string;
  /** Regex that matches listing-page hrefs on the results page (first capture group = href). */
  listingLink?: RegExp;
  /** Pull candidates straight from the results page HTML when it carries structured data. */
  extractResults?: (html: string, pageUrl: string) => ObservedListing[];
  /** When the results page has no per-result data, fetch up to this many listing pages. */
  maxDetailFetches?: number;
  /** When true, listing pages themselves cannot be fetched (bot wall); match on results-page data only. */
  detailBlocked?: boolean;
}

export class SiteSearchAdapter extends SearchFetchAdapter {
  constructor(def: DirectoryDefinition, private readonly cfg: SiteSearchConfig) { super(def); }

  async discover(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    const elig = this.eligibility(biz);
    if (!elig.eligible) {
      return { directoryId: this.def.id, state: "not_eligible", confidence: 1, diffs: [], evidence: { queries: [], candidates: [], source: "none", notes: elig.reason } };
    }
    const searchUrl = this.cfg.searchUrl(biz);
    const html = await ctx.fetchHtml(searchUrl);
    if (!html) {
      ctx.log("site_search_blocked", { directory: this.def.id, searchUrl });
      return { directoryId: this.def.id, state: "unable_to_verify", confidence: 0, diffs: [],
        evidence: { queries: [searchUrl], candidates: [], source: "none", notes: "Directory search page could not be fetched" } };
    }

    // 1. Candidates from the results page itself (JSON-LD or a custom extractor).
    let observed: ObservedListing[] = this.cfg.extractResults ? this.cfg.extractResults(html, searchUrl) : extractJsonLdAll(html, searchUrl);
    observed = observed.filter((o) => this.isListingUrl(o.url) || o.url === searchUrl);
    let source: Finding["evidence"]["source"] = observed.length ? "jsonld" : "none";

    // 2. Otherwise collect listing links and fetch the most promising ones.
    if (!observed.length && this.cfg.listingLink && !this.cfg.detailBlocked) {
      const links = uniqueLinks(html, this.cfg.listingLink, searchUrl).filter((u) => this.isListingUrl(u));
      // Rank links by how much the slug resembles the business name, so we fetch the right ones first.
      const ranked = links
        .map((u) => ({ u, score: nameSimilarity(biz.name, slugWords(u)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, this.cfg.maxDetailFetches ?? 3);
      for (const { u } of ranked) {
        const page = await ctx.fetchHtml(u);
        if (!page) continue;
        const o = extractBest(page, u);
        if (o) { observed.push({ ...o, url: u }); source = "html"; }
      }
    }

    // 3. Score every candidate against the canonical record.
    let best: { obs: ObservedListing; match: MatchResult } | null = null;
    const scored: { url: string; score: number }[] = [];
    for (const obs of observed) {
      const match = matchListing(biz, obs);
      scored.push({ url: obs.url, score: match.identity });
      if (!best || match.identity > best.match.identity) best = { obs, match };
    }
    const { state, confidence } = classify(best?.match ?? null, true);
    return {
      directoryId: this.def.id,
      state,
      // A directory's own search is authoritative about its own index: slightly higher confidence in absence.
      confidence: state === "not_found" ? Math.max(confidence, 0.8) : confidence,
      listingUrl: best && best.match.identity >= 0.5 ? best.obs.url : undefined,
      observed: best?.obs,
      diffs: best && best.match.identity >= 0.8 ? best.match.diffs : [],
      evidence: { queries: [searchUrl], candidates: scored, source, notes: best?.match.signals.join(",") },
    };
  }
}

function uniqueLinks(html: string, re: RegExp, base: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(html))) {
    const href = (m[1] ?? m[0]).replace(/&amp;/g, "&");
    let abs: string;
    try { abs = new URL(href, base).toString(); } catch { continue; }
    abs = abs.split("#")[0].split("?")[0];
    if (!seen.has(abs)) { seen.add(abs); out.push(abs); }
  }
  return out;
}

export function slugWords(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").filter(Boolean).pop() ?? "";
    return last.replace(/[-_]?\d+$/, "").replace(/[-_]+/g, " ");
  } catch { return ""; }
}
