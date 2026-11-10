/**
 * Industry taxonomy. Each business gets exactly one. Industry packs and
 * directory eligibility rules reference these ids.
 */
export const CATEGORIES = {
  restaurant: "Restaurant, café or bar",
  hotel_travel: "Hotel, lodging or travel",
  home_services: "Home services and trades (plumbing, HVAC, roofing, cleaning, remodeling)",
  healthcare: "Healthcare, physicians and clinics",
  dental: "Dental",
  legal: "Legal",
  real_estate: "Real estate",
  auto_dealer: "Auto dealer",
  auto_repair: "Auto repair and body shop",
  beauty: "Beauty, salon or spa",
  fitness: "Fitness and wellness",
  pet: "Pet services",
  weddings_events: "Weddings and events",
  childcare_education: "Childcare and education",
  senior_care: "Senior care",
  financial: "Financial and accounting",
  b2b_agency: "Agency or consultant (B2B)",
  software_it: "Software and IT services",
  manufacturing: "Manufacturing and industrial",
  nonprofit: "Nonprofit",
  cannabis: "Cannabis",
  moving_storage: "Moving and storage",
  creative: "Photographer or creative",
  religious: "Church or religious organization",
  funeral: "Funeral services",
  retail: "Retail store",
  professional_services: "Other professional services",
  other: "Other local business",
} as const;

export type CategoryId = keyof typeof CATEGORIES;

/** Older ids still present in stored records. */
const LEGACY: Record<string, CategoryId> = { health: "healthcare", automotive: "auto_repair" };
export function normalizeCategory(id: string): CategoryId {
  if (id in CATEGORIES) return id as CategoryId;
  return LEGACY[id] ?? "other";
}

/** Map Google Places `types` to our taxonomy. First match wins. */
const PLACE_TYPE_MAP: [RegExp, CategoryId][] = [
  [/dentist|dental/i, "dental"],
  [/doctor|physician|hospital|clinic|physiotherapist|chiropractor|pharmacy|medical/i, "healthcare"],
  [/lawyer|attorney|legal/i, "legal"],
  [/plumber|electrician|roofing|hvac|contractor|painter|locksmith|cleaning|landscap|pest|handyman|remodel/i, "home_services"],
  [/moving_company|storage/i, "moving_storage"],
  [/car_dealer|auto_dealer/i, "auto_dealer"],
  [/car_repair|auto_repair|tire|car_wash|body_shop|mechanic/i, "auto_repair"],
  [/hair|beauty|nail|salon|barber|spa/i, "beauty"],
  [/gym|fitness|yoga|pilates|wellness/i, "fitness"],
  [/veterinar|pet_store|pet|groom|kennel|dog/i, "pet"],
  [/wedding|event_venue|banquet|florist|caterer/i, "weddings_events"],
  [/child_care|preschool|school|tutor|daycare|education/i, "childcare_education"],
  [/senior|assisted_living|nursing_home|elder/i, "senior_care"],
  [/accounting|tax|financial|insurance|bank|advisor/i, "financial"],
  [/lodging|hotel|motel|resort|hostel|campground|travel_agency/i, "hotel_travel"],
  [/restaurant|cafe|bar|bakery|food|meal|coffee|pub|brewery/i, "restaurant"],
  [/real_estate|realtor|property|apartment/i, "real_estate"],
  [/church|place_of_worship|mosque|synagogue|temple/i, "religious"],
  [/funeral|cemetery|cremat/i, "funeral"],
  [/cannabis|dispensary/i, "cannabis"],
  [/photograph|video|studio|design/i, "creative"],
  [/marketing|advertising|consult|agency/i, "b2b_agency"],
  [/software|it_|computer|technology/i, "software_it"],
  [/manufactur|industrial|factory|wholesale/i, "manufacturing"],
  [/non_profit|charity|foundation/i, "nonprofit"],
  [/store|shop|retail|market|boutique/i, "retail"],
];

export function categoryFromPlaceTypes(types: string[]): CategoryId {
  for (const t of types) for (const [re, cat] of PLACE_TYPE_MAP) if (re.test(t)) return cat;
  return "other";
}
