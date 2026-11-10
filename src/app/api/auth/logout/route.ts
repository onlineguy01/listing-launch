import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/security/session";

export async function POST(req: Request) {
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
