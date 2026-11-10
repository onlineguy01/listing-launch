import type { CanonicalBusiness, ObservedListing } from "@/lib/domain/types";
import type { SiteSearchConfig } from "./siteSearchAdapter";
import * as cheerio from "cheerio";
import { extractJsonLdAll } from "@/lib/scan/extract";

const q = (s: string) => encodeURIComponent(s).replace(/%20/g, "+");
const loc = (b: CanonicalBusiness) => `${b.city}, ${b.state}`;

/** Yellow Pages: results page embeds one LocalBusiness JSON-LD node per result. */
export const yellowpages: SiteSearchConfig = {
  searchUrl: (b) => `https://www.yellowpages.com/search?search_terms=${q(b.name)}&geo_location_terms=${q(loc(b))}`,
  listingLink: /href="(\/[a-z0-9-]+\/mip\/[a-z0-9-]+)"/i,
  maxDetailFetches: 3,
};

/** Superpages: results page embeds an ItemList of LocalBusiness nodes. */
export const superpages: SiteSearchConfig = {
  searchUrl: (b) => `https://www.superpages.com/search?search_terms=${q(b.name)}&geo_location_terms=${q(loc(b))}`,
  listingLink: /href="(\/[a-z0-9-]+\/bpp\/[a-z0-9-]+)"/i,
  maxDetailFetches: 3,
};

/** MerchantCircle: results page has listing links; listing pages carry schema.org microdata. */
export const merchantcircle: SiteSearchConfig = {
  searchUrl: (b) => `https://www.merchantcircle.com/search?q=${q(b.name)}&qn=${q(loc(b))}`,
  listingLink: /href="(https:\/\/www\.merchantcircle\.com\/[a-z0-9-]+-[a-z]{2})"/i,
  extractResults: () => [], // force link-based discovery; results page has no structured data
  maxDetailFetches: 3,
};

/**
 * BBB serves two renderings of its results page: one with a SearchResultsPage
 * JSON-LD ItemList (name, address, phone, profile URL per result) and one with
 * server-rendered result cards. Try the structured data first, then the cards.
 * Profile pages sit behind a bot challenge, so we never fetch them.
 */
export const bbb: SiteSearchConfig = {
  searchUrl: (b) => `https://www.bbb.org/search?find_country=USA&find_text=${q(b.name)}&find_loc=${q(loc(b))}`,
  detailBlocked: true,
  extractResults: (html, pageUrl) => {
    const structured = extractJsonLdAll(html, pageUrl).filter((o) => /\/profile\//.test(o.url));
    if (structured.length) return structured;
    const $ = cheerio.load(html);
    const out: ObservedListing[] = [];
    const seen = new Set<string>();
    $(".result-card").each((_, card) => {
      const $c = $(card);
      const a = $c.find('a[href*="/profile/"]').first();
      const href = a.attr("href") ?? "";
      if (!href) return;
      const url = (href.startsWith("http") ? href : `https://www.bbb.org${href}`).split("?")[0].replace(/\/addressId\/\d+$/, "");
      if (seen.has(url)) return;
      seen.add(url);
      const name = ($c.find(".result-business-name").first().text() || a.text()).replace(/\s+/g, " ").trim();
      const info = $c.find(".result-business-info").text().replace(/\s+/g, " ").trim();
      const phone = /\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/.exec($c.text())?.[0];
      const m = /bbb\.org\/us\/([a-z]{2})\/([a-z-]+)\/profile\//i.exec(url);
      // info is typically "Category, Street, City, ST ZIP" — take the part that looks like a street.
      const street = info.split(",").map((x) => x.trim()).find((x) => /^\d+\s/.test(x));
      const zip = /\b\d{5}\b/.exec(info)?.[0];
      out.push({ url, name, phone, street, postalCode: zip, city: m ? m[2].replace(/-/g, " ") : undefined, state: m ? m[1].toUpperCase() : undefined });
    });
    return out;
  },
};
