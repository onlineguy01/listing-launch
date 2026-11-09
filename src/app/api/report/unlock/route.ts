import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { emailReportReady } from "@/lib/email/send";

const Body = z.object({ scanId: z.string().uuid(), email: z.string().email() });

/** Capture the owner's email to unlock the full report; sends the report email. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const { scanId, email } = parsed.data;
  const store = getStore();
  const scan = await store.getScan(scanId);
  if (!scan) return NextResponse.json({ error: "not found" }, { status: 404 });
  await store.updateBusiness(scan.businessId, { ownerEmail: email });
  await store.updateScan(scanId, { requesterEmail: email });
  const jar = await cookies();
  jar.set("ll_email", email, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
  if (scan.status === "complete") await emailReportReady(scanId, email).catch((e) => console.error("report email failed", e));
  return NextResponse.json({ ok: true });
}
