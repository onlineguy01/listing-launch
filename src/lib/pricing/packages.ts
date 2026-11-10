import type { DirectoryTier, Finding } from "@/lib/domain/types";
import { DIRECTORIES, getDirectory } from "@/lib/directories/registry";

export type PackageId = "essentials" | "complete";
export type LineAction = "create" | "correct" | "verify" | "review" | "none";

export interface PackageDef {
  id: PackageId;
  name: string;
  blurb: string;
  tiers: DirectoryTier[];
  priceCents: number;
}

const cents = (env: string, fallback: number) => {
  const v = Number(process.env[env]);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : fallback;
};

/**
 * Pilot prices. Override per deployment with PRICE_*_CENTS.
 * Packages only ever contain directories we can submit to ourselves (`sellable`).
 * Owner-verified profiles (Google, Apple, Bing, Yelp, Facebook, Nextdoor, LinkedIn…) are
 * reported for free and never sold.
 */
export const PACKAGES: PackageDef[] = [
  { id: "essentials", name: "Essentials", blurb: "The data aggregators that feed hundreds of apps and maps, plus the general directories search engines index.", tiers: ["aggregator", "general"], priceCents: cents("PRICE_ESSENTIALS_CENTS", 24900) },
  { id: "complete", name: "Complete", blurb: "Essentials plus your industry directories and local listings.", tiers: ["aggregator", "general", "industry", "local"], priceCents: cents("PRICE_COMPLETE_CENTS", 39900) },
];
export const CORRECTION_ONLY_CENTS = cents("PRICE_CORRECTION_CENTS", 900);
/** Lines not verified live within this many days of payment are refunded. */
export const GUARANTEE_DAYS = 30;

export interface PackageLine {
  directoryId: string;
  directoryName: string;
  tier: DirectoryTier;
  action: LineAction;
  findingState: Finding["state"];
  /** Share of the package price allocated to this line (for refunds). 0 for action "none". */
  priceCents: number;
  feeCents: number;
}

export interface PackageQuote {
  id: PackageId;
  name: string;
  blurb: string;
  priceCents: number;
  feesCents: number;
  totalCents: number;
  lines: PackageLine[];
  actionable: number;        // lines we will do work on
  alreadyAccurate: number;
  recommended: boolean;
}

export function actionFor(state: Finding["state"]): LineAction {
  switch (state) {
    case "not_found": return "create";
    case "incorrect": return "correct";
    case "unable_to_verify": return "verify";
    case "possible_match": return "review";
    case "verified_accurate": return "none";
    case "not_eligible": return "none";
  }
}

/**
 * Build the three packages from a scan. Every eligible directory in the package's
 * tiers is included: ones we could not verify are sold as "submit and verify" and are
 * refundable under the 30-day guarantee, like every other actionable line.
 */
export function buildPackages(findings: Finding[]): PackageQuote[] {
  const byId = new Map(findings.map((f) => [f.directoryId, f]));
  const quotes = PACKAGES.map((pkg) => {
    const lines: PackageLine[] = [];
    for (const d of DIRECTORIES) {
      if (!d.active || !d.sellable || !pkg.tiers.includes(d.tier)) continue;
      const f = byId.get(d.id);
      // Aggregators with discovery "none" have no finding: always submit + verify downstream.
      const state: Finding["state"] = f?.state ?? (d.discovery === "none" ? "unable_to_verify" : "unable_to_verify");
      if (state === "not_eligible") continue;
      lines.push({ directoryId: d.id, directoryName: d.name, tier: d.tier, action: actionFor(state), findingState: state, priceCents: 0, feeCents: d.externalFeeCents });
    }
    const actionableLines = lines.filter((l) => l.action !== "none");
    // Allocate the package price evenly across actionable lines; remainder goes to the first.
    if (actionableLines.length) {
      const each = Math.floor(pkg.priceCents / actionableLines.length);
      actionableLines.forEach((l, i) => { l.priceCents = each + (i === 0 ? pkg.priceCents - each * actionableLines.length : 0); });
    }
    const feesCents = actionableLines.reduce((a, l) => a + l.feeCents, 0);
    return {
      id: pkg.id, name: pkg.name, blurb: pkg.blurb, priceCents: pkg.priceCents, feesCents, totalCents: pkg.priceCents + feesCents,
      lines, actionable: actionableLines.length, alreadyAccurate: lines.filter((l) => l.action === "none").length, recommended: false,
    };
  });
  // Recommend Complete when an industry/local directory needs work, otherwise Essentials.
  const [essentials, complete] = quotes;
  const extra = complete.lines.some((l) => (l.tier === "industry" || l.tier === "local") && l.action !== "none");
  (extra && complete.actionable ? complete : essentials).recommended = true;
  return quotes;
}

export interface OwnerManagedRow {
  directoryId: string;
  directoryName: string;
  state: Finding["state"];
  listingUrl?: string;
  diffs: Finding["diffs"];
  howTo?: string;
  claimUrl?: string;
}

/**
 * Report-only directories: the owner must create or claim these personally. We show the
 * verdict and how to act on it; nothing here is ever priced.
 */
export function ownerManagedRows(findings: Finding[]): OwnerManagedRow[] {
  const byId = new Map(findings.map((f) => [f.directoryId, f]));
  return DIRECTORIES.filter((d) => d.active && !d.sellable).map((d) => {
    const f = byId.get(d.id);
    return {
      directoryId: d.id, directoryName: d.name, state: f?.state ?? "unable_to_verify", listingUrl: f?.listingUrl,
      diffs: f?.diffs ?? [], howTo: d.ownerHowTo, claimUrl: d.submitUrl ?? d.homepage,
    };
  }).filter((r) => r.state !== "not_eligible");
}

export function getPackage(id: string): PackageDef {
  const p = PACKAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown package ${id}`);
  return p;
}

export function formatCents(c: number): string {
  return (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export { getDirectory };
