import { NextResponse } from "next/server";
import { placeDetails, placesEnabled } from "@/lib/places/client";

export async function GET(req: Request) {
  if (!placesEnabled()) return NextResponse.json({ error: "Places not configured" }, { status: 501 });
  const u = new URL(req.url);
  const id = u.searchParams.get("placeId");
  if (!id) return NextResponse.json({ error: "placeId required" }, { status: 400 });
  try {
    const d = await placeDetails(id, u.searchParams.get("token") ?? undefined);
    return NextResponse.json(d);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
