import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Uploads live outside the build output (UPLOAD_DIR, default ./uploads)
 * so redeploying the app never wipes them. Public files are served by
 * /media/[...path]; private files (CVs) only through the admin route.
 */
export function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

const IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/gif": ".gif",
};
const DOC_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export type SavedFile = {
  fileName: string;
  relPath: string;
  url: string | null;
  mimeType: string;
  size: number;
  originalName: string;
};

async function save(
  file: File,
  folder: "public" | "private",
  allowed: Record<string, string>,
  maxBytes: number,
): Promise<SavedFile> {
  if (!file || file.size === 0) throw new Error("No file selected.");
  if (file.size > maxBytes) throw new Error(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const ext = allowed[file.type];
  if (!ext) throw new Error("This file type is not allowed.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (file.type === "image/svg+xml") {
    const text = buf.toString("utf8").toLowerCase();
    if (text.includes("<script") || text.includes("onload=") || text.includes("javascript:")) {
      throw new Error("SVG contains scripts and was rejected.");
    }
  }
  const now = new Date();
  const sub = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fileName = `${crypto.randomBytes(10).toString("hex")}${ext}`;
  const dir = path.join(uploadRoot(), folder, sub);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buf);
  const relPath = `${folder}/${sub}/${fileName}`;
  return {
    fileName,
    relPath,
    url: folder === "public" ? `/media/${sub}/${fileName}` : null,
    mimeType: file.type,
    size: file.size,
    originalName: file.name.slice(0, 250),
  };
}

export function saveImage(file: File) {
  return save(file, "public", IMAGE_TYPES, 5 * 1024 * 1024);
}

export function saveCv(file: File) {
  return save(file, "private", DOC_TYPES, 8 * 1024 * 1024);
}

export async function deleteUpload(relPath: string) {
  const full = path.resolve(uploadRoot(), relPath);
  if (!full.startsWith(uploadRoot() + path.sep)) return;
  await unlink(full).catch(() => {});
}

export function resolveUpload(relPath: string) {
  const full = path.resolve(uploadRoot(), relPath);
  if (!full.startsWith(uploadRoot() + path.sep)) return null;
  return full;
}

export const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
