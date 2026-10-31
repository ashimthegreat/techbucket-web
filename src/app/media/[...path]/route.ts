import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { MIME_BY_EXT, resolveUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Serves public uploads (logos, covers, images) from UPLOAD_DIR/public.
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = path.posix.join("public", ...parts.map((p) => p.replace(/[^\w.\-]/g, "")));
  const full = resolveUpload(rel);
  if (!full) return new Response("Not found", { status: 404 });
  try {
    const info = await stat(full);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    const body = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const type = MIME_BY_EXT[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(ext === ".svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
