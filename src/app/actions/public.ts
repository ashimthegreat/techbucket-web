"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { saveCv } from "@/lib/uploads";
import { notify } from "@/lib/mail";
import { getSettings } from "@/lib/data";

export type FormState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
  /** Echoed back on error so the form keeps what the visitor typed. */
  values?: Record<string, string>;
};

function echo(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v.slice(0, 8000);
  return out;
}

const leadSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(160),
  organisation: z.string().trim().max(200).optional().default(""),
  email: z.email("Please enter a valid email address.").max(200),
  phone: z.string().trim().max(60).optional().default(""),
  service: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(5000),
  source: z.string().trim().max(160).optional().default("contact"),
});

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function submitLead(_prev: FormState, formData: FormData): Promise<FormState> {
  // Honeypot: real people never fill this hidden field.
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { ok: true, message: "Thank you — we'll be in touch within one working day." };
  }
  const limit = await rateLimit("lead", 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return { ok: false, message: "Too many submissions. Please try again in a few minutes or call us.", values: echo(formData) };
  }
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error), values: echo(formData) };
  }
  const h = await headers();
  const data = parsed.data;
  try {
    await db.insert(schema.leads).values({
      ...data,
      ip: limit.ip,
      userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
    });
  } catch (e) {
    console.error("[lead] insert failed", e);
    return { ok: false, message: "Something went wrong on our side. Please email or call us instead.", values: echo(formData) };
  }
  const settings = await getSettings();
  await notify(
    settings.leadNotifyEmail,
    `New enquiry: ${data.name}${data.organisation ? ` (${data.organisation})` : ""}`,
    `Name: ${data.name}\nOrganisation: ${data.organisation}\nEmail: ${data.email}\nPhone: ${data.phone}\nInterest: ${data.service}\nSource: ${data.source}\n\n${data.message}\n\nManage in admin: ${process.env.SITE_URL ?? ""}/admin/leads`,
  );
  return { ok: true, message: "Thank you — we'll be in touch within one working day." };
}

const applicationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(160),
  email: z.email("Please enter a valid email address.").max(200),
  phone: z.string().trim().max(60).optional().default(""),
  coverLetter: z.string().trim().max(8000).optional().default(""),
  jobId: z.coerce.number().int().positive().optional(),
});

export async function submitApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("company_website") ?? "").length > 0) {
    return { ok: true, message: "Thank you — your application has been received." };
  }
  const limit = await rateLimit("apply", 4, 30 * 60 * 1000);
  if (!limit.ok) return { ok: false, message: "Too many submissions. Please try again later.", values: echo(formData) };

  const raw = Object.fromEntries(formData);
  if (raw.jobId === "") delete raw.jobId;
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error), values: echo(formData) };
  }
  const cv = formData.get("cv");
  if (!(cv instanceof File) || cv.size === 0) {
    return { ok: false, message: "Please attach your CV.", errors: { cv: "Attach your CV as PDF or Word (max 8 MB)." }, values: echo(formData) };
  }
  let saved;
  try {
    saved = await saveCv(cv);
  } catch (e) {
    return { ok: false, message: (e as Error).message, errors: { cv: (e as Error).message }, values: echo(formData) };
  }
  const data = parsed.data;
  let jobTitle = "General application";
  if (data.jobId) {
    const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, data.jobId));
    if (!job) data.jobId = undefined;
    else jobTitle = job.title;
  }
  await db.insert(schema.applications).values({
    jobId: data.jobId ?? null,
    name: data.name,
    email: data.email,
    phone: data.phone,
    coverLetter: data.coverLetter,
    cvPath: saved.relPath,
    cvOriginalName: saved.originalName,
  });
  const settings = await getSettings();
  await notify(
    settings.leadNotifyEmail,
    `New application: ${data.name} — ${jobTitle}`,
    `${data.name} <${data.email}> applied for ${jobTitle}.\n\nReview in admin: ${process.env.SITE_URL ?? ""}/admin/applications`,
  );
  return { ok: true, message: "Thank you — your application has been received. We'll contact shortlisted candidates." };
}
