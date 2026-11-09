"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/directories/categories";
import type { Suggestion, PlaceDetails } from "@/lib/places/client";

export function IntakeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placesOn, setPlacesOn] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const tokenRef = useRef<string>(crypto.randomUUID());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Probe once whether autocomplete is configured.
  useEffect(() => {
    fetch("/api/places/autocomplete?input=").then((r) => r.json()).then((j) => setPlacesOn(!!j.enabled)).catch(() => setPlacesOn(false));
  }, []);

  function onNameInput(v: string) {
    setPicked(null);
    if (!placesOn) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (v.trim().length < 3) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      const r = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(v)}&token=${tokenRef.current}`);
      const j = await r.json();
      setSuggestions(j.suggestions ?? []);
    }, 250);
  }

  async function pick(s: Suggestion) {
    setSuggestions([]);
    const r = await fetch(`/api/places/details?placeId=${encodeURIComponent(s.placeId)}&token=${tokenRef.current}`);
    tokenRef.current = crypto.randomUUID(); // a session token is spent on details
    if (!r.ok) return;
    const d: PlaceDetails = await r.json();
    const f = formRef.current!;
    const set = (name: string, v?: string) => { const el = f.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null; if (el && v !== undefined) el.value = v; };
    set("name", d.name); set("phone", d.phone); set("website", d.website?.replace(/^https?:\/\//, ""));
    set("street", d.street); set("city", d.city); set("state", d.state); set("postalCode", d.postalCode); set("category", d.category);
    (f.elements.namedItem("googlePlaceId") as HTMLInputElement).value = d.placeId;
    setPicked(`${d.name}, ${d.city ?? ""} ${d.state ?? ""}`.trim());
  }

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
    <form ref={formRef} onSubmit={onSubmit} className="card p-6 grid gap-4" autoComplete="off">
      <input type="hidden" name="googlePlaceId" />
      <div className="relative">
        <label className="label" htmlFor="name">Business name</label>
        <input className="input" id="name" name="name" required placeholder={placesOn ? "Start typing to find your business…" : "Lone Star Plumbing LLC"} onChange={(e) => onNameInput(e.target.value)} />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button type="button" onClick={() => pick(s)} className="block w-full px-3 py-2 text-left text-sm hover:bg-background">
                  <span className="font-medium">{s.mainText}</span> <span className="text-muted">{s.secondaryText}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked && <p className="mt-1 text-xs text-ok">Filled from Google: {picked}. Check the details below and edit anything that is wrong.</p>}
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
