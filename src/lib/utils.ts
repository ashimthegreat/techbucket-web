export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}

/** "01-4543897" -> "+97714543897", "9801151658" -> "+9779801151658" */
export function telHref(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("977")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+977${digits.slice(1)}`;
  return `tel:+977${digits}`;
}

export function siteUrl(path = "") {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
