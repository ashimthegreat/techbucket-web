import "server-only";
import { createHash } from "node:crypto";
import { siteUrl } from "@/lib/utils";

/**
 * IndexNow tells Bing (which powers Copilot and feeds many AI search tools),
 * Yandex, Seznam and Naver that pages changed, so they re-crawl within minutes
 * instead of days. The key is derived from SESSION_SECRET so it stays the same
 * across deploys without another setting; it's served at /indexnow-key.txt.
 */
export function indexNowKey(): string {
  const fromEnv = process.env.INDEXNOW_KEY?.trim();
  if (fromEnv && /^[a-zA-Z0-9-]{8,128}$/.test(fromEnv)) return fromEnv;
  return createHash("sha256")
    .update(`indexnow:${process.env.SESSION_SECRET ?? "techbucket"}`)
    .digest("hex")
    .slice(0, 32);
}

/** Only ping from the live public site (not localhost or previews). */
function enabled() {
  if (process.env.INDEXNOW_DISABLED === "true") return false;
  const base = siteUrl();
  return process.env.NODE_ENV === "production" && base.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(base);
}

export async function pingIndexNow(paths: string[]): Promise<void> {
  if (!enabled() || paths.length === 0) return;
  const host = new URL(siteUrl()).host;
  const urlList = [...new Set(paths)].slice(0, 1000).map((p) => siteUrl(p));
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: indexNowKey(), keyLocation: siteUrl("/indexnow-key.txt"), urlList }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok && res.status !== 202) console.warn(`[indexnow] HTTP ${res.status} for ${urlList.length} URL(s)`);
  } catch (e) {
    console.warn("[indexnow] ping failed:", (e as Error).message);
  }
}
