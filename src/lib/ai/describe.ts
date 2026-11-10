import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CanonicalBusiness } from "@/lib/domain/types";
import { CATEGORIES, normalizeCategory, type CategoryId } from "@/lib/directories/categories";

export const Descriptions = z.object({
  short: z.string().describe("Under 160 characters. One sentence. No marketing superlatives."),
  long: z.string().describe("Two or three sentences, under 750 characters. Plain, factual, written for a directory profile."),
});
export type DescriptionsT = z.infer<typeof Descriptions>;

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

/**
 * Draft directory descriptions from owner-approved facts only.
 * Rule: the model may not add services, credentials, years, awards, service areas
 * or claims that are not in the facts list. Falls back to a template when no key.
 */
export async function draftDescriptions(biz: CanonicalBusiness): Promise<{ drafts: DescriptionsT; source: "ai" | "template" }> {
  if (!aiEnabled()) return { drafts: templateDescriptions(biz), source: "template" };
  const client = new Anthropic();
  const facts = factsList(biz);
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Descriptions) },
      system: [
        "You write short business directory descriptions for local businesses.",
        "Use ONLY the facts provided. Do not invent services, credentials, licenses, awards, years in business, service areas, guarantees, or pricing.",
        "If a fact is missing, leave it out rather than guessing. No superlatives such as best, leading, premier, top-rated.",
        "Write in third person, plain American English, no exclamation marks, no emojis.",
      ].join(" "),
      messages: [{ role: "user", content: `Facts about the business:\n${facts}\n\nWrite the short and long descriptions.` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return { drafts: templateDescriptions(biz), source: "template" };
    return { drafts: response.parsed_output, source: "ai" };
  } catch (e) {
    console.error("describe: falling back to template", e);
    return { drafts: templateDescriptions(biz), source: "template" };
  }
}

export function factsList(biz: CanonicalBusiness): string {
  const lines = [
    `Name: ${biz.name}`,
    `Type: ${biz.categories.map((c) => CATEGORIES[normalizeCategory(c)]).join(", ")}`,
    `Location: ${biz.hideAddress ? `serves ${biz.city}, ${biz.state} (no public storefront)` : `${biz.city}, ${biz.state}`}`,
  ];
  if (biz.serviceArea?.length) lines.push(`Service area: ${biz.serviceArea.join(", ")}`);
  if (biz.services?.length) lines.push(`Services: ${biz.services.join(", ")}`);
  if (biz.yearFounded) lines.push(`Founded: ${biz.yearFounded}`);
  if (biz.paymentMethods?.length) lines.push(`Payment methods: ${biz.paymentMethods.join(", ")}`);
  if (biz.website) lines.push(`Website: ${biz.website}`);
  return lines.join("\n");
}

/** Deterministic fallback built from the same facts. */
export function templateDescriptions(biz: CanonicalBusiness): DescriptionsT {
  const type = categoryNoun(normalizeCategory(biz.categories[0] ?? "other"));
  const where = biz.hideAddress ? `serving ${biz.city}, ${biz.state}` : `in ${biz.city}, ${biz.state}`;
  const services = biz.services?.length ? ` Services include ${joinHuman(biz.services)}.` : "";
  const area = biz.serviceArea?.length ? ` The company serves ${joinHuman(biz.serviceArea)}.` : "";
  const founded = biz.yearFounded ? ` Founded in ${biz.yearFounded}.` : "";
  const short = `${biz.name} is a ${type} ${where}.`;
  const long = `${short}${services}${area}${founded}`.trim();
  return { short: short.slice(0, 160), long: long.slice(0, 750) };
}

function categoryNoun(c?: CategoryId): string {
  const nouns: Partial<Record<CategoryId, string>> = {
    home_services: "home services company", professional_services: "professional services firm", healthcare: "healthcare provider",
    dental: "dental practice", restaurant: "restaurant", hotel_travel: "lodging business", retail: "retail store",
    auto_dealer: "auto dealership", auto_repair: "auto repair shop", beauty: "beauty and personal care business",
    fitness: "fitness and wellness business", real_estate: "real estate business", legal: "law firm", pet: "pet services business",
    weddings_events: "events business", childcare_education: "childcare and education provider", senior_care: "senior care provider",
    financial: "financial services firm", b2b_agency: "agency", software_it: "software and IT services company",
    manufacturing: "manufacturer", nonprofit: "nonprofit organization", cannabis: "cannabis business", moving_storage: "moving and storage company",
    creative: "creative studio", religious: "religious organization", funeral: "funeral services provider",
  };
  return (c && nouns[c]) ?? "local business";
}

function joinHuman(items: string[]): string {
  const a = items.map((s) => s.trim()).filter(Boolean);
  if (a.length <= 1) return a[0] ?? "";
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}
