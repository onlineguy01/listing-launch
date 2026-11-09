import type { AdapterContext, SearchHit } from "@/lib/adapters/types";

/**
 * Production adapter context: a SERP API for discovery and a polite fetcher.
 * Set SERP_PROVIDER=serpapi|dataforseo and the matching key. Without a key,
 * `search` throws so adapters report unable_to_verify instead of lying.
 */
export function createLiveContext(log: AdapterContext["log"] = () => {}): AdapterContext {
  return {
    log,
    async search(query: string): Promise<SearchHit[]> {
      const provider = process.env.SERP_PROVIDER ?? "serpapi";
      if (provider === "serpapi") {
        const key = process.env.SERPAPI_KEY;
        if (!key) throw new Error("SERPAPI_KEY not set");
        const u = new URL("https://serpapi.com/search.json");
        u.searchParams.set("engine", "google");
        u.searchParams.set("q", query);
        u.searchParams.set("num", "10");
        u.searchParams.set("api_key", key);
        const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error(`serpapi ${r.status}`);
        const j = (await r.json()) as { organic_results?: { link: string; title?: string; snippet?: string }[] };
        return (j.organic_results ?? []).map((o) => ({ url: o.link, title: o.title, snippet: o.snippet }));
      }
      if (provider === "dataforseo") {
        const login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD;
        if (!login || !password) throw new Error("DATAFORSEO_LOGIN/PASSWORD not set");
        const r = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
          method: "POST",
          headers: { Authorization: "Basic " + Buffer.from(`${login}:${password}`).toString("base64"), "Content-Type": "application/json" },
          body: JSON.stringify([{ keyword: query, location_code: 2840, language_code: "en", depth: 10 }]),
          signal: AbortSignal.timeout(20000),
        });
        if (!r.ok) throw new Error(`dataforseo ${r.status}`);
        const j = (await r.json()) as { tasks?: { result?: { items?: { type: string; url?: string; title?: string; description?: string }[] }[] }[] };
        const items = j.tasks?.[0]?.result?.[0]?.items ?? [];
        return items.filter((i) => i.type === "organic" && i.url).map((i) => ({ url: i.url!, title: i.title, snippet: i.description }));
      }
      throw new Error(`Unsupported SERP_PROVIDER ${provider}`);
    },
    async fetchHtml(url: string): Promise<string | null> {
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ListingLaunchBot/0.1; +https://example.com/bot)", Accept: "text/html" },
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) return null;
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("html")) return null;
        const text = await r.text();
        return text.length > 2_000_000 ? text.slice(0, 2_000_000) : text;
      } catch {
        return null;
      }
    },
  };
}

export function hasLiveKeys(): boolean {
  const provider = process.env.SERP_PROVIDER ?? "serpapi";
  if (provider === "dataforseo") return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  return !!process.env.SERPAPI_KEY;
}
