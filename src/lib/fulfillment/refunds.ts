import { getStore } from "@/lib/data";
import { GUARANTEE_DAYS } from "@/lib/pricing/packages";
import { refundLine, stripeEnabled } from "@/lib/orders/service";
import { maybeEmailCompletion } from "@/lib/email/send";

export interface RefundSummary { ordersChecked: number; linesRefunded: number; centsRefunded: number; manualRefunds: number }

/**
 * The guarantee: any charged line not verified live within GUARANTEE_DAYS of payment is
 * refunded. Runs from the daily cron. Without Stripe configured, lines are marked
 * refunded with a note so ops can refund by hand.
 */
export async function runRefundSweep(now = new Date()): Promise<RefundSummary> {
  const store = getStore();
  const summary: RefundSummary = { ordersChecked: 0, linesRefunded: 0, centsRefunded: 0, manualRefunds: 0 };
  const cutoff = now.getTime() - GUARANTEE_DAYS * 86_400_000;
  const orders = (await store.listAllOrders()).filter((o) => ["paid", "in_progress"].includes(o.status) && o.paidAt && new Date(o.paidAt).getTime() <= cutoff);

  for (const order of orders) {
    summary.ordersChecked++;
    const subs = await store.listSubmissions({ orderId: order.id });
    let refunded = 0;
    for (const sub of subs) {
      if (sub.billingStatus !== "charged" || sub.priceCents <= 0) continue;
      const note = `Not confirmed live within ${GUARANTEE_DAYS} days (status: ${sub.status})`;
      let refundId: string | undefined;
      try { refundId = await refundLine(order, sub.priceCents, note); } catch (e) { console.error("refund failed", sub.id, e); continue; }
      if (!refundId && stripeEnabled()) continue; // Stripe configured but no payment intent: leave for ops
      await store.updateSubmission(sub.id, {
        billingStatus: "refunded", refundedAt: now.toISOString(), stripeRefundId: refundId,
        refundNote: refundId ? note : `${note}. Manual refund required.`,
        status: sub.status === "published" ? "published" : "failed",
      }, refundId ? `refunded ${sub.priceCents}¢ (${refundId})` : `refund pending manual processing (${sub.priceCents}¢)`);
      refunded += sub.priceCents;
      summary.linesRefunded++;
      if (!refundId) summary.manualRefunds++;
    }
    if (refunded) {
      summary.centsRefunded += refunded;
      await store.updateOrder(order.id, { refundedCents: order.refundedCents + refunded });
    }
    await maybeEmailCompletion(order.id).catch(() => {});
  }
  return summary;
}
