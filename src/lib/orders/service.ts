import Stripe from "stripe";
import { getStore } from "@/lib/data";
import { getDirectory } from "@/lib/directories/registry";
import type { OrderRecord } from "@/lib/data/store";
import type { Quote } from "@/lib/scan/quote";
import { emailOrderConfirmed } from "@/lib/email/send";
import { buildPackages, GUARANTEE_DAYS, type PackageId } from "@/lib/pricing/packages";

export function stripeEnabled() { return !!process.env.STRIPE_SECRET_KEY; }

/** Build an order for one package from a scan's current findings. */
export async function createOrderFromScan(scanId: string, customerEmail: string | undefined, packageId: PackageId): Promise<OrderRecord> {
  const store = getStore();
  const scan = await store.getScan(scanId);
  if (!scan) throw new Error("scan not found");
  const findings = await store.listFindings(scanId);
  const pkg = buildPackages(findings).find((p) => p.id === packageId);
  if (!pkg) throw new Error("unknown package");
  const actionable = pkg.lines.filter((l) => l.action !== "none");
  if (!actionable.length) throw new Error("Nothing to order in this package");
  const quote: Quote = {
    packageName: `${pkg.name} package`,
    items: actionable.map((l) => ({ directoryId: l.directoryId, directoryName: l.directoryName, action: l.action as Quote["items"][number]["action"], priceCents: l.priceCents, feeCents: l.feeCents, findingState: l.findingState })),
    subtotalCents: pkg.priceCents, feesCents: pkg.feesCents, totalCents: pkg.totalCents, excluded: [],
  };
  if (customerEmail) await store.updateBusiness(scan.businessId, { ownerEmail: customerEmail });
  return store.createOrder({ businessId: scan.businessId, scanId, status: "draft", quote, customerEmail, packageTier: packageId });
}

/** Create a Stripe Checkout session: one package line plus any pass-through fees. */
export async function createCheckoutSession(order: OrderRecord, origin: string): Promise<string> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const fees = order.quote.items.filter((i) => i.feeCents > 0);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customerEmail || undefined,
    line_items: [
      { quantity: 1, price_data: { currency: "usd", unit_amount: order.quote.subtotalCents, product_data: {
        name: order.quote.packageName,
        description: `${order.quote.items.length} directory listings created, corrected or verified. ${GUARANTEE_DAYS}-day guarantee: any listing we cannot confirm live is refunded.`,
      } } },
      ...fees.map((i) => ({ quantity: 1, price_data: { currency: "usd", unit_amount: i.feeCents, product_data: { name: `${i.directoryName} directory fee (pass-through)` } } })),
    ],
    metadata: { orderId: order.id },
    success_url: `${origin}/order/${order.id}?paid=1`,
    cancel_url: `${origin}/report/${order.scanId}`,
  });
  await getStore().updateOrder(order.id, { stripeCheckoutSessionId: session.id });
  return session.url!;
}

/** Mark paid and create one submission job per line, each carrying its refundable share. Idempotent. */
export async function markOrderPaid(orderId: string, stripePaymentIntentId?: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.status !== "draft") return;
  await store.updateOrder(orderId, { status: "paid", paidAt: new Date().toISOString(), stripePaymentIntentId });
  const existing = await store.listSubmissions({ orderId });
  if (existing.length) return;
  emailOrderConfirmed(orderId).catch((e) => console.error("order email failed", e));
  await store.createSubmissions(
    order.quote.items.map((i) => {
      const d = getDirectory(i.directoryId);
      return { orderId, businessId: order.businessId, directoryId: i.directoryId, action: i.action, status: "prepared" as const, method: d.submission, priceCents: i.priceCents + i.feeCents };
    }),
  );
}

/** Refund one line through Stripe (partial refund of the payment). Returns the refund id, or undefined when Stripe is not configured. */
export async function refundLine(order: OrderRecord, amountCents: number, reason: string): Promise<string | undefined> {
  if (!stripeEnabled() || !order.stripePaymentIntentId || amountCents <= 0) return undefined;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const r = await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, amount: amountCents, reason: "requested_by_customer", metadata: { orderId: order.id, note: reason.slice(0, 200) } });
  return r.id;
}
