/**
 * Local packs: chambers, tourism bureaus and regional directories by metro.
 * These are the most relevant links a local business can earn. Submission is
 * manual (membership or form); verification is a fetch of the member directory
 * once an adapter exists. Start with DFW; add metros as customers arrive.
 */
export interface LocalSite {
  id: string;
  name: string;
  host: string;
  metro: string;
  kind: "chamber" | "tourism" | "association" | "regional";
  note?: string;
  cities?: string[]; // when set, only shown for businesses in these cities
}

export const METROS: Record<string, { name: string; cities: string[] }> = {
  dfw: {
    name: "Dallas–Fort Worth",
    cities: ["dallas", "fort worth", "irving", "plano", "garland", "mesquite", "arlington", "frisco", "mckinney", "denton", "richardson", "carrollton", "lewisville", "grand prairie", "allen", "flower mound", "grapevine", "southlake", "coppell", "rowlett", "rockwall", "mansfield", "euless", "bedford", "hurst", "keller", "colleyville", "the colony", "little elm", "prosper", "wylie", "sachse", "duncanville", "desoto", "cedar hill", "lancaster", "addison", "farmers branch", "university park", "highland park", "las colinas"],
  },
};

export function metroForCity(city: string, state: string): string | null {
  if (state.toUpperCase() !== "TX") return null;
  const c = city.trim().toLowerCase();
  for (const [id, m] of Object.entries(METROS)) if (m.cities.includes(c)) return id;
  return null;
}

export const LOCAL_SITES: LocalSite[] = [
  { id: "dallas_chamber", name: "Dallas Regional Chamber", host: "www.dallaschamber.org", metro: "dfw", kind: "chamber", note: "Membership; member directory listing with link." },
  { id: "visit_dallas", name: "Visit Dallas", host: "www.visitdallas.com", metro: "dfw", kind: "tourism", note: "Partner listing for hospitality, dining, attractions and events." },
  { id: "fw_chamber", name: "Fort Worth Chamber of Commerce", host: "fortworthchamber.com", metro: "dfw", kind: "chamber", cities: ["fort worth", "keller", "haltom city"] },
  { id: "visit_fw", name: "Visit Fort Worth", host: "www.fortworth.com", metro: "dfw", kind: "tourism", cities: ["fort worth"] },
  { id: "irving_chamber", name: "Irving-Las Colinas Chamber", host: "www.irvingchamber.com", metro: "dfw", kind: "chamber", cities: ["irving", "las colinas"] },
  { id: "plano_chamber", name: "Plano Chamber of Commerce", host: "www.planochamber.org", metro: "dfw", kind: "chamber", cities: ["plano"] },
  { id: "garland_chamber", name: "Garland Chamber of Commerce", host: "www.garlandchamber.com", metro: "dfw", kind: "chamber", cities: ["garland"] },
  { id: "mesquite_chamber", name: "Mesquite Chamber of Commerce", host: "www.mesquitechamber.com", metro: "dfw", kind: "chamber", cities: ["mesquite"] },
  { id: "arlington_chamber", name: "Arlington Chamber of Commerce", host: "www.arlingtontx.com", metro: "dfw", kind: "chamber", cities: ["arlington"] },
  { id: "frisco_chamber", name: "Frisco Chamber of Commerce", host: "www.friscochamber.com", metro: "dfw", kind: "chamber", cities: ["frisco"] },
  { id: "mckinney_chamber", name: "McKinney Chamber of Commerce", host: "www.mckinneychamber.com", metro: "dfw", kind: "chamber", cities: ["mckinney"] },
  { id: "richardson_chamber", name: "Richardson Chamber of Commerce", host: "www.richardsonchamber.com", metro: "dfw", kind: "chamber", cities: ["richardson"] },
  { id: "dallas_black_chamber", name: "Dallas Black Chamber of Commerce", host: "www.dallasblackchamber.org", metro: "dfw", kind: "chamber", note: "Where applicable." },
  { id: "gdhcc", name: "Greater Dallas Hispanic Chamber", host: "www.gdhcc.com", metro: "dfw", kind: "chamber", note: "Where applicable." },
  { id: "ntx_bbb", name: "BBB Serving North Central Texas", host: "www.bbb.org", metro: "dfw", kind: "regional", note: "Covered by the BBB directory check." },
];

export function localSitesFor(city: string, state: string): { metro: string | null; sites: LocalSite[] } {
  const metro = metroForCity(city, state);
  if (!metro) return { metro: null, sites: [] };
  const c = city.trim().toLowerCase();
  return { metro, sites: LOCAL_SITES.filter((s) => s.metro === metro && (!s.cities || s.cities.includes(c))) };
}
