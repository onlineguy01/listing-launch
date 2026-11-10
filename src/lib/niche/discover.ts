import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getStore } from "@/lib/data";
import type { NicheSite } from "@/lib/domain/types";
import { CATEGORIES, type CategoryId } from "@/lib/directories/categories";
import { industrySitesFor } from "@/lib/directories/industryPacks";
import { DIRECTORIES } from "@/lib/directories/registry";

export const normalizeNiche = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const Suggested = z.object({
  sites: z.array(z.object({
    name: z.string().max(80),
    host: z.string().max(120).describe("Bare hostname, e.g. www.example.com"),
    url: z.string().max(300).describe("The page to list a business, or the homepage"),
    kind: z.enum(["directory", "marketplace", "profile", "association"]),
    who: z.enum(["we", "you", "manual"]).describe("we: a plain free directory submission an agency can do; you: requires the owner's identity, licence, merchant contract or personal account; manual: a directory submission that needs a human but not the owner"),
    note: z.string().max(200).describe("One sentence: what it is and how listing works (free/paid, verification)."),
  })).max(15),
});

export const discoveryEnabled = () => !!process.env.ANTHROPIC_API_KEY;

/**
 * Find vertical directories for a niche with web search, then probe each host so
 * only reachable, real sites are stored. Everything lands as `suggested` for ops
 * review; nothing here is sold until approved and promoted.
 */
export async function discoverNicheSites(nicheRaw: string, industry: CategoryId): Promise<NicheSite[]> {
  const niche = normalizeNiche(nicheRaw);
  const store = getStore();
  const existing = await store.listNicheSites(niche);
  if (existing.length) return existing;
  if (!discoveryEnabled()) return [];

  const known = new Set([...DIRECTORIES.map((d) => d.domains[0]), ...industrySitesFor(industry).map((s) => s.host.replace(/^www\./, ""))]);
  const client = new Anthropic();

  // Step 1: research with web search (text answer).
  const research = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 6000,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    system: "You research online business directories for a specific niche in the United States. Prefer sites that specifically serve this niche or its industry: associations with member directories, niche review sites, booking platforms, trade directories. Exclude general directories (Yelp, Yellow Pages, Google, Facebook, BBB) and sites you cannot confirm exist. For each site give its name, hostname, the listing/claim page if you find it, what kind of site it is, and how listing works.",
    messages: [{ role: "user", content: `Niche: ${niche}\nBroad industry: ${CATEGORIES[industry]}\nAlready known (skip these): ${[...known].slice(0, 40).join(", ")}\n\nFind up to 12 directories, review sites, associations or platforms where a business in this niche should be listed.` }],
  });
  const text = research.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
  if (!text.trim()) return [];

  // Step 2: structure it.
  const parsed = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(Suggested) },
    system: "Convert research notes into structured site records. Keep only sites with a concrete hostname. Classify honestly: marketplaces and licensed-professional profiles are 'you'.",
    messages: [{ role: "user", content: text }],
  });
  const sites = parsed.parsed_output?.sites ?? [];

  // Step 3: probe each host so dead or hallucinated sites never reach a customer.
  const probed = await Promise.all(sites.map(async (s) => ({ ...s, host: s.host.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""), probe: await probeHost(s.host) })));
  const keep = probed.filter((s) => s.host && !known.has(s.host.replace(/^www\./, "")) && s.probe.ok);
  return store.upsertNicheSites(keep.map((s) => ({
    niche, name: s.name, host: s.host, url: /^https?:\/\//.test(s.url) ? s.url : `https://${s.host}/`, kind: s.kind, who: s.who, note: s.note,
    status: "suggested", probe: s.probe, source: "web_search",
  })));
}

export async function probeHost(host: string): Promise<NonNullable<NicheSite["probe"]>> {
  const h = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const checkedAt = new Date().toISOString();
  try {
    const r = await fetch(`https://${h}/`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LocalBusinessBacklinks/1.0)", Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    const html = r.ok ? (await r.text()).toLowerCase() : "";
    const signals = ["add your business", "list your business", "claim your", "get listed", "add listing", "join", "member directory", "find a", "directory"].filter((k) => html.includes(k));
    return { ok: r.ok && html.length > 1500, status: r.status, signals, checkedAt };
  } catch {
    return { ok: false, signals: [], checkedAt };
  }
}
