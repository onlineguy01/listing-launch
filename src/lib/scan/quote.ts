import type { Finding } from "@/lib/domain/types";
import { getDirectory } from "@/lib/directories/registry";

export interface QuoteItem {
  directoryId: string;
  directoryName: string;
  action: "create" | "correct";
  priceCents: number;
  feeCents: number;
  findingState: Finding["state"];
}

export interface Quote {
  packageName: string;
  items: QuoteItem[];
  subtotalCents: number;
  feesCents: number;
  totalCents: number;
  excluded: { directoryId: string; reason: string }[];
}

/** Minimum confidence for a not_found to be sold as a "create" without review. */
export const NOT_FOUND_MIN_CONFIDENCE = 0.7;
/** Corrections cost less than creations by default. */
const CORRECTION_FACTOR = 0.6;

/**
 * Turn findings into a sellable package. Only actionable, confident findings are
 * quoted; everything else is listed under `excluded` with a reason so the
 * report can explain itself.
 */
export function buildQuote(findings: Finding[], packageName = "Recommended package"): Quote {
  const items: QuoteItem[] = [];
  const excluded: Quote["excluded"] = [];

  for (const f of findings) {
    const d = getDirectory(f.directoryId);
    switch (f.state) {
      case "not_found":
        if (f.confidence < NOT_FOUND_MIN_CONFIDENCE) { excluded.push({ directoryId: d.id, reason: "Low-confidence absence, needs review" }); break; }
        items.push({ directoryId: d.id, directoryName: d.name, action: "create", priceCents: d.basePriceCents, feeCents: d.externalFeeCents, findingState: f.state });
        break;
      case "incorrect":
        items.push({ directoryId: d.id, directoryName: d.name, action: "correct", priceCents: Math.round(d.basePriceCents * CORRECTION_FACTOR), feeCents: 0, findingState: f.state });
        break;
      case "verified_accurate": excluded.push({ directoryId: d.id, reason: "Already accurate" }); break;
      case "possible_match": excluded.push({ directoryId: d.id, reason: "Possible existing listing, we review before quoting" }); break;
      case "unable_to_verify": excluded.push({ directoryId: d.id, reason: "Could not verify" }); break;
      case "not_eligible": excluded.push({ directoryId: d.id, reason: f.evidence.notes ?? "Not eligible" }); break;
    }
  }

  const subtotalCents = items.reduce((s, i) => s + i.priceCents, 0);
  const feesCents = items.reduce((s, i) => s + i.feeCents, 0);
  return { packageName, items, subtotalCents, feesCents, totalCents: subtotalCents + feesCents, excluded };
}

export function formatCents(c: number): string {
  return (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
