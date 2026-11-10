/**
 * Signed, expiring tokens using Web Crypto (works in Node and the Edge proxy).
 * Format: base64url(json payload).base64url(hmac-sha256). Not encrypted; never
 * put secrets in the payload.
 */
export interface TokenPayload { purpose: "magic" | "session" | "admin"; email?: string; exp: number }

function secret(): string {
  return process.env.APP_SECRET || "dev-only-insecure-secret-set-APP_SECRET";
}

const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64url");

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${await hmac(body)}`;
}

export async function verifyToken(token: string | undefined, purpose: TokenPayload["purpose"]): Promise<TokenPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (p.purpose !== purpose || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export const MAGIC_TTL_MS = 15 * 60_000;
export const SESSION_TTL_MS = 30 * 86_400_000;
export const ADMIN_TTL_MS = 7 * 86_400_000;
export const SESSION_COOKIE = "ll_session";
export const ADMIN_COOKIE = "ll_admin";
