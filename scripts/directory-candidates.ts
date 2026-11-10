/** Candidate directories to probe. `searchUrl` templates use {q} {loc} {q-slug} {loc-slug}; omit to auto-discover. */
export interface Candidate { id: string; name: string; host: string; tier: "general" | "industry" | "local" | "aggregator"; category?: string; searchUrl?: string; sellable?: boolean; notes?: string }

export const SAMPLE_BUSINESSES: Record<string, { name: string; loc: string }> = {
  general: { name: "Dallas Zoo", loc: "Dallas, TX" },
  home_services: { name: "Baker Brothers Plumbing", loc: "Mesquite, TX" },
  health: { name: "Dallas Dental Arts", loc: "Dallas, TX" },
  legal: { name: "Thompson Law", loc: "Dallas, TX" },
  restaurant: { name: "Pecan Lodge", loc: "Dallas, TX" },
  real_estate: { name: "Dave Perry-Miller Real Estate", loc: "Dallas, TX" },
  automotive: { name: "Christian Brothers Automotive", loc: "Dallas, TX" },
  professional_services: { name: "Rocket Lab Digital", loc: "Dallas, TX" },
  beauty: { name: "Drybar", loc: "Dallas, TX" },
};

export const CANDIDATES: Candidate[] = [
  // ---- General directories
  { id: "hotfrog", name: "Hotfrog", host: "www.hotfrog.com", tier: "general" },
  { id: "cylex", name: "Cylex", host: "www.cylex.us.com", tier: "general" },
  { id: "ezlocal", name: "EZlocal", host: "ezlocal.com", tier: "general" },
  { id: "brownbook", name: "Brownbook", host: "www.brownbook.net", tier: "general" },
  { id: "showmelocal", name: "ShowMeLocal", host: "www.showmelocal.com", tier: "general" },
  { id: "citysquares", name: "CitySquares", host: "citysquares.com", tier: "general" },
  { id: "localstack", name: "LocalStack", host: "www.localstack.com", tier: "general" },
  { id: "chamberofcommerce", name: "ChamberofCommerce.com", host: "www.chamberofcommerce.com", tier: "general" },
  { id: "dexknows", name: "DexKnows", host: "www.dexknows.com", tier: "general", searchUrl: "https://www.dexknows.com/search?search_terms={q}&geo_location_terms={loc}" },
  { id: "localcom", name: "Local.com", host: "www.local.com", tier: "general" },
  { id: "elocal", name: "eLocal", host: "www.elocal.com", tier: "general" },
  { id: "ibegin", name: "iBegin", host: "www.ibegin.com", tier: "general" },
  { id: "yellowbook", name: "Yellowbook", host: "www.yellowbook.com", tier: "general" },
  { id: "2findlocal", name: "2FindLocal", host: "www.2findlocal.com", tier: "general" },
  { id: "n49", name: "n49", host: "www.n49.com", tier: "general" },
  { id: "tupalo", name: "Tupalo", host: "tupalo.com", tier: "general" },
  { id: "alignable", name: "Alignable", host: "www.alignable.com", tier: "general" },
  { id: "mapquest", name: "MapQuest", host: "www.mapquest.com", tier: "general" },
  { id: "yellowpagecity", name: "YellowPageCity", host: "www.yellowpagecity.com", tier: "general" },
  { id: "bizapedia", name: "Bizapedia", host: "www.bizapedia.com", tier: "general" },
  { id: "golocal247", name: "GoLocal247", host: "www.golocal247.com", tier: "general" },
  { id: "americantowns", name: "AmericanTowns", host: "www.americantowns.com", tier: "general" },
  { id: "infobel", name: "Infobel", host: "www.infobel.com", tier: "general" },
  { id: "opendi", name: "Opendi", host: "www.opendi.us", tier: "general" },
  { id: "cybo", name: "Cybo", host: "www.cybo.com", tier: "general" },
  { id: "businessyab", name: "BusinessYab", host: "www.businessyab.com", tier: "general" },
  // ---- Home services
  { id: "homeadvisor", name: "HomeAdvisor", host: "www.homeadvisor.com", tier: "industry", category: "home_services" },
  { id: "thumbtack", name: "Thumbtack", host: "www.thumbtack.com", tier: "industry", category: "home_services" },
  { id: "porch", name: "Porch", host: "porch.com", tier: "industry", category: "home_services" },
  { id: "buildzoom", name: "BuildZoom", host: "www.buildzoom.com", tier: "industry", category: "home_services" },
  { id: "networx", name: "Networx", host: "www.networx.com", tier: "industry", category: "home_services" },
  { id: "bark", name: "Bark", host: "www.bark.com", tier: "industry", category: "home_services" },
  // ---- Health
  { id: "healthgrades", name: "Healthgrades", host: "www.healthgrades.com", tier: "industry", category: "health" },
  { id: "zocdoc", name: "Zocdoc", host: "www.zocdoc.com", tier: "industry", category: "health" },
  { id: "vitals", name: "Vitals", host: "www.vitals.com", tier: "industry", category: "health" },
  { id: "webmd", name: "WebMD Provider Directory", host: "doctor.webmd.com", tier: "industry", category: "health" },
  { id: "ratemds", name: "RateMDs", host: "www.ratemds.com", tier: "industry", category: "health" },
  // ---- Legal
  { id: "avvo", name: "Avvo", host: "www.avvo.com", tier: "industry", category: "legal" },
  { id: "justia", name: "Justia Lawyers", host: "lawyers.justia.com", tier: "industry", category: "legal" },
  { id: "findlaw", name: "FindLaw", host: "lawyers.findlaw.com", tier: "industry", category: "legal" },
  { id: "lawyerscom", name: "Lawyers.com", host: "www.lawyers.com", tier: "industry", category: "legal" },
  { id: "martindale", name: "Martindale", host: "www.martindale.com", tier: "industry", category: "legal" },
  { id: "superlawyers", name: "Super Lawyers", host: "www.superlawyers.com", tier: "industry", category: "legal" },
  // ---- Food
  { id: "tripadvisor", name: "TripAdvisor", host: "www.tripadvisor.com", tier: "industry", category: "restaurant" },
  { id: "opentable", name: "OpenTable", host: "www.opentable.com", tier: "industry", category: "restaurant" },
  { id: "menupix", name: "MenuPix", host: "www.menupix.com", tier: "industry", category: "restaurant" },
  { id: "restaurantji", name: "Restaurantji", host: "www.restaurantji.com", tier: "industry", category: "restaurant" },
  // ---- Real estate
  { id: "zillow", name: "Zillow", host: "www.zillow.com", tier: "industry", category: "real_estate" },
  { id: "realtor", name: "Realtor.com", host: "www.realtor.com", tier: "industry", category: "real_estate" },
  // ---- Automotive
  { id: "repairpal", name: "RepairPal", host: "repairpal.com", tier: "industry", category: "automotive" },
  { id: "mechanicadvisor", name: "Mechanic Advisor", host: "www.mechanicadvisor.com", tier: "industry", category: "automotive" },
  { id: "carscom", name: "Cars.com", host: "www.cars.com", tier: "industry", category: "automotive" },
  // ---- Professional
  { id: "clutch", name: "Clutch", host: "clutch.co", tier: "industry", category: "professional_services" },
  { id: "expertise", name: "Expertise.com", host: "www.expertise.com", tier: "industry", category: "professional_services" },
  { id: "thervo", name: "Thervo", host: "www.thervo.com", tier: "industry", category: "professional_services" },
  // ---- Beauty
  { id: "styleseat", name: "StyleSeat", host: "www.styleseat.com", tier: "industry", category: "beauty" },
  { id: "vagaro", name: "Vagaro", host: "www.vagaro.com", tier: "industry", category: "beauty" },
  { id: "booksy", name: "Booksy", host: "booksy.com", tier: "industry", category: "beauty" },
];
