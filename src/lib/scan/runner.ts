import type { CanonicalBusiness, Finding } from "@/lib/domain/types";
import type { AdapterContext, DirectoryAdapter } from "@/lib/adapters/types";
import { ADAPTERS } from "@/lib/adapters";

export interface ScanProgress {
  total: number;
  done: number;
  current?: string;
}

/**
 * Run discovery across all adapters with bounded concurrency.
 * Calls `onFinding` as each directory completes so the UI can stream progress.
 */
export async function runScan(
  biz: CanonicalBusiness,
  ctx: AdapterContext,
  opts: { adapters?: DirectoryAdapter[]; concurrency?: number; onFinding?: (f: Finding, p: ScanProgress) => void | Promise<void> } = {},
): Promise<Finding[]> {
  const adapters = opts.adapters ?? ADAPTERS;
  const concurrency = opts.concurrency ?? 4;
  const findings: Finding[] = [];
  let idx = 0;
  let done = 0;

  const worker = async () => {
    while (idx < adapters.length) {
      const a = adapters[idx++];
      let f: Finding;
      try {
        f = await a.discover(biz, ctx);
      } catch (e) {
        ctx.log("adapter_crash", { directory: a.def.id, error: String(e) });
        f = { directoryId: a.def.id, state: "unable_to_verify", confidence: 0, diffs: [],
          evidence: { queries: [], candidates: [], source: "none", notes: String(e) } };
      }
      findings.push(f);
      done++;
      await opts.onFinding?.(f, { total: adapters.length, done, current: a.def.id });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, adapters.length) }, worker));
  return findings;
}
