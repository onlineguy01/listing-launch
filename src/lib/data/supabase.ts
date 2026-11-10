import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalBusiness, Finding } from "@/lib/domain/types";
import type { OrderRecord, PublicationCheck, ScanRecord, Store, SubmissionRecord } from "./store";

/**
 * Supabase-backed store using the service-role key (server only). Maps the
 * camelCase domain types onto the snake_case schema in supabase/migrations.
 */
export class SupabaseStore implements Store {
  private sb: SupabaseClient;
  constructor(url = process.env.SUPABASE_URL!, key = process.env.SUPABASE_SERVICE_ROLE_KEY!) {
    this.sb = createClient(url, key, { auth: { persistSession: false } });
  }

  async createBusiness(b: Omit<CanonicalBusiness, "id">) {
    const { data, error } = await this.sb.from("businesses").insert(bizToRow(b)).select().single();
    if (error) throw error;
    return rowToBiz(data);
  }
  async getBusiness(id: string) {
    const { data } = await this.sb.from("businesses").select().eq("id", id).maybeSingle();
    return data ? rowToBiz(data) : null;
  }
  async updateBusiness(id: string, patch: Partial<CanonicalBusiness>) {
    const { data, error } = await this.sb.from("businesses").update(bizToRow(patch)).eq("id", id).select().single();
    if (error) throw error;
    return rowToBiz(data);
  }

  async createScan(s: Omit<ScanRecord, "id" | "createdAt">) {
    const { data, error } = await this.sb.from("scan_jobs").insert({
      business_id: s.businessId, status: s.status, directories_total: s.directoriesTotal,
      directories_done: s.directoriesDone, requester_email: s.requesterEmail,
    }).select().single();
    if (error) throw error;
    return { ...rowToScan(data), mode: s.mode };
  }
  async getScan(id: string) {
    const { data } = await this.sb.from("scan_jobs").select().eq("id", id).maybeSingle();
    return data ? rowToScan(data) : null;
  }
  async updateScan(id: string, patch: Partial<ScanRecord>) {
    await this.sb.from("scan_jobs").update({
      status: patch.status, completed_at: patch.completedAt, directories_done: patch.directoriesDone, error: patch.error,
    }).eq("id", id);
  }
  async addFinding(scanId: string, businessId: string, f: Finding) {
    const { error } = await this.sb.from("findings").upsert({
      scan_job_id: scanId, business_id: businessId, directory_id: f.directoryId, state: f.state,
      confidence: f.confidence, listing_url: f.listingUrl, observed: f.observed, diffs: f.diffs, evidence: f.evidence,
    }, { onConflict: "scan_job_id,directory_id" });
    if (error) throw error;
  }
  async listFindings(scanId: string) {
    const { data } = await this.sb.from("findings").select().eq("scan_job_id", scanId);
    return (data ?? []).map((r) => ({
      directoryId: r.directory_id, state: r.state, confidence: Number(r.confidence), listingUrl: r.listing_url ?? undefined,
      observed: r.observed ?? undefined, diffs: r.diffs ?? [], evidence: r.evidence,
    })) as Finding[];
  }

  async createOrder(o: Omit<OrderRecord, "id" | "createdAt" | "refundedCents">) {
    const { data, error } = await this.sb.from("orders").insert({
      business_id: o.businessId, scan_job_id: o.scanId, status: o.status, package_name: o.quote.packageName, package_tier: o.packageTier,
      subtotal_cents: o.quote.subtotalCents, fees_cents: o.quote.feesCents, total_cents: o.quote.totalCents,
      customer_email: o.customerEmail, stripe_checkout_session_id: o.stripeCheckoutSessionId,
    }).select().single();
    if (error) throw error;
    const items = o.quote.items.map((i) => ({ order_id: data.id, directory_id: i.directoryId, action: i.action, price_cents: i.priceCents + i.feeCents }));
    if (items.length) await this.sb.from("order_items").insert(items);
    return { ...o, refundedCents: 0, id: data.id, createdAt: data.created_at };
  }
  async getOrder(id: string) {
    const { data } = await this.sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
    return data ? rowToOrder(data) : null;
  }
  async getOrderByCheckoutSession(sessionId: string) {
    const { data } = await this.sb.from("orders").select("*, order_items(*)").eq("stripe_checkout_session_id", sessionId).maybeSingle();
    return data ? rowToOrder(data) : null;
  }
  async updateOrder(id: string, patch: Partial<OrderRecord>) {
    await this.sb.from("orders").update({
      status: patch.status, paid_at: patch.paidAt, customer_email: patch.customerEmail,
      stripe_checkout_session_id: patch.stripeCheckoutSessionId, stripe_payment_intent_id: patch.stripePaymentIntentId,
      refunded_cents: patch.refundedCents, completion_report_sent_at: patch.completionReportSentAt,
    }).eq("id", id);
  }

  async createSubmissions(subs: Omit<SubmissionRecord, "id" | "updatedAt" | "log" | "humanMinutes" | "billingStatus">[]) {
    if (!subs.length) return [];
    // Need order_item ids: look them up by (order, directory)
    const orderId = subs[0].orderId;
    const { data: items } = await this.sb.from("order_items").select("id, directory_id").eq("order_id", orderId);
    const itemId = new Map((items ?? []).map((i) => [i.directory_id, i.id]));
    const rows = subs.map((s) => ({
      order_item_id: itemId.get(s.directoryId), business_id: s.businessId, directory_id: s.directoryId,
      status: s.status, method: s.method, action: s.action, price_cents: s.priceCents, log: [{ at: new Date().toISOString(), event: "prepared" }],
    }));
    const { data, error } = await this.sb.from("submission_jobs").insert(rows).select("*, order_items(order_id, action)");
    if (error) throw error;
    return (data ?? []).map(rowToSub);
  }
  async listSubmissions(filter: { orderId?: string; businessId?: string }) {
    let q = this.sb.from("submission_jobs").select("*, order_items!inner(order_id, action)");
    if (filter.businessId) q = q.eq("business_id", filter.businessId);
    if (filter.orderId) q = q.eq("order_items.order_id", filter.orderId);
    const { data } = await q;
    return (data ?? []).map(rowToSub);
  }
  async getSubmission(id: string) {
    const { data } = await this.sb.from("submission_jobs").select("*, order_items(order_id, action)").eq("id", id).maybeSingle();
    return data ? rowToSub(data) : null;
  }
  async listOrdersByEmail(email: string) {
    const { data } = await this.sb.from("orders").select("*, order_items(*), businesses!inner(owner_email)")
      .or(`customer_email.ilike.${email},businesses.owner_email.ilike.${email}`).order("created_at", { ascending: false });
    return (data ?? []).map(rowToOrder);
  }
  async listScansByEmail(email: string) {
    const { data } = await this.sb.from("scan_jobs").select("*, businesses!inner(owner_email)")
      .or(`requester_email.ilike.${email},businesses.owner_email.ilike.${email}`).order("created_at", { ascending: false });
    return (data ?? []).map(rowToScan);
  }
  async listAllScans() {
    const { data } = await this.sb.from("scan_jobs").select().order("created_at", { ascending: false }).limit(5000);
    return (data ?? []).map(rowToScan);
  }
  async listAllOrders() {
    const { data } = await this.sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(5000);
    return (data ?? []).map(rowToOrder);
  }
  async findRecentScanByPhone(phoneE164: string, since: Date) {
    const { data } = await this.sb.from("scan_jobs").select("*, businesses!inner(phone_e164)")
      .eq("status", "complete").eq("businesses.phone_e164", phoneE164).gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data ? rowToScan(data) : null;
  }
  async schedulePublicationChecks(submissionId: string, dates: Date[]) {
    await this.sb.from("publication_checks").insert(dates.map((d) => ({ submission_job_id: submissionId, scheduled_for: d.toISOString() })));
  }
  async listDuePublicationChecks(now: Date) {
    const { data } = await this.sb.from("publication_checks").select().is("checked_at", null).lte("scheduled_for", now.toISOString()).limit(200);
    return (data ?? []).map((r) => ({ id: r.id, submissionId: r.submission_job_id, scheduledFor: r.scheduled_for }));
  }
  async completePublicationCheck(id: string, result: PublicationCheck["result"], listingUrl?: string) {
    await this.sb.from("publication_checks").update({ checked_at: new Date().toISOString(), result, listing_url: listingUrl }).eq("id", id);
  }
  async listAllSubmissions() {
    const { data } = await this.sb.from("submission_jobs").select("*, order_items(order_id, action)").order("updated_at", { ascending: false }).limit(500);
    return (data ?? []).map(rowToSub);
  }
  async updateSubmission(id: string, patch: Partial<SubmissionRecord>, logEvent?: string, addMinutes = 0) {
    const { data: cur } = await this.sb.from("submission_jobs").select("log, human_minutes").eq("id", id).single();
    const log = logEvent ? [...(cur?.log ?? []), { at: new Date().toISOString(), event: logEvent }] : undefined;
    const human_minutes = addMinutes ? (cur?.human_minutes ?? 0) + addMinutes : undefined;
    await this.sb.from("submission_jobs").update({
      status: patch.status, listing_url: patch.listingUrl, method: patch.method, log, human_minutes,
      billing_status: patch.billingStatus, verified_at: patch.verifiedAt, verified_by: patch.verifiedBy,
      refunded_at: patch.refundedAt, stripe_refund_id: patch.stripeRefundId, refund_note: patch.refundNote,
    }).eq("id", id);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function bizToRow(b: Partial<CanonicalBusiness>): Record<string, any> {
  const r: Record<string, any> = {};
  const map: [keyof CanonicalBusiness, string][] = [
    ["name", "name"], ["street", "street"], ["city", "city"], ["state", "state"], ["postalCode", "postal_code"],
    ["country", "country"], ["phoneE164", "phone_e164"], ["website", "website"], ["domain", "domain"],
    ["categories", "categories"], ["hours", "hours"], ["hideAddress", "hide_address"], ["googlePlaceId", "google_place_id"],
    ["ownerEmail", "owner_email"], ["descriptionShort", "description_short"], ["descriptionLong", "description_long"], ["logoUrl", "logo_url"],
    ["serviceArea", "service_area"], ["services", "services"], ["yearFounded", "year_founded"], ["paymentMethods", "payment_methods"],
    ["googleRefreshTokenEnc", "google_refresh_token_enc"], ["googleAccountEmail", "google_account_email"], ["googleLocationName", "google_location_name"],
    ["detailsCompletedAt", "details_completed_at"],
  ];
  for (const [k, col] of map) if (b[k] !== undefined) r[col] = b[k];
  return r;
}
function rowToBiz(r: any): CanonicalBusiness {
  return {
    id: r.id, name: r.name, street: r.street ?? undefined, city: r.city, state: r.state, postalCode: r.postal_code ?? undefined,
    country: r.country, phoneE164: r.phone_e164 ?? undefined, website: r.website ?? undefined, domain: r.domain ?? undefined,
    categories: r.categories ?? [], hours: r.hours ?? undefined, hideAddress: r.hide_address, googlePlaceId: r.google_place_id ?? undefined,
    ownerEmail: r.owner_email ?? undefined, descriptionShort: r.description_short ?? undefined,
    descriptionLong: r.description_long ?? undefined, logoUrl: r.logo_url ?? undefined,
    serviceArea: r.service_area ?? undefined, services: r.services ?? undefined, yearFounded: r.year_founded ?? undefined,
    paymentMethods: r.payment_methods ?? undefined, googleRefreshTokenEnc: r.google_refresh_token_enc ?? undefined,
    googleAccountEmail: r.google_account_email ?? undefined, googleLocationName: r.google_location_name ?? undefined,
    detailsCompletedAt: r.details_completed_at ?? undefined,
  };
}
function rowToScan(r: any): ScanRecord {
  return {
    id: r.id, businessId: r.business_id, status: r.status, createdAt: r.created_at, completedAt: r.completed_at ?? undefined,
    directoriesTotal: r.directories_total, directoriesDone: r.directories_done, requesterEmail: r.requester_email ?? undefined,
    mode: "live", error: r.error ?? undefined,
  };
}
function rowToOrder(r: any): OrderRecord {
  const items = (r.order_items ?? []).map((i: any) => ({
    directoryId: i.directory_id, directoryName: i.directory_id, action: i.action, priceCents: i.price_cents, feeCents: 0, findingState: i.action === "create" ? "not_found" : "incorrect",
  }));
  return {
    id: r.id, businessId: r.business_id, scanId: r.scan_job_id, status: r.status, createdAt: r.created_at,
    paidAt: r.paid_at ?? undefined, customerEmail: r.customer_email ?? undefined, stripeCheckoutSessionId: r.stripe_checkout_session_id ?? undefined,
    stripePaymentIntentId: r.stripe_payment_intent_id ?? undefined, packageTier: r.package_tier ?? undefined, refundedCents: r.refunded_cents ?? 0,
    completionReportSentAt: r.completion_report_sent_at ?? undefined,
    quote: { packageName: r.package_name, items, subtotalCents: r.subtotal_cents, feesCents: r.fees_cents, totalCents: r.total_cents, excluded: [] },
  };
}
function rowToSub(r: any): SubmissionRecord {
  return {
    id: r.id, orderId: r.order_items?.order_id, businessId: r.business_id, directoryId: r.directory_id,
    action: r.action ?? r.order_items?.action ?? "create", status: r.status, method: r.method, listingUrl: r.listing_url ?? undefined,
    humanMinutes: r.human_minutes ?? 0, priceCents: r.price_cents ?? 0, billingStatus: r.billing_status ?? "charged",
    verifiedAt: r.verified_at ?? undefined, verifiedBy: r.verified_by ?? undefined, refundedAt: r.refunded_at ?? undefined,
    stripeRefundId: r.stripe_refund_id ?? undefined, refundNote: r.refund_note ?? undefined,
    updatedAt: r.updated_at, log: r.log ?? [],
  };
}
