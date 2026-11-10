import type { NicheSite } from "@/lib/domain/types";

/**
 * Curated, ops-approved niche sites. Seeded into niche_sites with `npm run seed:niches`.
 * These are the sites a generic industry pack would not justify showing to everyone in
 * the industry, but that matter a great deal for the niche.
 */
export type NicheSeed = Omit<NicheSite, "id" | "createdAt" | "probe" | "status" | "source">;

const roofing: NicheSeed[] = [
  { niche: "roofing contractor", name: "NRCA member directory", host: "www.nrca.net", url: "https://www.nrca.net/", kind: "association", who: "you", note: "National Roofing Contractors Association. Membership; member directory listing." },
  { niche: "roofing contractor", name: "RCAT member directory", host: "www.rcat.net", url: "https://www.rcat.net/", kind: "association", who: "you", note: "Roofing Contractors Association of Texas. Membership and licensing program; the Texas roofing credential." },
  { niche: "roofing contractor", name: "GAF Certified Contractor locator", host: "www.gaf.com", url: "https://www.gaf.com/en-us/roofing-contractors", kind: "profile", who: "you", note: "Manufacturer certification (Certified, Master Elite). Listed once certified." },
  { niche: "roofing contractor", name: "Owens Corning Preferred Contractor locator", host: "www.owenscorning.com", url: "https://www.owenscorning.com/en-us/roofing/contractors", kind: "profile", who: "you", note: "Manufacturer certification program." },
  { niche: "roofing contractor", name: "CertainTeed credentialed contractor locator", host: "www.certainteed.com", url: "https://www.certainteed.com/find-a-pro/", kind: "profile", who: "you", note: "Manufacturer credential program." },
];

const agency: NicheSeed[] = [
  { niche: "digital marketing agency", name: "Semrush Agency Partners", host: "www.semrush.com", url: "https://www.semrush.com/agencies/", kind: "profile", who: "you", note: "Partner directory; requires Semrush agency certification." },
  { niche: "digital marketing agency", name: "Google Partners directory", host: "www.google.com", url: "https://www.google.com/partners/", kind: "profile", who: "you", note: "Requires Google Ads certification and spend thresholds." },
  { niche: "digital marketing agency", name: "HubSpot Solutions Directory", host: "ecosystem.hubspot.com", url: "https://ecosystem.hubspot.com/marketplace/solutions", kind: "profile", who: "you", note: "Requires HubSpot solutions partner membership." },
  { niche: "digital marketing agency", name: "Meta Business Partners directory", host: "www.facebook.com", url: "https://www.facebook.com/business/partner-directory", kind: "profile", who: "you", note: "Requires Meta Business Partner status." },
];

/** Aliases so classification variants land on the same curated set. */
export const NICHE_ALIASES: Record<string, string> = {
  roofer: "roofing contractor", roofing: "roofing contractor", "roofing company": "roofing contractor", "commercial roofing contractor": "roofing contractor", "residential roofing": "roofing contractor",
  "marketing agency": "digital marketing agency", "seo agency": "digital marketing agency", "web design agency": "digital marketing agency", "advertising agency": "digital marketing agency",
};

export const NICHE_SEEDS: NicheSeed[] = [...roofing, ...agency];
