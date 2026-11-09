/**
 * Our small internal category taxonomy. Google Places types and user-facing
 * labels map onto these; directory eligibility rules reference them.
 */
export const CATEGORIES = {
  home_services: "Home services (plumbing, HVAC, roofing, cleaning, remodeling…)",
  professional_services: "Professional services (law, accounting, consulting, insurance)",
  health: "Health and wellness (dental, chiropractic, med spa, fitness)",
  restaurant: "Restaurant, bar or cafe",
  retail: "Retail store",
  automotive: "Automotive",
  beauty: "Beauty and personal care",
  real_estate: "Real estate",
  other: "Other local business",
} as const;

export type CategoryId = keyof typeof CATEGORIES;

/** Map Google Places `types` to our taxonomy. First match wins. */
const PLACE_TYPE_MAP: [RegExp, CategoryId][] = [
  [/plumber|electrician|roofing|hvac|contractor|painter|locksmith|moving|cleaning|landscap|pest/i, "home_services"],
  [/lawyer|accounting|insurance|consult|finance|notary/i, "professional_services"],
  [/dentist|doctor|physio|chiro|spa|gym|health|clinic|pharmacy/i, "health"],
  [/restaurant|cafe|bar|bakery|food|meal/i, "restaurant"],
  [/store|shop|retail|market/i, "retail"],
  [/car_|auto|tire|mechanic/i, "automotive"],
  [/hair|beauty|nail|salon|barber/i, "beauty"],
  [/real_estate|realtor|property/i, "real_estate"],
];

export function categoryFromPlaceTypes(types: string[]): CategoryId {
  for (const t of types) {
    for (const [re, cat] of PLACE_TYPE_MAP) if (re.test(t)) return cat;
  }
  return "other";
}
