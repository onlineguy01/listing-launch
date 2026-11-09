import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";

const Body = z.object({
  id: z.string(),
  status: z.enum(["prepared", "submitted", "verification_required", "published", "rejected", "failed"]),
  listingUrl: z.string().url().optional().or(z.literal("")),
});

/** Ops queue update. Protect with ADMIN_TOKEN in production. */
export async function POST(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (token && req.headers.get("x-admin-token") !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { id, status, listingUrl } = parsed.data;
  await getStore().updateSubmission(id, { status, listingUrl: listingUrl || undefined }, `status → ${status}`);
  return NextResponse.json({ ok: true });
}
