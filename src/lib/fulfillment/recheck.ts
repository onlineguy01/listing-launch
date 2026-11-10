import { getStore } from "@/lib/data";
import { ADAPTER_BY_ID } from "@/lib/adapters";
import { createLiveContext, hasLiveKeys } from "@/lib/scan/context";
import { createMockContext } from "@/lib/scan/mock";
import { maybeEmailCompletion } from "@/lib/email/send";
import { markVerified } from "./verify";

export interface RecheckSummary { due: number; stillLive: number; changed: number; missing: number; unverifiable: number }

/**
 * Run all due publication checks. For each: re-fetch the listing URL, compare
 * against the canonical record, and record the result. A listing that has
 * vanished flips its submission to `failed` so ops takes another look.
 */
export async function runDuePublicationChecks(now = new Date()): Promise<RecheckSummary> {
  const store = getStore();
  const due = await store.listDuePublicationChecks(now);
  const summary: RecheckSummary = { due: due.length, stillLive: 0, changed: 0, missing: 0, unverifiable: 0 };
  const touchedOrders = new Set<string>();

  for (const check of due) {
    const sub = await store.getSubmission(check.submissionId);
    if (!sub?.listingUrl) { await store.completePublicationCheck(check.id, "unable_to_verify"); summary.unverifiable++; continue; }
    const biz = await store.getBusiness(sub.businessId);
    const adapter = ADAPTER_BY_ID[sub.directoryId];
    if (!biz || !adapter) { await store.completePublicationCheck(check.id, "unable_to_verify"); summary.unverifiable++; continue; }

    const ctx = hasLiveKeys() ? createLiveContext() : createMockContext(biz);
    const finding = await adapter.verifyPublished(biz, sub.listingUrl, ctx).catch(() => null);
    const result = finding?.state ?? "unable_to_verify";
    await store.completePublicationCheck(check.id, result, sub.listingUrl);

    if (result === "verified_accurate") { summary.stillLive++; if (sub.billingStatus === "charged") await markVerified(sub.id, "scanner", "recheck confirmed live"); }
    else if (result === "incorrect") { summary.changed++; if (sub.billingStatus === "charged") await markVerified(sub.id, "scanner", "recheck: live, fields differ"); await store.updateSubmission(sub.id, {}, `recheck: listing drifted (${finding?.diffs.map((d) => d.field).join(", ")})`); }
    else if (result === "not_found") { summary.missing++; await store.updateSubmission(sub.id, { status: "failed" }, "recheck: listing no longer found"); }
    else summary.unverifiable++;
    touchedOrders.add(sub.orderId);
  }
  for (const orderId of touchedOrders) await maybeEmailCompletion(orderId).catch(() => {});
  return summary;
}
