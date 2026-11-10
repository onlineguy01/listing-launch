import type { CanonicalBusiness, DirectoryDefinition, Eligibility, Finding, ObservedListing } from "@/lib/domain/types";
import type { AdapterContext, DirectoryAdapter } from "./types";
import { extractHeuristic, extractJsonLd } from "@/lib/scan/extract";
import { classify, matchListing, type MatchResult } from "@/lib/scan/match";
import { normalizePhone } from "@/lib/scan/normalize";
import { CATEGORIES, normalizeCategory } from "@/lib/directories/categories";

/**
 * Generic adapter for directories we discover via `site:` search + page fetch.
 * Covers the majority of the registry. Directory-specific adapters can extend
 * this and override `buildQueries` or `isListingUrl`.
 */
export class SearchFetchAdapter implements DirectoryAdapter {
  constructor(public readonly def: DirectoryDefinition) {}

  eligibility(biz: CanonicalBusiness): Eligibility {
    if (!this.def.active) return { eligible: false, reason: "Directory inactive" };
    if (!this.def.eligibleCountries.includes(biz.country)) return { eligible: false, reason: "Country not supported" };
    if (this.def.eligibleCategories && !biz.categories.map(normalizeCategory).some((c) => this.def.eligibleCategories!.includes(c)))
      return { eligible: false, reason: `Only for ${this.def.eligibleCategories.map((c) => CATEGORIES[c as keyof typeof CATEGORIES] ?? c).join("; ")}` };
    if (biz.hideAddress && !this.def.allowsHiddenAddress)
      return { eligible: false, reason: "Requires a public street address" };
    return { eligible: true };
  }

  protected buildQueries(biz: CanonicalBusiness): string[] {
    const site = `site:${this.def.domains[0]}`;
    const q: string[] = [`${site} "${biz.name}" ${biz.city} ${biz.state}`];
    if (biz.phoneE164) {
      const national = formatNational(biz.phoneE164);
      if (national) q.push(`${site} "${national}"`);
    }
    if (biz.domain) q.push(`${site} "${biz.domain}"`);
    return q;
  }

  protected isListingUrl(url: string): boolean {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return this.def.domains.some((d) => host === d || host.endsWith("." + d));
    } catch {
      return false;
    }
  }

  async discover(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    const elig = this.eligibility(biz);
    if (!elig.eligible) {
      return {
        directoryId: this.def.id, state: "not_eligible", confidence: 1, diffs: [],
        evidence: { queries: [], candidates: [], source: "none", notes: elig.reason },
      };
    }

    const queries = this.buildQueries(biz);
    const seen = new Set<string>();
    const candidates: string[] = [];
    let searched = false;
    let totalHits = 0;
    for (const q of queries) {
      try {
        const hits = await ctx.search(q);
        searched = true;
        totalHits += hits.length;
        for (const h of hits) {
          const u = canonicalUrl(h.url);
          if (this.isListingUrl(u) && !seen.has(u)) { seen.add(u); candidates.push(u); }
        }
        // A full page of results with nothing on-site means the provider is ignoring `site:`;
        // further queries cost money and cannot help.
        if (hits.length >= 8 && candidates.length === 0) break;
      } catch (e) {
        ctx.log("search_error", { directory: this.def.id, q, error: String(e) });
      }
      if (candidates.length >= 5) break;
    }

    // Sanity: a `site:` query must return pages on that site. If the provider returned
    // results but none on-domain, the provider is degraded (redirect-wrapped URLs, ignored
    // operator). Report unable_to_verify rather than a false "not found".
    if (searched && candidates.length === 0 && totalHits > 0) {
      ctx.log("search_offsite_only", { directory: this.def.id, totalHits });
      return {
        directoryId: this.def.id, state: "unable_to_verify", confidence: 0, diffs: [],
        evidence: { queries, candidates: [], source: "none", notes: "Search provider returned no on-site results; cannot confirm absence" },
      };
    }

    let best: { url: string; match: MatchResult; obs: ObservedListing; source: "jsonld" | "html" | "llm" } | null = null;
    const scored: { url: string; score: number }[] = [];
    for (const url of candidates.slice(0, 5)) {
      const html = await ctx.fetchHtml(url);
      if (!html) { scored.push({ url, score: -1 }); continue; }
      let obs = extractJsonLd(html, url);
      let source: "jsonld" | "html" | "llm" = "jsonld";
      if (!obs) { obs = extractHeuristic(html, url); source = "html"; }
      if (!obs && ctx.extractWithLlm) { obs = await ctx.extractWithLlm(html, url); source = "llm"; }
      if (!obs) { scored.push({ url, score: 0 }); continue; }
      const match = matchListing(biz, obs);
      scored.push({ url, score: match.identity });
      if (!best || match.identity > best.match.identity) best = { url, match, obs, source };
    }

    const { state, confidence } = classify(best?.match ?? null, searched);
    return {
      directoryId: this.def.id,
      state,
      confidence,
      listingUrl: best && best.match.identity >= 0.5 ? best.url : undefined,
      observed: best?.obs,
      diffs: best && best.match.identity >= 0.8 ? best.match.diffs : [],
      evidence: { queries, candidates: scored, source: best?.source ?? "none", notes: best?.match.signals.join(",") },
    };
  }

  async verifyPublished(biz: CanonicalBusiness, listingUrl: string, ctx: AdapterContext): Promise<Finding> {
    const html = await ctx.fetchHtml(listingUrl);
    if (!html) {
      return { directoryId: this.def.id, state: "unable_to_verify", confidence: 0, listingUrl, diffs: [],
        evidence: { queries: [], candidates: [{ url: listingUrl, score: -1 }], source: "none" } };
    }
    const obs = extractJsonLd(html, listingUrl) ?? extractHeuristic(html, listingUrl);
    const match = obs ? matchListing(biz, obs) : null;
    const { state, confidence } = classify(match, true);
    return { directoryId: this.def.id, state, confidence, listingUrl, observed: obs ?? undefined,
      diffs: match?.diffs ?? [], evidence: { queries: [], candidates: [{ url: listingUrl, score: match?.identity ?? 0 }], source: obs ? "jsonld" : "none" } };
  }
}

function formatNational(e164: string): string | undefined {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return normalizePhone(e164);
}

function canonicalUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = ""; url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch { return u; }
}
