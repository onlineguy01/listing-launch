import Link from "next/link";

/** Admin-only sub-navigation. These links never appear on public pages. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6">
      <nav className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">Admin</span>
        <Link href="/admin" className="hover:text-accent">Ops queue</Link>
        <Link href="/admin/metrics" className="hover:text-accent">Metrics</Link>
        <Link href="/admin/outbox" className="hover:text-accent">Email outbox</Link>
        <form action="/api/admin/login" method="post" className="ml-auto">
          <button formAction="/api/admin/logout" className="text-xs text-muted hover:text-foreground">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
