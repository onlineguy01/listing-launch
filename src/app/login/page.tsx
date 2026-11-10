import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/components/MagicLinkForm";
import { currentUserEmail } from "@/lib/security/currentUser";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUserEmail()) redirect("/account");
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm grid gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Your account</p>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted">See your reports, orders and listing progress.</p>
      </div>
      {error === "expired" && <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">That link expired or was already used. Request a new one.</p>}
      <MagicLinkForm />
    </div>
  );
}
