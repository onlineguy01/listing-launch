import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { emailOwnerAction, maybeEmailCompletion } from "@/lib/email/send";

const Body = z.object({
  id: z.string(),
  status: z.enum(["prepared", "submitted", "verification_required", "published", "rejected", "failed"]),
  listingUrl: z.string().url().optional().or(z.literal("")),
  ownerInstructions: z.string().max(1000).optional().or(z.literal("")),
  minutes: z.number().int().min(0).max(600).optional(),
});

/** Days after publication at which we re-verify the listing is still live and accurate. */
export const RECHECK_DAYS = [3, 14, 30];

/** Ops queue update. Access is enforced by src/proxy.ts (admin cookie or x-admin-token). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { id, status, listingUrl, ownerInstructions, minutes } = parsed.data;
  const store = getStore();
  const before = await store.getSubmission(id);
  if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });

  await store.updateSubmission(id, { status, listingUrl: listingUrl || undefined }, `status → ${status}${minutes ? ` (+${minutes} min)` : ""}`, minutes ?? 0);
  const sub = { ...before, status, listingUrl: listingUrl || before.listingUrl };

  if (status === "verification_required" && before.status !== "verification_required") {
    await emailOwnerAction(sub, ownerInstructions || "Check your inbox or phone for a confirmation from this directory and complete it.").catch((e) => console.error(e));
  }
  if (status === "published" && before.status !== "published") {
    await store.schedulePublicationChecks(id, RECHECK_DAYS.map((d) => new Date(Date.now() + d * 86_400_000)));
  }
  const completed = await maybeEmailCompletion(sub.orderId).catch((e) => { console.error(e); return false; });
  return NextResponse.json({ ok: true, completionSent: completed });
}
