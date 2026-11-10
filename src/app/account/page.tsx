import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data";
import { currentUserEmail } from "@/lib/security/currentUser";
import { formatCents } from "@/lib/scan/quote";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const email = await currentUserEmail();
  if (!email) redirect("/login");
  const store = getStore();
  const [orders, scans] = await Promise.all([store.listOrdersByEmail(email), store.listScansByEmail(email)]);
  const bizIds = [...new Set([...orders.map((o) => o.businessId), ...scans.map((s) => s.businessId)])];
  const bizList = await Promise.all(bizIds.map((id) => store.getBusiness(id)));
  const bizName = new Map(bizIds.map((id, i) => [id, bizList[i]?.name ?? "Business"]));
  const subsByOrder = new Map(await Promise.all(orders.map(async (o) => [o.id, await store.listSubmissions({ orderId: o.id })] as const)));
  const orderedScanIds = new Set(orders.map((o) => o.scanId));

  return (
    <div className="grid gap-8 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Your account</p>
          <h1 className="text-2xl font-semibold">{email}</h1>
        </div>
        <form action="/api/auth/logout" method="post"><button className="btn btn-ghost">Sign out</button></form>
      </div>

      <section className="grid gap-3">
        <h2 className="font-semibold">Orders</h2>
        {orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
        {orders.map((o) => {
          const subs = subsByOrder.get(o.id) ?? [];
          const live = subs.filter((s) => s.status === "published").length;
          const needsYou = subs.filter((s) => s.status === "verification_required").length;
          return (
            <Link key={o.id} href={`/order/${o.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-accent/50">
              <div>
                <div className="font-medium">{bizName.get(o.businessId)}</div>
                <div className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()} · {o.quote.items.length} listings · {formatCents(o.quote.totalCents)} · {o.status}</div>
              </div>
              <div className="text-sm">
                <span className="text-ok">{live} live</span>
                {needsYou > 0 && <span className="ml-3 rounded bg-warn/10 px-2 py-0.5 text-xs text-warn">{needsYou} need you</span>}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">Scans</h2>
        {scans.length === 0 && <p className="text-sm text-muted">No scans yet. <Link className="text-accent" href="/">Run one</Link>.</p>}
        {scans.map((s) => (
          <Link key={s.id} href={`/report/${s.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-accent/50">
            <div>
              <div className="font-medium">{bizName.get(s.businessId)}</div>
              <div className="text-xs text-muted">{new Date(s.createdAt).toLocaleDateString()} · {s.directoriesDone}/{s.directoriesTotal} directories · {s.status}</div>
            </div>
            <span className="text-sm text-muted">{orderedScanIds.has(s.id) ? "Ordered" : "View report"}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
