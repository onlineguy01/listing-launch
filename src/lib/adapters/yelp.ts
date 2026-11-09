import type { CanonicalBusiness, Finding, ObservedListing } from "@/lib/domain/types";
import type { AdapterContext } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { classify, matchListing } from "@/lib/scan/match";

/**
 * Yelp discovery via the Fusion API phone search (exact) with a name/location
 * search fallback. Requires YELP_API_KEY; otherwise falls back to search+fetch.
 */
export class YelpAdapter extends SearchFetchAdapter {
  async discover(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    const key = process.env.YELP_API_KEY;
    if (!key) return super.discover(biz, ctx);
    const elig = this.eligibility(biz);
    if (!elig.eligible) return super.discover(biz, ctx);

    const headers = { Authorization: `Bearer ${key}` };
    const queries: string[] = [];
    const results: YelpBusiness[] = [];
    try {
      if (biz.phoneE164) {
        queries.push(`phone:${biz.phoneE164}`);
        const r = await fetch(`https://api.yelp.com/v3/businesses/search/phone?phone=${encodeURIComponent(biz.phoneE164)}`, { headers });
        if (r.ok) results.push(...(((await r.json()) as { businesses?: YelpBusiness[] }).businesses ?? []));
      }
      if (!results.length) {
        const loc = `${biz.city}, ${biz.state}`;
        queries.push(`term:${biz.name} location:${loc}`);
        const r = await fetch(
          `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(biz.name)}&location=${encodeURIComponent(loc)}&limit=5`,
          { headers },
        );
        if (r.ok) results.push(...(((await r.json()) as { businesses?: YelpBusiness[] }).businesses ?? []));
      }
    } catch (e) {
      ctx.log("yelp_error", String(e));
      return { directoryId: this.def.id, state: "unable_to_verify", confidence: 0, diffs: [],
        evidence: { queries, candidates: [], source: "none", notes: String(e) } };
    }

    let best: { obs: ObservedListing; match: ReturnType<typeof matchListing> } | null = null;
    const candidates: { url: string; score: number }[] = [];
    for (const b of results) {
      const obs: ObservedListing = {
        url: b.url.split("?")[0], name: b.name, phone: b.phone,
        street: b.location?.address1, city: b.location?.city, state: b.location?.state, postalCode: b.location?.zip_code,
      };
      const match = matchListing(biz, obs);
      candidates.push({ url: obs.url, score: match.identity });
      if (!best || match.identity > best.match.identity) best = { obs, match };
    }
    const { state, confidence } = classify(best?.match ?? null, true);
    return {
      directoryId: this.def.id, state, confidence,
      listingUrl: best && best.match.identity >= 0.5 ? best.obs.url : undefined,
      observed: best?.obs, diffs: best && best.match.identity >= 0.8 ? best.match.diffs : [],
      evidence: { queries, candidates, source: "api", notes: best?.match.signals.join(",") },
    };
  }
}

interface YelpBusiness {
  id: string; name: string; url: string; phone?: string;
  location?: { address1?: string; city?: string; state?: string; zip_code?: string };
}
