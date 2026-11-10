import { describe, expect, it } from "vitest";
import { matchListing, nameSimilarity, classify } from "./match";
import { normalizePhone, normalizeStreet, normalizeDomain, nameTokens } from "./normalize";
import { extractJsonLd } from "./extract";
import { buildQuote } from "./quote";
import type { CanonicalBusiness, Finding } from "@/lib/domain/types";

const biz: CanonicalBusiness = {
  id: "b1", name: "Lone Star Plumbing LLC", street: "4521 North Beltline Road, Suite 200", city: "Irving", state: "TX",
  postalCode: "75038", country: "US", phoneE164: "+12145550100", website: "https://www.lonestarplumbingtx.com",
  domain: "lonestarplumbingtx.com", categories: ["home_services"], hideAddress: false,
};

describe("normalize", () => {
  it("phones to E.164", () => {
    expect(normalizePhone("(214) 555-0100")).toBe("+12145550100");
    expect(normalizePhone("214.555.0100")).toBe("+12145550100");
    expect(normalizePhone("not a phone")).toBeUndefined();
  });
  it("streets with USPS abbreviations", () => {
    expect(normalizeStreet("4521 North Beltline Road, Suite 200")).toBe("4521 n beltline rd ste 200");
    expect(normalizeStreet("4521 N. Beltline Rd Ste 200")).toBe("4521 n beltline rd ste 200");
  });
  it("domains", () => {
    expect(normalizeDomain("https://www.LoneStarPlumbingTX.com/contact")).toBe("lonestarplumbingtx.com");
    expect(normalizeDomain("lonestarplumbingtx.com")).toBe("lonestarplumbingtx.com");
  });
  it("name tokens drop legal suffixes", () => {
    expect(nameTokens("Lone Star Plumbing, LLC")).toEqual(["lone", "star", "plumbing"]);
  });
});

describe("nameSimilarity", () => {
  it("ignores suffix and punctuation", () => {
    expect(nameSimilarity("Lone Star Plumbing LLC", "Lone Star Plumbing")).toBe(1);
  });
  it("distinguishes different businesses", () => {
    expect(nameSimilarity("Lone Star Plumbing", "Lone Star Roofing")).toBeLessThan(0.8);
  });
});

describe("matchListing", () => {
  it("phone match alone gives high identity", () => {
    const m = matchListing(biz, { url: "u", name: "LSP", phone: "214-555-0100" });
    expect(m.identity).toBeGreaterThanOrEqual(0.9);
    expect(m.signals).toContain("phone");
  });
  it("name + street match is accepted with no diffs when fields agree", () => {
    const m = matchListing(biz, { url: "u", name: "Lone Star Plumbing", street: "4521 N Beltline Rd Ste 200", city: "Irving", state: "Texas", postalCode: "75038" });
    expect(m.identity).toBeGreaterThanOrEqual(0.8);
    expect(m.diffs).toEqual([]);
  });
  it("same business with a wrong phone is identified and the phone is diffed", () => {
    const m = matchListing(biz, { url: "u", name: "Lone Star Plumbing", street: "4521 N Beltline Rd Ste 200", city: "Irving", phone: "(214) 555-0199", website: "lonestarplumbingtx.com" });
    expect(m.identity).toBeGreaterThanOrEqual(0.8);
    expect(m.diffs.map((d) => d.field)).toEqual(["phone"]);
  });
  it("name only in same city is a possible match, not accepted", () => {
    const m = matchListing(biz, { url: "u", name: "Lone Star Plumbing", city: "Irving" });
    expect(m.identity).toBeLessThan(0.8);
    expect(m.identity).toBeGreaterThanOrEqual(0.5);
    expect(classify(m, true).state).toBe("possible_match");
  });
  it("different name and different phone is rejected", () => {
    const m = matchListing(biz, { url: "u", name: "Metro Roofing Co", city: "Irving", phone: "(972) 555-0111" });
    expect(classify(m, true).state).toBe("not_found");
  });
});

describe("extractJsonLd", () => {
  it("reads LocalBusiness with nested address", () => {
    const html = `<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"Plumber","name":"Lone Star Plumbing","telephone":"+1-214-555-0100","url":"https://lonestarplumbingtx.com","address":{"@type":"PostalAddress","streetAddress":"4521 N Beltline Rd","addressLocality":"Irving","addressRegion":"TX","postalCode":"75038"}}</script></head></html>`;
    const o = extractJsonLd(html, "https://www.yelp.com/biz/x");
    expect(o?.name).toBe("Lone Star Plumbing");
    expect(o?.phone).toBe("+1-214-555-0100");
    expect(o?.street).toBe("4521 N Beltline Rd");
    expect(o?.website).toBe("https://lonestarplumbingtx.com");
  });
  it("handles @graph arrays and returns null for non-business pages", () => {
    const graph = `<script type="application/ld+json">{"@graph":[{"@type":"WebSite","name":"Yelp"},{"@type":"LocalBusiness","name":"X","telephone":"2145550100"}]}</script>`;
    expect(extractJsonLd(graph, "u")?.name).toBe("X");
    expect(extractJsonLd(`<script type="application/ld+json">{"@type":"WebSite","name":"Yelp"}</script>`, "u")).toBeNull();
  });
});

describe("buildQuote", () => {
  const ev = { queries: [], candidates: [], source: "none" as const };
  it("quotes confident gaps, excludes everything else with a reason", () => {
    const findings: Finding[] = [
      { directoryId: "yellowpages", state: "not_found", confidence: 0.75, diffs: [], evidence: ev },
      { directoryId: "manta", state: "not_found", confidence: 0.65, diffs: [], evidence: ev },
      { directoryId: "yelp", state: "incorrect", confidence: 0.9, diffs: [{ field: "phone", expected: "a", observed: "b" }], evidence: ev },
      { directoryId: "google", state: "verified_accurate", confidence: 0.95, diffs: [], evidence: ev },
      { directoryId: "angi", state: "not_eligible", confidence: 1, diffs: [], evidence: { ...ev, notes: "Only for home_services" } },
    ];
    const q = buildQuote(findings);
    expect(q.items.map((i) => `${i.directoryId}:${i.action}`)).toEqual(["yellowpages:create", "yelp:correct"]);
    expect(q.totalCents).toBe(800 + Math.round(1500 * 0.6));
    expect(q.excluded.find((e) => e.directoryId === "manta")?.reason).toMatch(/Low-confidence/);
    expect(q.excluded.find((e) => e.directoryId === "angi")?.reason).toMatch(/home_services/);
  });
});

describe("BusinessInput hideAddress coercion", () => {
  it("treats false/\"false\"/missing as false and true/\"true\"/\"on\" as true", async () => {
    const { BusinessInput } = await import("./service");
    const base = { name: "X Co", city: "Irving", state: "TX", category: "home_services" };
    expect(BusinessInput.parse({ ...base }).hideAddress).toBe(false);
    expect(BusinessInput.parse({ ...base, hideAddress: "false" }).hideAddress).toBe(false);
    expect(BusinessInput.parse({ ...base, hideAddress: false }).hideAddress).toBe(false);
    expect(BusinessInput.parse({ ...base, hideAddress: "true" }).hideAddress).toBe(true);
    expect(BusinessInput.parse({ ...base, hideAddress: "on" }).hideAddress).toBe(true);
    expect(BusinessInput.parse({ ...base, hideAddress: true }).hideAddress).toBe(true);
  });
});

describe("wrong-phone correction case", () => {
  it("exact name + exact street with a different phone is identified and the phone diffed", () => {
    const m = matchListing(biz, { url: "u", name: "Lone Star Plumbing", street: "4521 North Beltline Road Suite 200", city: "Irving", phone: "(972) 555-0199" });
    expect(m.identity).toBeGreaterThanOrEqual(0.8);
    expect(classify(m, true).state).toBe("incorrect");
    expect(m.diffs.map((d) => d.field)).toEqual(["phone"]);
  });
  it("same name, different phone, different street stays a possible match", () => {
    const m = matchListing(biz, { url: "u", name: "Lone Star Plumbing", street: "99 Other St", city: "Irving", phone: "(972) 555-0199" });
    expect(classify(m, true).state).toBe("possible_match");
  });
});
