import * as cheerio from "cheerio";
import type { ObservedListing } from "@/lib/domain/types";

/**
 * Extract a LocalBusiness-like record from schema.org JSON-LD embedded in a page.
 * Most directories (Yelp, YP, BBB, Manta, Houzz…) ship this, which makes the
 * extraction deterministic and free. Returns null when nothing usable is found.
 */
export function extractJsonLd(html: string, url: string): ObservedListing | null {
  const $ = cheerio.load(html);
  const blocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      blocks.push(parsed);
    } catch {
      /* ignore malformed blocks */
    }
  });

  for (const node of flatten(blocks)) {
    if (!isBusinessNode(node)) continue;
    const addr = pickAddress(node);
    const out: ObservedListing = {
      url,
      name: str(node.name),
      phone: str(node.telephone),
      website: str(node.url) !== undefined && !sameHost(str(node.url)!, url) ? str(node.url) : str(node.sameAs?.[0]),
      street: addr?.streetAddress,
      city: addr?.addressLocality,
      state: addr?.addressRegion,
      postalCode: addr?.postalCode,
    };
    if (out.name || out.phone || out.street) return out;
  }
  return null;
}

/** Cheap HTML heuristics for pages without JSON-LD: tel: links, og:title, address tags. */
export function extractHeuristic(html: string, url: string): ObservedListing | null {
  const $ = cheerio.load(html);
  const tel = $('a[href^="tel:"]').first().attr("href")?.replace(/^tel:/, "");
  const name =
    $('meta[property="og:title"]').attr("content") ??
    $("h1").first().text().trim() ??
    $("title").text().trim();
  const address = $("address").first().text().replace(/\s+/g, " ").trim();
  if (!tel && !name) return null;
  return { url, name: name || undefined, phone: tel, street: address || undefined };
}

// ---------- helpers ----------

type JsonLdNode = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function flatten(blocks: unknown[]): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  const walk = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") {
      const o = n as JsonLdNode;
      out.push(o);
      if (Array.isArray(o["@graph"])) o["@graph"].forEach(walk);
      if (o.mainEntity) walk(o.mainEntity);
      if (o.itemListElement) walk(o.itemListElement);
      if (o.item) walk(o.item);
    }
  };
  blocks.forEach(walk);
  return out;
}

const BUSINESS_TYPES = /business|organization|store|restaurant|dentist|physician|plumber|electrician|contractor|service|hotel|school|place|company/i;

function isBusinessNode(n: JsonLdNode): boolean {
  const t = n["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && BUSINESS_TYPES.test(x)) && (n.name || n.telephone || n.address);
}

function pickAddress(n: JsonLdNode) {
  const a = Array.isArray(n.address) ? n.address[0] : n.address;
  if (!a || typeof a !== "object") return undefined;
  return {
    streetAddress: str(a.streetAddress),
    addressLocality: str(a.addressLocality),
    addressRegion: str(a.addressRegion),
    postalCode: str(a.postalCode),
  };
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  return undefined;
}

function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
}
