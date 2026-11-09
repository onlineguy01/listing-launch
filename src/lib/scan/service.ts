import { z } from "zod";
import { getStore } from "@/lib/data";
import type { Store } from "@/lib/data/store";
import type { CanonicalBusiness } from "@/lib/domain/types";
import { normalizeDomain, normalizePhone, normalizeState } from "./normalize";
import { runScan } from "./runner";
import { createMockContext } from "./mock";
import { createLiveContext, hasLiveKeys } from "./context";
import { ADAPTERS } from "@/lib/adapters";
import { CATEGORIES } from "@/lib/directories/categories";
import { emailReportReady } from "@/lib/email/send";

export const BusinessInput = z.object({
  name: z.string().trim().min(2).max(120),
  street: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  category: z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]]),
  hideAddress: z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean()).default(false),
  email: z.string().trim().email().optional().or(z.literal("")),
  googlePlaceId: z.string().trim().max(200).optional().or(z.literal("")),
});
export type BusinessInputT = z.infer<typeof BusinessInput>;

export function toCanonical(input: BusinessInputT): Omit<CanonicalBusiness, "id"> {
  const phoneE164 = normalizePhone(input.phone || undefined);
  const website = input.website ? (/^https?:\/\//.test(input.website) ? input.website : `https://${input.website}`) : undefined;
  return {
    name: input.name,
    street: input.street || undefined,
    city: input.city,
    state: normalizeState(input.state),
    postalCode: input.postalCode || undefined,
    country: "US",
    phoneE164,
    website,
    domain: normalizeDomain(website),
    categories: [input.category],
    hideAddress: input.hideAddress,
    ownerEmail: input.email || undefined,
    googlePlaceId: input.googlePlaceId || undefined,
  };
}

export const SCAN_CACHE_DAYS = 14;

/**
 * Create the business + scan records and return the scan id. Call `executeScan` to run it.
 * If the same phone number was scanned successfully within SCAN_CACHE_DAYS, reuse that scan.
 */
export async function startScan(input: BusinessInputT): Promise<{ scan: Awaited<ReturnType<Store["createScan"]>>; biz: CanonicalBusiness; cached: boolean }> {
  const store = getStore();
  const canonical = toCanonical(input);
  if (canonical.phoneE164) {
    const since = new Date(Date.now() - SCAN_CACHE_DAYS * 86_400_000);
    const recent = await store.findRecentScanByPhone(canonical.phoneE164, since);
    if (recent) {
      const existing = await store.getBusiness(recent.businessId);
      if (existing && input.email && !existing.ownerEmail) await store.updateBusiness(existing.id, { ownerEmail: input.email });
      return { scan: recent, biz: existing!, cached: true };
    }
  }
  const biz = await store.createBusiness(canonical);
  const mode = hasLiveKeys() ? "live" : "mock";
  const scan = await store.createScan({
    businessId: biz.id, status: "queued", directoriesTotal: ADAPTERS.length, directoriesDone: 0,
    requesterEmail: input.email || undefined, mode,
  });
  return { scan, biz, cached: false };
}

// ---- Simple in-process rate limiter (per IP, sliding hour). Swap for Upstash/Redis when multi-instance.
const g = globalThis as unknown as { __llRate?: Map<string, number[]> };
const hits = (g.__llRate ??= new Map());
export const SCANS_PER_HOUR_PER_IP = Number(process.env.SCANS_PER_HOUR_PER_IP ?? 5);

export function checkRateLimit(ip: string, now = Date.now()): { ok: boolean; retryAfterSec?: number } {
  const windowStart = now - 3_600_000;
  const list = (hits.get(ip) ?? []).filter((t: number) => t > windowStart);
  if (list.length >= SCANS_PER_HOUR_PER_IP) {
    return { ok: false, retryAfterSec: Math.ceil((list[0] + 3_600_000 - now) / 1000) };
  }
  list.push(now);
  hits.set(ip, list);
  return { ok: true };
}

/** Run the scan, persisting findings as they arrive. Safe to run in the background. */
export async function executeScan(scanId: string) {
  const store = getStore();
  const scan = await store.getScan(scanId);
  if (!scan) return;
  const biz = await store.getBusiness(scan.businessId);
  if (!biz) return;
  const log = (event: string, detail?: unknown) => console.log(`[scan ${scanId.slice(0, 8)}] ${event}`, detail ?? "");
  const ctx = scan.mode === "live" ? createLiveContext(log) : createMockContext(biz, log);
  await store.updateScan(scanId, { status: "running" });
  try {
    await runScan(biz, ctx, {
      onFinding: async (f, p) => {
        await store.addFinding(scanId, biz.id, f);
        await store.updateScan(scanId, { directoriesDone: p.done });
      },
    });
    await store.updateScan(scanId, { status: "complete", completedAt: new Date().toISOString() });
    const to = scan.requesterEmail ?? biz.ownerEmail;
    if (to) await emailReportReady(scanId, to).catch((e) => console.error("report email failed", e));
  } catch (e) {
    await store.updateScan(scanId, { status: "failed", error: String(e) });
  }
}
