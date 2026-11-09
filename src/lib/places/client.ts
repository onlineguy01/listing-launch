import { categoryFromPlaceTypes } from "@/lib/directories/categories";

/** Server-side wrappers around Google Places API (New). Key never reaches the browser. */

const KEY = () => process.env.GOOGLE_PLACES_API_KEY;
export const placesEnabled = () => !!KEY();

export interface Suggestion { placeId: string; mainText: string; secondaryText: string }

export async function autocomplete(input: string, sessionToken?: string): Promise<Suggestion[]> {
  const key = KEY();
  if (!key || input.trim().length < 2) return [];
  const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({
      input, includedPrimaryTypes: ["establishment"], includedRegionCodes: ["us"],
      sessionToken, languageCode: "en",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`autocomplete ${r.status}`);
  const j = (await r.json()) as { suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[] };
  return (j.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ placeId: p.placeId, mainText: p.structuredFormat?.mainText?.text ?? "", secondaryText: p.structuredFormat?.secondaryText?.text ?? "" }));
}

export interface PlaceDetails {
  placeId: string; name: string; street?: string; city?: string; state?: string; postalCode?: string;
  phone?: string; website?: string; category: string; hours?: Record<string, [string, string][]>;
}

export async function placeDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails | null> {
  const key = KEY();
  if (!key) return null;
  const u = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) u.searchParams.set("sessionToken", sessionToken);
  const r = await fetch(u, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,addressComponents,nationalPhoneNumber,websiteUri,types,regularOpeningHours",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`details ${r.status}`);
  const p = (await r.json()) as {
    id: string; displayName?: { text: string }; nationalPhoneNumber?: string; websiteUri?: string; types?: string[];
    addressComponents?: { longText: string; shortText: string; types: string[] }[];
    regularOpeningHours?: { periods?: { open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }[] };
  };
  const comp = (t: string) => p.addressComponents?.find((c) => c.types.includes(t));
  const street = [comp("street_number")?.longText, comp("route")?.longText].filter(Boolean).join(" ") || undefined;
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const hours: Record<string, [string, string][]> = {};
  for (const per of p.regularOpeningHours?.periods ?? []) {
    const d = days[per.open.day];
    const fmt = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    (hours[d] ??= []).push([fmt(per.open.hour, per.open.minute), per.close ? fmt(per.close.hour, per.close.minute) : "23:59"]);
  }
  return {
    placeId: p.id, name: p.displayName?.text ?? "", street, city: comp("locality")?.longText,
    state: comp("administrative_area_level_1")?.shortText, postalCode: comp("postal_code")?.longText,
    phone: p.nationalPhoneNumber, website: p.websiteUri, category: categoryFromPlaceTypes(p.types ?? []),
    hours: Object.keys(hours).length ? hours : undefined,
  };
}
