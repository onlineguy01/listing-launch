import type { CanonicalBusiness, FieldDiff, FindingState, ObservedListing } from "@/lib/domain/types";
import { nameTokens, normalizeDomain, normalizePhone, normalizePostal, normalizeState, normalizeStreet } from "./normalize";

export interface MatchResult {
  /** 0..1 — how confident we are that this listing IS the business. */
  identity: number;
  /** Fields that match / differ once identity is accepted. */
  diffs: FieldDiff[];
  signals: string[];
}

/** Two tokens count as the same word when both are 5+ chars and share their first five letters (electric/electrical, plumbing/plumbers). */
function sameToken(x: string, y: string): boolean {
  if (x === y) return true;
  if (x.length < 5 || y.length < 5) return false;
  return x.slice(0, 5) === y.slice(0, 5);
}

/** Token-set similarity (Jaccard on token sets, plus containment bonus), tolerant of word-form variants. */
export function nameSimilarity(a?: string | null, b?: string | null): number {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if ([...tb].some((u) => sameToken(t, u))) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);
  const containment = inter / Math.min(ta.size, tb.size);
  return Math.max(jaccard, containment * 0.9);
}

/**
 * Decide whether an observed listing is the same business, and what differs.
 *
 * Identity signals (strongest first): phone match, website domain match,
 * name + street match, name + city/postal match. A phone or domain match alone
 * is enough for high identity; name alone is never enough.
 */
export function matchListing(biz: CanonicalBusiness, obs: ObservedListing): MatchResult {
  const signals: string[] = [];
  let identity = 0;

  const bizPhone = biz.phoneE164;
  const obsPhone = normalizePhone(obs.phone, biz.country);
  const phoneMatch = !!bizPhone && !!obsPhone && bizPhone === obsPhone;
  if (phoneMatch) { identity = Math.max(identity, 0.92); signals.push("phone"); }

  const bizDomain = biz.domain ?? normalizeDomain(biz.website);
  const obsDomain = normalizeDomain(obs.website);
  const domainMatch = !!bizDomain && !!obsDomain && bizDomain === obsDomain;
  if (domainMatch) { identity = Math.max(identity, 0.9); signals.push("domain"); }

  const nameSim = nameSimilarity(biz.name, obs.name);
  const streetMatch = !!biz.street && !!obs.street && normalizeStreet(biz.street) === normalizeStreet(obs.street);
  const cityMatch = !!obs.city && obs.city.trim().toLowerCase() === biz.city.trim().toLowerCase();
  const postalMatch = !!biz.postalCode && !!obs.postalCode && normalizePostal(biz.postalCode) === normalizePostal(obs.postalCode);

  if (nameSim >= 0.8 && streetMatch) { identity = Math.max(identity, 0.88); signals.push("name+street"); }
  else if (nameSim >= 0.8 && (cityMatch || postalMatch)) { identity = Math.max(identity, 0.7); signals.push("name+city"); }
  else if (nameSim >= 0.6 && (cityMatch || postalMatch)) { identity = Math.max(identity, 0.5); signals.push("weak-name+city"); }
  else if (nameSim >= 0.8) { identity = Math.max(identity, 0.35); signals.push("name-only"); }

  // Corroboration bumps
  if (identity >= 0.7 && (phoneMatch || domainMatch) && nameSim >= 0.6) identity = Math.min(1, identity + 0.05);
  // Contradiction: a different phone lowers confidence, unless name + street pin the identity
  // (that is the classic "listing has an old phone number" correction we want to sell).
  const pinnedByAddress = nameSim >= 0.8 && streetMatch;
  if (bizPhone && obsPhone && !phoneMatch && !domainMatch && !pinnedByAddress) identity = Math.min(identity, 0.6);

  // Field diffs (only meaningful if identity accepted)
  const diffs: FieldDiff[] = [];
  if (obsPhone && bizPhone && !phoneMatch) diffs.push({ field: "phone", expected: bizPhone, observed: obsPhone });
  if (obs.name && nameSim < 0.8) diffs.push({ field: "name", expected: biz.name, observed: obs.name });
  if (!biz.hideAddress && obs.street && biz.street && !streetMatch)
    diffs.push({ field: "street", expected: biz.street, observed: obs.street });
  if (obs.city && !cityMatch) diffs.push({ field: "city", expected: biz.city, observed: obs.city });
  if (obs.state && normalizeState(obs.state) !== normalizeState(biz.state))
    diffs.push({ field: "state", expected: biz.state, observed: obs.state });
  if (obs.postalCode && biz.postalCode && !postalMatch)
    diffs.push({ field: "postalCode", expected: biz.postalCode, observed: obs.postalCode });
  if (obsDomain && bizDomain && !domainMatch) diffs.push({ field: "website", expected: bizDomain, observed: obsDomain });

  return { identity, diffs, signals };
}

export const IDENTITY_ACCEPT = 0.8;   // >= this: it's them
export const IDENTITY_POSSIBLE = 0.5; // between: needs review

/** Turn a best match into a finding state. `searched` = we completed discovery queries. */
export function classify(best: MatchResult | null, searched: boolean): { state: FindingState; confidence: number } {
  if (!searched) return { state: "unable_to_verify", confidence: 0 };
  if (!best) return { state: "not_found", confidence: 0.75 };
  if (best.identity >= IDENTITY_ACCEPT) {
    return best.diffs.length ? { state: "incorrect", confidence: best.identity } : { state: "verified_accurate", confidence: best.identity };
  }
  if (best.identity >= IDENTITY_POSSIBLE) return { state: "possible_match", confidence: best.identity };
  // Candidates existed but none plausibly the business → treat as not found, slightly less sure
  return { state: "not_found", confidence: 0.65 };
}
