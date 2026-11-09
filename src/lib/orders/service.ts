import Stripe from "stripe";
import { getStore } from "@/lib/data";
import { buildQuote } from "@/lib/scan/quote";
import { getDirectory } from "@/lib/directories/registry";
import type { OrderRecord } from "@/lib/data/store";
import { emailOrderConfirmed } from "@/lib/email/send";

export function stripeEnabled() { return !!process.env.STRIPE_SECRET_KEY; }

/** Build an order from a scan's current findings. */
export async function createOrderFromScan(scanId: string, customerEmail?: string): Promise<OrderRecord> {
  const store = getStore();
  const scan = await store.getScan(scanId);
  if (!scan) throw new Error("scan not found");
  const findings = await store.listFindings(scanId);
  const quote = buildQuote(findings);
  if (!quote.items.length) throw new Error("Nothing to order");
  if (customerEmail) await store.updateBusiness(scan.businessId, { ownerEmail: customerEmail });
  return store.createOrder({ businessId: scan.businessId, scanId, status: "draft", quote, customerEmail });
}

/** Create a Stripe Checkout session for a draft order. */
export async function createCheckoutSession(order: OrderRecord, origin: string): Promise<string> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customerEmail || undefined,
    line_items: order.quote.items.map((i) => ({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: i.priceCents + i.feeCents,
        product_data: { name: `${i.action === "create" ? "Create" : "Correct"} listing: ${i.directoryName}` },
      },
    })),
    metadata: { orderId: order.id },
    success_url: `${origin}/order/${order.id}?paid=1`,
    cancel_url: `${origin}/report/${order.scanId}`,
  });
  await getStore().updateOrder(order.id, { stripeCheckoutSessionId: session.id });
  return session.url!;
}

/** Mark paid and create one submission job per order item. Idempotent. */
export async function markOrderPaid(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status !== "draft") return;
  await store.updateOrder(orderId, { status: "paid", paidAt: new Date().toISOString() });
  const existing = await store.listSubmissions({ orderId });
  if (existing.length) return;
  emailOrderConfirmed(orderId).catch((e) => console.error("order email failed", e));
  await store.createSubmissions(
    order.quote.items.map((i) => {
      const d = getDirectory(i.directoryId);
      return { orderId, businessId: order.businessId, directoryId: i.directoryId, action: i.action, status: "prepared" as const, method: d.submission };
    }),
  );
}
