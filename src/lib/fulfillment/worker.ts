import { getStore } from "@/lib/data";
import { ADAPTER_BY_ID } from "@/lib/adapters";
import { createLiveContext } from "@/lib/scan/context";
import { emailOwnerAction } from "@/lib/email/send";
import type { SubmissionRecord } from "@/lib/data/store";

export interface WorkerSummary { picked: number; submitted: number; verification: number; manual: number; failed: number }

/**
 * One pass of the submission worker. Picks `prepared` jobs whose adapter can
 * submit automatically (API or permitted form). Everything else stays in the
 * ops queue for a human. Safe to run repeatedly.
 */
export async function runSubmissionWorker(opts: { limit?: number; dryRun?: boolean } = {}): Promise<WorkerSummary> {
  const store = getStore();
  const limit = opts.limit ?? 10;
  const all = await store.listAllSubmissions();
  const candidates = all.filter((s) => s.status === "prepared" && (s.method === "api" || s.method === "form") && !!ADAPTER_BY_ID[s.directoryId]?.submit).slice(0, limit);
  const summary: WorkerSummary = { picked: candidates.length, submitted: 0, verification: 0, manual: 0, failed: 0 };
  const ctx = createLiveContext((e, d) => console.log(`[worker] ${e}`, d ?? ""));

  for (const sub of candidates) {
    if (opts.dryRun) { console.log(`[worker] would submit ${sub.directoryId} for ${sub.businessId}`); continue; }
    const biz = await store.getBusiness(sub.businessId);
    const adapter = ADAPTER_BY_ID[sub.directoryId];
    if (!biz || !adapter?.submit) continue;
    await store.updateSubmission(sub.id, {}, "worker: attempting automated submission");
    const r = await adapter.submit(biz, ctx).catch((e) => ({ status: "failed" as const, notes: String(e) }));
    await applyResult(sub, r, summary);
  }
  return summary;
}

async function applyResult(sub: SubmissionRecord, r: Awaited<ReturnType<NonNullable<(typeof ADAPTER_BY_ID)[string]["submit"]>>>, summary: WorkerSummary) {
  const store = getStore();
  switch (r.status) {
    case "submitted":
      summary.submitted++;
      await store.updateSubmission(sub.id, { status: "submitted", listingUrl: r.listingUrl }, `worker: submitted${r.notes ? ` (${r.notes})` : ""}`);
      break;
    case "verification_required":
      summary.verification++;
      await store.updateSubmission(sub.id, { status: "verification_required" }, `worker: owner verification needed${r.notes ? ` (${r.notes})` : ""}`);
      await emailOwnerAction({ ...sub, status: "verification_required" }, "This directory sent you a confirmation. Please complete it so your listing goes live.").catch(() => {});
      break;
    case "manual_required":
      summary.manual++;
      await store.updateSubmission(sub.id, { method: "manual" }, `worker: handed to ops (${r.notes ?? "manual required"})`);
      break;
    default:
      summary.failed++;
      await store.updateSubmission(sub.id, { method: "manual" }, `worker: automated attempt failed, handed to ops (${r.notes ?? ""})`);
  }
}
