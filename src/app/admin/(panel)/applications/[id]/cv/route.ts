import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { MIME_BY_EXT, resolveUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// CVs are private: only signed-in staff can download them.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const [a] = await db.select().from(schema.applications).where(eq(schema.applications.id, Number(id)));
  if (!a?.cvPath) return new Response("Not found", { status: 404 });
  const full = resolveUpload(a.cvPath);
  if (!full) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const name = (a.cvOriginalName ?? `cv${ext}`).replace(/[^\w.\- ]/g, "_");
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
