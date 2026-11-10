import { describe, expect, it } from "vitest";
import { heuristicClassify, normalizeUrl } from "./website";

describe("website intake", () => {
  it("normalizes URLs", () => {
    expect(normalizeUrl("bakerbrothersplumbing.com")).toBe("https://bakerbrothersplumbing.com/");
    expect(normalizeUrl("http://x.com/a#b")).toBe("http://x.com/a");
  });
  it("refuses private and local addresses", () => {
    for (const bad of ["localhost", "127.0.0.1", "http://10.0.0.5", "192.168.1.1", "172.16.0.9", "169.254.169.254", "foo.local", "http://x.com:8080"]) {
      expect(() => normalizeUrl(bad), bad).toThrow();
    }
  });
  it("classifies by keywords with a specific niche", () => {
    expect(heuristicClassify("Dallas Dental Arts: cosmetic dentist, Invisalign, teeth whitening and dental implants.").industry).toBe("dental");
    expect(heuristicClassify("Family owned plumbing company. Water heater repair, drain cleaning, HVAC and air conditioning.").industry).toBe("home_services");
    expect(heuristicClassify("Mobile dog grooming and pet sitting in Plano").industry).toBe("pet");
    expect(heuristicClassify("hello world").industry).toBe("other");
  });
});
