import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emailFromIdToken, exchangeCode, sealRefreshToken } from "@/lib/google/oauth";
import { GoogleBusinessClient } from "@/lib/google/business";
import { getStore } from "@/lib/data";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const stateRaw = u.searchParams.get("state");
  if (!code || !stateRaw) return NextResponse.redirect(`${u.origin}/?google=denied`);
  let state: { businessId: string; orderId: string; nonce: string };
  try { state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")); } catch { return NextResponse.json({ error: "bad state" }, { status: 400 }); }
  const jar = await cookies();
  if (jar.get("g_oauth_nonce")?.value !== state.nonce) return NextResponse.json({ error: "state mismatch" }, { status: 400 });
  jar.delete("g_oauth_nonce");

  const store = getStore();
  const biz = await store.getBusiness(state.businessId);
  if (!biz) return NextResponse.json({ error: "business not found" }, { status: 404 });
  const back = state.orderId ? `${u.origin}/order/${state.orderId}` : `${u.origin}/`;
  try {
    const tokens = await exchangeCode(u.origin, code);
    if (!tokens.refreshToken) return NextResponse.redirect(`${back}?google=no_refresh_token`);
    const enc = sealRefreshToken(tokens.refreshToken);
    const email = emailFromIdToken(tokens.idToken);
    let locationName: string | undefined;
    try {
      const match = await new GoogleBusinessClient(enc).findMatchingLocation(biz);
      locationName = match?.location.name;
    } catch (e) { console.error("GBP lookup failed", e); }
    await store.updateBusiness(biz.id, { googleRefreshTokenEnc: enc, googleAccountEmail: email, googleLocationName: locationName });
    return NextResponse.redirect(`${back}?google=connected${locationName ? "&gbp=found" : "&gbp=none"}`);
  } catch (e) {
    console.error("google callback failed", e);
    return NextResponse.redirect(`${back}?google=error`);
  }
}
