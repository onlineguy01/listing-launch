import { getStore } from "@/lib/data";
import { ADAPTER_BY_ID } from "@/lib/adapters";
import { createLiveContext, hasLiveKeys } from "@/lib/scan/context";
import { createMockContext } from "@/lib/scan/mock";
import type { SubmissionRecord } from "@/lib/data/store";
import type { Finding } from "@/lib/domain/types";

export type VerifyOutcome = { verified: true; by: "scanner" | "owner" | "ops"; finding?: Finding } | { verified: false; finding?: Finding; reason: string };

/**
 * Real-time verification of a submitted/published listing. Fetches the listing URL
 * through the directory adapter and compares it to the canonical record. On success
 * the line's billing status flips to `verified`, which takes it out of the refund sweep.
 */
export async function verifySubmission(sub: SubmissionRecord): Promise<VerifyOutcome> {
  const store = getStore();
  if (!sub.listingUrl) return { verified: false, reason: "no listing URL" };
  const biz = await store.getBusiness(sub.businessId);
  if (!biz) return { verified: false, reason: "unknown business" };
  const adapter = ADAPTER_BY_ID[sub.directoryId];
  if (!adapter) return { verified: false, reason: "no automated check for this directory; attest after checking it yourself, or wait for the downstream re-check" };
  const ctx = hasLiveKeys() ? createLiveContext() : createMockContext(biz);
  const finding = await adapter.verifyPublished(biz, sub.listingUrl, ctx).catch(() => undefined);
  if (finding && (finding.state === "verified_accurate" || finding.state === "incorrect")) {
    await markVerified(sub.id, "scanner", finding.state === "incorrect" ? `verified live (fields differ: ${finding.diffs.map((d) => d.field).join(", ")})` : "verified live");
    return { verified: true, by: "scanner", finding };
  }
  return { verified: false, finding, reason: finding?.state ?? "fetch failed" };
}

/** Owner or ops attest the listing is live. Used for directories that block automated checks. */
export async function markVerified(submissionId: string, by: "scanner" | "owner" | "ops", note: string) {
  const store = getStore();
  const sub = await store.getSubmission(submissionId);
  if (!sub || sub.billingStatus === "refunded") return;
  await store.updateSubmission(submissionId, {
    billingStatus: "verified", verifiedAt: new Date().toISOString(), verifiedBy: by,
    status: sub.status === "published" ? "published" : "published",
  }, `${by}: ${note}`);
}
