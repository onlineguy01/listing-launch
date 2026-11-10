import { describe, expect, it } from "vitest";
import { runScan } from "./runner";
import { createMockContext } from "./mock";
import type { CanonicalBusiness } from "@/lib/domain/types";
import { DIRECTORIES } from "@/lib/directories/registry";

const SCANNED = DIRECTORIES.filter((d) => d.active && d.discovery !== "none").length;

const biz: CanonicalBusiness = {
  id: "b1", name: "Lone Star Plumbing LLC", street: "4521 N Beltline Rd Ste 200", city: "Irving", state: "TX",
  postalCode: "75038", country: "US", phoneE164: "+12145550100", website: "https://lonestarplumbingtx.com",
  domain: "lonestarplumbingtx.com", categories: ["home_services"], hideAddress: false,
};

describe("runScan with mock context", () => {
  it("produces one finding per active directory and streams progress", async () => {
    const progress: number[] = [];
    const findings = await runScan(biz, createMockContext(biz), { onFinding: (_f, p) => { progress.push(p.done); } });
    expect(findings.length).toBe(SCANNED);
    expect(new Set(findings.map((f) => f.directoryId)).size).toBe(SCANNED);
    expect(Math.max(...progress)).toBe(SCANNED);
    const states = new Set(findings.map((f) => f.state));
    expect(states.has("verified_accurate")).toBe(true);
    expect(states.has("not_found")).toBe(true);
    // google is always accurate in mock mode
    expect(findings.find((f) => f.directoryId === "google")?.state).toBe("verified_accurate");
  });
  it("marks industry directories not_eligible for non-home-services", async () => {
    const pro = { ...biz, categories: ["professional_services"] };
    const findings = await runScan(pro, createMockContext(pro));
    expect(findings.find((f) => f.directoryId === "angi")?.state).toBe("not_eligible");
    expect(findings.find((f) => f.directoryId === "houzz")?.state).toBe("not_eligible");
  });
});
