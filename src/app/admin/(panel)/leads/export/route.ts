import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const valid = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
  const s = valid.find((v) => v === status);
  const rows = await db
    .select()
    .from(schema.leads)
    .where(s ? eq(schema.leads.status, s) : undefined)
    .orderBy(desc(schema.leads.createdAt));
  const header = ["id", "received", "name", "organisation", "email", "phone", "interest", "source", "status", "message", "notes"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.id, r.createdAt, r.name, r.organisation, r.email, r.phone, r.service, r.source, r.status, r.message, r.notes].map(csvCell).join(","),
    ),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="techbucket-enquiries-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
