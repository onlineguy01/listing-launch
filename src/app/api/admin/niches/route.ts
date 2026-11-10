import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/data";
import { discoverNicheSites } from "@/lib/niche/discover";
import { CATEGORIES, type CategoryId } from "@/lib/directories/categories";

const Update = z.object({ id: z.string(), status: z.enum(["suggested", "approved", "rejected"]).optional(), who: z.enum(["we", "you", "manual"]).optional(), kind: z.enum(["directory", "marketplace", "profile", "association"]).optional(), note: z.string().max(300).optional(), url: z.string().url().optional() });
const Discover = z.object({ niche: z.string().min(2).max(60), industry: z.enum(Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]]) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const upd = Update.safeParse(body);
  if (upd.success) { const { id, ...patch } = upd.data; await getStore().updateNicheSite(id, patch); return NextResponse.json({ ok: true }); }
  const disc = Discover.safeParse(body);
  if (disc.success) { const sites = await discoverNicheSites(disc.data.niche, disc.data.industry); return NextResponse.json({ ok: true, count: sites.length }); }
  return NextResponse.json({ error: "bad input" }, { status: 400 });
}
