import "server-only";
import tls from "node:tls";
import { siteUrl } from "@/lib/utils";
import { Collector, DAY, listOf } from "./collector";

const UA = "TechBucketSiteHealth/1.0 (+https://techbucket.com.np)";

type Page = { url: string; status: number; ms: number; html: string; error?: string };

async function get(url: string, opts: { method?: string; redirect?: RequestRedirect; timeout?: number } = {}) {
  const started = Date.now();
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    redirect: opts.redirect ?? "follow",
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
    signal: AbortSignal.timeout(opts.timeout ?? 20000),
    cache: "no-store",
  });
  return { res, ms: Date.now() - started };
}

/** Run async jobs with a small concurrency limit (shared hosting is fragile). */
async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Only the part of the page that is real HTML (Next.js appends a script payload). */
function body(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function analyse(p: Page) {
  const html = body(p.html);
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const desc = decode(attr(metas.find((m) => /name=["']description["']/i.test(m)) ?? "", "content") ?? "");
  const robots = attr(metas.find((m) => /name=["']robots["']/i.test(m)) ?? "", "content") ?? "";
  const canonical = attr((html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) ?? [""])[0], "href") ?? "";
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = imgs.filter((t) => attr(t, "alt") === undefined).length;
  const links = (html.match(/<a\b[^>]*>/gi) ?? []).map((t) => attr(t, "href")).filter(Boolean) as string[];
  const ld = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const ldInvalid = ld.filter((j) => {
    try {
      JSON.parse(j);
      return false;
    } catch {
      return true;
    }
  }).length;
  const mixed = /\s(?:src|href)=["']http:\/\/(?!localhost)/i.test(html);
  return { title, desc, robots, canonical, h1, noAlt, links, ld: ld.length, ldInvalid, mixed };
}

export async function liveChecks(c: Collector): Promise<number> {
  const base = siteUrl().replace(/\/$/, "");
  const origin = new URL(base);
  const isHttps = origin.protocol === "https:";
  const short = (u: string) => u.replace(base, "") || "/";

  /* ---------- robots.txt, sitemap, llms.txt ---------- */
  let urls: string[] = [];
  try {
    const { res } = await get(`${base}/robots.txt`);
    const txt = await res.text();
    const blocksAll = /User-Agent:\s*\*\s*\n(?:(?!User-Agent)[\s\S])*?Disallow:\s*\/\s*$/im.test(txt);
    c.check(res.ok && /Sitemap:/i.test(txt) && !blocksAll, {
      id: "robots",
      category: "seo",
      severity: "critical",
      title: !res.ok ? `robots.txt returns HTTP ${res.status}` : blocksAll ? "robots.txt blocks the whole site" : "robots.txt has no Sitemap line",
      passTitle: "robots.txt is valid and points to the sitemap",
    });
  } catch (e) {
    c.skipped("seo", "robots", "Could not fetch robots.txt", (e as Error).message);
  }
  try {
    const { res } = await get(`${base}/sitemap.xml`);
    const xml = await res.text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim()));
    c.check(res.ok && urls.length > 0, {
      id: "sitemap",
      category: "seo",
      severity: "critical",
      title: res.ok ? "sitemap.xml lists no pages" : `sitemap.xml returns HTTP ${res.status}`,
      passTitle: `sitemap.xml lists ${urls.length} pages`,
    });
  } catch (e) {
    c.skipped("seo", "sitemap", "Could not fetch sitemap.xml", (e as Error).message);
  }
  for (const [path, label] of [
    ["/llms.txt", "llms.txt"],
    ["/indexnow-key.txt", "IndexNow key file"],
  ] as const) {
    try {
      const { res } = await get(base + path);
      c.check(res.ok, {
        id: `file-${path}`,
        category: "seo",
        severity: "info",
        title: `${label} returns HTTP ${res.status}`,
        passTitle: `${label} is reachable`,
      });
    } catch {
      /* covered by page checks */
    }
  }

  /* ---------- Crawl every page in the sitemap ---------- */
  // The sitemap holds the public URL; fetch through `base` so a local run checks this server.
  const toFetch = [...new Set(urls.map((u) => base + new URL(u).pathname))].slice(0, 150);
  if (toFetch.length === 0) toFetch.push(`${base}/`);
  const pages: Page[] = await pool(toFetch, 3, async (url) => {
    try {
      const { res, ms } = await get(url);
      return { url, status: res.status, ms, html: res.ok ? await res.text() : "" };
    } catch (e) {
      return { url, status: 0, ms: 0, html: "", error: (e as Error).message };
    }
  });

  const failed = pages.filter((p) => p.status !== 200);
  c.check(failed.length === 0, {
    id: "pages-status",
    category: "seo",
    severity: "critical",
    title: `${failed.length} page${failed.length === 1 ? "" : "s"} in the sitemap did not load`,
    passTitle: `All ${pages.length} sitemap pages load`,
    detail: listOf(failed.map((p) => `${short(p.url)}: ${p.status || p.error}`)),
    fix: "Fix or unpublish these pages; search engines drop sites that serve errors.",
  });

  const ok = pages.filter((p) => p.status === 200);
  const info = ok.map((p) => ({ p, a: analyse(p) }));
  const avgMs = ok.length ? Math.round(ok.reduce((s, p) => s + p.ms, 0) / ok.length) : 0;
  const slow = ok.filter((p) => p.ms > 2000);
  c.check(slow.length === 0, {
    id: "pages-slow",
    category: "seo",
    severity: "warning",
    title: `${slow.length} page${slow.length === 1 ? "" : "s"} took over 2 seconds to load (average ${avgMs} ms)`,
    passTitle: `Pages respond quickly (average ${avgMs} ms)`,
    detail: listOf(slow.map((p) => `${short(p.url)}: ${p.ms} ms`)),
    fix: "Check server load in cPanel (Resource Usage). Large images and slow database queries are the usual causes.",
  });

  const rule = (
    id: string,
    bad: typeof info,
    severity: "critical" | "warning" | "info",
    title: (n: number) => string,
    passTitle: string,
    describe: (x: (typeof info)[number]) => string,
    fix: string,
  ) =>
    c.check(bad.length === 0, {
      id,
      category: "seo",
      severity,
      title: title(bad.length),
      passTitle,
      detail: listOf(bad.map(describe)),
      fix,
    });
  const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  rule(
    "noindex",
    info.filter((x) => /noindex/i.test(x.a.robots)),
    "critical",
    (n) => `${pl(n, "page is", "pages are")} hidden from search (noindex)`,
    "No public page is set to noindex",
    (x) => short(x.p.url),
    "Remove the noindex setting from these pages.",
  );
  rule(
    "title-length",
    info.filter((x) => x.a.title.length < 25 || x.a.title.length > 65),
    "warning",
    (n) => `${pl(n, "page has a title", "pages have titles")} outside 25–65 characters`,
    "Page titles are a good length",
    (x) => `${short(x.p.url)}: ${x.a.title.length} chars, “${x.a.title}”`,
    "Edit the SEO title for each page so it fits in Google results.",
  );
  rule(
    "desc-length",
    info.filter((x) => x.a.desc.length < 70 || x.a.desc.length > 170),
    "warning",
    (n) => `${pl(n, "page has a search description", "pages have search descriptions")} outside 70–160 characters`,
    "Search descriptions are a good length",
    (x) => `${short(x.p.url)}: ${x.a.desc.length} chars`,
    "Write a 70–160 character SEO description for these pages.",
  );
  const descSeen = new Map<string, string[]>();
  info.forEach((x) => x.a.desc && descSeen.set(x.a.desc, [...(descSeen.get(x.a.desc) ?? []), short(x.p.url)]));
  const dupDesc = [...descSeen.values()].filter((v) => v.length > 1);
  c.check(dupDesc.length === 0, {
    id: "desc-dupes",
    category: "seo",
    severity: "warning",
    title: `${pl(dupDesc.length, "search description is", "search descriptions are")} repeated across pages`,
    passTitle: "Search descriptions are unique",
    detail: listOf(dupDesc.map((v) => v.join(", "))),
    fix: "Give every page its own description.",
  });
  rule(
    "h1",
    info.filter((x) => x.a.h1 !== 1),
    "warning",
    (n) => `${pl(n, "page does", "pages do")} not have exactly one main heading`,
    "Every page has one main heading (H1)",
    (x) => `${short(x.p.url)}: ${x.a.h1} H1`,
    "Each page needs a single H1.",
  );
  rule(
    "canonical",
    info.filter((x) => !x.a.canonical || new URL(x.a.canonical, base).pathname.replace(/\/$/, "") !== new URL(x.p.url).pathname.replace(/\/$/, "")),
    "warning",
    (n) => `${pl(n, "page has a missing or wrong", "pages have missing or wrong")} canonical link`,
    "Canonical links are correct",
    (x) => `${short(x.p.url)} → ${x.a.canonical || "none"}`,
    "Each page's canonical link should point to itself.",
  );
  rule(
    "structured-data",
    info.filter((x) => x.a.ld === 0 || x.a.ldInvalid > 0),
    "warning",
    (n) => `${pl(n, "page has", "pages have")} missing or broken structured data`,
    "Structured data present and valid on every page",
    (x) => `${short(x.p.url)}: ${x.a.ld} blocks, ${x.a.ldInvalid} invalid`,
    "This is generated by the site; report it to the developer.",
  );
  rule(
    "img-alt",
    info.filter((x) => x.a.noAlt > 0),
    "info",
    (n) => `${pl(n, "page has", "pages have")} images without alt text`,
    "All images have alt text",
    (x) => `${short(x.p.url)}: ${x.a.noAlt} image(s)`,
    "Describe images in the content (Markdown: ![description](url)).",
  );
  if (isHttps)
    rule(
      "mixed-content",
      info.filter((x) => x.a.mixed),
      "warning",
      (n) => `${pl(n, "page loads", "pages load")} insecure http:// content`,
      "No insecure (http://) content",
      (x) => short(x.p.url),
      "Change links and images in the content to https://.",
    );

  /* ---------- Broken links ---------- */
  const fetched = new Set(pages.map((p) => new URL(p.url).pathname.replace(/\/$/, "") || "/"));
  const internal = new Map<string, string>();
  const external = new Map<string, string>();
  for (const { p, a } of info) {
    for (const raw of a.links) {
      const href = decode(raw);
      if (/^(mailto|tel|javascript):|^#/i.test(href)) continue;
      let u: URL;
      try {
        u = new URL(href, p.url);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(u.protocol)) continue;
      const sameSite = u.host === origin.host || u.host === new URL(siteUrl()).host;
      if (sameSite) {
        const path = u.pathname.replace(/\/$/, "") || "/";
        if (!fetched.has(path) && !path.startsWith("/admin") && !internal.has(path)) internal.set(path, short(p.url));
      } else if (!external.has(u.href.split("#")[0])) external.set(u.href.split("#")[0], short(p.url));
    }
  }
  const brokenInternal: string[] = [];
  await pool([...internal.entries()].slice(0, 80), 3, async ([path, from]) => {
    try {
      const { res } = await get(base + path, { timeout: 15000 });
      if (res.status >= 400) brokenInternal.push(`${path} (HTTP ${res.status}) on ${from}`);
    } catch (e) {
      brokenInternal.push(`${path} (${(e as Error).message}) on ${from}`);
    }
  });
  c.check(brokenInternal.length === 0, {
    id: "links-internal",
    category: "seo",
    severity: "warning",
    title: `${pl(brokenInternal.length, "broken internal link", "broken internal links")}`,
    passTitle: `Internal links work (${internal.size} extra checked)`,
    detail: listOf(brokenInternal),
    fix: "Fix the link in the page content or menu.",
  });
  const brokenExternal: string[] = [];
  await pool([...external.entries()].slice(0, 60), 4, async ([href, from]) => {
    try {
      let { res } = await get(href, { method: "HEAD", timeout: 12000 });
      if (res.status === 405 || res.status === 403 || res.status === 501) ({ res } = await get(href, { timeout: 12000 }));
      if (res.status === 404 || res.status === 410 || res.status >= 500) brokenExternal.push(`${href} (HTTP ${res.status}) on ${from}`);
    } catch (e) {
      const msg = (e as Error & { cause?: { code?: string } }).cause?.code ?? (e as Error).message;
      if (/ENOTFOUND|ECONNREFUSED|CERT|EAI_AGAIN/i.test(msg)) brokenExternal.push(`${href} (${msg}) on ${from}`);
    }
  });
  c.check(brokenExternal.length === 0, {
    id: "links-external",
    category: "seo",
    severity: "warning",
    title: `${pl(brokenExternal.length, "broken outside link", "broken outside links")}`,
    passTitle: `Outside links work (${Math.min(external.size, 60)} checked)`,
    detail: listOf(brokenExternal),
    fix: "Update or remove these links (client and partner websites change).",
  });

  /* ---------- Redirects and HTTPS ---------- */
  if (isHttps) {
    try {
      const { res } = await get(`http://${origin.host}/`, { redirect: "manual", timeout: 12000 });
      const loc = res.headers.get("location") ?? "";
      c.check([301, 308].includes(res.status) && loc.startsWith("https://"), {
        id: "redirect-https",
        category: "security",
        severity: "critical",
        title: `http:// does not permanently redirect to https:// (HTTP ${res.status}${loc ? ` → ${loc}` : ""})`,
        passTitle: "http:// redirects to https://",
        fix: "cPanel → Domains → turn on Force HTTPS Redirect for techbucket.com.np.",
      });
    } catch (e) {
      c.skipped("security", "redirect-https", "Could not test the http → https redirect", (e as Error).message);
    }
    const alt = origin.host.startsWith("www.") ? origin.host.slice(4) : `www.${origin.host}`;
    try {
      const { res } = await get(`https://${alt}/`, { redirect: "manual", timeout: 12000 });
      const loc = res.headers.get("location") ?? "";
      c.check([301, 308].includes(res.status) && new URL(loc, `https://${alt}`).host === origin.host, {
        id: "redirect-www",
        category: "seo",
        severity: "warning",
        title: `https://${alt} does not redirect to ${origin.host} (HTTP ${res.status})`,
        passTitle: `${alt} redirects to ${origin.host}`,
        detail: "Two addresses serving the same pages split search ranking between them.",
        fix: `Add a permanent redirect from ${alt} to https://${origin.host} (cPanel → Redirects, or in .htaccess).`,
      });
    } catch (e) {
      c.skipped("seo", "redirect-www", `Could not reach https://${alt}`, (e as Error).message);
    }

    /* ---------- SSL certificate ---------- */
    try {
      const validTo = await new Promise<Date>((resolve, reject) => {
        const sock = tls.connect({ host: origin.hostname, port: 443, servername: origin.hostname, timeout: 10000 }, () => {
          const cert = sock.getPeerCertificate();
          sock.end();
          resolve(new Date(cert.valid_to));
        });
        sock.on("error", reject);
        sock.on("timeout", () => sock.destroy(new Error("timeout")));
      });
      const days = Math.floor((validTo.getTime() - Date.now()) / DAY);
      c.check(days >= 21, {
        id: "ssl-expiry",
        category: "security",
        severity: days < 10 ? "critical" : "warning",
        title: `SSL certificate expires in ${days} days`,
        passTitle: `SSL certificate valid for ${days} more days`,
        fix: "cPanel → SSL/TLS Status → Run AutoSSL. If it fails, ask Prabhu Host.",
      });
    } catch (e) {
      c.skipped("security", "ssl-expiry", "Could not read the SSL certificate", (e as Error).message);
    }
  }

  /* ---------- Security headers ---------- */
  try {
    const { res } = await get(`${base}/`);
    const h = res.headers;
    const missing = [
      isHttps && !h.get("strict-transport-security") ? "Strict-Transport-Security" : null,
      h.get("x-content-type-options") !== "nosniff" ? "X-Content-Type-Options" : null,
      !h.get("x-frame-options") && !/frame-ancestors/i.test(h.get("content-security-policy") ?? "") ? "X-Frame-Options" : null,
      !h.get("referrer-policy") ? "Referrer-Policy" : null,
      !h.get("permissions-policy") ? "Permissions-Policy" : null,
    ].filter(Boolean) as string[];
    c.check(missing.length === 0, {
      id: "headers",
      category: "security",
      severity: "warning",
      title: `Missing security headers: ${missing.join(", ")}`,
      passTitle: "Security headers set",
      fix: "Headers are set in next.config.ts; the hosting's Apache config can also strip or override them.",
    });
    c.check(!h.get("x-powered-by"), {
      id: "powered-by",
      category: "security",
      severity: "info",
      title: `Server reveals its software: X-Powered-By: ${h.get("x-powered-by")}`,
      passTitle: "Server software not advertised",
      fix: "Ask Prabhu Host to hide the X-Powered-By header.",
    });
  } catch (e) {
    c.skipped("security", "headers", "Could not read response headers", (e as Error).message);
  }

  /* ---------- Files that must never be public ---------- */
  const secrets = ["/.env", "/.env.local", "/.git/config", "/.git/HEAD", "/package.json", "/server.js", "/stderr.log", "/.htpasswd", "/drizzle/0000_init.sql"];
  const exposed: string[] = [];
  await pool(secrets, 3, async (path) => {
    try {
      const { res } = await get(base + path, { redirect: "manual", timeout: 10000 });
      if (res.status === 200) {
        const text = (await res.text()).slice(0, 2000);
        if (!/<html/i.test(text)) exposed.push(path);
      }
    } catch {
      /* unreachable is fine */
    }
  });
  c.check(exposed.length === 0, {
    id: "exposed-files",
    category: "security",
    severity: "critical",
    title: `Private files can be downloaded from the website: ${exposed.join(", ")}`,
    passTitle: "Private files (.env, .git, server files) are not public",
    fix: "Remove them from public_html, or block them in .htaccess, today.",
  });
  try {
    const { res } = await get(`${base}/admin`, { redirect: "manual", timeout: 10000 });
    const loc = res.headers.get("location") ?? "";
    c.check(res.status >= 300 && res.status < 400 && loc.includes("/admin/login"), {
      id: "admin-guard",
      category: "security",
      severity: "critical",
      title: `Admin area does not require a login (HTTP ${res.status})`,
      passTitle: "Admin area requires a login",
    });
  } catch (e) {
    c.skipped("security", "admin-guard", "Could not test the admin login guard", (e as Error).message);
  }

  return pages.length;
}
