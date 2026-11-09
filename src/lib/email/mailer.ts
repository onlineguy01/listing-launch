import { Resend } from "resend";

export interface Mail { to: string; subject: string; html: string; text: string }
export interface SentMail extends Mail { id: string; at: string; provider: "resend" | "outbox" }

const g = globalThis as unknown as { __llOutbox?: SentMail[] };
const outbox: SentMail[] = (g.__llOutbox ??= []);

export const FROM = process.env.EMAIL_FROM ?? "Listing Launch <hello@example.com>";
export const emailEnabled = () => !!process.env.RESEND_API_KEY;

/**
 * Send an email through Resend when configured. Otherwise append to an
 * in-memory outbox (visible at /admin/outbox) and log to the console.
 */
export async function sendEmail(mail: Mail): Promise<SentMail> {
  if (emailEnabled()) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from: FROM, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
    if (error) throw new Error(`resend: ${error.message}`);
    return { ...mail, id: data?.id ?? "", at: new Date().toISOString(), provider: "resend" };
  }
  const rec: SentMail = { ...mail, id: `outbox_${outbox.length + 1}`, at: new Date().toISOString(), provider: "outbox" };
  outbox.unshift(rec);
  console.log(`[email → ${mail.to}] ${mail.subject}`);
  return rec;
}

export function listOutbox(): SentMail[] { return outbox; }
