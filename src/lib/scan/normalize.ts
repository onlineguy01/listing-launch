import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Normalize any US/intl phone string to E.164, or undefined if unparseable. */
export function normalizePhone(input?: string | null, country = "US"): string | undefined {
  if (!input) return undefined;
  const p = parsePhoneNumberFromString(input, country as "US");
  return p?.isValid() ? p.number : undefined;
}

const LEGAL_SUFFIXES = /\b(llc|l\.l\.c\.|inc|inc\.|incorporated|corp|corp\.|corporation|co|co\.|ltd|ltd\.|limited|pllc|lp|llp|pc|dba)\b/g;
const PUNCT = /[^\p{L}\p{N}\s]/gu;
const STOP = new Set(["the", "and", "&", "of", "a", "an"]);

/** Lowercase, strip punctuation, legal suffixes and stop words. Returns token list. */
export function nameTokens(name?: string | null): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(PUNCT, " ")
    .replace(LEGAL_SUFFIXES, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

const STREET_ABBR: Record<string, string> = {
  street: "st", avenue: "ave", boulevard: "blvd", drive: "dr", road: "rd", lane: "ln",
  court: "ct", circle: "cir", place: "pl", parkway: "pkwy", highway: "hwy", suite: "ste",
  north: "n", south: "s", east: "e", west: "w", northeast: "ne", northwest: "nw",
  southeast: "se", southwest: "sw", apartment: "apt", building: "bldg", floor: "fl",
  expressway: "expy", freeway: "fwy", terrace: "ter", trail: "trl", way: "way",
};

/** Normalize a street line: lowercase, USPS-style abbreviations, no punctuation, single spaces. */
export function normalizeStreet(street?: string | null): string {
  if (!street) return "";
  return street
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => STREET_ABBR[w] ?? w)
    .join(" ");
}

/** Extract bare registrable host from a URL or domain string ("https://www.Foo.com/x" -> "foo.com"). */
export function normalizeDomain(input?: string | null): string | undefined {
  if (!input) return undefined;
  let s = input.trim().toLowerCase();
  if (!/^https?:\/\//.test(s)) s = "https://" + s;
  try {
    const host = new URL(s).hostname.replace(/^www\./, "");
    return host || undefined;
  } catch {
    return undefined;
  }
}

export function normalizePostal(p?: string | null): string {
  return (p ?? "").trim().slice(0, 5);
}

export function normalizeState(s?: string | null): string {
  if (!s) return "";
  const t = s.trim().toLowerCase();
  return STATE_MAP[t] ?? t.toUpperCase().slice(0, 2);
}

const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

/** Format E.164 for display: +12145550100 -> (214) 555-0100. Non-US falls back to international format. */
export function formatPhoneDisplay(e164?: string | null): string {
  if (!e164) return "";
  const p = parsePhoneNumberFromString(e164);
  if (!p) return e164;
  return p.country === "US" ? p.formatNational() : p.formatInternational();
}
