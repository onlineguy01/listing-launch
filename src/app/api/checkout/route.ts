import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutSession, createOrderFromScan, markOrderPaid, stripeEnabled } from "@/lib/orders/service";

const Body = z.object({ scanId: z.string().uuid(), email: z.string().email(), packageId: z.enum(["essentials", "complete"]) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const { scanId, email, packageId } = parsed.data;
  try {
    const order = await createOrderFromScan(scanId, email, packageId);
    if (stripeEnabled()) {
      const origin = new URL(req.url).origin;
      const url = await createCheckoutSession(order, origin);
      return NextResponse.json({ url });
    }
    // Demo mode: no payment processor configured, mark as paid immediately.
    await markOrderPaid(order.id);
    return NextResponse.json({ url: `/order/${order.id}?demo=1` });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 400 });
  }
}
