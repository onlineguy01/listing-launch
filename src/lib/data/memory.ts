import { randomUUID } from "node:crypto";
import type { CanonicalBusiness, Finding } from "@/lib/domain/types";
import type { OrderRecord, ScanRecord, Store, SubmissionRecord } from "./store";

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
}
const g = globalThis as unknown as { __llMem?: Mem };
const mem: Mem = (g.__llMem ??= {
  businesses: new Map(), scans: new Map(), findings: new Map(), orders: new Map(), submissions: new Map(),
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

  async createOrder(o: Omit<OrderRecord, "id" | "createdAt">) {
    const rec: OrderRecord = { ...o, id: randomUUID(), createdAt: new Date().toISOString() };
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

  async createSubmissions(subs: Omit<SubmissionRecord, "id" | "updatedAt" | "log">[]) {
    const out: SubmissionRecord[] = [];
    for (const s of subs) {
      const rec: SubmissionRecord = { ...s, id: randomUUID(), updatedAt: new Date().toISOString(), log: [{ at: new Date().toISOString(), event: "prepared" }] };
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
  async listAllSubmissions() { return [...mem.submissions.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async updateSubmission(id: string, patch: Partial<SubmissionRecord>, logEvent?: string) {
    const cur = mem.submissions.get(id);
    if (!cur) return;
    const log = logEvent ? [...cur.log, { at: new Date().toISOString(), event: logEvent }] : cur.log;
    mem.submissions.set(id, { ...cur, ...patch, log, updatedAt: new Date().toISOString() });
  }
}
