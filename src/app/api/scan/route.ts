import { NextResponse, after } from "next/server";
import { BusinessInput, executeScan, startScan } from "@/lib/scan/service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BusinessInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  const { scan } = await startScan(parsed.data);
  // Run after the response is sent; on Vercel `after` keeps the function alive.
  after(() => executeScan(scan.id));
  return NextResponse.json({ scanId: scan.id });
}
