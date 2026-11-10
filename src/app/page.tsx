import { IntakeForm } from "@/components/IntakeForm";
import { DIRECTORIES } from "@/lib/directories/registry";
import { industryPackSummary } from "@/lib/pricing/packs";
import { KIND_LABEL } from "@/lib/directories/industryPacks";

const ACTIVE = DIRECTORIES.filter((d) => d.active);
const CORE = ACTIVE.filter((d) => !d.sellable);
const HANDLED = ACTIVE.filter((d) => d.sellable);
const TIER_LABEL: Record<string, string> = { aggregator: "Data aggregators", general: "General directories", industry: "Industry directories", local: "Local directories" };

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
            We check {ACTIVE.length} of the directories customers and search engines actually use, show you
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

      <section id="directories" className="grid gap-6">
        <div>
          <h2 className="text-2xl font-semibold">Three packs for every business</h2>
          <p className="text-muted">A core pack everyone needs, an industry pack for where your customers actually look, and a local pack for your city.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6 grid content-start gap-3">
            <div>
              <h3 className="font-semibold">Core profiles: checked free, fixed by you</h3>
              <p className="text-sm text-muted">Only the owner can claim these. We tell you whether each one is accurate, wrong or missing, and exactly what to do.</p>
            </div>
            <ul className="flex flex-wrap content-start items-start gap-2">
              {CORE.map((d) => <li key={d.id} className="rounded-full border border-border bg-background px-3 py-1 text-sm">{d.name}</li>)}
            </ul>
          </div>
          <div className="card p-6 grid gap-3">
            <div>
              <h3 className="font-semibold">Directories we create and correct for you</h3>
              <p className="text-sm text-muted">Included in a one-time package. Every listing is verified live or refunded.</p>
            </div>
            {(["aggregator", "general", "industry", "local"] as const).map((tier) => {
              const list = HANDLED.filter((d) => d.tier === tier);
              if (!list.length) return null;
              return (
                <div key={tier} className="grid gap-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">{TIER_LABEL[tier]}</div>
                  <ul className="flex flex-wrap gap-2">
                    {list.map((d) => <li key={d.id} className="rounded-full border border-border bg-background px-3 py-1 text-sm">{d.name}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3">
          <h3 className="font-semibold">Industry packs</h3>
          <p className="text-sm text-muted">Pick your industry on the form and your report includes the sites below. Marketplaces and professional profiles are labeled: you sign up for those, and we tell you whether you are there.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {industryPackSummary().map((p) => (
              <details key={p.id} className="card px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">{p.label} <span className="text-muted font-normal">· {p.sites.length} sites</span></summary>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {p.sites.map((s) => (
                    <li key={s.id} className={`rounded-full border px-2.5 py-0.5 text-xs ${s.kind === "marketplace" ? "border-warn/40 text-warn" : s.kind === "profile" ? "border-border text-muted" : "border-accent/40 text-accent"}`} title={KIND_LABEL[s.kind]}>{s.name}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <p className="text-xs text-muted">Teal: directory we can submit for you. Amber: marketplace. Grey: professional profile.</p>
        </div>
      </section>
    </div>
  );
}
