import type {
  CanonicalBusiness,
  DirectoryDefinition,
  Eligibility,
  Finding,
  ObservedListing,
  OwnerTaskType,
} from "@/lib/domain/types";

/** Shared services an adapter may call. Injected so adapters are testable. */
export interface AdapterContext {
  /** Run a web search restricted to a site; returns candidate URLs with titles/snippets. */
  search(query: string): Promise<SearchHit[]>;
  /** Fetch a page's HTML (server-side, with a sane UA, timeout and robots respect). */
  fetchHtml(url: string): Promise<string | null>;
  /** Optional LLM extraction fallback when a page has no structured data. */
  extractWithLlm?(html: string, url: string): Promise<ObservedListing | null>;
  log(event: string, detail?: unknown): void;
}

export interface SearchHit {
  url: string;
  title?: string;
  snippet?: string;
}

export interface SubmissionResult {
  status: "submitted" | "verification_required" | "failed" | "manual_required";
  listingUrl?: string;
  ownerActions?: OwnerTaskType[];
  notes?: string;
}

/**
 * One adapter per directory. `discover` is required (even if it only returns
 * unable_to_verify). `submit` is optional: when absent, fulfillment creates an
 * ops task instead.
 */
export interface DirectoryAdapter {
  readonly def: DirectoryDefinition;
  eligibility(biz: CanonicalBusiness): Eligibility;
  discover(biz: CanonicalBusiness, ctx: AdapterContext): Promise<Finding>;
  submit?(biz: CanonicalBusiness, ctx: AdapterContext): Promise<SubmissionResult>;
  verifyPublished(biz: CanonicalBusiness, listingUrl: string, ctx: AdapterContext): Promise<Finding>;
}
