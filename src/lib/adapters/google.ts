import type { CanonicalBusiness, Finding, ObservedListing } from "@/lib/domain/types";
import type { AdapterContext } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { classify, matchListing, type MatchResult } from "@/lib/scan/match";

/**
 * Google Business Profile discovery. Three paths, best available first:
 *  1. Places API (New) Text Search       — GOOGLE_PLACES_API_KEY
 *  2. DataForSEO Business Listings DB    — DATAFORSEO_LOGIN/PASSWORD (Google Maps data, ~1¢/query)
 *  3. Generic site: search + fetch        — fallback
 */
export class GooglePlacesAdapter extends SearchFetchAdapter {
  async discover(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    const elig = this.eligibility(biz);
    if (!elig.eligible) return super.discover(biz, ctx);
    if (process.env.GOOGLE_PLACES_API_KEY) return this.viaPlaces(biz, ctx);
    if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) return this.viaListingsDb(biz, ctx);
    return super.discover(biz, ctx);
  }

  private finish(biz: CanonicalBusiness, observed: ObservedListing[], queries: string[], notes?: string): Finding {
    let best: { obs: ObservedListing; match: MatchResult } | null = null;
    const candidates: { url: string; score: number }[] = [];
    for (const obs of observed) {
      const match = matchListing(biz, obs);
      candidates.push({ url: obs.url, score: match.identity });
      if (!best || match.identity > best.match.identity) best = { obs, match };
    }
    const { state, confidence } = classify(best?.match ?? null, true);
    return {
      directoryId: this.def.id, state, confidence,
      listingUrl: best && best.match.identity >= 0.5 ? best.obs.url : undefined,
      observed: best?.obs, diffs: best && best.match.identity >= 0.8 ? best.match.diffs : [],
      evidence: { queries, candidates, source: "api", notes: [notes, best?.match.signals.join(",")].filter(Boolean).join(" ") },
    };
  }

  private unable(queries: string[], err: unknown): Finding {
    return { directoryId: this.def.id, state: "unable_to_verify", confidence: 0, diffs: [],
      evidence: { queries, candidates: [], source: "none", notes: String(err) } };
  }

  private async viaPlaces(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    const query = `${biz.name} ${biz.street ?? ""} ${biz.city} ${biz.state}`.trim();
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.addressComponents",
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 5, regionCode: biz.country }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Places ${res.status}`);
      const data = (await res.json()) as { places?: GooglePlace[] };
      return this.finish(biz, (data.places ?? []).map(placeToObserved), [query], "places-api");
    } catch (e) {
      ctx.log("google_places_error", String(e));
      return this.unable([query], e);
    }
  }

  private async viaListingsDb(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    if (!biz.city?.trim()) return this.unable([], "city needed to look up the Google listing");
    const title = biz.name.replace(/[%_]/g, " ").trim();
    const filters: unknown[] = [["title", "like", `%${title}%`], "and", ["address_info.city", "=", biz.city]];
    const query = `dataforseo:business_listings title~"${title}" city=${biz.city}`;
    try {
      const auth = "Basic " + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
      const r = await fetch("https://api.dataforseo.com/v3/business_data/business_listings/search/live", {
        method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify([{ filters, limit: 10 }]), signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`dataforseo ${r.status}`);
      const j = (await r.json()) as { tasks?: { status_code: number; status_message?: string; result?: { items?: ListingItem[] }[] }[] };
      const task = j.tasks?.[0];
      if (!task || task.status_code !== 20000) throw new Error(`dataforseo task ${task?.status_code}: ${task?.status_message}`);
      const items = task.result?.[0]?.items ?? [];
      const observed: ObservedListing[] = items.map((i) => ({
        url: i.place_id ? `https://www.google.com/maps/place/?q=place_id:${i.place_id}` : `https://www.google.com/maps/search/${encodeURIComponent(i.title ?? "")}`,
        name: i.title, phone: i.phone, website: i.url,
        street: i.address_info?.address, city: i.address_info?.city, state: i.address_info?.region, postalCode: i.address_info?.zip,
      }));
      return this.finish(biz, observed, [query], "listings-db");
    } catch (e) {
      ctx.log("google_listings_db_error", String(e));
      return this.unable([query], e);
    }
  }
}

interface ListingItem {
  title?: string; phone?: string; url?: string; place_id?: string;
  address_info?: { address?: string; city?: string; zip?: string; region?: string; country_code?: string };
}

interface GooglePlace {
  id: string; displayName?: { text: string }; formattedAddress?: string; nationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
}

function placeToObserved(p: GooglePlace): ObservedListing {
  const comp = (t: string) => p.addressComponents?.find((c) => c.types.includes(t));
  const num = comp("street_number")?.longText;
  const route = comp("route")?.longText;
  return {
    url: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    name: p.displayName?.text, phone: p.nationalPhoneNumber, website: p.websiteUri,
    street: [num, route].filter(Boolean).join(" ") || undefined,
    city: comp("locality")?.longText, state: comp("administrative_area_level_1")?.shortText, postalCode: comp("postal_code")?.longText,
  };
}
