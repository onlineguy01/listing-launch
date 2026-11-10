import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appUrl } from "@/lib/email/send";
import { SESSION_COOKIE, SESSION_TTL_MS, signToken, verifyToken } from "@/lib/security/session";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const payload = await verifyToken(u.searchParams.get("token") ?? undefined, "magic");
  if (!payload?.email) return NextResponse.redirect(`${u.origin}/login?error=expired`);
  const session = await signToken({ purpose: "session", email: payload.email, exp: Date.now() + SESSION_TTL_MS });
  (await cookies()).set(SESSION_COOKIE, session, { httpOnly: true, sameSite: "lax", secure: appUrl().startsWith("https"), path: "/", maxAge: SESSION_TTL_MS / 1000 });
  return NextResponse.redirect(`${u.origin}/account`);
}
