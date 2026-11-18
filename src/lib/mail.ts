import "server-only";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { open } from "@/lib/secret-box";
import { siteUrl } from "@/lib/utils";

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  /** Sender address; may differ from the login (Zoho "Send mail as" / group address). */
  fromAddress: string;
  source: "admin" | "env";
};

/**
 * SMTP settings: from Admin → Site settings → Email when filled in, otherwise
 * from the SMTP_* variables in .env. Zoho: host smtppro.zoho.com (or .in / .eu
 * for those data centres), port 465, user = the full mailbox address.
 */
export async function mailConfig(): Promise<MailConfig | null> {
  const [s] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  const pass = open(s?.smtpPassEnc);
  if (s?.smtpHost && s.smtpUser && pass) {
    return {
      host: s.smtpHost,
      port: s.smtpPort || 465,
      user: s.smtpUser,
      pass,
      fromName: s.smtpFromName || s.companyName,
      fromAddress: s.smtpFromAddress || s.smtpUser,
      source: "admin",
    };
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const name = SMTP_FROM?.match(/^"?([^"<]+?)"?\s*</)?.[1] ?? s?.companyName ?? "Tech Bucket";
    const address = SMTP_FROM?.match(/<([^>]+)>/)?.[1] ?? (SMTP_FROM?.includes("@") ? SMTP_FROM.trim() : SMTP_USER);
    return { host: SMTP_HOST, port: Number(SMTP_PORT ?? 465), user: SMTP_USER, pass: SMTP_PASS, fromName: name, fromAddress: address, source: "env" };
  }
  return null;
}

function transport(c: MailConfig) {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465,
    requireTLS: c.port !== 465,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A plain, branded HTML version of a text email (links become clickable). */
function html(text: string, fromName: string) {
  const body = esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#b8431a">$1</a>')
    .replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#f3f4f5;font-family:Arial,Helvetica,sans-serif;color:#111417">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid #e8622a">
<tr><td style="padding:28px 32px 8px;font-size:18px;font-weight:bold">${esc(fromName)}</td></tr>
<tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e3e6e8;font-size:12px;color:#5c6870">${esc(fromName)} · <a href="${siteUrl("/")}" style="color:#5c6870">${esc(siteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;
}

export type SendInput = {
  to: string;
  subject: string;
  text: string;
  kind: string;
  replyTo?: string;
  leadId?: number;
  sentBy?: number;
  /** Store the body in the email log (on for replies to clients, off for password links). */
  keepBody?: boolean;
};

/** Sends one email and records it in the email log. Never throws. */
export async function sendMail(m: SendInput): Promise<{ ok: boolean; error?: string }> {
  const log = (status: string, error?: string) =>
    db
      .insert(schema.emailLog)
      .values({
        to: m.to.slice(0, 300),
        subject: m.subject.slice(0, 300),
        kind: m.kind,
        status,
        error: error?.slice(0, 1000),
        body: m.keepBody ? m.text.slice(0, 20000) : null,
        leadId: m.leadId,
        sentBy: m.sentBy,
      })
      .catch(() => {});
  let c: MailConfig | null = null;
  try {
    c = await mailConfig();
  } catch (e) {
    await log("failed", (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
  if (!c) {
    await log("skipped", "Email is not set up (Admin → Site settings → Email).");
    return { ok: false, error: "Email is not set up yet. Add the SMTP details under Site settings → Email." };
  }
  try {
    await transport(c).sendMail({
      from: { name: c.fromName, address: c.fromAddress },
      // The login mailbox is the envelope sender, so bounces reach a real inbox.
      envelope: { from: c.user, to: m.to },
      to: m.to,
      replyTo: m.replyTo,
      subject: m.subject,
      text: m.text,
      html: html(m.text, c.fromName),
    });
    await log("sent");
    return { ok: true };
  } catch (e) {
    let error = (e as Error).message;
    if (c.fromAddress !== c.user && /553|550|relay|not allowed|sender/i.test(error)) {
      error += ` (${c.user} is not allowed to send as ${c.fromAddress}. In Zoho, add ${c.fromAddress} under Settings → Mail → Send Mail As for ${c.user}, or clear the "Send from" address.)`;
    }
    console.error("[mail] failed:", error);
    await log("failed", error);
    return { ok: false, error };
  }
}

/** Internal notification (new enquiry, application, weekly report). */
export async function notify(to: string | null | undefined, subject: string, text: string, kind = "notification", replyTo?: string) {
  if (!to) return false;
  return (await sendMail({ to, subject, text, kind, replyTo })).ok;
}

/** Checks the SMTP login without sending anything. */
export async function verifyMail(c: MailConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    await transport(c).verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
