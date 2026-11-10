import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { draftDescriptions } from "@/lib/ai/describe";

const Body = z.object({
  businessId: z.string().uuid(),
  services: z.array(z.string().max(80)).max(30).optional(),
  serviceArea: z.array(z.string().max(80)).max(50).optional(),
  yearFounded: z.number().int().min(1800).max(2100).optional().nullable(),
  paymentMethods: z.array(z.string().max(40)).max(12).optional(),
});

/** Draft descriptions from the saved business plus any not-yet-saved facts from the form. Does not persist. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const biz = await getStore().getBusiness(parsed.data.businessId);
  if (!biz) return NextResponse.json({ error: "not found" }, { status: 404 });
  const merged = { ...biz, ...stripUndefined(parsed.data), yearFounded: parsed.data.yearFounded ?? biz.yearFounded };
  const r = await draftDescriptions(merged);
  return NextResponse.json(r);
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}
