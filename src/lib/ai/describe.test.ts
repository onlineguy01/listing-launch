import { describe, expect, it } from "vitest";
import { templateDescriptions, factsList, draftDescriptions } from "./describe";
import type { CanonicalBusiness } from "@/lib/domain/types";

const biz: CanonicalBusiness = {
  id: "b", name: "Lone Star Plumbing LLC", city: "Irving", state: "TX", country: "US", categories: ["home_services"], hideAddress: false,
  services: ["water heater repair", "drain cleaning", "repiping"], serviceArea: ["Irving", "Las Colinas", "Coppell"], yearFounded: 2019,
};

describe("description writer", () => {
  it("template uses only supplied facts and respects length limits", () => {
    const d = templateDescriptions(biz);
    expect(d.short).toBe("Lone Star Plumbing LLC is a home services company in Irving, TX.");
    expect(d.long).toContain("water heater repair, drain cleaning and repiping");
    expect(d.long).toContain("Founded in 2019");
    expect(d.short.length).toBeLessThanOrEqual(160);
    expect(d.long.length).toBeLessThanOrEqual(750);
  });
  it("omits missing facts instead of inventing them", () => {
    const d = templateDescriptions({ ...biz, services: undefined, serviceArea: undefined, yearFounded: undefined, hideAddress: true });
    expect(d.long).toBe("Lone Star Plumbing LLC is a home services company serving Irving, TX.");
    expect(factsList(biz)).not.toMatch(/licen|award|guarantee/i);
  });
  it("falls back to the template when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await draftDescriptions(biz);
    expect(r.source).toBe("template");
  });
});
