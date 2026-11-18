import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendMail } from "@/lib/mail";
import { siteUrl } from "@/lib/utils";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Creates a one-time link token. Only its hash is stored. Older unused links for the user stop working. */
export async function createPasswordToken(userId: number, purpose: "reset" | "invite") {
  const token = randomBytes(32).toString("base64url");
  const hours = purpose === "invite" ? 72 : 1;
  await db.delete(schema.passwordTokens).where(and(eq(schema.passwordTokens.userId, userId), isNull(schema.passwordTokens.usedAt)));
  await db.insert(schema.passwordTokens).values({
    userId,
    tokenHash: hash(token),
    purpose,
    expiresAt: new Date(Date.now() + hours * 3600 * 1000),
  });
  return { url: siteUrl(`/admin/reset?token=${token}`), hours };
}

/** The user a still-valid token belongs to, or null. */
export async function findPasswordToken(token: string) {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) return null;
  const [row] = await db
    .select({ t: schema.passwordTokens, name: schema.users.name, email: schema.users.email, active: schema.users.active })
    .from(schema.passwordTokens)
    .innerJoin(schema.users, eq(schema.users.id, schema.passwordTokens.userId))
    .where(
      and(
        eq(schema.passwordTokens.tokenHash, hash(token)),
        isNull(schema.passwordTokens.usedAt),
        gt(schema.passwordTokens.expiresAt, new Date()),
      ),
    );
  return row && row.active ? row : null;
}

export async function markPasswordTokenUsed(id: number) {
  await db.update(schema.passwordTokens).set({ usedAt: new Date() }).where(eq(schema.passwordTokens.id, id));
}

/** Emails a reset or invite link. */
export async function sendPasswordLink(user: { id: number; name: string; email: string }, purpose: "reset" | "invite", sentBy?: number) {
  const { url, hours } = await createPasswordToken(user.id, purpose);
  const first = user.name.split(" ")[0];
  const text =
    purpose === "invite"
      ? `Namaste ${first},\n\nAn account has been created for you on the Tech Bucket website admin.\n\nSet your password here (the link works for ${hours} hours, once):\n${url}\n\nThen sign in at ${siteUrl("/admin")} with ${user.email}.`
      : `Namaste ${first},\n\nSomeone asked to reset the password for ${user.email} on the Tech Bucket website admin.\n\nChoose a new password here (the link works for 1 hour, once):\n${url}\n\nIf this wasn't you, ignore this email. Your password stays the same.`;
  return sendMail({
    to: user.email,
    subject: purpose === "invite" ? "Your Tech Bucket admin account" : "Reset your Tech Bucket admin password",
    text,
    kind: purpose === "invite" ? "invite" : "password_reset",
    sentBy,
  });
}
