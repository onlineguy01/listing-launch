import type { Store } from "./store";
import { MemoryStore } from "./memory";

let store: Store | null = null;

/** Supabase when configured, otherwise the in-memory demo store. */
export function getStore(): Store {
  if (store) return store;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Lazy import keeps the supabase client out of the bundle in demo mode.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseStore } = require("./supabase") as typeof import("./supabase");
    store = new SupabaseStore();
  } else {
    store = new MemoryStore();
  }
  return store;
}

export function isDemoMode(): boolean {
  return !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
