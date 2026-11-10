import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWebsite } from "@/lib/intake/website";
import { checkRateLimit } from "@/lib/scan/service";

const Body = z.object({ url: z.string().min(4).max(300) });

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`site:${ip}`).ok) return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a website address" }, { status: 400 });
  try {
    return NextResponse.json(await analyzeWebsite(parsed.data.url));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
