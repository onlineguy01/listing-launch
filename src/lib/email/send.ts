import { getStore } from "@/lib/data";
import { sendEmail } from "./mailer";
import { completionReport, orderConfirmed, ownerActionNeeded, reportReady } from "./templates";
import type { SubmissionRecord } from "@/lib/data/store";

export const appUrl = () => process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function emailReportReady(scanId: string, to: string) {
  const store = getStore();
  const scan = await store.getScan(scanId);
  if (!scan) return;
  const biz = await store.getBusiness(scan.businessId);
  if (!biz) return;
  const findings = await store.listFindings(scanId);
  await sendEmail(reportReady(to, biz, findings, `${appUrl()}/report/${scanId}`));
}

export async function emailOrderConfirmed(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order?.customerEmail) return;
  const biz = await store.getBusiness(order.businessId);
  if (!biz) return;
  await sendEmail(orderConfirmed(order.customerEmail, biz, order, `${appUrl()}/order/${orderId}`));
}

export async function emailOwnerAction(sub: SubmissionRecord, instructions: string) {
  const store = getStore();
  const biz = await store.getBusiness(sub.businessId);
  const to = biz?.ownerEmail;
  if (!biz || !to) return;
  await sendEmail(ownerActionNeeded(to, biz, sub, instructions, `${appUrl()}/order/${sub.orderId}`));
}

const TERMINAL = new Set(["published", "rejected", "not_eligible", "failed"]);

/** Send the completion report once every submission in the order is terminal. Idempotent. */
export async function maybeEmailCompletion(orderId: string) {
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.completionReportSentAt || !order.customerEmail) return false;
  const subs = await store.listSubmissions({ orderId });
  if (!subs.length || !subs.every((s) => TERMINAL.has(s.status))) return false;
  const biz = await store.getBusiness(order.businessId);
  if (!biz) return false;
  await sendEmail(completionReport(order.customerEmail, biz, subs, `${appUrl()}/order/${orderId}`));
  await store.updateOrder(orderId, { completionReportSentAt: new Date().toISOString(), status: "complete" });
  return true;
}
