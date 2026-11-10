import { DIRECTORIES } from "@/lib/directories/registry";
import type { DirectoryAdapter } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { GooglePlacesAdapter } from "./google";
import { YelpAdapter } from "./yelp";
import { SiteSearchAdapter } from "./siteSearchAdapter";
import * as site from "./siteSearchConfigs";

/**
 * Adapter registry. Directories with an official API get a dedicated adapter;
 * everything else uses the generic search+fetch adapter. Adding directory #16
 * means adding a registry entry (and optionally a class here).
 */
const SPECIAL: Record<string, (def: (typeof DIRECTORIES)[number]) => DirectoryAdapter> = {
  google: (def) => new GooglePlacesAdapter(def),
  yelp: (def) => new YelpAdapter(def),
  yellowpages: (def) => new SiteSearchAdapter(def, site.yellowpages),
  superpages: (def) => new SiteSearchAdapter(def, site.superpages),
  merchantcircle: (def) => new SiteSearchAdapter(def, site.merchantcircle),
  bbb: (def) => new SiteSearchAdapter(def, site.bbb),
};

/** Directories with discovery "none" (aggregators) are submitted and verified downstream, never scanned. */
export const ADAPTERS: DirectoryAdapter[] = DIRECTORIES.filter((d) => d.active && d.discovery !== "none").map((def) =>
  SPECIAL[def.id] ? SPECIAL[def.id](def) : new SearchFetchAdapter(def),
);

export const ADAPTER_BY_ID: Record<string, DirectoryAdapter> = Object.fromEntries(ADAPTERS.map((a) => [a.def.id, a]));
