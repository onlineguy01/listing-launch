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
  return !!process.env.SERPAPI_KEY;
}
