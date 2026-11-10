import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { currentUserEmail } from "@/lib/security/currentUser";
import { markVerified } from "@/lib/fulfillment/verify";
import { maybeEmailCompletion } from "@/lib/email/send";

const Body = z.object({ submissionId: z.string() });

/** Owner confirms a listing is live. Requires a signed-in session matching the order's email. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await currentUserEmail();
  if (!email) return NextResponse.json({ error: "Sign in to confirm" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  const biz = await store.getBusiness(order.businessId);
  const allowed = [order.customerEmail, biz?.ownerEmail].filter(Boolean).map((e) => e!.toLowerCase());
  if (!allowed.includes(email.toLowerCase())) return NextResponse.json({ error: "This order belongs to a different email" }, { status: 403 });
  const sub = await store.getSubmission(parsed.data.submissionId);
  if (!sub || sub.orderId !== id) return NextResponse.json({ error: "not found" }, { status: 404 });
  await markVerified(sub.id, "owner", `owner confirmed live from ${email}`);
  await maybeEmailCompletion(id).catch(() => {});
  return NextResponse.json({ ok: true });
}
