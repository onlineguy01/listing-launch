import { encrypt, decrypt } from "@/lib/security/crypto";

/**
 * Google OAuth for Business Profile access, owner-authorized.
 * Scope `business.manage` lets us read the owner's accounts/locations and,
 * later, create or update a location on their behalf. The refresh token is
 * stored encrypted on the business record.
 */
export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const googleOAuthEnabled = () => !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.APP_SECRET);

function redirectUri(origin: string) { return `${origin}/api/google/callback`; }

export function buildAuthUrl(origin: string, state: string): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", `${GBP_SCOPE} openid email`);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

export interface TokenSet { accessToken: string; refreshToken?: string; expiresIn: number; idToken?: string }

export async function exchangeCode(origin: string, code: string): Promise<TokenSet> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin), grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`token exchange ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };
  return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: j.expires_in, idToken: j.id_token };
}

export async function refreshAccessToken(refreshTokenEnc: string): Promise<string> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: decrypt(refreshTokenEnc), client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(`token refresh ${r.status}`);
  return ((await r.json()) as { access_token: string }).access_token;
}

export const sealRefreshToken = (t: string) => encrypt(t);

/** Email claim from the id_token, without verifying signature (we only use it for display). */
export function emailFromIdToken(idToken?: string): string | undefined {
  if (!idToken) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : undefined;
  } catch { return undefined; }
}
