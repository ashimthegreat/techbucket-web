"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { createSession, destroySession, requireUser, type SessionUser } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/data";
import { pingIndexNow } from "@/lib/indexnow";
import { runHealthCheck } from "@/lib/health/run";
import { mailConfig, sendMail, verifyMail } from "@/lib/mail";
import { seal } from "@/lib/secret-box";
import { findPasswordToken, markPasswordTokenUsed, sendPasswordLink } from "@/lib/password-tokens";
import { randomBytes } from "node:crypto";
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

/** Refresh cached pages, then tell Bing/IndexNow which public URLs changed (after the response). */
function contentChanged(paths: string[] = []) {
  updateTag(CONTENT_TAG);
  if (paths.length) after(() => pingIndexNow(["/sitemap.xml", "/llms.txt", ...paths]));
}

function fail(path: string, message: string): never {
  const [p, hash] = path.split("#");
  redirect(`${p}${p.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}${hash ? `#${hash}` : ""}`);
}

function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/** Accepts either the bare code or the whole <meta ... content="CODE"> tag the search console shows. */
function verificationCode(raw: string): string | null {
  const fromTag = raw.match(/content=["']([^"']+)["']/i);
  const code = (fromTag ? fromTag[1] : raw).trim();
  return /^[A-Za-z0-9_\-:.]{6,200}$/.test(code) ? code : null;
}

function coord(raw: string, limit: number): string | null {
  const n = Number(raw);
  return raw !== "" && Number.isFinite(n) && Math.abs(n) <= limit ? String(n) : null;
}

/** "Question?\nAnswer…" blocks separated by a blank line. */
function faqBlocks(raw: string): { q: string; a: string }[] {
  return raw
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => {
      const [first, ...rest] = block.trim().split("\n");
      return { q: (first ?? "").replace(/^Q[:.]\s*/i, "").trim(), a: rest.join("\n").replace(/^A[:.]\s*/i, "").trim() };
    })
    .filter((f) => f.q && f.a)
    .slice(0, 20);
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
  if (!u || !ok || !u.active) {
    // Counted by the weekly site health check to spot password guessing.
    await db
      .insert(schema.auditLog)
      .values({ userId: u?.id ?? null, action: "login_failed", entity: "auth", entityId: email.slice(0, 80) })
      .catch(() => {});
    return { email, error: "Incorrect email or password." };
  }
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
  await db
    .update(schema.users)
    .set({ passwordHash: await bcrypt.hash(next, 12), passwordChangedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  await audit(user, "password_change", "user", user.id);
  // Signs out every other device; this one gets a fresh session.
  await createSession(user.id);
  redirect("/admin/account?saved=1");
}

/* ---------------- settings ---------------- */

export async function saveSettings(fd: FormData) {
  const user = await requireUser("admin");
  const socials: Record<string, string> = {};
  for (const k of ["linkedin", "facebook", "x", "youtube", "instagram", "google", "tiktok"]) {
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
    googleVerification: verificationCode(str(fd, "googleVerification", 400)),
    bingVerification: verificationCode(str(fd, "bingVerification", 400)),
    latitude: coord(str(fd, "latitude", 30), 90),
    longitude: coord(str(fd, "longitude", 30), 180),
    openingHours: optStr(fd, "openingHours", 200),
    mapUrl: optStr(fd, "mapUrl", 1000),
    allowAiTraining: bool(fd, "allowAiTraining"),
  };
  if (!values.companyName || !values.heroTitle || !values.email || !values.phonePrimary) {
    fail("/admin/settings", "Company name, hero title, email and primary phone are required.");
  }
  await db.update(schema.siteSettings).set(values).where(eq(schema.siteSettings.id, 1));
  await audit(user, "update", "settings", 1);
  contentChanged(["/", "/about", "/contact"]);
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
    faqs: faqBlocks(str(fd, "faqs", 20000)),
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
  contentChanged(["/", "/services", `/services/${values.slug}`]);
  redirect("/admin/services?saved=1");
}

export async function deleteService(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.services).where(eq(schema.services.id, id));
  await audit(user, "delete", "service", id);
  contentChanged(["/services"]);
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
  contentChanged(["/industries", `/industries/${values.slug}`]);
  redirect("/admin/industries?saved=1");
}

export async function deleteIndustry(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.industries).where(eq(schema.industries.id, id));
  await audit(user, "delete", "industry", id);
  contentChanged(["/industries"]);
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
  contentChanged(["/", "/about"]);
  redirect("/admin/clients?saved=1");
}

export async function deleteClient(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.clients).where(eq(schema.clients.id, id));
  await audit(user, "delete", "client", id);
  contentChanged(["/", "/about"]);
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
  contentChanged(["/", "/about"]);
  redirect("/admin/partners?saved=1");
}

export async function deletePartner(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.partners).where(eq(schema.partners.id, id));
  await audit(user, "delete", "partner", id);
  contentChanged(["/", "/about"]);
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
  contentChanged(["/"]);
  redirect("/admin/homepage?saved=1");
}

export async function deleteStat(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  await db.delete(schema.stats).where(eq(schema.stats.id, id));
  await audit(user, "delete", "stat", id);
  contentChanged(["/"]);
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
  contentChanged(["/"]);
  redirect("/admin/homepage?saved=1");
}

export async function deleteFeatured(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  await db.delete(schema.featuredItems).where(eq(schema.featuredItems.id, id));
  await audit(user, "delete", "featured", id);
  contentChanged(["/"]);
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
  contentChanged(status === "published" ? ["/", type === "case_study" ? "/case-studies" : "/insights", `/${type === "case_study" ? "case-studies" : "insights"}/${values.slug}`] : []);
  redirect(`/admin/posts/${newId}?saved=1`);
}

export async function deletePost(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  await db.delete(schema.posts).where(eq(schema.posts.id, id));
  await audit(user, "delete", "post", id);
  contentChanged(["/insights", "/case-studies"]);
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
  contentChanged(["/careers", `/careers/${values.slug}`]);
  redirect("/admin/jobs?saved=1");
}

export async function deleteJob(fd: FormData) {
  const user = await requireUser("admin");
  const id = Number(str(fd, "id"));
  await db.delete(schema.jobs).where(eq(schema.jobs.id, id));
  await audit(user, "delete", "job", id);
  contentChanged(["/careers"]);
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
  const invite = !id && bool(fd, "invite");
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) fail(back, "Name and a valid email are required.");
  if (!id && !invite && password.length < 10) fail(back, "Set a password of at least 10 characters, or tick “Email them a link”.");
  if (password && password.length < 10) fail(back, "Password must be at least 10 characters.");
  if (id === me.id && (role !== "admin" || !active)) fail(back, "You can't remove your own admin access.");

  const [clash] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(id ? and(eq(schema.users.email, email), ne(schema.users.id, id)) : eq(schema.users.email, email));
  if (clash) fail(back, "Another user already has that email.");

  const jobTitle = optStr(fd, "jobTitle", 120);
  const values = {
    name,
    email,
    role,
    active,
    jobTitle,
    ...(password ? { passwordHash: await bcrypt.hash(password, 12), passwordChangedAt: new Date() } : {}),
  };
  if (id) {
    await db.update(schema.users).set(values).where(eq(schema.users.id, id));
    await audit(me, "update", "user", id);
    redirect("/admin/users?saved=1");
  }
  // An invited user gets an unusable random password until they set their own.
  const passwordHash = values.passwordHash ?? (await bcrypt.hash(randomBytes(32).toString("hex"), 12));
  const [created] = await db.insert(schema.users).values({ ...values, passwordHash }).returning({ id: schema.users.id });
  await audit(me, "create", "user", created.id);
  if (invite) {
    const sent = await sendPasswordLink({ id: created.id, name, email }, "invite", me.id);
    if (!sent.ok) fail(`/admin/users/${created.id}`, `User created, but the invite email failed: ${sent.error}`);
    redirect(`/admin/users/${created.id}?saved=invited`);
  }
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

/* ---------------- site health ---------------- */

export async function runHealthNow() {
  const user = await requireUser();
  const run = await runHealthCheck("manual");
  await audit(user, "run", "health", run?.id ?? null);
  redirect(run ? "/admin/health?ran=1" : "/admin/health?busy=1");
}

/* ---------------- email ---------------- */

export async function saveEmailSettings(fd: FormData) {
  const user = await requireUser("admin");
  const host = str(fd, "smtpHost", 200).toLowerCase();
  const port = int(fd, "smtpPort", 465);
  const smtpUser = str(fd, "smtpUser", 200).toLowerCase();
  const pass = String(fd.get("smtpPass") ?? "");
  const fromAddress = str(fd, "smtpFromAddress", 200).toLowerCase();
  if (fromAddress && !/^\S+@\S+\.\S+$/.test(fromAddress)) fail("/admin/settings#mail", "The Send from address must be an email address, e.g. noreply@techbucket.com.np.");
  if (host && !/^[a-z0-9.-]+$/.test(host)) fail("/admin/settings#mail", "The SMTP server name doesn't look right (e.g. smtppro.zoho.com).");
  if (smtpUser && !/^\S+@\S+\.\S+$/.test(smtpUser)) fail("/admin/settings#mail", "The username is the full email address, e.g. admin@techbucket.com.np.");
  await db
    .update(schema.siteSettings)
    .set({
      smtpHost: host || null,
      smtpPort: [25, 465, 587, 2525].includes(port) ? port : 465,
      smtpUser: smtpUser || null,
      smtpFromName: optStr(fd, "smtpFromName", 120),
      smtpFromAddress: fromAddress && fromAddress !== smtpUser ? fromAddress : null,
      autoReply: bool(fd, "autoReply"),
      ...(bool(fd, "smtpClear") ? { smtpPassEnc: null } : pass ? { smtpPassEnc: seal(pass) } : {}),
    })
    .where(eq(schema.siteSettings.id, 1));
  await audit(user, "update", "email_settings", 1);
  contentChanged();
  redirect("/admin/settings?saved=1#mail");
}

export async function sendTestEmail(fd: FormData) {
  const user = await requireUser("admin");
  const to = str(fd, "to", 200) || user.email;
  const c = await mailConfig();
  if (!c) fail("/admin/settings#mail", "Save the SMTP server, username and password first.");
  const check = await verifyMail(c);
  if (!check.ok) fail("/admin/settings#mail", `Could not sign in to ${c.host}: ${check.error}`);
  const r = await sendMail({
    to,
    subject: `Test email from ${c.fromAddress}`,
    text: `This is a test from the Tech Bucket website, sent by ${user.name}.\n\nIf you can read this, enquiry alerts, password resets and replies to clients will work.`,
    kind: "test",
    sentBy: user.id,
  });
  if (!r.ok) fail("/admin/settings#mail", `Sending failed: ${r.error}`);
  redirect(`/admin/settings?mailed=${encodeURIComponent(to)}#mail`);
}

export async function sendUserPasswordLink(fd: FormData) {
  const me = await requireUser("admin");
  const id = Number(str(fd, "id"));
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) fail("/admin/users", "User not found.");
  const r = await sendPasswordLink(u, u.lastLoginAt ? "reset" : "invite", me.id);
  await audit(me, "send_password_link", "user", id);
  if (!r.ok) fail(`/admin/users/${id}`, `Email failed: ${r.error}`);
  redirect(`/admin/users/${id}?saved=link`);
}

export async function replyToLead(fd: FormData) {
  const user = await requireUser();
  const id = Number(str(fd, "id"));
  const back = `/admin/leads/${id}`;
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
  if (!lead) fail("/admin/leads", "Enquiry not found.");
  const subject = str(fd, "subject", 250);
  const message = str(fd, "message", 20000);
  if (!subject || message.length < 5) fail(back, "Write a subject and a message.");
  const [s] = await db.select({ email: schema.siteSettings.email }).from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  const r = await sendMail({
    to: lead.email,
    subject,
    text: message,
    kind: "lead_reply",
    replyTo: s?.email,
    leadId: lead.id,
    sentBy: user.id,
    keepBody: true,
  });
  if (!r.ok) fail(back, `Email not sent: ${r.error}`);
  const stamp = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date());
  await db
    .update(schema.leads)
    .set({
      status: lead.status === "new" ? "contacted" : lead.status,
      notes: `${lead.notes ? `${lead.notes}\n` : ""}[${stamp}] ${user.name} emailed: ${subject}`.slice(0, 20000),
    })
    .where(eq(schema.leads.id, id));
  await audit(user, "email", "lead", id);
  redirect(`${back}?saved=emailed`);
}

/* ---------------- password reset (signed out) ---------------- */

export async function requestPasswordReset(fd: FormData) {
  const limit = await rateLimit("reset", 5, 15 * 60 * 1000);
  if (!limit.ok) redirect("/admin/forgot?error=wait");
  const email = str(fd, "email", 200).toLowerCase();
  if (/^\S+@\S+\.\S+$/.test(email)) {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    // Same response whether or not the account exists, so emails can't be probed.
    if (u?.active) await sendPasswordLink(u, "reset");
  }
  redirect("/admin/forgot?sent=1");
}

export async function resetPasswordAction(fd: FormData) {
  const limit = await rateLimit("reset-set", 10, 15 * 60 * 1000);
  const token = str(fd, "token", 100);
  const back = `/admin/reset?token=${encodeURIComponent(token)}`;
  if (!limit.ok) fail(back, "Too many attempts. Wait 15 minutes.");
  const row = await findPasswordToken(token);
  if (!row) redirect("/admin/reset?expired=1");
  const next = String(fd.get("next") ?? "");
  if (next.length < 10) fail(back, "Use at least 10 characters.");
  if (next !== String(fd.get("confirm") ?? "")) fail(back, "The two passwords don't match.");
  await db
    .update(schema.users)
    .set({ passwordHash: await bcrypt.hash(next, 12), passwordChangedAt: new Date() })
    .where(eq(schema.users.id, row.t.userId));
  await markPasswordTokenUsed(row.t.id);
  await db
    .insert(schema.auditLog)
    .values({ userId: row.t.userId, action: row.t.purpose === "invite" ? "password_set" : "password_reset", entity: "user", entityId: String(row.t.userId) })
    .catch(() => {});
  await createSession(row.t.userId);
  redirect("/admin?welcome=1");
}
