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

  it("legacy category ids still resolve and non-TX cities get no local pack", () => {
    const biz: CanonicalBusiness = { id: "b", name: "X", city: "Tulsa", state: "OK", country: "US", categories: ["health"], hideAddress: false };
    const packs = assemblePacks(biz, []);
    expect(packs.category).toBe("healthcare");
    expect(packs.industry.some((r) => r.name === "Healthgrades")).toBe(true);
    expect(packs.local.rows).toHaveLength(0);
  });
});
