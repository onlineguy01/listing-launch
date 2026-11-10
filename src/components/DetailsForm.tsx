"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CanonicalBusiness, Hours } from "@/lib/domain/types";

const DAYS: { key: keyof Hours; label: string }[] = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" }, { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];
const PAYMENTS = ["Cash", "Check", "Visa", "Mastercard", "American Express", "Discover", "Apple Pay", "Google Pay", "Zelle", "Venmo", "Financing"];

type DayHours = { open: boolean; from: string; to: string };

export function DetailsForm({ biz, orderId }: { biz: CanonicalBusiness; orderId: string }) {
  const router = useRouter();
  const [services, setServices] = useState((biz.services ?? []).join(", "));
  const [serviceArea, setServiceArea] = useState((biz.serviceArea ?? []).join(", "));
  const [yearFounded, setYearFounded] = useState(biz.yearFounded ? String(biz.yearFounded) : "");
  const [payments, setPayments] = useState<string[]>(biz.paymentMethods ?? []);
  const [logoUrl, setLogoUrl] = useState(biz.logoUrl ?? "");
  const [short, setShort] = useState(biz.descriptionShort ?? "");
  const [long, setLong] = useState(biz.descriptionLong ?? "");
  const [hours, setHours] = useState<Record<string, DayHours>>(() =>
    Object.fromEntries(DAYS.map((d) => {
      const h = biz.hours?.[d.key]?.[0];
      const weekday = !["sat", "sun"].includes(d.key);
      return [d.key, h ? { open: true, from: h[0], to: h[1] } : { open: weekday, from: "08:00", to: "17:00" }];
    })),
  );
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  async function draft() {
    setDrafting(true); setDraftNote(null);
    const r = await fetch("/api/describe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: biz.id, services: list(services), serviceArea: list(serviceArea), yearFounded: yearFounded ? Number(yearFounded) : null, paymentMethods: payments }),
    });
    const j = await r.json();
    if (r.ok) {
      setShort(j.drafts.short); setLong(j.drafts.long);
      setDraftNote(j.source === "ai" ? "Drafted from your facts only. Edit anything you like." : "Drafted from a template (AI key not configured). Edit anything you like.");
    } else setDraftNote(j.error ?? "Could not draft");
    setDrafting(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const hoursOut: Hours = {};
    for (const d of DAYS) { const h = hours[d.key]; hoursOut[d.key] = h.open ? [[h.from, h.to]] : []; }
    const r = await fetch(`/api/business/${biz.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descriptionShort: short, descriptionLong: long, logoUrl, services: list(services), serviceArea: list(serviceArea),
        yearFounded: yearFounded ? Number(yearFounded) : null, paymentMethods: payments, hours: hoursOut, markDetailsComplete: true,
      }),
    });
    if (!r.ok) { setError((await r.json()).error ?? "Could not save"); setSaving(false); return; }
    router.push(`/order/${orderId}?details=saved`);
  }

  return (
    <form onSubmit={save} className="grid gap-6">
      <section className="card p-6 grid gap-4">
        <h2 className="font-semibold">Facts about your business</h2>
        <p className="text-sm text-muted">Only what you enter here goes on your listings. We never add services, credentials or claims you did not give us.</p>
        <div>
          <label className="label" htmlFor="services">Services you offer (comma separated)</label>
          <input id="services" className="input" value={services} onChange={(e) => setServices(e.target.value)} placeholder="water heater repair, drain cleaning, repiping" />
        </div>
        <div>
          <label className="label" htmlFor="area">Cities or ZIP codes you serve (comma separated)</label>
          <input id="area" className="input" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="Irving, Las Colinas, Coppell, 75038" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="year">Year founded (optional)</label>
            <input id="year" className="input" inputMode="numeric" value={yearFounded} onChange={(e) => setYearFounded(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2019" />
          </div>
          <div>
            <label className="label" htmlFor="logo">Logo URL (optional)</label>
            <input id="logo" className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://yoursite.com/logo.png" />
          </div>
        </div>
        <div>
          <div className="label">Payment methods accepted</div>
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <label key={p} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${payments.includes(p) ? "border-accent bg-accent/10" : "border-border"}`}>
                <input type="checkbox" className="sr-only" checked={payments.includes(p)} onChange={(e) => setPayments((s) => (e.target.checked ? [...s, p] : s.filter((x) => x !== p)))} />
                {p}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6 grid gap-3">
        <h2 className="font-semibold">Business hours</h2>
        <div className="grid gap-2">
          {DAYS.map((d) => {
            const h = hours[d.key];
            return (
              <div key={d.key} className="grid grid-cols-[3rem_5rem_1fr_1fr] items-center gap-2 text-sm">
                <span className="font-medium">{d.label}</span>
                <label className="flex items-center gap-1"><input type="checkbox" checked={h.open} onChange={(e) => setHours((s) => ({ ...s, [d.key]: { ...h, open: e.target.checked } }))} /> Open</label>
                <input type="time" className="input" disabled={!h.open} value={h.from} onChange={(e) => setHours((s) => ({ ...s, [d.key]: { ...h, from: e.target.value } }))} />
                <input type="time" className="input" disabled={!h.open} value={h.to} onChange={(e) => setHours((s) => ({ ...s, [d.key]: { ...h, to: e.target.value } }))} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Descriptions</h2>
          <button type="button" className="btn btn-ghost" onClick={draft} disabled={drafting}>{drafting ? "Drafting…" : "Draft from my facts"}</button>
        </div>
        {draftNote && <p className="text-xs text-muted">{draftNote}</p>}
        <div>
          <label className="label" htmlFor="short">Short description <span className="text-muted">({short.length}/160)</span></label>
          <input id="short" className="input" maxLength={160} value={short} onChange={(e) => setShort(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="long">Long description <span className="text-muted">({long.length}/750)</span></label>
          <textarea id="long" className="input" rows={4} maxLength={750} value={long} onChange={(e) => setLong(e.target.value)} />
        </div>
      </section>

      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save details"}</button>
    </form>
  );
}
