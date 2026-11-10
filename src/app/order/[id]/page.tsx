import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data";
import { getDirectory } from "@/lib/directories/registry";
import { formatCents, GUARANTEE_DAYS } from "@/lib/pricing/packages";
import { googleOAuthEnabled } from "@/lib/google/oauth";
import { currentUserEmail } from "@/lib/security/currentUser";
import { ConfirmLiveButton } from "@/components/ConfirmLiveButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  prepared: "Queued", submitted: "Submitted", verification_required: "Needs your confirmation",
  published: "Live", rejected: "Rejected by directory", not_eligible: "Not eligible", failed: "Not completed",
};
const ACTION_LABEL: Record<string, string> = { create: "Create listing", correct: "Correct listing", verify: "Submit and verify", review: "Review, then fix" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) notFound();
  const biz = await store.getBusiness(order.businessId);
  const subs = await store.listSubmissions({ orderId: id });
  const needsDetails = !biz?.detailsCompletedAt;
  const hasGoogleItem = order.quote.items.some((i) => i.directoryId === "google");
  const googleConnected = !!biz?.googleRefreshTokenEnc;
  const sessionEmail = await currentUserEmail();
  const isOwner = !!sessionEmail && [order.customerEmail, biz?.ownerEmail].filter(Boolean).map((e) => e!.toLowerCase()).includes(sessionEmail.toLowerCase());
  const verified = subs.filter((s) => s.billingStatus === "verified").length;
  const refunded = subs.filter((s) => s.billingStatus === "refunded").length;
  const deadline = order.paidAt ? new Date(new Date(order.paidAt).getTime() + GUARANTEE_DAYS * 86_400_000) : null;

  return (
    <div className="grid gap-8 max-w-3xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Order {order.status === "draft" ? "pending payment" : order.status === "complete" ? "complete" : "confirmed"}</p>
        <h1 className="text-3xl font-bold">{sp.paid || sp.demo ? "Thank you. We're on it." : "Your order"}</h1>
        <p className="text-muted">{biz?.name} · {order.quote.packageName} · {formatCents(order.quote.totalCents)} one-time{order.refundedCents > 0 && <> · {formatCents(order.refundedCents)} refunded</>}</p>
        {sp.demo && <p className="mt-2 inline-block rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">Demo mode: no payment was taken.</p>}
        {sp.details === "saved" && <p className="mt-2 inline-block rounded-md bg-ok/10 px-2 py-1 text-xs text-ok">Details saved. Thank you.</p>}
        {sp.google === "connected" && <p className="mt-2 inline-block rounded-md bg-ok/10 px-2 py-1 text-xs text-ok">Google account connected{sp.gbp === "found" ? " and your existing profile was found" : ""}.</p>}
      </div>

      {(needsDetails || (hasGoogleItem && googleOAuthEnabled() && !googleConnected)) && (
        <section className="card border-accent/40 p-6 grid gap-3">
          <h2 className="font-semibold">One quick thing we need from you</h2>
          <ul className="grid gap-3 text-sm">
            {needsDetails && (
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>Hours, services, service area and a short description. About 3 minutes.</span>
                <Link href={`/order/${id}/details`} className="btn btn-primary">Complete listing details</Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="card p-6 grid gap-3">
        <h2 className="font-semibold">Our guarantee</h2>
        <p className="text-sm text-muted">
          Every listing below is charged once and then verified live: by our scanner, by our team, or by you clicking “Yes, it's live”.
          Anything not confirmed by {deadline ? deadline.toLocaleDateString() : `day ${GUARANTEE_DAYS}`} is refunded automatically to your card.
          {verified > 0 && <> So far <strong className="text-foreground">{verified} of {subs.length}</strong> confirmed live.</>}
          {refunded > 0 && <> {refunded} refunded.</>}
        </p>
      </section>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Directory</th><th className="px-4 py-2">Work</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Billing</th></tr></thead>
          <tbody>
            {(subs.length ? subs : order.quote.items.map((i) => ({ id: i.directoryId, directoryId: i.directoryId, action: i.action, status: "prepared", listingUrl: undefined as string | undefined, billingStatus: "charged" as const, priceCents: i.priceCents }))).map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-medium">{getDirectory(s.directoryId).name}</td>
                <td className="px-4 py-3 text-muted">{ACTION_LABEL[s.action] ?? s.action}</td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[s.status] ?? s.status}
                  {s.listingUrl && <a className="ml-2 text-accent hover:underline" href={s.listingUrl} target="_blank" rel="noreferrer">View ↗</a>}
                  {subs.length > 0 && s.billingStatus === "charged" && ["submitted", "published", "verification_required"].includes(s.status) && (
                    <div className="mt-1">
                      {isOwner ? <ConfirmLiveButton orderId={id} submissionId={s.id} /> : <Link href="/login" className="text-xs text-accent hover:underline">Sign in to confirm it's live</Link>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {s.billingStatus === "verified" && <span className="rounded-full bg-ok/10 px-2 py-0.5 text-ok">Verified live</span>}
                  {s.billingStatus === "charged" && <span className="rounded-full bg-neutral/10 px-2 py-0.5 text-neutral">Pending verification · {formatCents(s.priceCents)}</span>}
                  {s.billingStatus === "refunded" && <span className="rounded-full bg-warn/10 px-2 py-0.5 text-warn">Refunded {formatCents(s.priceCents)}</span>}
                  {s.billingStatus === "substituted" && <span className="rounded-full bg-neutral/10 px-2 py-0.5 text-neutral">Substituted</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-muted">Bookmark this page. It updates as work completes. Order ID {order.id} · <Link href="/terms" className="text-accent hover:underline">Terms</Link></p>
    </div>
  );
}
