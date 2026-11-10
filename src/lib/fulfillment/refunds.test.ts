import { describe, expect, it } from "vitest";
import { getStore } from "@/lib/data";
import { runRefundSweep } from "./refunds";
import { markVerified } from "./verify";
import { GUARANTEE_DAYS } from "@/lib/pricing/packages";

describe("30-day guarantee refund sweep (memory store, no Stripe)", () => {
  it("refunds unverified charged lines after the window, leaves verified lines alone, and ignores recent orders", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const store = getStore();
    const biz = await store.createBusiness({ name: "Sweep Test Co", city: "Dallas", state: "TX", country: "US", categories: ["other"], hideAddress: false, ownerEmail: "o@sweep.example" });
    const scan = await store.createScan({ businessId: biz.id, status: "complete", directoriesTotal: 1, directoriesDone: 1, mode: "mock" });
    const quote = { packageName: "Essentials package", items: [], subtotalCents: 3000, feesCents: 0, totalCents: 3000, excluded: [] };
    const old = await store.createOrder({ businessId: biz.id, scanId: scan.id, status: "paid", quote, customerEmail: "o@sweep.example", packageTier: "essentials" });
    await store.updateOrder(old.id, { paidAt: new Date(Date.now() - (GUARANTEE_DAYS + 1) * 86_400_000).toISOString() });
    const fresh = await store.createOrder({ businessId: biz.id, scanId: scan.id, status: "paid", quote, customerEmail: "o@sweep.example", packageTier: "essentials" });
    await store.updateOrder(fresh.id, { paidAt: new Date().toISOString() });

    const [a, b, c] = await store.createSubmissions([
      { orderId: old.id, businessId: biz.id, directoryId: "yellowpages", action: "create", status: "published", method: "manual", priceCents: 1000 },
      { orderId: old.id, businessId: biz.id, directoryId: "manta", action: "create", status: "submitted", method: "manual", priceCents: 1000 },
      { orderId: old.id, businessId: biz.id, directoryId: "bbb", action: "verify", status: "prepared", method: "manual", priceCents: 1000 },
    ]);
    await store.createSubmissions([{ orderId: fresh.id, businessId: biz.id, directoryId: "manta", action: "create", status: "prepared", method: "manual", priceCents: 3000 }]);
    await markVerified(a.id, "ops", "confirmed by screenshot");

    const s = await runRefundSweep();
    expect(s.ordersChecked).toBe(1);
    expect(s.linesRefunded).toBe(2);
    expect(s.centsRefunded).toBe(2000);
    expect(s.manualRefunds).toBe(2); // no Stripe → flagged for manual processing
    expect((await store.getSubmission(a.id))?.billingStatus).toBe("verified");
    expect((await store.getSubmission(b.id))?.billingStatus).toBe("refunded");
    expect((await store.getSubmission(c.id))?.refundNote).toMatch(/Manual refund required/);
    expect((await store.getOrder(old.id))?.refundedCents).toBe(2000);
    expect((await store.getOrder(old.id))?.status).toBe("complete"); // all lines terminal → completion report sent
    // idempotent
    expect((await runRefundSweep()).linesRefunded).toBe(0);
  });
});
