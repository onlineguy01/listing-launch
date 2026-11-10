import { StateBadge } from "./StateBadge";
import { WHO_LABEL, type PackRow } from "@/lib/pricing/packs";
import { formatPhoneDisplay } from "@/lib/scan/normalize";

/** One pack as a table: name, what kind of site it is, our verdict (or "not checked"), and what happens next. */
export function PackTable({ rows, emptyText }: { rows: PackRow[]; emptyText?: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{emptyText ?? "Nothing in this pack."}</p>;
  const show = (field: string, v: string) => (field === "phone" ? formatPhoneDisplay(v) : v);
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-background text-left text-xs text-muted"><tr><th className="px-4 py-2">Site</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Who does it</th><th className="px-4 py-2">What happens</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="px-4 py-3 font-medium">
                {r.name}
                {r.listingUrl ? <a href={r.listingUrl} target="_blank" rel="noreferrer" className="block text-xs text-accent hover:underline">View listing ↗</a>
                  : <a href={r.url} target="_blank" rel="noreferrer" className="block text-xs text-muted hover:underline">{r.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗</a>}
              </td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.kind === "marketplace" ? "bg-warn/10 text-warn" : r.kind === "profile" ? "bg-neutral/10 text-neutral" : "bg-accent/10 text-accent"}`}>{r.kindLabel}</span></td>
              <td className="px-4 py-3">{r.checked && r.state ? <StateBadge state={r.state} /> : <span className="rounded-full bg-neutral/10 px-2 py-0.5 text-xs text-neutral">{r.suggested ? "Suggested" : "Not checked automatically"}</span>}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.who === "we" ? "bg-ok/10 text-ok" : r.who === "you" ? "bg-warn/10 text-warn" : "bg-neutral/10 text-neutral"}`}>{WHO_LABEL[r.who]}</span></td>
              <td className="px-4 py-3 text-muted">
                {r.checked && r.state === "incorrect" && r.diffs?.map((x) => <div key={x.field}><span className="font-medium text-foreground">{x.field}</span>: shows “{show(x.field, x.observed)}”, should be “{show(x.field, x.expected)}”</div>)}
                {r.checked && r.state === "verified_accurate" && "Nothing to do."}
                {r.checked && r.state === "not_found" && (r.sellable ? "Missing. Included in your package." : "Missing. ")}
                {r.checked && r.state === "possible_match" && "A similar listing exists; we review by hand."}
                {!r.checked && r.sellable && "We submit, then verify it live."}
                {r.ownerManaged && <div>{r.howTo ?? r.note}</div>}
                {!r.ownerManaged && !r.sellable && !r.checked && <div>{r.note}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
