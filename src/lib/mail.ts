import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends a notification email if SMTP is configured (cPanel mailboxes work:
 * host mail.yourdomain, port 465, secure). Failures never break the form.
 */
export async function notify(to: string | null | undefined, subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!to || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;
  try {
    const port = Number(SMTP_PORT ?? 465);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({ from: SMTP_FROM ?? SMTP_USER, to, subject, text });
    return true;
  } catch (e) {
    console.error("[mail] failed:", e);
    return false;
  }
}
