import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const SESSION_COOKIE = "tb_session";
const SESSION_DAYS = 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 random characters.");
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor";
};

export async function createSession(userId: number) {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.SITE_URL?.startsWith("http://"),
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the signed-in, active user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!uid) return null;
    const [u] = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        active: schema.users.active,
      })
      .from(schema.users)
      .where(eq(schema.users.id, uid));
    if (!u || !u.active) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  } catch {
    return null;
  }
}

/** Use at the top of every admin page and Server Action. */
export async function requireUser(role?: "admin"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (role === "admin" && user.role !== "admin") redirect("/admin?denied=1");
  return user;
}
