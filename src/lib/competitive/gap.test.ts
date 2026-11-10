import { describe, expect, it } from "vitest";
import { filterCandidates } from "./gap";

const cov = (entries: [string, string[], number][]) => new Map(entries.map(([d, c, r]) => [d, { competitors: c, rank: r }]));
const comps = ["a.com", "b.com", "c.com", "d.com", "e.com"];

describe("competitor gap filtering", () => {
  it("drops scraper farms, junk and competitors; keeps authority or shared directories; flags known packs", () => {
    const out = filterCandidates(cov([
      ["clifflisting.com", comps, 0],                 // scraper farm: all 5, rank 0
      ["burlesonchamber.com", ["a.com", "b.com", "c.com"], 0],
      ["nationalroofingdirectory.com", ["a.com"], 51],
      ["randomblog.com", ["a.com"], 5],              // one competitor, low authority
      ["wowqualitybacklinks.com", ["a.com", "b.com"], 0],
      ["booksreadr.org", ["a.com", "b.com", "c.com"], 0],   // zero-authority unknown farm, 3 of 5
      ["nowmagazines.com", ["a.com", "b.com"], 30],         // real local magazine, some authority
      ["b.com", ["a.com"], 90],                      // a competitor
      ["bbb.org", ["a.com", "c.com"], 0],            // known registry
      ["cheap.xyz", ["a.com", "b.com"], 0],
    ]), 5, new Set(comps), new Set(["bbb.org"]));
    const names = out.map((c) => c.domain);
    expect(names).toContain("burlesonchamber.com");
    expect(names).toContain("nationalroofingdirectory.com");
    expect(names).toContain("bbb.org");
    expect(names).not.toContain("clifflisting.com");
    expect(names).not.toContain("booksreadr.org");
    expect(names).toContain("nowmagazines.com");
    expect(names).not.toContain("randomblog.com");
    expect(names).not.toContain("wowqualitybacklinks.com");
    expect(names).not.toContain("b.com");
    expect(names).not.toContain("cheap.xyz");
    expect(out.find((c) => c.domain === "bbb.org")?.known?.kind).toBe("registry");
    expect(out.find((c) => c.domain === "bbb.org")?.alreadyLinks).toBe(true);
    expect(out.find((c) => c.domain === "burlesonchamber.com")?.known?.kind).toBe("local");
    expect(out[0].domain).toBe("nationalroofingdirectory.com"); // rank 51 outranks coverage 3 (30)
  });
});
