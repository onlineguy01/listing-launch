import { describe, expect, it } from "vitest";
import { buildPackages, actionFor, ownerManagedRows } from "./packages";
import type { Finding } from "@/lib/domain/types";

const ev = { queries: [], candidates: [], source: "none" as const };
const f = (directoryId: string, state: Finding["state"]): Finding => ({ directoryId, state, confidence: 0.8, diffs: [], evidence: ev });

describe("packages", () => {
  const findings = [
    f("google", "verified_accurate"), f("yelp", "unable_to_verify"), f("facebook", "unable_to_verify"), f("apple", "not_found"),
    f("bing", "unable_to_verify"), f("nextdoor", "unable_to_verify"), f("foursquare", "unable_to_verify"),
    f("yellowpages", "incorrect"), f("superpages", "verified_accurate"), f("bbb", "not_found"), f("manta", "unable_to_verify"),
    f("merchantcircle", "possible_match"), f("linkedin", "unable_to_verify"), f("angi", "not_eligible"), f("houzz", "not_eligible"),
  ];
  it("maps states to actions", () => {
    expect(actionFor("not_found")).toBe("create"); expect(actionFor("incorrect")).toBe("correct");
    expect(actionFor("unable_to_verify")).toBe("verify"); expect(actionFor("verified_accurate")).toBe("none");
  });
  it("builds two packages from sellable directories only, price allocated across actionable lines", () => {
    const [essentials, complete] = buildPackages(findings);
    const ownerOnly = ["google", "apple", "bing", "yelp", "facebook", "nextdoor", "linkedin", "angi"];
    expect(complete.lines.some((l) => ownerOnly.includes(l.directoryId))).toBe(false);
    expect(essentials.lines.find((l) => l.directoryId === "dataaxle")?.action).toBe("verify"); // aggregator with no finding
    expect(essentials.lines.find((l) => l.directoryId === "superpages")?.action).toBe("none"); // already accurate, listed but free
    expect(essentials.lines.filter((l) => l.action !== "none").reduce((a, l) => a + l.priceCents, 0)).toBe(essentials.priceCents);
    expect(essentials.lines.some((l) => l.directoryId === "yellowpages" && l.action === "correct")).toBe(true);
    expect(complete.lines.some((l) => l.directoryId === "localeze")).toBe(false); // inactive directory excluded
  });
  it("recommends Essentials by default and Complete when an industry directory needs work", () => {
    expect(buildPackages(findings).find((p) => p.recommended)?.id).toBe("essentials");
    const home = buildPackages([...findings.filter((x) => x.directoryId !== "houzz"), f("houzz", "not_found")]);
    expect(home.find((p) => p.recommended)?.id).toBe("complete");
  });
  it("lists owner-managed profiles with verdicts and instructions, never priced", () => {
    const rows = ownerManagedRows(findings);
    const google = rows.find((r) => r.directoryId === "google");
    expect(google?.state).toBe("verified_accurate");
    expect(google?.howTo).toMatch(/business\.google\.com/);
    expect(rows.some((r) => r.directoryId === "angi")).toBe(false); // not eligible dropped
    expect(rows.some((r) => r.directoryId === "yellowpages")).toBe(false); // sellable ones are not here
  });
});
