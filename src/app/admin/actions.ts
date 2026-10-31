"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { createSession, destroySession, requireUser, type SessionUser } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";
import { deleteUpload, saveImage } from "@/lib/uploads";
import { slugify } from "@/lib/utils";

/* ---------------- helpers ---------------- */

function str(fd: FormData, key: string, max = 20000) {
  return String(fd.get(key) ?? "").trim().slice(0, max);
}
function optStr(fd: FormData, key: string, max = 20000) {
  const v = str(fd, key, max);
  return v.length ? v : null;
}
function bool(fd: FormData, key: string) {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
function int(fd: FormData, key: string, fallback = 0) {
  const n = Number.parseInt(String(fd.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}
function lines(fd: FormData, key: string) {
  return str(fd, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30);
}
function idParam(fd: FormData) {
  const raw = str(fd, "id");
  return raw === "" || raw === "new" ? null : Number(raw);
}

async function audit(user: SessionUser, action: string, entity: string, entityId?: number | string | null) {
  await db
    .insert(schema.auditLog)
    .values({ userId: user.id, action, entity, entityId: entityId == null ? null : String(entityId) })
    .catch(() => {});
}

/** Handles an ImageField: upload replaces, "Remove" clears, otherwise keeps current. */
async function imageFromForm(fd: FormData, name: string, user: SessionUser): Promise<string | null> {
  const file = fd.get(`${name}File`);
  if (file instanceof File && file.size > 0) {
    const saved = await saveImage(file);
    await db.insert(schema.media).values({
      fileName: saved.fileName,
      originalName: saved.originalName,
      url: saved.url!,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedBy: user.id,
    });
    return saved.url;
  }
  if (bool(fd, `${name}Remove`)) return null;
  return optStr(fd, name, 500);
}

function contentChanged() {
  updateTag(CONTENT_TAG);
}

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/* ---------------- auth ---------------- */

export async function loginAction(_prev: { error?: string; email?: string }, fd: FormData): Promise<{ error?: string; email?: string }> {
  const limit = await rateLimit("login", 8, 15 * 60 * 1000);
  const email = str(fd, "email", 200).toLowerCase();
  if (!limit.ok) return { email, error: "Too many attempts. Please wait 15 minutes and try again." };
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { email, error: "Enter your email and password." };
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  // Compare against a dummy hash when the user is missing to keep timing uniform.
  const ok = await bcrypt.compare(password, u?.passwordHash ?? "$2b$12$Ep6IeQTawmij.GJWF8G6But.lpCBHsppUtwNg6bVrrUm9CAjwpFfq");
  if (!u || !ok || !u.active) return { email, error: "Incorrect email or password." };
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, u.id));
  await createSession(u.id);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(fd: FormData) {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  if (!u || !(await bcrypt.compare(current, u.passwordHash))) fail("/admin/account", "Current password is incorrect.");
  if (next.length < 10) fail("/admin/account", "New password must be at least 10 characters.");
  if (next !== confirm) fail("/admin/account", "New passwords do not match.");
  await db.update(schema.users).set({ passwordHash: await bcrypt.hash(next, 12) }).where(eq(schema.users.id, user.id));
  await audit(user, "password_change", "user", user.id);
  redirect("/admin/account?saved=1");
}

/* ---------------- settings ---------------- */

export async function saveSettings(fd: FormData) {
  const user = await requireUser("admin");
  const socials: Record<string, string> = {};
  for (const k of ["linkedin", "facebook", "x", "youtube", "instagram"]) {
    const v = str(fd, `social_${k}`, 300);
    if (v) socials[k] = v;
  }
  const values = {
    companyName: str(fd, "companyName", 160),
    tagline: str(fd, "tagline", 200),
    heroEyebrow: str(fd, "heroEyebrow", 200),
    heroTitle: str(fd, "heroTitle", 200),
    heroSubtitle: str(fd, "heroSubtitle", 1000),
    aboutStatement: str(fd, "aboutStatement", 1000),
    aboutStatementMuted: str(fd, "aboutStatementMuted", 1000),
    aboutBody: str(fd, "aboutBody", 6000),
    mission: str(fd, "mission", 1000),
    vision: str(fd, "vision", 1000),
    values: lines(fd, "values"),
    address: str(fd, "address", 240),
    addressLocality: str(fd, "addressLocality", 120),
    addressRegion: str(fd, "addressRegion", 120),
    phonePrimary: str(fd, "phonePrimary", 60),
    phoneSecondary: optStr(fd, "phoneSecondary", 60),
    email: str(fd, "email", 200),
    leadNotifyEmail: optStr(fd, "leadNotifyEmail", 200),
    vatNumber: optStr(fd, "vatNumber", 60),
    foundedYear: int(fd, "foundedYear") || null,
    socials,
    defaultSeoTitle: str(fd, "defaultSeoTitle", 200),
    defaultSeoDescription: str(fd, "defaultSeoDescription", 320),
  };
  if (!values.companyName || !values.heroTitle || !values.email || !values.phonePrimary) {
    fail("/admin/settings", "Company name, hero title, email and primary phone are required.");
  }
  await db.update(schema.siteSettings).set(values).where(eq(schema.siteSettings.id, 1));
  await audit(user, "update", "settings", 1);
  contentChanged();
  redirect("/admin/settings?saved=1");
}

/* ---------------- services ---------------- */

export async function saveService(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const title = str(fd, "title", 200);
  const back = `/admin/services/${id ?? "new"}`;
  if (!title) fail(back, "Title is required.");
  const values = {
    title,
    slug: slugify(str(fd, "slug") || title),
    summary: str(fd, "summary", 1000),
    body: str(fd, "body"),
    highlights: lines(fd, "highlights"),
    sortOrder: int(fd, "sortOrder"),
    published: bool(fd, "published"),
    seoTitle: optStr(fd, "seoTitle", 200),
    seoDescription: optStr(fd, "seoDescription", 320),
  };
  try {
    if (id) await db.update(schema.services).set(values).where(eq(schema.services.id, id));
    else await db.insert(schema.services).values(values);
  } catch (e) {
    if (isUniqueViolation(e)) fail(back, "That URL slug is already used by another service.");
    throw e;
  }
  await audit(user, id ? "update" : "create", "service", id);
  contentChanged();
  redirect("/admin/services?saved=1");
}

export async function deleteService(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.services).where(eq(schema.services.id, id));
  await audit(user, "delete", "service", id);
  contentChanged();
  redirect("/admin/services?saved=deleted");
}

/* ---------------- industries ---------------- */

export async function saveIndustry(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const title = str(fd, "title", 200);
  const back = `/admin/industries/${id ?? "new"}`;
  if (!title) fail(back, "Title is required.");
  const values = {
    title,
    slug: slugify(str(fd, "slug") || title),
    summary: str(fd, "summary", 1000),
    body: str(fd, "body"),
    clientsText: str(fd, "clientsText", 2000),
    sortOrder: int(fd, "sortOrder"),
    published: bool(fd, "published"),
    seoTitle: optStr(fd, "seoTitle", 200),
    seoDescription: optStr(fd, "seoDescription", 320),
  };
  try {
    if (id) await db.update(schema.industries).set(values).where(eq(schema.industries.id, id));
    else await db.insert(schema.industries).values(values);
  } catch (e) {
    if (isUniqueViolation(e)) fail(back, "That URL slug is already used by another industry.");
    throw e;
  }
  await audit(user, id ? "update" : "create", "industry", id);
  contentChanged();
  redirect("/admin/industries?saved=1");
}

export async function deleteIndustry(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.industries).where(eq(schema.industries.id, id));
  await audit(user, "delete", "industry", id);
  contentChanged();
  redirect("/admin/industries?saved=deleted");
}

/* ---------------- clients ---------------- */

export async function saveClient(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const name = str(fd, "name", 200);
  const back = `/admin/clients/${id ?? "new"}`;
  if (!name) fail(back, "Name is required.");
  let logoUrl: string | null;
  try {
    logoUrl = await imageFromForm(fd, "logoUrl", user);
  } catch (e) {
    fail(back, (e as Error).message);
  }
  const values = {
    name,
    sector: str(fd, "sector", 120),
    website: optStr(fd, "website", 300),
    logoUrl,
    showOnHome: bool(fd, "showOnHome"),
    sortOrder: int(fd, "sortOrder"),
    published: bool(fd, "published"),
  };
  if (id) await db.update(schema.clients).set(values).where(eq(schema.clients.id, id));
  else await db.insert(schema.clients).values(values);
  await audit(user, id ? "update" : "create", "client", id);
  contentChanged();
  redirect("/admin/clients?saved=1");
}

export async function deleteClient(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.clients).where(eq(schema.clients.id, id));
  await audit(user, "delete", "client", id);
  contentChanged();
  redirect("/admin/clients?saved=deleted");
}

/* ---------------- partners ---------------- */

export async function savePartner(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const name = str(fd, "name", 160);
  const back = `/admin/partners/${id ?? "new"}`;
  if (!name) fail(back, "Name is required.");
  let logoUrl: string | null;
  try {
    logoUrl = await imageFromForm(fd, "logoUrl", user);
  } catch (e) {
    fail(back, (e as Error).message);
  }
  const values = {
    name,
    website: optStr(fd, "website", 300),
    logoUrl,
    sortOrder: int(fd, "sortOrder"),
    published: bool(fd, "published"),
  };
  if (id) await db.update(schema.partners).set(values).where(eq(schema.partners.id, id));
  else await db.insert(schema.partners).values(values);
  await audit(user, id ? "update" : "create", "partner", id);
  contentChanged();
  redirect("/admin/partners?saved=1");
}

export async function deletePartner(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.partners).where(eq(schema.partners.id, id));
  await audit(user, "delete", "partner", id);
  contentChanged();
  redirect("/admin/partners?saved=deleted");
}

/* ---------------- homepage: stats & featured ---------------- */

export async function saveStat(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const values = {
    value: str(fd, "value", 40),
    suffix: str(fd, "suffix", 10),
    label: str(fd, "label", 120),
    sortOrder: int(fd, "sortOrder"),
    published: bool(fd, "published"),
  };
  if (!values.value || !values.label) fail(`/admin/homepage/stats/${id ?? "new"}`, "Value and label are required.");
  if (id) await db.update(schema.stats).set(values).where(eq(schema.stats.id, id));
  else await db.insert(schema.stats).values(values);
  await audit(user, id ? "update" : "create", "stat", id);
  contentChanged();
  redirect("/admin/homepage?saved=1");
}

export async function deleteStat(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  await db.delete(schema.stats).where(eq(schema.stats.id, id));
  await audit(user, "delete", "stat", id);
  contentChanged();
  redirect("/admin/homepage?saved=deleted");
}

export async function saveFeatured(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const values = {
    kicker: str(fd, "kicker", 80),
    title: str(fd, "title", 240),
    ctaLabel: str(fd, "ctaLabel", 80),
    href: str(fd, "href", 300),
    theme: (str(fd, "theme") === "dark" ? "dark" : "light") as "dark" | "light",
    sortOrder: int(fd, "sortOrder"),
    published: bool(fd, "published"),
  };
  if (!values.title || !values.href) fail(`/admin/homepage/featured/${id ?? "new"}`, "Title and link are required.");
  if (id) await db.update(schema.featuredItems).set(values).where(eq(schema.featuredItems.id, id));
  else await db.insert(schema.featuredItems).values(values);
  await audit(user, id ? "update" : "create", "featured", id);
  contentChanged();
  redirect("/admin/homepage?saved=1");
}

export async function deleteFeatured(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  await db.delete(schema.featuredItems).where(eq(schema.featuredItems.id, id));
  await audit(user, "delete", "featured", id);
  contentChanged();
  redirect("/admin/homepage?saved=deleted");
}

/* ---------------- posts (insights & case studies) ---------------- */

export async function savePost(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const title = str(fd, "title", 240);
  const back = `/admin/posts/${id ?? "new"}`;
  if (!title) fail(back, "Title is required.");
  const type = (str(fd, "type") === "case_study" ? "case_study" : "insight") as "insight" | "case_study";
  const status = (str(fd, "status") === "published" ? "published" : "draft") as "draft" | "published";
  let coverUrl: string | null;
  try {
    coverUrl = await imageFromForm(fd, "coverUrl", user);
  } catch (e) {
    fail(back, (e as Error).message);
  }
  const body = str(fd, "body", 200000);
  const words = body.split(/\s+/).filter(Boolean).length;
  const dateStr = str(fd, "publishedAt");
  // datetime-local inputs are entered in Nepal time (UTC+05:45).
  let publishedAt: Date | null = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr) ? new Date(`${dateStr}:00+05:45`) : null;
  if (status === "published" && !publishedAt) publishedAt = new Date();
  const values = {
    type,
    title,
    slug: slugify(str(fd, "slug") || title),
    excerpt: str(fd, "excerpt", 600),
    body,
    category: str(fd, "category", 80),
    clientName: optStr(fd, "clientName", 200),
    coverUrl,
    coverHeadline: optStr(fd, "coverHeadline", 80),
    readMinutes: Math.max(1, Math.round(words / 220)),
    status,
    publishedAt,
    seoTitle: optStr(fd, "seoTitle", 200),
    seoDescription: optStr(fd, "seoDescription", 320),
  };
  let newId = id;
  try {
    if (id) await db.update(schema.posts).set(values).where(eq(schema.posts.id, id));
    else {
      const [row] = await db.insert(schema.posts).values({ ...values, authorId: user.id }).returning({ id: schema.posts.id });
      newId = row.id;
    }
  } catch (e) {
    if (isUniqueViolation(e)) fail(back, "That URL slug is already used by another post of the same type.");
    throw e;
  }
  await audit(user, id ? "update" : "create", "post", newId);
  contentChanged();
  redirect(`/admin/posts/${newId}?saved=1`);
}

export async function deletePost(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  await db.delete(schema.posts).where(eq(schema.posts.id, id));
  await audit(user, "delete", "post", id);
  contentChanged();
  redirect("/admin/posts?saved=deleted");
}

/* ---------------- jobs & applications ---------------- */

export async function saveJob(fd: FormData) {
  const user = await requireUser();
  const id = idParam(fd);
  const title = str(fd, "title", 200);
  const back = `/admin/jobs/${id ?? "new"}`;
  if (!title) fail(back, "Title is required.");
  const closes = str(fd, "closesAt");
  const values = {
    title,
    slug: slugify(str(fd, "slug") || title),
    department: str(fd, "department", 120),
    location: str(fd, "location", 120) || "Kathmandu",
    employmentType: str(fd, "employmentType", 60) || "Full-time",
    summary: str(fd, "summary", 1000),
    body: str(fd, "body"),
    status: (str(fd, "status") === "closed" ? "closed" : "open") as "open" | "closed",
    closesAt: /^\d{4}-\d{2}-\d{2}$/.test(closes) ? new Date(`${closes}T23:59:00+05:45`) : null,
  };
  try {
    if (id) await db.update(schema.jobs).set(values).where(eq(schema.jobs.id, id));
    else await db.insert(schema.jobs).values(values);
  } catch (e) {
    if (isUniqueViolation(e)) fail(back, "That URL slug is already used by another job.");
    throw e;
  }
  await audit(user, id ? "update" : "create", "job", id);
  contentChanged();
  redirect("/admin/jobs?saved=1");
}

export async function deleteJob(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.jobs).where(eq(schema.jobs.id, id));
  await audit(user, "delete", "job", id);
  contentChanged();
  redirect("/admin/jobs?saved=deleted");
}

const appStatuses = ["new", "shortlisted", "interview", "offer", "rejected"] as const;

export async function updateApplication(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  const s = str(fd, "status") as (typeof appStatuses)[number];
  await db
    .update(schema.applications)
    .set({ status: appStatuses.includes(s) ? s : "new", notes: str(fd, "notes", 10000) })
    .where(eq(schema.applications.id, id));
  await audit(user, "update", "application", id);
  redirect(`/admin/applications/${id}?saved=1`);
}

export async function deleteApplication(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  const [a] = await db.select().from(schema.applications).where(eq(schema.applications.id, id));
  if (a?.cvPath) await deleteUpload(a.cvPath);
  await db.delete(schema.applications).where(eq(schema.applications.id, id));
  await audit(user, "delete", "application", id);
  redirect("/admin/applications?saved=deleted");
}

/* ---------------- leads ---------------- */

const leadStatuses = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;

export async function updateLead(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  const s = str(fd, "status") as (typeof leadStatuses)[number];
  await db
    .update(schema.leads)
    .set({ status: leadStatuses.includes(s) ? s : "new", notes: str(fd, "notes", 10000) })
    .where(eq(schema.leads.id, id));
  await audit(user, "update", "lead", id);
  redirect(`/admin/leads/${id}?saved=1`);
}

export async function deleteLead(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.leads).where(eq(schema.leads.id, id));
  await audit(user, "delete", "lead", id);
  redirect("/admin/leads?saved=deleted");
}

/* ---------------- media ---------------- */

export async function uploadMedia(fd: FormData) {
  const user = await requireUser();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) fail("/admin/media", "Choose at least one image.");
  try {
    for (const file of files.slice(0, 10)) {
      const saved = await saveImage(file);
      await db.insert(schema.media).values({
        fileName: saved.fileName,
        originalName: saved.originalName,
        url: saved.url!,
        mimeType: saved.mimeType,
        size: saved.size,
        alt: str(fd, "alt", 255),
        uploadedBy: user.id,
      });
    }
  } catch (e) {
    fail("/admin/media", (e as Error).message);
  }
  await audit(user, "upload", "media");
  redirect("/admin/media?saved=1");
}

export async function deleteMedia(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, id));
  if (m) {
    await deleteUpload(`public/${m.url.replace(/^\/media\//, "")}`);
    await db.delete(schema.media).where(eq(schema.media.id, id));
  }
  await audit(user, "delete", "media", id);
  redirect("/admin/media?saved=deleted");
}

/* ---------------- users ---------------- */

export async function saveUser(fd: FormData) {
  const me = await requireUser("admin");
  const id = idParam(fd);
  const back = `/admin/users/${id ?? "new"}`;
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200).toLowerCase();
  const role = (str(fd, "role") === "admin" ? "admin" : "editor") as "admin" | "editor";
  const active = bool(fd, "active");
  const password = String(fd.get("password") ?? "");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) fail(back, "Name and a valid email are required.");
  if (!id && password.length < 10) fail(back, "Set a password of at least 10 characters.");
  if (password && password.length < 10) fail(back, "Password must be at least 10 characters.");
  if (id === me.id && (role !== "admin" || !active)) fail(back, "You can't remove your own admin access.");

  const [clash] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(id ? and(eq(schema.users.email, email), ne(schema.users.id, id)) : eq(schema.users.email, email));
  if (clash) fail(back, "Another user already has that email.");

  const values = { name, email, role, active, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) };
  if (id) await db.update(schema.users).set(values).where(eq(schema.users.id, id));
  else await db.insert(schema.users).values(values as typeof values & { passwordHash: string });
  await audit(me, id ? "update" : "create", "user", id);
  redirect("/admin/users?saved=1");
}

export async function deleteUser(fd: FormData) {
  const me = await requireUser("admin");
  const id = Number(str(fd, "id"));
  if (id === me.id) fail("/admin/users", "You can't delete your own account.");
  await db.delete(schema.users).where(eq(schema.users.id, id));
  await audit(me, "delete", "user", id);
  redirect("/admin/users?saved=deleted");
}
