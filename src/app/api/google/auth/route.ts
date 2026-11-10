import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { buildAuthUrl, googleOAuthEnabled } from "@/lib/google/oauth";
import { getStore } from "@/lib/data";

/** Start owner-authorized Google sign-in for a business: /api/google/auth?businessId=…&orderId=… */
export async function GET(req: Request) {
  if (!googleOAuthEnabled()) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 501 });
  const u = new URL(req.url);
  const businessId = u.searchParams.get("businessId");
  const orderId = u.searchParams.get("orderId") ?? "";
  if (!businessId || !(await getStore().getBusiness(businessId))) return NextResponse.json({ error: "business not found" }, { status: 404 });
  const nonce = randomBytes(16).toString("hex");
  const state = Buffer.from(JSON.stringify({ businessId, orderId, nonce })).toString("base64url");
  (await cookies()).set("g_oauth_nonce", nonce, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(buildAuthUrl(u.origin, state));
}
