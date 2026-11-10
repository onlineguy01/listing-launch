import { AdminLoginForm } from "@/components/AdminLoginForm";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm grid gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Ops</p>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted">Enter the admin token for this deployment.</p>
      </div>
      <AdminLoginForm next={next ?? "/admin"} />
    </div>
  );
}
