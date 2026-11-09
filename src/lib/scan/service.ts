import { z } from "zod";
import { getStore } from "@/lib/data";
import type { CanonicalBusiness } from "@/lib/domain/types";
import { normalizeDomain, normalizePhone, normalizeState } from "./normalize";
import { runScan } from "./runner";
import { createMockContext } from "./mock";
import { createLiveContext, hasLiveKeys } from "./context";
import { ADAPTERS } from "@/lib/adapters";
import { CATEGORIES } from "@/lib/directories/categories";

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
  };
}

/** Create the business + scan records and return the scan id. Call `executeScan` to run it. */
export async function startScan(input: BusinessInputT) {
  const store = getStore();
  const biz = await store.createBusiness(toCanonical(input));
  const mode = hasLiveKeys() ? "live" : "mock";
  const scan = await store.createScan({
    businessId: biz.id, status: "queued", directoriesTotal: ADAPTERS.length, directoriesDone: 0,
    requesterEmail: input.email || undefined, mode,
  });
  return { scan, biz };
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
  } catch (e) {
    await store.updateScan(scanId, { status: "failed", error: String(e) });
  }
}
