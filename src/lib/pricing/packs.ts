import type { CanonicalBusiness, Finding } from "@/lib/domain/types";
import { DIRECTORIES } from "@/lib/directories/registry";
import { INDUSTRY_SITES, industrySitesFor, KIND_LABEL, type IndustrySite, type SiteKind } from "@/lib/directories/industryPacks";
import { localSitesFor, METROS, type LocalSite } from "@/lib/directories/localPacks";
import { CATEGORIES, normalizeCategory, type CategoryId } from "@/lib/directories/categories";

/** One row in a pack as shown on the report. */
export interface PackRow {
  id: string;
  name: string;
  url: string;              // homepage or claim page
  kind: SiteKind | "core" | "chamber" | "tourism" | "association" | "regional";
  kindLabel: string;
  checked: boolean;         // we have an automated verdict
  state?: Finding["state"];
  listingUrl?: string;
  diffs?: Finding["diffs"];
  sellable: boolean;        // we can submit on the owner's behalf (and it is checkable)
  ownerManaged: boolean;    // owner must claim/verify
  note?: string;
  howTo?: string;
}

export interface Packs {
  category: CategoryId;
  categoryLabel: string;
  core: PackRow[];
  industry: PackRow[];
  local: { metro: string | null; metroName?: string; rows: PackRow[] };
}

/** Hosts → registry directory, so an industry-pack site can borrow its scan verdict. */
function registryByHost() {
  const map = new Map<string, (typeof DIRECTORIES)[number]>();
  for (const d of DIRECTORIES) for (const h of d.domains) map.set(h.replace(/^www\./, ""), d);
  return map;
}

/** The universal core pack: what every business is checked against. */
export const CORE_IDS = ["google", "apple", "bing", "yelp", "facebook", "nextdoor", "foursquare", "bbb", "yellowpages", "manta", "merchantcircle", "superpages", "dexknows", "hotfrog", "dataaxle", "linkedin"];

export function assemblePacks(biz: CanonicalBusiness, findings: Finding[]): Packs {
  const category = normalizeCategory(biz.categories[0] ?? "other");
  const byId = new Map(findings.map((f) => [f.directoryId, f]));
  const byHost = registryByHost();

  const rowFromDirectory = (d: (typeof DIRECTORIES)[number], kind: PackRow["kind"], kindLabel: string, note?: string): PackRow => {
    const f = byId.get(d.id);
    const checked = !!f && f.state !== "unable_to_verify" && f.state !== "not_eligible";
    return {
      id: d.id, name: d.name, url: d.submitUrl ?? d.homepage, kind, kindLabel,
      checked, state: f?.state, listingUrl: f?.listingUrl, diffs: f?.diffs,
      sellable: d.sellable && d.discovery !== "none", ownerManaged: !d.sellable,
      note: note ?? d.notes, howTo: d.ownerHowTo,
    };
  };

  const core = CORE_IDS.map((id) => DIRECTORIES.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => !!d && d.active)
    .filter((d) => !(byId.get(d.id)?.state === "not_eligible"))
    .map((d) => rowFromDirectory(d, "core", d.sellable ? "Directory" : "Core profile"));

  const industry: PackRow[] = industrySitesFor(category).map((s: IndustrySite) => {
    const d = byHost.get(s.host.replace(/^www\./, ""));
    if (d && d.active) {
      const row = rowFromDirectory(d, s.kind, KIND_LABEL[s.kind], s.note);
      return { ...row, name: s.name, sellable: s.kind === "directory" && row.sellable, ownerManaged: s.kind !== "directory" || row.ownerManaged };
    }
    return { id: s.id, name: s.name, url: `https://${s.host}/`, kind: s.kind, kindLabel: KIND_LABEL[s.kind], checked: false, sellable: false, ownerManaged: s.kind !== "directory", note: s.note };
  });

  const local = localSitesFor(biz.city, biz.state);
  const localRows: PackRow[] = local.sites.map((s: LocalSite) => {
    const d = byHost.get(s.host.replace(/^www\./, ""));
    if (d && d.active) return { ...rowFromDirectory(d, s.kind, s.kind === "chamber" ? "Chamber" : s.kind === "tourism" ? "Tourism bureau" : "Regional"), name: s.name, note: s.note };
    return { id: s.id, name: s.name, url: `https://${s.host}/`, kind: s.kind, kindLabel: s.kind === "chamber" ? "Chamber" : s.kind === "tourism" ? "Tourism bureau" : s.kind === "association" ? "Association" : "Regional", checked: false, sellable: false, ownerManaged: false, note: s.note ?? "Membership or application; we submit once you approve the fee." };
  });

  return {
    category, categoryLabel: CATEGORIES[category],
    core, industry,
    local: { metro: local.metro, metroName: local.metro ? METROS[local.metro].name : undefined, rows: localRows },
  };
}

/** All industries with their pack sizes, for the homepage. */
export function industryPackSummary(): { id: CategoryId; label: string; sites: IndustrySite[] }[] {
  return (Object.keys(CATEGORIES) as CategoryId[])
    .map((id) => ({ id, label: CATEGORIES[id], sites: INDUSTRY_SITES.filter((s) => s.industries.includes(id)) }))
    .filter((x) => x.sites.length > 0);
}
