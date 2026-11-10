import { IntakeForm } from "@/components/IntakeForm";
import { DIRECTORIES } from "@/lib/directories/registry";

export default function Home() {
  return (
    <div className="grid gap-12">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="grid gap-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Free listing scan</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Find out where your business is missing or wrong online. Fix it once.
          </h1>
          <p className="text-lg text-muted">
            We check {DIRECTORIES.length} of the directories customers and search engines actually use, show you
            exactly what we found, and offer a one-time fix. Every listing we create is a real citation for your
            business, and most link back to your website. No subscription. No sales call.
          </p>
          <ul className="grid gap-2 text-sm">
            <li className="flex gap-2"><span className="text-ok">✓</span> See accurate, incorrect and missing listings with evidence links</li>
            <li className="flex gap-2"><span className="text-ok">✓</span> Pay once, only for the listings that actually need work</li>
            <li className="flex gap-2"><span className="text-ok">✓</span> You own every listing and account we set up</li>
          </ul>
        </div>
        <IntakeForm />
      </section>

      <section id="how" className="grid gap-4">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ["Scan", "We search each directory for your name, phone and website and compare what we find against your details."],
            ["Report", "A plain-English report: what's right, what's wrong, what's missing, and what we could not verify."],
            ["Fix", "Buy a one-time package. We create and correct listings, handle verification steps with you, and send live links."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <div className="text-xs font-semibold text-muted">Step {i + 1}</div>
              <div className="mt-1 font-semibold">{t}</div>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3">
        <h2 className="text-2xl font-semibold">Directories we check</h2>
        <div className="flex flex-wrap gap-2">
          {DIRECTORIES.map((d) => (
            <span key={d.id} className="rounded-full border border-border bg-card px-3 py-1 text-sm">{d.name}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
