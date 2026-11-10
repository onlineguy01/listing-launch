import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appUrl } from "@/lib/email/send";
import { ADMIN_COOKIE, ADMIN_TTL_MS, signToken } from "@/lib/security/session";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return NextResponse.json({ ok: true, demo: true });
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token || token !== expected) return NextResponse.json({ error: "Wrong token" }, { status: 401 });
  const value = await signToken({ purpose: "admin", exp: Date.now() + ADMIN_TTL_MS });
  (await cookies()).set(ADMIN_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: appUrl().startsWith("https"), path: "/", maxAge: ADMIN_TTL_MS / 1000 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
