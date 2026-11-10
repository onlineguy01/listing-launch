import type { CanonicalBusiness, Finding } from "@/lib/domain/types";
import type { Quote } from "@/lib/scan/quote";

export type ScanStatus = "queued" | "running" | "complete" | "failed";
export type OrderStatus = "draft" | "paid" | "in_progress" | "complete" | "refunded";

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
  stripeCheckoutSessionId?: string;
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
  action: "create" | "correct";
  status: "prepared" | "submitted" | "verification_required" | "published" | "rejected" | "not_eligible" | "failed";
  method: "api" | "form" | "manual" | "none";
  listingUrl?: string;
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

  createOrder(o: Omit<OrderRecord, "id" | "createdAt">): Promise<OrderRecord>;
  getOrder(id: string): Promise<OrderRecord | null>;
  getOrderByCheckoutSession(sessionId: string): Promise<OrderRecord | null>;
  updateOrder(id: string, patch: Partial<OrderRecord>): Promise<void>;

  createSubmissions(subs: Omit<SubmissionRecord, "id" | "updatedAt" | "log">[]): Promise<SubmissionRecord[]>;
  listSubmissions(filter: { orderId?: string; businessId?: string }): Promise<SubmissionRecord[]>;
  listAllSubmissions(): Promise<SubmissionRecord[]>;
  getSubmission(id: string): Promise<SubmissionRecord | null>;
  updateSubmission(id: string, patch: Partial<SubmissionRecord>, logEvent?: string): Promise<void>;

  /** Customer account views. */
  listOrdersByEmail(email: string): Promise<OrderRecord[]>;
  listScansByEmail(email: string): Promise<ScanRecord[]>;
  /** Admin metrics. */
  listAllScans(): Promise<ScanRecord[]>;
  listAllOrders(): Promise<OrderRecord[]>;

  /** Most recent complete scan for this phone number newer than `since`, for caching. */
  findRecentScanByPhone(phoneE164: string, since: Date): Promise<ScanRecord | null>;

  schedulePublicationChecks(submissionId: string, dates: Date[]): Promise<void>;
  listDuePublicationChecks(now: Date): Promise<PublicationCheck[]>;
  completePublicationCheck(id: string, result: Finding["state"], listingUrl?: string): Promise<void>;
}
