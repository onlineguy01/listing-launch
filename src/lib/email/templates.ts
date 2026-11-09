import type { CanonicalBusiness, Finding } from "@/lib/domain/types";
import type { OrderRecord, SubmissionRecord } from "@/lib/data/store";
import { getDirectory } from "@/lib/directories/registry";
import { formatCents } from "@/lib/scan/quote";
import type { Mail } from "./mailer";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f7f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:700;margin-bottom:24px"><span style="display:inline-block;width:14px;height:14px;background:#0f766e;border-radius:4px;vertical-align:-1px;margin-right:8px"></span>Listing Launch</div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#6b7280;margin-top:16px">We find, create and correct business listings. We do not sell rankings or guaranteed backlinks.</p>
  </div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#0f766e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;display:inline-block">${esc(label)}</a></p>`;

export function reportReady(to: string, biz: CanonicalBusiness, findings: Finding[], reportUrl: string): Mail {
  const n = (s: Finding["state"]) => findings.filter((f) => f.state === s).length;
  const subject = `Your listing report for ${biz.name}: ${n("incorrect")} to fix, ${n("not_found")} missing`;
  const html = layout(`Your listing report is ready`, `
    <p>We checked ${findings.length} directories for <strong>${esc(biz.name)}</strong>.</p>
    <table style="font-size:14px;border-collapse:collapse"><tr>
      <td style="padding:6px 16px 6px 0"><strong style="color:#15803d;font-size:20px">${n("verified_accurate")}</strong><br>accurate</td>
      <td style="padding:6px 16px"><strong style="color:#b45309;font-size:20px">${n("incorrect")}</strong><br>need correction</td>
      <td style="padding:6px 16px"><strong style="color:#b91c1c;font-size:20px">${n("not_found")}</strong><br>not found</td>
    </tr></table>
    ${button(reportUrl, "View your full report")}
    <p style="font-size:13px;color:#6b7280">This link is yours; anyone with it can see the report.</p>`);
  const text = `Your listing report for ${biz.name} is ready.\n${n("verified_accurate")} accurate, ${n("incorrect")} need correction, ${n("not_found")} not found.\n\n${reportUrl}`;
  return { to, subject, html, text };
}

export function orderConfirmed(to: string, biz: CanonicalBusiness, order: OrderRecord, orderUrl: string): Mail {
  const rows = order.quote.items.map((i) => `<li>${i.action === "create" ? "Create" : "Correct"} listing on ${esc(i.directoryName)}</li>`).join("");
  const html = layout(`Thanks, we're on it`, `
    <p>Your one-time order for <strong>${esc(biz.name)}</strong> (${formatCents(order.quote.totalCents)}) is confirmed.</p>
    <ul style="font-size:14px">${rows}</ul>
    <p style="font-size:14px">Some directories will email or text <em>you</em> a confirmation code. We'll tell you exactly when to expect each one. You can follow progress any time:</p>
    ${button(orderUrl, "Track your order")}`);
  const text = `Your order for ${biz.name} (${formatCents(order.quote.totalCents)}) is confirmed.\n\n${order.quote.items.map((i) => `- ${i.action} ${i.directoryName}`).join("\n")}\n\nTrack: ${orderUrl}`;
  return { to, subject: `Order confirmed: ${order.quote.items.length} listing${order.quote.items.length === 1 ? "" : "s"} for ${biz.name}`, html, text };
}

export function ownerActionNeeded(to: string, biz: CanonicalBusiness, sub: SubmissionRecord, instructions: string, orderUrl: string): Mail {
  const d = getDirectory(sub.directoryId);
  const html = layout(`Action needed: confirm your ${d.name} listing`, `
    <p>We've submitted <strong>${esc(biz.name)}</strong> to ${esc(d.name)}. To finish, ${esc(d.name)} needs a confirmation from you:</p>
    <p style="font-size:14px;background:#f7f7f5;padding:12px;border-radius:8px">${esc(instructions)}</p>
    ${button(orderUrl, "See all open steps")}`);
  return { to, subject: `Action needed: confirm your ${d.name} listing`, html, text: `${d.name} needs a confirmation from you: ${instructions}\n\n${orderUrl}` };
}

export function completionReport(to: string, biz: CanonicalBusiness, subs: SubmissionRecord[], orderUrl: string): Mail {
  const row = (s: SubmissionRecord) => {
    const d = getDirectory(s.directoryId);
    const status = s.status === "published" ? "Live" : s.status === "rejected" ? "Rejected by directory" : s.status;
    const link = s.listingUrl ? ` · <a href="${esc(s.listingUrl)}">view</a>` : "";
    return `<tr><td style="padding:6px 12px 6px 0;border-top:1px solid #e5e7eb">${esc(d.name)}</td><td style="padding:6px 0;border-top:1px solid #e5e7eb">${esc(status)}${link}</td></tr>`;
  };
  const live = subs.filter((s) => s.status === "published").length;
  const html = layout(`Your listings are done: ${live} of ${subs.length} live`, `
    <p>Here is where <strong>${esc(biz.name)}</strong> now appears. You own every one of these listings.</p>
    <table style="font-size:14px;border-collapse:collapse;width:100%">${subs.map(row).join("")}</table>
    ${button(orderUrl, "Open your completion report")}
    <p style="font-size:13px;color:#6b7280">We re-checked each listing after publication. If anything changes, reply to this email.</p>`);
  const text = `Completion report for ${biz.name}: ${live} of ${subs.length} live.\n\n${subs.map((s) => `- ${getDirectory(s.directoryId).name}: ${s.status}${s.listingUrl ? ` ${s.listingUrl}` : ""}`).join("\n")}\n\n${orderUrl}`;
  return { to, subject: `Completion report: ${live} of ${subs.length} listings live for ${biz.name}`, html, text };
}
