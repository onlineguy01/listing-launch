import { NextResponse } from "next/server";
import { autocomplete, placesEnabled } from "@/lib/places/client";

export async function GET(req: Request) {
  if (!placesEnabled()) return NextResponse.json({ enabled: false, suggestions: [] });
  const u = new URL(req.url);
  const input = u.searchParams.get("input") ?? "";
  const token = u.searchParams.get("token") ?? undefined;
  try {
    return NextResponse.json({ enabled: true, suggestions: await autocomplete(input, token) });
  } catch (e) {
    return NextResponse.json({ enabled: true, suggestions: [], error: String(e) }, { status: 502 });
  }
}
