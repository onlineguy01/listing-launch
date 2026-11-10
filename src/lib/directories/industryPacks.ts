import type { CategoryId } from "./categories";

/**
 * Industry packs: the vertical sites a business in each industry should be on.
 *
 * kind:
 *   directory    plain listing submission (we can do it for the owner once verifiable)
 *   marketplace  merchant onboarding, contracts or payouts; the owner must sign up
 *   profile      professional/practitioner profile tied to a person or licence; the owner must claim
 *
 * Marketplaces and profiles are never sold. Directories become sellable once a
 * discovery adapter exists for them (set in registry.ts); until then they are
 * shown in the industry pack as "not checked automatically yet".
 */
export type SiteKind = "directory" | "marketplace" | "profile";

export interface IndustrySite {
  id: string;
  name: string;
  host: string;            // primary host, used for the homepage link and URL matching
  kind: SiteKind;
  industries: CategoryId[];
  note?: string;
}

const d = (id: string, name: string, host: string, industries: CategoryId[], note?: string): IndustrySite => ({ id, name, host, kind: "directory", industries, note });
const m = (id: string, name: string, host: string, industries: CategoryId[], note?: string): IndustrySite => ({ id, name, host, kind: "marketplace", industries, note });
const p = (id: string, name: string, host: string, industries: CategoryId[], note?: string): IndustrySite => ({ id, name, host, kind: "profile", industries, note });

export const INDUSTRY_SITES: IndustrySite[] = [
  // Restaurants, cafés, bars
  p("tripadvisor", "TripAdvisor", "www.tripadvisor.com", ["restaurant", "hotel_travel"], "Owner claims the listing via TripAdvisor Management Center."),
  m("opentable", "OpenTable", "www.opentable.com", ["restaurant"], "Reservation platform; merchant contract."),
  m("resy", "Resy", "resy.com", ["restaurant"], "Reservation platform; merchant contract."),
  m("doordash", "DoorDash", "www.doordash.com", ["restaurant"], "Delivery marketplace; merchant onboarding and payouts."),
  m("ubereats", "Uber Eats", "www.ubereats.com", ["restaurant"], "Delivery marketplace; merchant onboarding and payouts."),
  m("grubhub", "Grubhub", "www.grubhub.com", ["restaurant"], "Delivery marketplace; merchant onboarding and payouts."),
  d("happycow", "HappyCow", "www.happycow.net", ["restaurant"], "Vegan/vegetarian-friendly listings; community submitted."),
  // Hotels and travel
  m("bookingcom", "Booking.com", "www.booking.com", ["hotel_travel"], "Partner onboarding and commission."),
  m("expedia", "Expedia", "www.expedia.com", ["hotel_travel"], "Partner Central onboarding."),
  m("hotelscom", "Hotels.com", "www.hotels.com", ["hotel_travel"], "Part of Expedia Partner Central."),
  d("aaa", "AAA Travel", "www.aaa.com", ["hotel_travel"], "AAA Approved listing via inspection program."),
  m("airbnb", "Airbnb", "www.airbnb.com", ["hotel_travel"], "Host onboarding and payouts."),
  // Home services and trades
  m("angi_pack", "Angi", "www.angi.com", ["home_services", "moving_storage"], "Pro account with phone verification. Also in core profiles."),
  m("homeadvisor_pack", "HomeAdvisor", "www.homeadvisor.com", ["home_services", "moving_storage"], "Pro account; lead fees."),
  m("thumbtack_pack", "Thumbtack", "www.thumbtack.com", ["home_services", "moving_storage", "creative", "weddings_events"], "Pro account; lead fees."),
  d("houzz_pack", "Houzz", "www.houzz.com", ["home_services"], "Free pro profile; checked automatically."),
  m("porch_pack", "Porch", "porch.com", ["home_services"], "Pro network; lead fees."),
  d("buildzoom_pack", "BuildZoom", "www.buildzoom.com", ["home_services"], "Profiles built from contractor licence records; claim to edit."),
  m("networx_pack", "Networx", "www.networx.com", ["home_services"], "Lead marketplace."),
  m("craftjack", "CraftJack", "www.craftjack.com", ["home_services"], "Lead marketplace."),
  // Healthcare
  p("healthgrades_pack", "Healthgrades", "www.healthgrades.com", ["healthcare", "dental"], "Provider profile; practitioner claims it."),
  m("zocdoc_pack", "Zocdoc", "www.zocdoc.com", ["healthcare", "dental"], "Booking marketplace; practice contract."),
  p("webmd_pack", "WebMD Provider Directory", "doctor.webmd.com", ["healthcare", "dental"], "Provider profile."),
  p("vitals_pack", "Vitals", "www.vitals.com", ["healthcare"], "Provider profile."),
  p("ratemds", "RateMDs", "www.ratemds.com", ["healthcare"], "Provider profile."),
  p("sharecare", "Sharecare", "www.sharecare.com", ["healthcare"], "Provider profile."),
  p("doximity", "Doximity", "www.doximity.com", ["healthcare"], "Physician network; licence-verified."),
  p("ada", "ADA Find-a-Dentist", "findadentist.ada.org", ["dental"], "ADA member dentists only."),
  // Legal
  p("avvo_pack", "Avvo", "www.avvo.com", ["legal"], "Attorney profile; bar-verified."),
  p("findlaw", "FindLaw", "lawyers.findlaw.com", ["legal"], "Attorney profile; paid listings available."),
  p("justia_pack", "Justia", "lawyers.justia.com", ["legal"], "Attorney profile."),
  p("lawyerscom", "Lawyers.com", "www.lawyers.com", ["legal"], "Attorney profile (Martindale network)."),
  p("martindale", "Martindale-Hubbell", "www.martindale.com", ["legal"], "Attorney profile and peer ratings."),
  p("nolo", "Nolo", "www.nolo.com", ["legal"], "Attorney directory; paid."),
  d("hgorg", "HG.org", "www.hg.org", ["legal"], "Law firm directory submission."),
  // Real estate
  p("zillow", "Zillow", "www.zillow.com", ["real_estate"], "Agent profile."),
  p("realtorcom", "Realtor.com", "www.realtor.com", ["real_estate"], "Agent profile; NAR members."),
  p("homescom", "Homes.com", "www.homes.com", ["real_estate"], "Agent profile."),
  p("redfin", "Redfin", "www.redfin.com", ["real_estate"], "Agent profile via partner program."),
  p("trulia", "Trulia", "www.trulia.com", ["real_estate"], "Agent profile (Zillow network)."),
  m("loopnet", "LoopNet", "www.loopnet.com", ["real_estate"], "Commercial listings marketplace."),
  m("apartmentscom", "Apartments.com", "www.apartments.com", ["real_estate"], "Property listings marketplace."),
  // Automotive dealers
  m("carscom", "Cars.com", "www.cars.com", ["auto_dealer"], "Dealer inventory marketplace."),
  m("autotrader", "AutoTrader", "www.autotrader.com", ["auto_dealer"], "Dealer inventory marketplace."),
  m("cargurus", "CarGurus", "www.cargurus.com", ["auto_dealer"], "Dealer inventory marketplace."),
  p("dealerrater", "DealerRater", "www.dealerrater.com", ["auto_dealer"], "Dealer review profile."),
  m("edmunds", "Edmunds", "www.edmunds.com", ["auto_dealer"], "Dealer inventory marketplace."),
  m("carfax_dealer", "CARFAX", "www.carfax.com", ["auto_dealer"], "Dealer program."),
  // Auto repair
  d("repairpal", "RepairPal", "repairpal.com", ["auto_repair"], "Certified shop network; application."),
  d("carfax_service", "CARFAX Service Shops", "www.carfax.com", ["auto_repair"], "Service shop program."),
  d("mechanicadvisor", "Mechanic Advisor", "www.mechanicadvisor.com", ["auto_repair"], "Shop directory submission."),
  d("carwise", "Carwise", "www.carwise.com", ["auto_repair"], "Body shop directory (CCC network)."),
  d("automd", "AutoMD", "www.automd.com", ["auto_repair"], "Shop directory submission."),
  // Beauty
  m("vagaro", "Vagaro", "www.vagaro.com", ["beauty", "fitness"], "Booking platform; merchant subscription."),
  m("booksy", "Booksy", "booksy.com", ["beauty"], "Booking platform; merchant subscription."),
  m("fresha", "Fresha", "www.fresha.com", ["beauty"], "Booking platform."),
  m("styleseat", "StyleSeat", "www.styleseat.com", ["beauty"], "Booking marketplace for stylists."),
  m("mindbody", "Mindbody", "www.mindbodyonline.com", ["beauty", "fitness"], "Booking platform; merchant subscription."),
  d("spafinder", "SpaFinder", "www.spafinder.com", ["beauty"], "Spa directory submission."),
  // Fitness and wellness
  m("classpass", "ClassPass", "classpass.com", ["fitness"], "Marketplace; partner contract."),
  m("wellhub", "Wellhub", "wellhub.com", ["fitness"], "Corporate wellness marketplace; partner contract."),
  m("wellnessliving", "WellnessLiving", "www.wellnessliving.com", ["fitness"], "Booking platform."),
  p("yogaalliance", "Yoga Alliance", "www.yogaalliance.org", ["fitness"], "Registered school/teacher directory."),
  // Pet services
  m("rover", "Rover", "www.rover.com", ["pet"], "Sitter marketplace; individual onboarding."),
  m("wag", "Wag!", "wagwalking.com", ["pet"], "Walker marketplace."),
  d("bringfido", "BringFido", "www.bringfido.com", ["pet", "hotel_travel", "restaurant"], "Pet-friendly business directory submission."),
  p("petfinder", "Petfinder", "www.petfinder.com", ["pet", "nonprofit"], "Shelter and rescue organization profiles."),
  m("carecom_pet", "Care.com", "www.care.com", ["pet", "childcare_education", "senior_care"], "Caregiver marketplace."),
  p("gooddog", "Good Dog", "www.gooddog.com", ["pet"], "Breeder and shelter profiles; screened."),
  // Weddings and events
  m("theknot", "The Knot", "www.theknot.com", ["weddings_events", "creative"], "Vendor marketplace; paid storefront."),
  m("weddingwire", "WeddingWire", "www.weddingwire.com", ["weddings_events", "creative"], "Vendor marketplace; paid storefront."),
  m("zola", "Zola", "www.zola.com", ["weddings_events"], "Vendor marketplace."),
  d("eventective", "Eventective", "www.eventective.com", ["weddings_events"], "Venue and vendor directory submission."),
  m("partyslate", "PartySlate", "www.partyslate.com", ["weddings_events"], "Vendor profile; curated."),
  // Childcare and education
  d("winnie", "Winnie", "winnie.com", ["childcare_education"], "Childcare directory; provider claims listing."),
  d("childcarecenter", "ChildCareCenter.us", "childcarecenter.us", ["childcare_education"], "Licensed provider directory; claim to edit."),
  p("greatschools", "GreatSchools", "www.greatschools.org", ["childcare_education"], "School profiles from public data."),
  p("niche", "Niche", "www.niche.com", ["childcare_education"], "School profiles; claim to edit."),
  m("wyzant", "Wyzant", "www.wyzant.com", ["childcare_education"], "Tutor marketplace."),
  // Senior care
  m("caringcom", "Caring.com", "www.caring.com", ["senior_care"], "Referral marketplace; provider listing."),
  m("aplaceformom", "A Place for Mom", "www.aplaceformom.com", ["senior_care"], "Referral marketplace; partner contract."),
  m("senioradvisor", "SeniorAdvisor", "www.senioradvisor.com", ["senior_care"], "Review marketplace (A Place for Mom)."),
  p("carecompare", "Medicare Care Compare", "www.medicare.gov", ["senior_care", "healthcare"], "Government listing from Medicare enrollment."),
  // Financial and accounting
  p("cfpboard", "CFP Board", "www.cfp.net", ["financial"], "Certificant directory."),
  p("napfa", "NAPFA", "www.napfa.org", ["financial"], "Member advisor directory."),
  p("xypn", "XY Planning Network", "www.xyplanningnetwork.com", ["financial"], "Member advisor directory."),
  p("cpaverify", "CPAverify", "cpaverify.org", ["financial"], "Licence verification; from state boards."),
  d("taxbuzz", "TaxBuzz", "www.taxbuzz.com", ["financial"], "Tax professional directory; claim listing."),
  p("proadvisor", "QuickBooks ProAdvisor", "quickbooks.intuit.com", ["financial"], "ProAdvisor program directory."),
  // B2B agencies and consultants
  d("clutch", "Clutch", "clutch.co", ["b2b_agency", "software_it"], "Agency profile with verified reviews; free listing."),
  d("upcity", "UpCity", "upcity.com", ["b2b_agency"], "Agency directory; free listing."),
  d("designrush", "DesignRush", "www.designrush.com", ["b2b_agency"], "Agency directory; free listing."),
  d("goodfirms", "GoodFirms", "www.goodfirms.co", ["b2b_agency", "software_it"], "Agency directory; free listing."),
  p("crunchbase", "Crunchbase", "www.crunchbase.com", ["b2b_agency", "software_it"], "Company profile."),
  d("sortlist", "Sortlist", "www.sortlist.com", ["b2b_agency"], "Agency directory; free profile."),
  d("themanifest", "The Manifest", "themanifest.com", ["b2b_agency", "software_it"], "Agency directory (Clutch network); free listing."),
  d("agencyspotter", "Agency Spotter", "www.agencyspotter.com", ["b2b_agency"], "Agency directory; free profile."),
  // Software and IT
  p("g2", "G2", "www.g2.com", ["software_it"], "Product profile with reviews."),
  p("capterra", "Capterra", "www.capterra.com", ["software_it"], "Product profile; vendor portal."),
  d("cloudtango", "Cloudtango", "www.cloudtango.net", ["software_it"], "MSP directory submission."),
  // Manufacturing
  d("thomasnet", "Thomasnet", "www.thomasnet.com", ["manufacturing"], "Supplier directory; free basic listing."),
  d("industrynet", "IndustryNet", "www.industrynet.com", ["manufacturing"], "Supplier directory."),
  d("kompass", "Kompass", "us.kompass.com", ["manufacturing"], "B2B directory."),
  d("globalspec", "GlobalSpec", "www.globalspec.com", ["manufacturing"], "Engineering supplier directory."),
  // Nonprofits
  p("candid", "Candid / GuideStar", "www.guidestar.org", ["nonprofit"], "Profile from IRS data; claim to update."),
  p("charitynavigator", "Charity Navigator", "www.charitynavigator.org", ["nonprofit"], "Profile from IRS data."),
  d("greatnonprofits", "GreatNonprofits", "greatnonprofits.org", ["nonprofit"], "Review directory; claim listing."),
  d("volunteermatch", "VolunteerMatch", "www.volunteermatch.org", ["nonprofit"], "Organization listing."),
  // Cannabis
  m("weedmaps", "Weedmaps", "weedmaps.com", ["cannabis"], "Dispensary marketplace; licence-verified."),
  m("leafly", "Leafly", "www.leafly.com", ["cannabis"], "Dispensary marketplace; licence-verified."),
  // Moving and storage
  d("movingcom", "Moving.com", "www.moving.com", ["moving_storage"], "Mover directory."),
  m("hireahelper", "HireAHelper", "www.hireahelper.com", ["moving_storage"], "Labor marketplace."),
  // Photographers and creatives
  m("bark", "Bark", "www.bark.com", ["creative", "home_services"], "Lead marketplace."),
  d("productionhub", "ProductionHUB", "www.productionhub.com", ["creative"], "Production directory; free listing."),
  // Churches
  d("faithstreet", "FaithStreet", "www.faithstreet.com", ["religious"], "Church directory; claim listing."),
  d("churchfinder", "Church Finder", "www.churchfinder.com", ["religious"], "Church directory submission."),
  // Funeral
  p("legacy", "Legacy.com", "www.legacy.com", ["funeral"], "Funeral home profile via partnership."),
  d("funeralwise", "Funeralwise", "www.funeralwise.com", ["funeral"], "Funeral home directory."),
];

export const KIND_LABEL: Record<SiteKind, string> = { directory: "Directory", marketplace: "Marketplace", profile: "Professional profile" };
export const KIND_NOTE: Record<SiteKind, string> = {
  directory: "A listing we can submit for you once we can verify it.",
  marketplace: "Requires merchant onboarding, contracts or payouts. You sign up; we tell you if you're there.",
  profile: "Tied to a licensed person or practice. You claim it; we tell you if it's there.",
};

export function industrySitesFor(category: CategoryId): IndustrySite[] {
  return INDUSTRY_SITES.filter((s) => s.industries.includes(category));
}
