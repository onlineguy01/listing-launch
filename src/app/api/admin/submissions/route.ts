import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { emailOwnerAction, maybeEmailCompletion } from "@/lib/email/send";
import { markVerified, verifySubmission } from "@/lib/fulfillment/verify";

const Body = z.object({
  id: z.string(),
  status: z.enum(["prepared", "submitted", "verification_required", "published", "rejected", "failed"]),
  listingUrl: z.string().url().optional().or(z.literal("")),
  ownerInstructions: z.string().max(1000).optional().or(z.literal("")),
  minutes: z.number().int().min(0).max(600).optional(),
  /** Ops attests the listing is live (for directories that block automated checks). */
  attestLive: z.boolean().optional(),
});

/** Days after publication at which we re-verify the listing is still live and accurate. */
export const RECHECK_DAYS = [3, 14, 30];

/** Ops queue update. Access is enforced by src/proxy.ts (admin cookie or x-admin-token). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { id, status, listingUrl, ownerInstructions, minutes, attestLive } = parsed.data;
  const store = getStore();
  const before = await store.getSubmission(id);
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  await store.updateSubmission(id, { status, listingUrl: listingUrl || undefined }, `status → ${status}${minutes ? ` (+${minutes} min)` : ""}`, minutes ?? 0);
  const sub = { ...before, status, listingUrl: listingUrl || before.listingUrl };

  if (status === "verification_required" && before.status !== "verification_required") {
    await emailOwnerAction(sub, ownerInstructions || "Check your inbox or phone for a confirmation from this directory and complete it.").catch((e) => console.error(e));
  }
  let verification: string | undefined;
  if (status === "published" && before.status !== "published") {
    await store.schedulePublicationChecks(id, RECHECK_DAYS.map((d) => new Date(Date.now() + d * 86_400_000)));
    // Real-time verification against the live listing page.
    const v = await verifySubmission({ ...sub, listingUrl: sub.listingUrl });
    verification = v.verified ? `verified live by ${v.by}` : `could not verify automatically (${v.reason})`;
  }
  if (attestLive && status === "published") {
    await markVerified(id, "ops", "ops attested the listing is live");
    verification = "verified live by ops";
  }
  const completed = await maybeEmailCompletion(sub.orderId).catch((e) => { console.error(e); return false; });
  return NextResponse.json({ ok: true, completionSent: completed, verification });
}
