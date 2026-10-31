import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-3 inline-block text-sm font-medium text-subtle hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="inline-flex min-h-11 items-center justify-center bg-ink px-5 text-sm font-semibold text-white hover:bg-charcoal">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Card({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <section className={cn("border border-hair bg-white p-5 sm:p-7", className)}>
      {title && <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-subtle">{title}</h2>}
      {children}
    </section>
  );
}

export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (error)
    return (
      <p role="alert" className="mb-6 border-l-[3px] border-accent-ink bg-accent-wash px-4 py-3 text-sm text-accent-ink">
        {error}
      </p>
    );
  if (saved)
    return (
      <p role="status" className="mb-6 border-l-[3px] border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {saved === "deleted" ? "Deleted." : "Saved."}
      </p>
    );
  return null;
}

const badgeTone: Record<string, string> = {
  new: "bg-accent-wash text-accent-ink",
  published: "bg-emerald-50 text-emerald-800",
  open: "bg-emerald-50 text-emerald-800",
  won: "bg-emerald-50 text-emerald-800",
  offer: "bg-emerald-50 text-emerald-800",
  qualified: "bg-sky-50 text-sky-800",
  shortlisted: "bg-sky-50 text-sky-800",
  interview: "bg-sky-50 text-sky-800",
  contacted: "bg-amber-50 text-amber-800",
  draft: "bg-mist text-slate",
  closed: "bg-mist text-slate",
  hidden: "bg-mist text-slate",
  lost: "bg-mist text-slate",
  rejected: "bg-mist text-slate",
  spam: "bg-mist text-subtle",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-semibold capitalize", badgeTone[value] ?? "bg-mist text-slate")}>
      {label ?? value.replace(/_/g, " ")}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-hair bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-hair bg-mist px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-subtle", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-hair px-4 py-3 align-top", className)}>{children}</td>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="border border-dashed border-line bg-white px-6 py-12 text-center text-[15px] text-muted">{children}</div>;
}

/* ---------- Form fields ---------- */

const inputCls =
  "w-full border border-line bg-white px-3 py-2.5 text-[15px] text-ink focus:border-ink focus:outline-none focus:ring-0";

export function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
      {children}
      {hint && <span className="ml-2 font-normal text-subtle">{hint}</span>}
    </label>
  );
}

export function TextField({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  hint,
  placeholder,
  className,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} hint={hint}>
        {label}
        {required && <span className="text-accent-ink"> *</span>}
      </Label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        className={inputCls}
      />
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  rows = 4,
  hint,
  required,
  className,
  mono,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
  required?: boolean;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} hint={hint}>
        {label}
        {required && <span className="text-accent-ink"> *</span>}
      </Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={cn(inputCls, "resize-y leading-relaxed", mono && "font-mono text-[13px]")}
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  options: { value: string | number; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-[18px] w-[18px] accent-[#e8622a]" />
      <span>
        <span className="text-sm font-semibold">{label}</span>
        {hint && <span className="block text-sm text-subtle">{hint}</span>}
      </span>
    </label>
  );
}

export function ImageField({ name, label, current }: { name: string; label: string; current?: string | null }) {
  return (
    <div>
      <Label htmlFor={`${name}File`} hint="PNG, JPG, WebP or SVG · max 5 MB">
        {label}
      </Label>
      {current && (
        <div className="mb-3 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="" className="h-16 w-auto max-w-[200px] border border-hair bg-mist object-contain p-1" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={`${name}Remove`} className="h-4 w-4 accent-[#e8622a]" /> Remove
          </label>
        </div>
      )}
      <input type="hidden" name={name} defaultValue={current ?? ""} />
      <input
        id={`${name}File`}
        name={`${name}File`}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="block w-full text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
    </div>
  );
}

export function SeoFields({ title, description }: { title?: string | null; description?: string | null }) {
  return (
    <Card title="Search engine (SEO)">
      <div className="space-y-4">
        <TextField name="seoTitle" label="SEO title" defaultValue={title} maxLength={200} hint="Leave blank to use the page title. ~60 characters." />
        <TextArea name="seoDescription" label="Meta description" defaultValue={description} rows={3} hint="~155 characters shown in Google results." />
      </div>
    </Card>
  );
}

export const markdownHint = "Markdown: ## Heading, **bold**, - list, [link](https://…)";
