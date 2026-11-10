import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyToken } from "@/lib/security/session";

/**
 * Protects /admin pages and /api/admin routes. When ADMIN_TOKEN is unset the
 * app is in demo mode and admin stays open. Otherwise a signed admin cookie
 * (from /admin/login) or the raw x-admin-token header is required.
 */
export async function proxy(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (path === "/admin/login" || path === "/api/admin/login") return NextResponse.next();

  if (req.headers.get("x-admin-token") === token) return NextResponse.next();
  const ok = await verifyToken(req.cookies.get(ADMIN_COOKIE)?.value, "admin");
  if (ok) return NextResponse.next();

  if (path.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
