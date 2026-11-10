import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES, type CategoryId } from "@/lib/directories/categories";
import { extractJsonLdAll } from "@/lib/scan/extract";
import { normalizePhone } from "@/lib/scan/normalize";

/** What we learn from a business website: contact facts to prefill, and a classification. */
export interface WebsiteAnalysis {
  url: string;
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  industry: CategoryId;
  niche: string;
  confidence: number;
  services: string[];
  source: "llm" | "heuristic";
  pages: string[];
}

const UA = "Mozilla/5.0 (compatible; LocalBusinessBacklinks/1.0; +https://localbusinessbacklinks.com)";

async function fetchText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return await r.text();
  } catch { return null; }
}

/** Only public http(s) hostnames; never loopback, private ranges, link-local, or bare IPs (SSRF guard). */
export function normalizeUrl(input: string): string {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  const u = new URL(s);
  u.hash = "";
  const h = u.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(h) || !h.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.endsWith(".local") || h.endsWith(".internal") || h === "localhost" || h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.startsWith("169.254.") || h.endsWith(".localhost")) {
    throw new Error("Enter a public website address.");
  }
  if (u.port && !["80", "443", ""].includes(u.port)) throw new Error("Enter a public website address.");
  return u.toString();
}

/** Visible text of a page, trimmed. */
function pageText($: cheerio.CheerioAPI, max = 6000): string {
  $("script, style, noscript, svg, nav, footer, header form").remove();
  return $("body").text().replace(/\s+/g, " ").trim().slice(0, max);
}

const US_ADDRESS = /(\d{1,6}\s+[A-Za-z0-9.'\- ]{2,40}?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Parkway|Pkwy|Highway|Hwy|Place|Pl|Trail|Trl|Circle|Cir)\.?(?:\s*(?:Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+)?)[,\s]+([A-Za-z .'\-]{2,40}?)[,\s]+([A-Z]{2})\s+(\d{5})(?:-\d{4})?/;

export async function analyzeWebsite(input: string): Promise<WebsiteAnalysis> {
  const url = normalizeUrl(input);
  const home = await fetchText(url);
  if (!home) throw new Error("Could not fetch that website. Check the address, or enter your details by hand.");
  const pages = [url];
  const $ = cheerio.load(home);
  const ld = extractJsonLdAll(home, url)[0];
  let text = pageText($);

  // Contact page often holds the NAP; one extra fetch.
  const contactHref = $('a[href*="contact" i]').first().attr("href");
  if (contactHref) {
    try {
      const cu = new URL(contactHref, url).toString();
      const ch = await fetchText(cu);
      if (ch) { pages.push(cu); text += " " + pageText(cheerio.load(ch), 3000); }
    } catch { /* ignore */ }
  }

  const name = ld?.name ?? $('meta[property="og:site_name"]').attr("content") ?? $('meta[property="og:title"]').attr("content") ?? $("title").text().split(/[|\-–]/)[0].trim();
  const telHref = $('a[href^="tel:"]').first().attr("href")?.replace(/^tel:/, "");
  const phone = normalizePhone(ld?.phone ?? telHref ?? (text.match(/\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/)?.[0] ?? null));
  const addr = US_ADDRESS.exec(text);
  const facts = {
    name: name?.trim() || undefined, phone,
    street: ld?.street ?? addr?.[1]?.trim(), city: ld?.city ?? addr?.[2]?.trim(), state: ld?.state ?? addr?.[3], postalCode: ld?.postalCode ?? addr?.[4],
  };

  const description = $('meta[name="description"]').attr("content") ?? "";
  const cls = await classifyBusiness({ name: facts.name, description, text: text.slice(0, 4000), url });
  return { url, ...facts, ...cls, pages };
}

const Classification = z.object({
  industry: z.enum(Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]]).describe("The closest broad industry."),
  niche: z.string().max(60).describe("A specific 2-5 word niche in lowercase, e.g. 'mobile dog grooming', 'tattoo studio', 'commercial roofing contractor'."),
  services: z.array(z.string().max(60)).max(10).describe("Services clearly offered on the site. Facts only."),
  confidence: z.number().min(0).max(1),
});

export async function classifyBusiness(input: { name?: string; description: string; text: string; url: string }): Promise<{ industry: CategoryId; niche: string; services: string[]; confidence: number; source: "llm" | "heuristic" }> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const response = await client.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 1500,
        output_config: { effort: "low", format: zodOutputFormat(Classification) },
        system: "You classify local business websites. Use only what the page text says. Pick the single closest industry from the list and a short specific niche. Never invent services.",
        messages: [{ role: "user", content: `Website: ${input.url}\nName: ${input.name ?? "(unknown)"}\nMeta description: ${input.description}\n\nPage text:\n${input.text}` }],
      });
      if (response.stop_reason !== "refusal" && response.parsed_output) return { ...response.parsed_output, source: "llm" };
    } catch (e) { console.error("classify: LLM failed, using heuristics", e); }
  }
  return { ...heuristicClassify(`${input.name ?? ""} ${input.description} ${input.text}`), source: "heuristic" };
}

/** Keyword classifier used without an API key or when the model fails. */
export function heuristicClassify(text: string): { industry: CategoryId; niche: string; services: string[]; confidence: number } {
  const t = text.toLowerCase();
  const rules: [CategoryId, string, RegExp][] = [
    ["dental", "dental practice", /\b(dentist|dental|orthodont|invisalign|teeth whitening)\b/],
    ["healthcare", "medical practice", /\b(clinic|physician|urgent care|chiropract|physical therapy|pediatric|dermatolog|med spa|optometr)\b/],
    ["legal", "law firm", /\b(attorney|law firm|lawyer|legal services|personal injury|divorce lawyer)\b/],
    ["auto_repair", "auto repair shop", /\b(auto repair|mechanic|oil change|brake|transmission|collision|body shop)\b/],
    ["auto_dealer", "car dealership", /\b(dealership|new and used cars|pre-owned vehicles|inventory of vehicles)\b/],
    ["restaurant", "restaurant", /\b(restaurant|menu|dine-in|takeout|catering|bar & grill|cafe|coffee shop|bakery|brewery)\b/],
    ["hotel_travel", "hotel", /\b(hotel|inn|bed and breakfast|resort|vacation rental|lodging)\b/],
    ["home_services", "home services contractor", /\b(plumb|hvac|air conditioning|roofing|roofer|electrician|remodel|landscap|lawn care|pest control|cleaning service|handyman|garage door|fencing|painting contractor)\b/],
    ["moving_storage", "moving company", /\b(movers|moving company|self storage|storage units)\b/],
    ["beauty", "salon", /\b(salon|barber|hair stylist|nail|spa|massage|esthetician|lash|waxing)\b/],
    ["fitness", "fitness studio", /\b(gym|fitness|crossfit|yoga|pilates|personal train|martial arts)\b/],
    ["pet", "pet services", /\b(veterinar|pet grooming|dog grooming|dog walking|pet sitting|boarding|kennel|doggy daycare)\b/],
    ["weddings_events", "event services", /\b(wedding|event venue|dj services|event planning|photo booth|florist)\b/],
    ["childcare_education", "childcare center", /\b(daycare|preschool|child care|tutoring|learning center|montessori)\b/],
    ["senior_care", "senior care", /\b(senior living|assisted living|home care|memory care|elder care|in-home care)\b/],
    ["financial", "accounting firm", /\b(cpa|accounting|bookkeeping|tax preparation|financial advisor|wealth management|insurance agency)\b/],
    ["real_estate", "real estate agency", /\b(realtor|real estate|homes for sale|property management|apartments)\b/],
    ["software_it", "it services company", /\b(managed it|it support|software|saas|web development|cybersecurity)\b/],
    ["b2b_agency", "marketing agency", /\b(marketing agency|digital marketing|seo agency|consulting firm|advertising agency|branding)\b/],
    ["manufacturing", "manufacturer", /\b(manufactur|fabrication|machining|industrial supply|wholesale)\b/],
    ["nonprofit", "nonprofit organization", /\b(nonprofit|non-profit|501\(c\)|donate|volunteer|foundation)\b/],
    ["cannabis", "dispensary", /\b(dispensary|cannabis|cbd|marijuana)\b/],
    ["creative", "photography studio", /\b(photograph|videograph|graphic design|studio|creative agency)\b/],
    ["religious", "church", /\b(church|ministry|worship|congregation|parish|mosque|synagogue)\b/],
    ["funeral", "funeral home", /\b(funeral|cremation|memorial services|cemetery)\b/],
    ["retail", "retail store", /\b(shop now|store hours|boutique|retail|in stock|add to cart)\b/],
  ];
  let best: { industry: CategoryId; niche: string; score: number } = { industry: "other", niche: "local business", score: 0 };
  for (const [industry, niche, re] of rules) {
    const n = (t.match(new RegExp(re.source, "g")) ?? []).length;
    if (n > best.score) best = { industry, niche, score: n };
  }
  return { industry: best.industry, niche: best.niche, services: [], confidence: Math.min(0.8, best.score / 6) };
}
