import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data";
import { getDirectory } from "@/lib/directories/registry";
import { formatCents } from "@/lib/scan/quote";
import { googleOAuthEnabled } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  prepared: "Queued", submitted: "Submitted", verification_required: "Needs your confirmation",
  published: "Live", rejected: "Rejected by directory", not_eligible: "Not eligible", failed: "Failed",
};

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

  return (
    <div className="grid gap-8 max-w-3xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Order {order.status === "draft" ? "pending payment" : "confirmed"}</p>
        <h1 className="text-3xl font-bold">{sp.paid || sp.demo ? "Thank you. We're on it." : "Your order"}</h1>
        <p className="text-muted">{biz?.name} · {formatCents(order.quote.totalCents)} one-time</p>
        {sp.demo && <p className="mt-2 inline-block rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">Demo mode: no payment was taken.</p>}
        {sp.details === "saved" && <p className="mt-2 inline-block rounded-md bg-ok/10 px-2 py-1 text-xs text-ok">Details saved. Thank you.</p>}
        {sp.google === "connected" && <p className="mt-2 inline-block rounded-md bg-ok/10 px-2 py-1 text-xs text-ok">Google account connected{sp.gbp === "found" ? " and your existing profile was found" : ""}.</p>}
        {sp.google && sp.google !== "connected" && <p className="mt-2 inline-block rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">Google connection did not complete ({sp.google}). You can try again below.</p>}
      </div>

      {(needsDetails || (hasGoogleItem && googleOAuthEnabled() && !googleConnected)) && (
        <section className="card border-accent/40 p-6 grid gap-3">
          <h2 className="font-semibold">Two quick things we need from you</h2>
          <ul className="grid gap-3 text-sm">
            {needsDetails && (
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>Hours, services, service area and a short description. About 3 minutes.</span>
                <Link href={`/order/${id}/details`} className="btn btn-primary">Complete listing details</Link>
              </li>
            )}
            {hasGoogleItem && googleOAuthEnabled() && !googleConnected && (
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>Google requires the owner to authorize changes to a Business Profile. Sign in with the Google account that owns (or should own) it.</span>
                <a href={`/api/google/auth?businessId=${order.businessId}&orderId=${id}`} className="btn btn-ghost">Connect Google Business Profile</a>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="card p-6 grid gap-3">
        <h2 className="font-semibold">What happens next</h2>
        <ol className="grid gap-2 text-sm text-muted list-decimal pl-5">
          <li>We prepare each listing from the details you gave us. If a directory needs more (logo, description, service area), we email you a short form.</li>
          <li>We submit each listing. Some directories email or text <em>you</em> a confirmation code; we will tell you exactly when to expect each one.</li>
          <li>We re-check every listing at 3, 14 and 30 days and send you a completion report with live links and any logins we created for you.</li>
        </ol>
      </section>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Directory</th><th className="px-4 py-2">Work</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody>
            {(subs.length ? subs : order.quote.items.map((i) => ({ id: i.directoryId, directoryId: i.directoryId, action: i.action, status: "prepared", listingUrl: undefined as string | undefined }))).map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{getDirectory(s.directoryId).name}</td>
                <td className="px-4 py-3 text-muted">{s.action === "create" ? "Create listing" : "Correct listing"}</td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[s.status] ?? s.status}
                  {s.listingUrl && <a className="ml-2 text-accent hover:underline" href={s.listingUrl} target="_blank" rel="noreferrer">View ↗</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-muted">Bookmark this page. It updates as work completes. Order ID {order.id}</p>
    </div>
  );
}
