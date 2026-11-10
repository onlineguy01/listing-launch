import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SiteSearchAdapter } from "./siteSearchAdapter";
import * as site from "./siteSearchConfigs";
import { getDirectory } from "@/lib/directories/registry";
import type { CanonicalBusiness } from "@/lib/domain/types";
import type { AdapterContext } from "./types";

const fx = (name: string) => readFileSync(path.join(__dirname, "__fixtures__", name), "utf8");

/** Fake context: serves fixture HTML by URL pattern, records fetches. */
function ctx(routes: [RegExp, string][]): AdapterContext & { fetched: string[] } {
  const fetched: string[] = [];
  return {
    fetched,
    search: async () => { throw new Error("search should not be used by site-search adapters"); },
    fetchHtml: async (url) => { fetched.push(url); const r = routes.find(([re]) => re.test(url)); return r ? r[1] : null; },
    log: () => {},
  };
}

const zoo: CanonicalBusiness = {
  id: "z", name: "Dallas Zoo", street: "650 S R L Thornton Fwy", city: "Dallas", state: "TX", postalCode: "75203", country: "US",
  phoneE164: "+14695547501", website: "https://www.dallaszoo.com", domain: "dallaszoo.com", categories: ["other"], hideAddress: false,
};

describe("site-search adapters against real page fixtures", () => {
  it("Yellow Pages: finds the listing from results-page JSON-LD with no detail fetch", async () => {
    const a = new SiteSearchAdapter(getDirectory("yellowpages"), site.yellowpages);
    const c = ctx([[/yellowpages\.com\/search/, fx("yellowpages-search.html")]]);
    const f = await a.discover(zoo, c);
    expect(f.state).toBe("verified_accurate");
    expect(f.listingUrl).toBe("https://www.yellowpages.com/dallas-tx/mip/dallas-zoo-455895047");
    expect(f.confidence).toBeGreaterThanOrEqual(0.9);
    expect(c.fetched).toHaveLength(1);
    expect(f.evidence.candidates.length).toBeGreaterThan(1); // other zoos were scored and rejected
  });

  it("Yellow Pages: reports a wrong phone as a correction, not a miss", async () => {
    const a = new SiteSearchAdapter(getDirectory("yellowpages"), site.yellowpages);
    const f = await a.discover({ ...zoo, phoneE164: "+14695559999" }, ctx([[/yellowpages\.com\/search/, fx("yellowpages-search.html")]]));
    expect(f.state).toBe("incorrect");
    expect(f.diffs.map((d) => d.field)).toEqual(["phone"]);
  });

  it("Superpages: finds the listing from the ItemList JSON-LD", async () => {
    const a = new SiteSearchAdapter(getDirectory("superpages"), site.superpages);
    const f = await a.discover(zoo, ctx([[/superpages\.com\/search/, fx("superpages-search.html")]]));
    expect(f.state).toBe("verified_accurate");
    expect(f.listingUrl).toBe("https://www.superpages.com/dallas-tx/bpp/dallas-zoo-455895047");
  });

  it("MerchantCircle: follows the best-named listing link and reads microdata", async () => {
    const a = new SiteSearchAdapter(getDirectory("merchantcircle"), site.merchantcircle);
    const c = ctx([[/merchantcircle\.com\/search/, fx("merchantcircle-search.html")], [/merchantcircle\.com\/dallas-zoo-dallas-tx$/, fx("merchantcircle-listing.html")]]);
    const f = await a.discover(zoo, c);
    expect(c.fetched[1]).toBe("https://www.merchantcircle.com/dallas-zoo-dallas-tx"); // ranked first by slug similarity
    expect(f.listingUrl).toBe("https://www.merchantcircle.com/dallas-zoo-dallas-tx");
    // The MerchantCircle page lists a different phone (214-670-6826) but the same street: identified, phone flagged.
    expect(["incorrect", "verified_accurate"]).toContain(f.state);
    expect(f.observed?.street?.trim()).toBe("650 S R L Thornton Fwy");
  });

  it("BBB: extracts name, phone and city from result cards without fetching profiles", async () => {
    const a = new SiteSearchAdapter(getDirectory("bbb"), site.bbb);
    const baker: CanonicalBusiness = { id: "b", name: "Baker Brothers Plumbing, Air & Electric", city: "Mesquite", state: "TX", country: "US", phoneE164: "+19723710082", categories: ["home_services"], hideAddress: false };
    const c = ctx([[/bbb\.org\/search/, fx("bbb-search.html")]]);
    const f = await a.discover(baker, c);
    expect(c.fetched).toHaveLength(1);
    expect(f.state).toBe("verified_accurate");
    expect(f.listingUrl).toMatch(/bbb\.org\/us\/tx\/mesquite\/profile\/plumber\/baker-brothers/);
    expect(f.evidence.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it("BBB (JSON-LD rendering): reads the SearchResultsPage ItemList and strips <em> highlight tags", async () => {
    const a = new SiteSearchAdapter(getDirectory("bbb"), site.bbb);
    const baker: CanonicalBusiness = { id: "b", name: "Baker Brothers Plumbing, Air & Electric", street: "2615 Big Town Blvd", city: "Mesquite", state: "TX", postalCode: "75150", country: "US", phoneE164: "+19723710082", categories: ["home_services"], hideAddress: false };
    const f = await a.discover(baker, ctx([[/bbb\.org\/search/, fx("bbb-search-jsonld.html")]]));
    expect(f.state).toBe("verified_accurate");
    expect(f.observed?.name).toBe("Baker Brothers Plumbing, Air & Electric");
    expect(f.listingUrl).toBe("https://www.bbb.org/us/tx/mesquite/profile/plumber/baker-brothers-plumbing-air-electric-0875-30000632");
  });

  it("reports unable_to_verify when the directory blocks the fetch, never not_found", async () => {
    const a = new SiteSearchAdapter(getDirectory("yellowpages"), site.yellowpages);
    const f = await a.discover(zoo, ctx([]));
    expect(f.state).toBe("unable_to_verify");
  });

  it("reports not_found with higher confidence when the directory's own search has no match", async () => {
    const a = new SiteSearchAdapter(getDirectory("superpages"), site.superpages);
    const f = await a.discover({ ...zoo, name: "Zzyzx Widget Emporium", phoneE164: "+12145550000", website: undefined, domain: undefined, street: "1 Nowhere Ln" }, ctx([[/superpages\.com\/search/, fx("superpages-search.html")]]));
    expect(f.state).toBe("not_found");
    expect(f.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

describe("SERP sanity in the generic adapter", () => {
  it("returns unable_to_verify when a site: search yields only off-site results", async () => {
    const { SearchFetchAdapter } = await import("./searchFetchAdapter");
    const a = new SearchFetchAdapter(getDirectory("facebook"));
    const c: AdapterContext = { search: async () => [{ url: "https://google.com/goto?url=abc" }, { url: "https://shutterstock.com/x" }], fetchHtml: async () => null, log: () => {} };
    const f = await a.discover(zoo, c);
    expect(f.state).toBe("unable_to_verify");
    expect(f.evidence.notes).toMatch(/no on-site results/);
  });
});
