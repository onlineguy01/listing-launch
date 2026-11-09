import { DIRECTORIES } from "@/lib/directories/registry";
import type { DirectoryAdapter } from "./types";
import { SearchFetchAdapter } from "./searchFetchAdapter";
import { GooglePlacesAdapter } from "./google";
import { YelpAdapter } from "./yelp";

/**
 * Adapter registry. Directories with an official API get a dedicated adapter;
 * everything else uses the generic search+fetch adapter. Adding directory #16
 * means adding a registry entry (and optionally a class here).
 */
const SPECIAL: Record<string, (def: (typeof DIRECTORIES)[number]) => DirectoryAdapter> = {
  google: (def) => new GooglePlacesAdapter(def),
  yelp: (def) => new YelpAdapter(def),
};

export const ADAPTERS: DirectoryAdapter[] = DIRECTORIES.filter((d) => d.active).map((def) =>
  SPECIAL[def.id] ? SPECIAL[def.id](def) : new SearchFetchAdapter(def),
);

export const ADAPTER_BY_ID: Record<string, DirectoryAdapter> = Object.fromEntries(ADAPTERS.map((a) => [a.def.id, a]));
