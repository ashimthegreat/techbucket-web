import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Flash, PageHeader, SelectField, TextArea } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteLead, updateLead } from "../../../actions";
import { formatDateTime, telHref } from "@/lib/utils";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function LeadPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, Number(id)));
  if (!lead) notFound();

  const row = (k: string, v: React.ReactNode) => (
    <div className="grid gap-1 border-b border-hair py-3 sm:grid-cols-[160px_1fr]">
      <dt className="text-sm font-semibold text-subtle">{k}</dt>
      <dd className="text-[15px] break-words">{v || "—"}</dd>
    </div>
  );

  return (
    <>
      <PageHeader title={lead.name} description={`Received ${formatDateTime(lead.createdAt)}`} back={{ href: "/admin/leads", label: "Enquiries" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Enquiry">
          <dl>
            {row("Organisation", lead.organisation)}
            {row("Email", <a className="text-accent-ink hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>)}
            {row("Phone", lead.phone && <a className="text-accent-ink hover:underline" href={telHref(lead.phone)}>{lead.phone}</a>)}
            {row("Interest", lead.service)}
            {row("Source", lead.source)}
          </dl>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-subtle">Message</h3>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{lead.message}</p>
          <p className="mt-6 text-xs text-subtle">IP {lead.ip ?? "unknown"} · {lead.userAgent?.slice(0, 120)}</p>
        </Card>
        <div className="space-y-6">
          <Card title="Follow-up">
            <form action={updateLead} className="space-y-4">
              <input type="hidden" name="id" value={lead.id} />
              <SelectField
                name="status"
                label="Status"
                defaultValue={lead.status}
                options={["new", "contacted", "qualified", "won", "lost", "spam"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
              />
              <TextArea name="notes" label="Internal notes" defaultValue={lead.notes} rows={6} />
              <SubmitButton />
            </form>
          </Card>
          {user.role === "admin" && (
            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmSubmit message="Delete this enquiry permanently?">Delete enquiry</ConfirmSubmit>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
