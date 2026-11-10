import { randomUUID } from "node:crypto";
import type { CanonicalBusiness, Finding, NicheSite } from "@/lib/domain/types";
import type { OrderRecord, PublicationCheck, ScanRecord, Store, SubmissionRecord } from "./store";

/**
 * In-memory store for local development and demo mode. Lives on globalThis so
 * it survives Next.js hot reloads. Not for production.
 */
interface Mem {
  businesses: Map<string, CanonicalBusiness>;
  scans: Map<string, ScanRecord>;
  findings: Map<string, Finding[]>;
  orders: Map<string, OrderRecord>;
  submissions: Map<string, SubmissionRecord>;
  checks: Map<string, PublicationCheck>;
  nicheSites: Map<string, NicheSite>;
}
const g = globalThis as unknown as { __llMem?: Mem };
const mem: Mem = (g.__llMem ??= {
  businesses: new Map(), scans: new Map(), findings: new Map(), orders: new Map(), submissions: new Map(), checks: new Map(), nicheSites: new Map(),
});

export class MemoryStore implements Store {
  async createBusiness(b: Omit<CanonicalBusiness, "id">) {
    const rec = { ...b, id: randomUUID() };
    mem.businesses.set(rec.id, rec);
    return rec;
  }
  async getBusiness(id: string) { return mem.businesses.get(id) ?? null; }
  async updateBusiness(id: string, patch: Partial<CanonicalBusiness>) {
    const cur = mem.businesses.get(id);
    if (!cur) throw new Error("business not found");
    const next = { ...cur, ...patch };
    mem.businesses.set(id, next);
    return next;
  }

  async createScan(s: Omit<ScanRecord, "id" | "createdAt">) {
    const rec: ScanRecord = { ...s, id: randomUUID(), createdAt: new Date().toISOString() };
    mem.scans.set(rec.id, rec);
    mem.findings.set(rec.id, []);
    return rec;
  }
  async getScan(id: string) { return mem.scans.get(id) ?? null; }
  async updateScan(id: string, patch: Partial<ScanRecord>) {
    const cur = mem.scans.get(id);
    if (cur) mem.scans.set(id, { ...cur, ...patch });
  }
  async addFinding(scanId: string, _businessId: string, f: Finding) {
    const list = mem.findings.get(scanId) ?? [];
    const i = list.findIndex((x) => x.directoryId === f.directoryId);
    if (i >= 0) list[i] = f; else list.push(f);
    mem.findings.set(scanId, list);
  }
  async listFindings(scanId: string) { return [...(mem.findings.get(scanId) ?? [])]; }

  async createOrder(o: Omit<OrderRecord, "id" | "createdAt" | "refundedCents">) {
    const rec: OrderRecord = { ...o, refundedCents: 0, id: randomUUID(), createdAt: new Date().toISOString() };
    mem.orders.set(rec.id, rec);
    return rec;
  }
  async getOrder(id: string) { return mem.orders.get(id) ?? null; }
  async getOrderByCheckoutSession(sessionId: string) {
    for (const o of mem.orders.values()) if (o.stripeCheckoutSessionId === sessionId) return o;
    return null;
  }
  async updateOrder(id: string, patch: Partial<OrderRecord>) {
    const cur = mem.orders.get(id);
    if (cur) mem.orders.set(id, { ...cur, ...patch });
  }

  async createSubmissions(subs: Omit<SubmissionRecord, "id" | "updatedAt" | "log" | "humanMinutes" | "billingStatus">[]) {
    const out: SubmissionRecord[] = [];
    for (const s of subs) {
      const rec: SubmissionRecord = { ...s, id: randomUUID(), humanMinutes: 0, billingStatus: "charged", updatedAt: new Date().toISOString(), log: [{ at: new Date().toISOString(), event: "prepared" }] };
      mem.submissions.set(rec.id, rec);
      out.push(rec);
    }
    return out;
  }
  async listSubmissions(filter: { orderId?: string; businessId?: string }) {
    return [...mem.submissions.values()].filter(
      (s) => (!filter.orderId || s.orderId === filter.orderId) && (!filter.businessId || s.businessId === filter.businessId),
    );
  }
  async getSubmission(id: string) { return mem.submissions.get(id) ?? null; }
  async listOrdersByEmail(email: string) {
    const e = email.toLowerCase();
    return [...mem.orders.values()].filter((o) => o.customerEmail?.toLowerCase() === e || mem.businesses.get(o.businessId)?.ownerEmail?.toLowerCase() === e)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listScansByEmail(email: string) {
    const e = email.toLowerCase();
    return [...mem.scans.values()].filter((s) => s.requesterEmail?.toLowerCase() === e || mem.businesses.get(s.businessId)?.ownerEmail?.toLowerCase() === e)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listAllScans() { return [...mem.scans.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async listAllOrders() { return [...mem.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async findRecentScanByPhone(phoneE164: string, since: Date) {
    let best: ScanRecord | null = null;
    for (const sc of mem.scans.values()) {
      if (sc.status !== "complete" || new Date(sc.createdAt) < since) continue;
      if (mem.businesses.get(sc.businessId)?.phoneE164 !== phoneE164) continue;
      if (!best || sc.createdAt > best.createdAt) best = sc;
    }
    return best;
  }
  async listNicheSites(niche: string, status?: NicheSite["status"]) {
    return [...mem.nicheSites.values()].filter((s) => s.niche === niche && (!status || s.status === status));
  }
  async listNiches() {
    const m = new Map<string, { niche: string; suggested: number; approved: number; rejected: number }>();
    for (const s of mem.nicheSites.values()) { const r = m.get(s.niche) ?? { niche: s.niche, suggested: 0, approved: 0, rejected: 0 }; r[s.status]++; m.set(s.niche, r); }
    return [...m.values()];
  }
  async upsertNicheSites(sites: Omit<NicheSite, "id" | "createdAt">[]) {
    const out: NicheSite[] = [];
    for (const s of sites) {
      const existing = [...mem.nicheSites.values()].find((x) => x.niche === s.niche && x.host === s.host);
      if (existing) { out.push(existing); continue; }
      const rec: NicheSite = { ...s, id: randomUUID(), createdAt: new Date().toISOString() };
      mem.nicheSites.set(rec.id, rec); out.push(rec);
    }
    return out;
  }
  async updateNicheSite(id: string, patch: Partial<Pick<NicheSite, "status" | "who" | "kind" | "note" | "url">>) {
    const cur = mem.nicheSites.get(id); if (cur) mem.nicheSites.set(id, { ...cur, ...patch });
  }
  async schedulePublicationChecks(submissionId: string, dates: Date[]) {
    for (const d of dates) {
      const id = randomUUID();
      mem.checks.set(id, { id, submissionId, scheduledFor: d.toISOString() });
    }
  }
  async listDuePublicationChecks(now: Date) {
    return [...mem.checks.values()].filter((c) => !c.checkedAt && new Date(c.scheduledFor) <= now);
  }
  async completePublicationCheck(id: string, result: PublicationCheck["result"], listingUrl?: string) {
    const c = mem.checks.get(id);
    if (c) mem.checks.set(id, { ...c, checkedAt: new Date().toISOString(), result, listingUrl });
  }
  async listAllSubmissions() { return [...mem.submissions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async updateSubmission(id: string, patch: Partial<SubmissionRecord>, logEvent?: string, addMinutes = 0) {
    const cur = mem.submissions.get(id);
    if (!cur) return;
    const log = logEvent ? [...cur.log, { at: new Date().toISOString(), event: logEvent }] : cur.log;
    mem.submissions.set(id, { ...cur, ...patch, humanMinutes: cur.humanMinutes + addMinutes, log, updatedAt: new Date().toISOString() });
  }
}
