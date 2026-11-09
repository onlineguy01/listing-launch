"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DIRECTORIES } from "@/lib/directories/registry";
import type { FindingState } from "@/lib/domain/types";
import { StateBadge } from "./StateBadge";

interface Resp {
  scan: { status: string; directoriesTotal: number; directoriesDone: number; mode: string; error?: string };
  findings: { directoryId: string; state: FindingState; confidence: number }[];
}

export function ScanProgress({ scanId }: { scanId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const r = await fetch(`/api/scan/${scanId}`, { cache: "no-store" });
      if (!alive) return;
      if (r.ok) {
        const j: Resp = await r.json();
        setData(j);
        if (j.scan.status === "complete") {
          setTimeout(() => router.push(`/report/${scanId}`), 600);
          return;
        }
        if (j.scan.status === "failed") return;
      }
      setTimeout(tick, 800);
    };
    tick();
    return () => { alive = false; };
  }, [scanId, router]);

  const byId = new Map(data?.findings.map((f) => [f.directoryId, f]) ?? []);
  const done = data?.scan.directoriesDone ?? 0;
  const total = data?.scan.directoriesTotal ?? DIRECTORIES.length;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Scanning directories…</h1>
        <p className="text-muted text-sm mt-1">Checking {total} directories for your business. This usually takes under a minute.</p>
        {data?.scan.mode === "mock" && (
          <p className="mt-2 inline-block rounded-md bg-warn/10 px-2 py-1 text-xs text-warn">
            Demo mode: no search API key configured, results are simulated.
          </p>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DIRECTORIES.map((d) => {
          const f = byId.get(d.id);
          return (
            <li key={d.id} className="card flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{d.name}</span>
              {f ? <StateBadge state={f.state} /> : <span className="h-4 w-4 animate-pulse rounded-full bg-border" />}
            </li>
          );
        })}
      </ul>
      {data?.scan.status === "failed" && <p className="text-bad text-sm">Scan failed: {data.scan.error}</p>}
    </div>
  );
}
