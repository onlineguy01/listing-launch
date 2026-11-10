import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/security/session";

export async function POST(req: Request) {
  (await cookies()).delete(ADMIN_COOKIE);
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
