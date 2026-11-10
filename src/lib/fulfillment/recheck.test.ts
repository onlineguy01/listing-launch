import { describe, expect, it } from "vitest";
import { getStore } from "@/lib/data";
import { runDuePublicationChecks } from "./recheck";
import { maybeEmailCompletion } from "@/lib/email/send";
import { listOutbox } from "@/lib/email/mailer";
import { buildQuote } from "@/lib/scan/quote";
import type { Finding } from "@/lib/domain/types";

const ev = { queries: [], candidates: [], source: "none" as const };

describe("publication re-checks and completion report (memory store, mock context)", () => {
  it("verifies a live listing, flags a vanished one, and emails the completion report once", async () => {
    const store = getStore();
    const biz = await store.createBusiness({
      name: "Lone Star Plumbing LLC", street: "4521 N Beltline Rd Ste 200", city: "Irving", state: "TX", postalCode: "75038", country: "US",
      phoneE164: "+12145550100", website: "https://lonestarplumbingtx.com", domain: "lonestarplumbingtx.com", categories: ["home_services"], hideAddress: false, ownerEmail: "owner@example.com",
    });
    const scan = await store.createScan({ businessId: biz.id, status: "complete", directoriesTotal: 2, directoriesDone: 2, mode: "mock" });
    const findings: Finding[] = [
      { directoryId: "bbb", state: "not_found", confidence: 0.75, diffs: [], evidence: ev },
      { directoryId: "manta", state: "not_found", confidence: 0.75, diffs: [], evidence: ev },
    ];
    const order = await store.createOrder({ businessId: biz.id, scanId: scan.id, status: "paid", quote: buildQuote(findings), customerEmail: "owner@example.com" });
    const [bbb, manta] = await store.createSubmissions([
      { orderId: order.id, businessId: biz.id, directoryId: "bbb", action: "create", status: "published", method: "manual", priceCents: 1000 },
      { orderId: order.id, businessId: biz.id, directoryId: "manta", action: "create", status: "published", method: "manual", priceCents: 1000 },
    ]);
    // Mock context serves a page for this URL shape; a bogus URL returns no page → not_found/unable.
    await store.updateSubmission(bbb.id, { listingUrl: "https://www.bbb.org/biz/lone-star-plumbing-llc-irving" });
    await store.updateSubmission(manta.id, { listingUrl: "https://www.manta.com/biz/does-not-exist" });

    const past = new Date(Date.now() - 1000);
    await store.schedulePublicationChecks(bbb.id, [past]);
    await store.schedulePublicationChecks(manta.id, [past]);
    await store.schedulePublicationChecks(bbb.id, [new Date(Date.now() + 86_400_000)]); // future, must not run

    const before = listOutbox().length;
    const summary = await runDuePublicationChecks();
    expect(summary.due).toBe(2);
    expect(summary.stillLive + summary.changed).toBe(1);        // bbb page exists in mock
    expect(summary.unverifiable + summary.missing).toBe(1);     // manta page does not

    // Nothing left due
    expect((await store.listDuePublicationChecks(new Date())).length).toBe(0);

    // Completion report: both terminal → exactly one email, idempotent
    const sent = listOutbox().length - before;
    expect(sent).toBe(1);
    expect(listOutbox()[0].subject).toMatch(/Completion report/);
    expect(await maybeEmailCompletion(order.id)).toBe(false);
    expect((await store.getOrder(order.id))?.status).toBe("complete");
  });
});
