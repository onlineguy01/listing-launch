/**
 * Directory fetchability probe. For each candidate: fetch the homepage, discover its
 * search form, run a search for a known business, and report status, structured data,
 * and whether the known listing was found. Run:
 *   NODE_USE_ENV_PROXY=1 npx tsx --tsconfig tsconfig.scripts.json scripts/probe-directories.ts [vertical]
 */
import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "node:fs";
import { extractJsonLdAll } from "../src/lib/scan/extract";
import { nameSimilarity } from "../src/lib/scan/match";
import { CANDIDATES, SAMPLE_BUSINESSES, type Candidate } from "./directory-candidates";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function get(url: string): Promise<{ status: number; html: string; finalUrl: string } | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    const html = (r.headers.get("content-type") ?? "").includes("html") ? await r.text() : "";
    return { status: r.status, html, finalUrl: r.url };
  } catch (e) {
    return null;
  }
}

/** Find a search form on the homepage: text input for the query, optional location input. */
function discoverSearchForm(html: string, base: string): string | null {
  const $ = cheerio.load(html);
  type Form = { action: string; q: string; loc?: string; method: string; hidden: [string, string][] };
  const forms: Form[] = [];
  $("form").each((_, f) => {
    const $f = $(f);
    const inputs = $f.find("input").toArray();
    const named = inputs.map((i) => ({ name: $(i).attr("name") ?? "", type: ($(i).attr("type") ?? "text").toLowerCase(), ph: ($(i).attr("placeholder") ?? "").toLowerCase(), value: $(i).attr("value") ?? "" }));
    const q = named.find((i) => i.name && i.type !== "hidden" && /^(q|query|search|search_terms|what|keyword|keywords|term|terms|searchTerm|s|find_text|find_desc|text|name|business)$/i.test(i.name))
      ?? named.find((i) => i.name && i.type !== "hidden" && /(search|what|keyword|business|name)/i.test(i.name + " " + i.ph));
    if (!q) return;
    const loc = named.find((i) => i.name && i.type !== "hidden" && i.name !== q.name && /(where|loc|location|near|city|geo|zip|find_loc|address|place)/i.test(i.name + " " + i.ph));
    const hidden: [string, string][] = named.filter((i) => i.type === "hidden" && i.name).map((i) => [i.name, i.value]);
    const action = new URL($f.attr("action") || "", base).toString();
    const method = ($f.attr("method") ?? "get").toLowerCase();
    forms.push({ action, q: q.name, loc: loc?.name, method, hidden });
  });
  const best = forms.find((f) => f.loc && f.method === "get") ?? forms.find((f) => f.method === "get");
  if (!best) return null;
  const u = new URL(best.action);
  for (const [k, v] of best.hidden) u.searchParams.set(k, v);
  u.searchParams.set(best.q, "{q}");
  if (best.loc) u.searchParams.set(best.loc, "{loc}");
  return decodeURIComponent(u.toString());
}

function fill(tpl: string, q: string, loc: string) {
  return tpl.replace("{q}", encodeURIComponent(q)).replace("{loc}", encodeURIComponent(loc)).replace("{q-slug}", slug(q)).replace("{loc-slug}", slug(loc));
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Result {
  id: string; name: string; host: string; tier: string; category?: string;
  homepage: number | "ERR"; searchUrl?: string; search?: number | "ERR"; bytes?: number;
  jsonld: number; anchorMatches: number; found: boolean; bestUrl?: string; note: string;
}

async function probe(c: Candidate, bizName: string, loc: string): Promise<Result> {
  const r: Result = { id: c.id, name: c.name, host: c.host, tier: c.tier, category: c.category, homepage: "ERR", jsonld: 0, anchorMatches: 0, found: false, note: "" };
  const home = await get(`https://${c.host}/`);
  if (!home) { r.note = "homepage unreachable (blocked host or network)"; return r; }
  r.homepage = home.status;
  if (home.status === 403 || home.status === 429) { r.note = "bot wall on homepage"; return r; }
  let tpl = c.searchUrl ?? (home.html ? discoverSearchForm(home.html, home.finalUrl) : null);
  if (!tpl) { r.note = "no search form discovered (likely JS-rendered); needs a hand-written URL"; return r; }
  r.searchUrl = tpl;
  const sr = await get(fill(tpl, bizName, loc));
  if (!sr) { r.search = "ERR"; r.note = "search request failed"; return r; }
  r.search = sr.status; r.bytes = sr.html.length;
  if (sr.status >= 400) { r.note = `search page ${sr.status}`; return r; }
  if (sr.html.length < 2000) { r.note = "near-empty response (JS app?)"; return r; }
  const ld = extractJsonLdAll(sr.html, sr.finalUrl).filter((o) => o.name);
  r.jsonld = ld.length;
  const $ = cheerio.load(sr.html);
  const host = new URL(sr.finalUrl).hostname.replace(/^www\./, "");
  const anchors: { url: string; text: string; sim: number }[] = [];
  $("a[href]").each((_, a) => {
    const text = $(a).text().replace(/\s+/g, " ").trim();
    if (text.length < 3 || text.length > 120) return;
    let url: string; try { url = new URL($(a).attr("href")!, sr.finalUrl).toString(); } catch { return; }
    if (!new URL(url).hostname.replace(/^www\./, "").endsWith(host)) return;
    const sim = nameSimilarity(bizName, text);
    if (sim >= 0.6) anchors.push({ url, text, sim });
  });
  anchors.sort((a, b) => b.sim - a.sim);
  r.anchorMatches = anchors.length;
  const ldHit = ld.find((o) => nameSimilarity(bizName, o.name) >= 0.8);
  if (ldHit) { r.found = true; r.bestUrl = ldHit.url; r.note = "found via results-page JSON-LD"; }
  else if (anchors.length) { r.found = true; r.bestUrl = anchors[0].url; r.note = `found via anchor text "${anchors[0].text}"`; }
  else r.note = sr.html.toLowerCase().includes(bizName.toLowerCase().split(" ")[0]) ? "name appears but no listing link detected" : "no match on results page";
  return r;
}

(async () => {
  const only = process.argv[2];
  const list = CANDIDATES.filter((c) => !only || c.category === only || c.tier === only);
  const out: Result[] = [];
  const pool = 4;
  let i = 0;
  await Promise.all(Array.from({ length: pool }, async () => {
    while (i < list.length) {
      const c = list[i++];
      const sample = SAMPLE_BUSINESSES[c.category ?? "general"] ?? SAMPLE_BUSINESSES.general;
      const r = await probe(c, sample.name, sample.loc);
      out.push(r);
      console.log(`${r.found ? "OK  " : "--  "} ${r.id.padEnd(16)} home=${String(r.homepage).padEnd(3)} search=${String(r.search ?? "-").padEnd(3)} ld=${String(r.jsonld).padEnd(2)} anchors=${String(r.anchorMatches).padEnd(2)} ${r.note}${r.bestUrl ? " -> " + r.bestUrl.slice(0, 90) : ""}`);
    }
  }));
  mkdirSync("probe-results", { recursive: true });
  writeFileSync("probe-results/latest.json", JSON.stringify(out, null, 2));
  console.log(`\n${out.filter((r) => r.found).length}/${out.length} found. Details in probe-results/latest.json`);
})();
