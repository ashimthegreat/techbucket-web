import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

/** Renders admin-authored Markdown to sanitised HTML. */
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md ?? "", { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "h4"]),
    allowedAttributes: {
      a: ["href", "title", "rel", "target"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:\/\//.test(attribs.href ?? "");
        return {
          tagName,
          attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs,
        };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
    },
  });
}

/** Plain-text excerpt for meta descriptions. */
export function plainText(md: string, max = 160) {
  const text = (md ?? "")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
