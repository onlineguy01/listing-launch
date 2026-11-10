import { NextResponse } from "next/server";
import { z } from "zod";
import { MAGIC_TTL_MS, signToken } from "@/lib/security/session";
import { sendEmail } from "@/lib/email/mailer";
import { appUrl } from "@/lib/email/send";
import { SITE_NAME } from "@/lib/config/brand";

const Body = z.object({ email: z.string().email() });

/** Email a one-time sign-in link. Always responds ok to avoid revealing which emails exist. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const token = await signToken({ purpose: "magic", email, exp: Date.now() + MAGIC_TTL_MS });
  const link = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: email,
    subject: `Your ${SITE_NAME} sign-in link`,
    text: `Click to sign in (valid 15 minutes): ${link}`,
    html: `<p>Click to sign in to ${SITE_NAME}. The link is valid for 15 minutes.</p><p><a href="${link}" style="background:#0f766e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;display:inline-block">Sign in</a></p><p style="color:#6b7280;font-size:12px">If you did not request this, ignore this email.</p>`,
  }).catch((e) => console.error("magic link email failed", e));
  return NextResponse.json({ ok: true });
}
