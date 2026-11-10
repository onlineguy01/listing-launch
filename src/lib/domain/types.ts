// Core domain types shared by the scan engine, adapters, UI and database layer.

export type DiscoveryMethod = "api" | "search_fetch" | "none";
export type SubmissionMethod = "api" | "form" | "manual" | "none";

export type FindingState =
  | "verified_accurate"
  | "incorrect"
  | "not_found"
  | "possible_match"
  | "unable_to_verify"
  | "not_eligible";

export type SubmissionStatus =
  | "prepared"
  | "submitted"
  | "verification_required"
  | "published"
  | "rejected"
  | "not_eligible"
  | "failed";

export type OwnerTaskType = "email_confirm" | "sms_code" | "oauth" | "upload" | "review" | "other";

export type DirectoryTier = "maps" | "review" | "general" | "industry" | "local";

/** Weekly hours: day -> list of [open, close] in 24h "HH:MM". Empty list = closed. */
export type Hours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", [string, string][]>>;

/** The single source of truth we compare every directory against. */
export interface CanonicalBusiness {
  id: string;
  name: string;
  street?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string; // ISO-2
  phoneE164?: string;
  website?: string;
  domain?: string;
  categories: string[];
  hours?: Hours;
  hideAddress: boolean;
  googlePlaceId?: string;
  ownerEmail?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  logoUrl?: string;
  /** Cities / ZIPs served, for service-area businesses. */
  serviceArea?: string[];
  /** Owner-supplied list of services offered. Facts only; never invented. */
  services?: string[];
  yearFounded?: number;
  paymentMethods?: string[];
  /** Google Business Profile connection (owner-authorized OAuth). */
  googleRefreshTokenEnc?: string;
  googleAccountEmail?: string;
  googleLocationName?: string; // e.g. "locations/123"
  detailsCompletedAt?: string;
}

/** What we could read off a directory page or API response. All optional. */
export interface ObservedListing {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  hours?: Hours;
  url: string;
}

export interface FieldDiff {
  field: "name" | "phone" | "street" | "city" | "state" | "postalCode" | "website" | "hours";
  expected: string;
  observed: string;
}

export interface Evidence {
  queries: string[];
  candidates: { url: string; score: number }[];
  screenshotPath?: string;
  source: "api" | "jsonld" | "html" | "llm" | "none";
  notes?: string;
}

export interface Finding {
  directoryId: string;
  state: FindingState;
  confidence: number; // 0..1
  listingUrl?: string;
  observed?: ObservedListing;
  diffs: FieldDiff[];
  evidence: Evidence;
}

export interface DirectoryDefinition {
  id: string;
  name: string;
  homepage: string;
  domains: string[];
  tier: DirectoryTier;
  discovery: DiscoveryMethod;
  submission: SubmissionMethod;
  ownerActions: OwnerTaskType[];
  eligibleCategories?: string[]; // undefined = all
  eligibleCountries: string[];
  allowsHiddenAddress: boolean;
  externalFeeCents: number;
  basePriceCents: number;
  estHumanMinutes: number;
  active: boolean;
  notes?: string;
  /** URL of the "add your business" / claim page, for the ops task card. */
  submitUrl?: string;
}

export interface Eligibility {
  eligible: boolean;
  reason?: string;
}
