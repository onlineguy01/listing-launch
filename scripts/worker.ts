/**
 * Submission worker. Run once:   npm run worker
 * Loop every 5 minutes:          npm run worker -- --loop
 * Dry run (no submissions):      npm run worker -- --dry
 *
 * Requires the same env as the app (Supabase, API keys). In demo mode (in-memory
 * store) it has nothing to pick up because the store lives in the web process.
 */
import { runSubmissionWorker } from "../src/lib/fulfillment/worker";

const loop = process.argv.includes("--loop");
const dryRun = process.argv.includes("--dry");

async function tick() {
  const s = await runSubmissionWorker({ dryRun });
  console.log(`[worker ${new Date().toISOString()}]`, s);
}

(async () => {
  do {
    await tick().catch((e) => console.error("[worker] pass failed", e));
    if (loop) await new Promise((r) => setTimeout(r, 5 * 60_000));
  } while (loop);
})();
