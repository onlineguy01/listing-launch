import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";

const Hours = z.record(z.string(), z.array(z.tuple([z.string(), z.string()])));
const Patch = z.object({
  descriptionShort: z.string().max(160).optional(),
  descriptionLong: z.string().max(750).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  services: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  serviceArea: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  yearFounded: z.number().int().min(1800).max(2100).optional().nullable(),
  paymentMethods: z.array(z.string().max(40)).max(12).optional(),
  hours: Hours.optional(),
  markDetailsComplete: z.boolean().optional(),
});

/** Owner updates to the canonical record after purchase. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the form", issues: parsed.error.flatten() }, { status: 400 });
  const store = getStore();
  const biz = await store.getBusiness(id);
  if (!biz) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { markDetailsComplete, logoUrl, yearFounded, ...rest } = parsed.data;
  const updated = await store.updateBusiness(id, {
    ...rest,
    logoUrl: logoUrl === "" ? undefined : logoUrl ?? biz.logoUrl,
    yearFounded: yearFounded === null ? undefined : yearFounded ?? biz.yearFounded,
    detailsCompletedAt: markDetailsComplete ? new Date().toISOString() : biz.detailsCompletedAt,
  });
  return NextResponse.json({ ok: true, business: { id: updated.id, detailsCompletedAt: updated.detailsCompletedAt } });
}
