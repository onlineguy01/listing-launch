import { NextResponse, after } from "next/server";
import { BusinessInput, checkRateLimit, executeScan, startScan } from "@/lib/scan/service";

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: `Too many scans from this network. Try again in ${Math.ceil((rl.retryAfterSec ?? 60) / 60)} minutes.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } });
  }
  const body = await req.json().catch(() => null);
  const parsed = BusinessInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  const { scan, cached } = await startScan(parsed.data);
  // Run after the response is sent; on Vercel `after` keeps the function alive.
  if (!cached) after(() => executeScan(scan.id));
  return NextResponse.json({ scanId: scan.id, cached });
}
