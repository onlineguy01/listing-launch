import { emailEnabled, listOutbox } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

export default function OutboxPage() {
  const mails = listOutbox();
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Email outbox</p>
        <h1 className="text-2xl font-semibold">{emailEnabled() ? "Resend is configured; this page shows nothing." : `${mails.length} email${mails.length === 1 ? "" : "s"} captured in demo mode`}</h1>
        <p className="text-sm text-muted">Without a Resend key, every email the app would send lands here instead.</p>
      </div>
      {mails.map((m) => (
        <details key={m.id} className="card p-4">
          <summary className="cursor-pointer text-sm"><span className="font-medium">{m.subject}</span> <span className="text-muted">→ {m.to} · {new Date(m.at).toLocaleString()}</span></summary>
          <iframe title={m.subject} srcDoc={m.html} className="mt-4 h-[520px] w-full rounded-lg border border-border bg-white" sandbox="" />
        </details>
      ))}
    </div>
  );
}
