import type { AdapterContext, SearchHit } from "@/lib/adapters/types";
import type { CanonicalBusiness } from "@/lib/domain/types";
import { DIRECTORIES } from "@/lib/directories/registry";

/**
 * Demo-mode context. Fabricates plausible directory pages (with JSON-LD) for a
 * deterministic subset of directories so the full scan → report → quote flow
 * can be exercised without API keys. Clearly a simulation; the UI labels it.
 */
export function createMockContext(biz: CanonicalBusiness, log: AdapterContext["log"] = () => {}): AdapterContext {
  const seed = hash(biz.name + biz.city);
  // Decide each directory's fate deterministically from the seed.
  const fate = new Map<string, "accurate" | "wrong_phone" | "wrong_address" | "missing" | "ambiguous">();
  DIRECTORIES.forEach((d, i) => {
    const r = (seed >> (i % 28)) & 7;
    fate.set(d.id, r <= 1 ? "accurate" : r === 2 ? "wrong_phone" : r === 3 ? "wrong_address" : r === 4 ? "ambiguous" : "missing");
  });
  // Always make the maps trio present so demos look realistic.
  fate.set("google", "accurate");
  fate.set("yelp", (seed & 1) ? "wrong_phone" : "accurate");

  const pages = new Map<string, string>();
  const hits = new Map<string, SearchHit[]>();
  for (const d of DIRECTORIES) {
    const f = fate.get(d.id)!;
    if (f === "missing") { hits.set(d.id, []); continue; }
    const url = `https://www.${d.domains[0]}/biz/${slug(biz.name)}-${slug(biz.city)}`;
    const phone = f === "wrong_phone" ? "(214) 555-0199" : biz.phoneE164 ?? "";
    const street = f === "wrong_address" ? "123 Old Address Rd" : biz.street ?? "";
    const name = f === "ambiguous" ? `${biz.name.split(" ")[0]} Services` : biz.name;
    pages.set(url, jsonLdPage({ name, phone, street, city: biz.city, state: biz.state, postal: biz.postalCode ?? "", website: f === "ambiguous" ? "" : biz.website ?? "" }));
    hits.set(d.id, [{ url, title: `${name} - ${biz.city}, ${biz.state} | ${d.name}` }]);
  }

  return {
    log,
    async search(query) {
      await delay(120 + (hash(query) % 200));
      const m = /site:([^\s]+)/.exec(query);
      const host = m?.[1] ?? "";
      const d = DIRECTORIES.find((x) => x.domains[0] === host);
      return d ? hits.get(d.id) ?? [] : [];
    },
    async fetchHtml(url) {
      await delay(80);
      return pages.get(url) ?? null;
    },
  };
}

function jsonLdPage(o: { name: string; phone: string; street: string; city: string; state: string; postal: string; website: string }): string {
  const ld = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: o.name, telephone: o.phone,
    url: o.website || undefined,
    address: { "@type": "PostalAddress", streetAddress: o.street, addressLocality: o.city, addressRegion: o.state, postalCode: o.postal },
  };
  return `<!doctype html><html><head><title>${o.name}</title><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body><h1>${o.name}</h1></body></html>`;
}

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function hash(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
