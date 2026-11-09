"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/directories/categories";

export function IntakeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    body.hideAddress = fd.get("hideAddress") === "on";
    const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setBusy(false);
      return;
    }
    router.push(`/scan/${json.scanId}`);
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 grid gap-4">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input className="input" id="name" name="name" required placeholder="Lone Star Plumbing LLC" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">Business phone</label>
          <input className="input" id="phone" name="phone" placeholder="(214) 555-0100" />
        </div>
        <div>
          <label className="label" htmlFor="website">Website</label>
          <input className="input" id="website" name="website" placeholder="lonestarplumbingtx.com" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="street">Street address</label>
        <input className="input" id="street" name="street" placeholder="4521 N Beltline Rd Ste 200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_6rem_8rem]">
        <div>
          <label className="label" htmlFor="city">City</label>
          <input className="input" id="city" name="city" required placeholder="Irving" />
        </div>
        <div>
          <label className="label" htmlFor="state">State</label>
          <input className="input" id="state" name="state" required placeholder="TX" />
        </div>
        <div>
          <label className="label" htmlFor="postalCode">ZIP</label>
          <input className="input" id="postalCode" name="postalCode" placeholder="75038" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="category">Business type</label>
        <select className="input" id="category" name="category" defaultValue="home_services">
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hideAddress" className="h-4 w-4" />
        I work from home or only serve customers at their location (hide my street address)
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "Starting scan…" : "Run my free scan"}</button>
      <p className="text-xs text-muted">Takes about a minute. No account needed to see your results.</p>
    </form>
  );
}
