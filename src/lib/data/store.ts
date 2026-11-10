import type { CanonicalBusiness, Finding, NicheSite } from "@/lib/domain/types";
import type { Quote } from "@/lib/scan/quote";

export type ScanStatus = "queued" | "running" | "complete" | "failed";
export type OrderStatus = "draft" | "paid" | "in_progress" | "complete" | "refunded";
export type BillingStatus = "charged" | "verified" | "refunded" | "substituted";
export type LineAction = "create" | "correct" | "verify" | "review";

export interface ScanRecord {
  id: string;
  businessId: string;
  status: ScanStatus;
  createdAt: string;
  completedAt?: string;
  directoriesTotal: number;
  directoriesDone: number;
  requesterEmail?: string;
  mode: "mock" | "live";
  error?: string;
}

export interface OrderRecord {
  id: string;
  businessId: string;
  scanId: string;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  customerEmail?: string;
  quote: Quote;
  packageTier?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  refundedCents: number;
  completionReportSentAt?: string;
}

export interface PublicationCheck {
  id: string;
  submissionId: string;
  scheduledFor: string;
  checkedAt?: string;
  result?: Finding["state"];
  listingUrl?: string;
}

export interface SubmissionRecord {
  id: string;
  orderId: string;
  businessId: string;
  directoryId: string;
  action: LineAction;
  status: "prepared" | "submitted" | "verification_required" | "published" | "rejected" | "not_eligible" | "failed";
  method: "api" | "form" | "manual" | "none";
  listingUrl?: string;
  humanMinutes: number;
  /** Billing under the guarantee. */
  priceCents: number;
  billingStatus: BillingStatus;
  verifiedAt?: string;
  verifiedBy?: "scanner" | "owner" | "ops";
  refundedAt?: string;
  stripeRefundId?: string;
  refundNote?: string;
  updatedAt: string;
  log: { at: string; event: string; detail?: string }[];
}

export interface Store {
  createBusiness(b: Omit<CanonicalBusiness, "id">): Promise<CanonicalBusiness>;
  getBusiness(id: string): Promise<CanonicalBusiness | null>;
  updateBusiness(id: string, patch: Partial<CanonicalBusiness>): Promise<CanonicalBusiness>;

  createScan(s: Omit<ScanRecord, "id" | "createdAt">): Promise<ScanRecord>;
  getScan(id: string): Promise<ScanRecord | null>;
  updateScan(id: string, patch: Partial<ScanRecord>): Promise<void>;
  addFinding(scanId: string, businessId: string, f: Finding): Promise<void>;
  listFindings(scanId: string): Promise<Finding[]>;

  createOrder(o: Omit<OrderRecord, "id" | "createdAt" | "refundedCents">): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  getOrderByCheckoutSession(sessionId: string): Promise<OrderRecord | null>;
  updateOrder(id: string, patch: Partial<OrderRecord>): Promise<void>;

  createSubmissions(subs: Omit<SubmissionRecord, "id" | "updatedAt" | "log" | "humanMinutes" | "billingStatus">[]): Promise<SubmissionRecord[]>;
  listSubmissions(filter: { orderId?: string; businessId?: string }): Promise<SubmissionRecord[]>;
  listAllSubmissions(): Promise<SubmissionRecord[]>;
  getSubmission(id: string): Promise<SubmissionRecord | null>;
  /** `addMinutes` increments the human-minutes counter (never replaces it). */
  updateSubmission(id: string, patch: Partial<SubmissionRecord>, logEvent?: string, addMinutes?: number): Promise<void>;

  /** Customer account views. */
  listOrdersByEmail(email: string): Promise<OrderRecord[]>;
  listScansByEmail(email: string): Promise<ScanRecord[]>;
  /** Admin metrics. */
  listAllScans(): Promise<ScanRecord[]>;
  listAllOrders(): Promise<OrderRecord[]>;

  /** Most recent complete scan for this phone number newer than `since`, for caching. */
  findRecentScanByPhone(phoneE164: string, since: Date): Promise<ScanRecord | null>;

  /** Niche directory discovery. */
  listNicheSites(niche: string, status?: NicheSite["status"]): Promise<NicheSite[]>;
  listNiches(): Promise<{ niche: string; suggested: number; approved: number; rejected: number }[]>;
  upsertNicheSites(sites: Omit<NicheSite, "id" | "createdAt">[]): Promise<NicheSite[]>;
  updateNicheSite(id: string, patch: Partial<Pick<NicheSite, "status" | "who" | "kind" | "note" | "url">>): Promise<void>;

  schedulePublicationChecks(submissionId: string, dates: Date[]): Promise<void>;
  listDuePublicationChecks(now: Date): Promise<PublicationCheck[]>;
  completePublicationCheck(id: string, result: Finding["state"], listingUrl?: string): Promise<void>;
}
