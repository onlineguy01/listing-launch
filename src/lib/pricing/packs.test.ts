import { describe, expect, it } from "vitest";
import { assemblePacks } from "./packs";
import { INDUSTRY_SITES, industrySitesFor } from "@/lib/directories/industryPacks";
import { CATEGORIES, type CategoryId } from "@/lib/directories/categories";
import type { CanonicalBusiness, Finding } from "@/lib/domain/types";

const ev = { queries: [], candidates: [], source: "none" as const };
const f = (directoryId: string, state: Finding["state"]): Finding => ({ directoryId, state, confidence: 0.9, diffs: [], evidence: ev });

describe("packs", () => {
  it("every industry in the taxonomy except retail/professional/other has a pack of 2 to 10 sites", () => {
    for (const id of Object.keys(CATEGORIES) as CategoryId[]) {
      const n = industrySitesFor(id).length;
      if (["retail", "professional_services", "other"].includes(id)) continue;
      expect(n, id).toBeGreaterThanOrEqual(2);
      expect(n, id).toBeLessThanOrEqual(10);
    }
    expect(new Set(INDUSTRY_SITES.map((s) => s.id)).size).toBe(INDUSTRY_SITES.length); // unique ids
  });

  it("assembles core, industry and local packs for a DFW plumber, borrowing scan verdicts where a registry entry exists", () => {
    const biz: CanonicalBusiness = { id: "b", name: "Baker Brothers", city: "Mesquite", state: "TX", country: "US", categories: ["home_services"], hideAddress: false };
    const packs = assemblePacks(biz, [f("google", "verified_accurate"), f("houzz", "not_found"), f("angi", "incorrect"), f("yellowpages", "incorrect")]);
    expect(packs.categoryLabel).toMatch(/Home services/);
    expect(packs.core.find((r) => r.id === "google")?.checked).toBe(true);
    expect(packs.core.find((r) => r.id === "google")?.ownerManaged).toBe(true);
    expect(packs.core.find((r) => r.id === "yellowpages")?.sellable).toBe(true);
    const houzz = packs.industry.find((r) => r.name === "Houzz");
    expect(houzz?.checked).toBe(true); expect(houzz?.state).toBe("not_found"); expect(houzz?.sellable).toBe(true);
    const angi = packs.industry.find((r) => r.name === "Angi");
    expect(angi?.kind).toBe("marketplace"); expect(angi?.sellable).toBe(false); expect(angi?.checked).toBe(true);
    const thumbtack = packs.industry.find((r) => r.name === "Thumbtack");
    expect(thumbtack?.checked).toBe(false); expect(thumbtack?.sellable).toBe(false);
    expect(packs.local.metroName).toBe("Dallas–Fort Worth");
    expect(packs.local.rows.some((r) => r.name === "Mesquite Chamber of Commerce")).toBe(true);
    expect(packs.local.rows.some((r) => r.name === "Plano Chamber of Commerce")).toBe(false);
  });

  it("labels who does the work and renders niche sites with suggested/approved ordering", () => {
    const biz: CanonicalBusiness = { id: "b", name: "Ink Haus", city: "Dallas", state: "TX", country: "US", categories: ["beauty"], niche: "tattoo studio", hideAddress: false };
    const now = new Date().toISOString();
    const packs = assemblePacks(biz, [f("google", "verified_accurate"), f("yellowpages", "not_found")], [
      { id: "1", niche: "tattoo studio", name: "Tattoodo", host: "www.tattoodo.com", url: "https://www.tattoodo.com/", kind: "profile", who: "you", status: "suggested", source: "web_search", createdAt: now },
      { id: "2", niche: "tattoo studio", name: "Alliance of Professional Tattooists", host: "www.safe-tattoos.com", url: "https://www.safe-tattoos.com/", kind: "association", who: "manual", status: "approved", source: "web_search", createdAt: now },
      { id: "3", niche: "tattoo studio", name: "Junk", host: "junk.example", url: "https://junk.example/", kind: "directory", who: "we", status: "rejected", source: "web_search", createdAt: now },
    ]);
    expect(packs.core.find((r) => r.id === "google")?.who).toBe("you");
    expect(packs.core.find((r) => r.id === "yellowpages")?.who).toBe("we");
    expect(packs.core.find((r) => r.id === "dataaxle")?.who).toBe("manual");
    expect(packs.nicheRows.map((r) => r.name)).toEqual(["Alliance of Professional Tattooists", "Tattoodo"]);
    expect(packs.nicheRows[0].suggested).toBe(false);
    expect(packs.nicheRows[1].who).toBe("you");
  });

  it("legacy category ids still resolve and non-TX cities get no local pack", () => {
    const biz: CanonicalBusiness = { id: "b", name: "X", city: "Tulsa", state: "OK", country: "US", categories: ["health"], hideAddress: false };
    const packs = assemblePacks(biz, []);
    expect(packs.category).toBe("healthcare");
    expect(packs.industry.some((r) => r.name === "Healthgrades")).toBe(true);
    expect(packs.local.rows).toHaveLength(0);
  });
});
