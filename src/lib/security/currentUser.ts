import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "./session";

/** Email of the signed-in customer, or null. Server components and routes only. */
export async function currentUserEmail(): Promise<string | null> {
  const jar = await cookies();
  const p = await verifyToken(jar.get(SESSION_COOKIE)?.value, "session");
  return p?.email ?? null;
}
