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
  industries?: string[]; // when set, only shown for these industries (tourism bureaus, trade associations)
}

const DALLAS_SIDE = ["dallas", "irving", "plano", "garland", "mesquite", "frisco", "mckinney", "richardson", "carrollton", "lewisville", "allen", "addison", "farmers branch", "university park", "highland park", "las colinas", "rowlett", "rockwall", "wylie", "sachse", "duncanville", "desoto", "cedar hill", "lancaster", "grand prairie", "the colony", "little elm", "prosper", "celina", "anna", "melissa", "princeton", "forney", "terrell", "royse city", "coppell", "flower mound", "denton"];
const FW_SIDE = ["fort worth", "arlington", "burleson", "crowley", "joshua", "cleburne", "benbrook", "white settlement", "north richland hills", "haltom city", "watauga", "saginaw", "keller", "colleyville", "southlake", "grapevine", "euless", "bedford", "hurst", "mansfield", "weatherford", "midlothian"];
const VISITOR_INDUSTRIES = ["restaurant", "hotel_travel", "retail", "weddings_events", "fitness", "beauty", "creative", "pet"];

export const METROS: Record<string, { name: string; cities: string[] }> = {
  dfw: {
    name: "Dallas–Fort Worth",
    cities: ["dallas", "fort worth", "irving", "plano", "garland", "mesquite", "arlington", "frisco", "mckinney", "denton", "richardson", "carrollton", "lewisville", "grand prairie", "allen", "flower mound", "grapevine", "southlake", "coppell", "rowlett", "rockwall", "mansfield", "euless", "bedford", "hurst", "keller", "colleyville", "the colony", "little elm", "prosper", "wylie", "sachse", "duncanville", "desoto", "cedar hill", "lancaster", "addison", "farmers branch", "university park", "highland park", "las colinas", "burleson", "cleburne", "crowley", "joshua", "benbrook", "white settlement", "north richland hills", "haltom city", "watauga", "saginaw", "weatherford", "midlothian", "waxahachie", "red oak", "forney", "terrell", "royse city", "celina", "anna", "melissa", "princeton"],
  },
};

export function metroForCity(city: string, state: string): string | null {
  if (state.toUpperCase() !== "TX") return null;
  const c = city.trim().toLowerCase();
  for (const [id, m] of Object.entries(METROS)) if (m.cities.includes(c)) return id;
  return null;
}

export const LOCAL_SITES: LocalSite[] = [
  { id: "dallas_chamber", name: "Dallas Regional Chamber", host: "www.dallaschamber.org", metro: "dfw", kind: "chamber", cities: DALLAS_SIDE, note: "Membership; member directory listing with link." },
  { id: "visit_dallas", name: "Visit Dallas", host: "www.visitdallas.com", metro: "dfw", kind: "tourism", cities: DALLAS_SIDE, industries: VISITOR_INDUSTRIES, note: "Partner listing for hospitality, dining, attractions and events." },
  { id: "fw_chamber", name: "Fort Worth Chamber of Commerce", host: "fortworthchamber.com", metro: "dfw", kind: "chamber", cities: FW_SIDE, note: "Regional chamber for Tarrant County and the south-west metro." },
  { id: "visit_fw", name: "Visit Fort Worth", host: "www.fortworth.com", metro: "dfw", kind: "tourism", cities: FW_SIDE, industries: VISITOR_INDUSTRIES },
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
  { id: "burleson_chamber", name: "Burleson Area Chamber of Commerce", host: "burlesonchamber.com", metro: "dfw", kind: "chamber", cities: ["burleson", "joshua", "crowley"], note: "Membership; member directory listing with link. Links to 6 of the 11 page-1 Burleson roofers (Nov 2026 gap analysis)." },
  { id: "cleburne_chamber", name: "Cleburne Chamber of Commerce", host: "cleburnechamber.com", metro: "dfw", kind: "chamber", cities: ["cleburne", "burleson", "joshua"], note: "Johnson County chamber; member directory with link." },
  { id: "fwmbcc", name: "Fort Worth Metropolitan Black Chamber of Commerce", host: "fwmbcc.org", metro: "dfw", kind: "chamber", cities: FW_SIDE, note: "Where applicable." },
  { id: "ntx_bbb", name: "BBB Serving North Central Texas", host: "www.bbb.org", metro: "dfw", kind: "regional", note: "Covered by the BBB directory check." },
];

export function localSitesFor(city: string, state: string, industry?: string): { metro: string | null; sites: LocalSite[] } {
  const metro = metroForCity(city, state);
  if (!metro) return { metro: null, sites: [] };
  const c = city.trim().toLowerCase();
  return { metro, sites: LOCAL_SITES.filter((s) => s.metro === metro && (!s.cities || s.cities.includes(c)) && (!s.industries || !industry || s.industries.includes(industry))) };
}
