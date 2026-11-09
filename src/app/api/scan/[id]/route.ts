import { NextResponse } from "next/server";
import { getStore } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const scan = await store.getScan(id);
  if (!scan) return NextResponse.json({ error: "not found" }, { status: 404 });
  const findings = await store.listFindings(id);
  return NextResponse.json({ scan, findings: findings.map((f) => ({ directoryId: f.directoryId, state: f.state, confidence: f.confidence })) });
}
