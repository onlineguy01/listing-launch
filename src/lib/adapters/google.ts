import type { CanonicalBusiness, Finding, ObservedListing } from "@/lib/domain/types";
import type { AdapterContext } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { classify, matchListing } from "@/lib/scan/match";

/**
 * Google Business Profile discovery via the Places API (New) Text Search.
 * Requires GOOGLE_PLACES_API_KEY. Without it, falls back to search+fetch.
 */
export class GooglePlacesAdapter extends SearchFetchAdapter {
  async discover(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding> {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return super.discover(biz, ctx);

    const elig = this.eligibility(biz);
    if (!elig.eligible) return super.discover(biz, ctx);

    const query = `${biz.name} ${biz.street ?? ""} ${biz.city} ${biz.state}`.trim();
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.addressComponents",
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 5, regionCode: biz.country }),
      });
      if (!res.ok) throw new Error(`Places ${res.status}`);
      const data = (await res.json()) as { places?: GooglePlace[] };
      const places = data.places ?? [];
      let best: { obs: ObservedListing; match: ReturnType<typeof matchListing> } | null = null;
      const candidates: { url: string; score: number }[] = [];
      for (const p of places) {
        const obs = placeToObserved(p);
        const match = matchListing(biz, obs);
        candidates.push({ url: obs.url, score: match.identity });
        if (!best || match.identity > best.match.identity) best = { obs, match };
      }
      const { state, confidence } = classify(best?.match ?? null, true);
      return {
        directoryId: this.def.id, state, confidence,
        listingUrl: best && best.match.identity >= 0.5 ? best.obs.url : undefined,
        observed: best?.obs, diffs: best && best.match.identity >= 0.8 ? best.match.diffs : [],
        evidence: { queries: [query], candidates, source: "api", notes: best?.match.signals.join(",") },
      };
    } catch (e) {
      ctx.log("google_places_error", String(e));
      return { directoryId: this.def.id, state: "unable_to_verify", confidence: 0, diffs: [],
        evidence: { queries: [query], candidates: [], source: "none", notes: String(e) } };
    }
  }
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
}

function placeToObserved(p: GooglePlace): ObservedListing {
  const comp = (t: string) => p.addressComponents?.find((c) => c.types.includes(t));
  const num = comp("street_number")?.longText;
  const route = comp("route")?.longText;
  return {
    url: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    name: p.displayName?.text,
    phone: p.nationalPhoneNumber,
    website: p.websiteUri,
    street: [num, route].filter(Boolean).join(" ") || undefined,
    city: comp("locality")?.longText,
    state: comp("administrative_area_level_1")?.shortText,
    postalCode: comp("postal_code")?.longText,
  };
}
