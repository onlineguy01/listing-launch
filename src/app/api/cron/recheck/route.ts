import { NextResponse } from "next/server";
import { runDuePublicationChecks } from "@/lib/fulfillment/recheck";

/**
 * Daily cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Also safe to hit manually in development.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runDuePublicationChecks();
  return NextResponse.json(summary);
}
