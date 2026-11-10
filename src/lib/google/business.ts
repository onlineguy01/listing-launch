import { refreshAccessToken } from "./oauth";
import type { CanonicalBusiness } from "@/lib/domain/types";

/**
 * Minimal Google Business Profile client (Account Management + Business
 * Information APIs). Requires the project to be approved for these APIs.
 */
const ACCOUNTS = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";

export interface GbpAccount { name: string; accountName?: string; type?: string }
export interface GbpLocation { name: string; title?: string; metadata?: { placeId?: string; mapsUri?: string }; phoneNumbers?: { primaryPhone?: string }; websiteUri?: string }

export class GoogleBusinessClient {
  constructor(private readonly refreshTokenEnc: string) {}

  private async get<T>(url: string): Promise<T> {
    const token = await refreshAccessToken(this.refreshTokenEnc);
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`GBP ${r.status}: ${await r.text()}`);
    return (await r.json()) as T;
  }

  async listAccounts(): Promise<GbpAccount[]> {
    const j = await this.get<{ accounts?: GbpAccount[] }>(`${ACCOUNTS}/accounts`);
    return j.accounts ?? [];
  }

  async listLocations(accountName: string): Promise<GbpLocation[]> {
    const mask = "name,title,metadata,phoneNumbers,websiteUri";
    const j = await this.get<{ locations?: GbpLocation[] }>(`${INFO}/${accountName}/locations?readMask=${encodeURIComponent(mask)}&pageSize=100`);
    return j.locations ?? [];
  }

  /** Find the owner's location that matches our canonical record (by Place ID first, then phone). */
  async findMatchingLocation(biz: CanonicalBusiness): Promise<{ account: GbpAccount; location: GbpLocation } | null> {
    for (const account of await this.listAccounts()) {
      const locs = await this.listLocations(account.name);
      const byPlace = biz.googlePlaceId ? locs.find((l) => l.metadata?.placeId === biz.googlePlaceId) : undefined;
      if (byPlace) return { account, location: byPlace };
      const digits = biz.phoneE164?.replace(/\D/g, "").slice(-10);
      const byPhone = digits ? locs.find((l) => l.phoneNumbers?.primaryPhone?.replace(/\D/g, "").endsWith(digits)) : undefined;
      if (byPhone) return { account, location: byPhone };
    }
    return null;
  }
}
