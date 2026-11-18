import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, Flash, PageHeader, SelectField, TextArea, TextField } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteLead, replyToLead, updateLead } from "../../../actions";
import { formatDateTime, telHref } from "@/lib/utils";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function LeadPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, Number(id)));
  if (!lead) notFound();
  const [emails, [settings]] = await Promise.all([
    db
      .select({ e: schema.emailLog, by: schema.users.name })
      .from(schema.emailLog)
      .leftJoin(schema.users, eq(schema.users.id, schema.emailLog.sentBy))
      .where(eq(schema.emailLog.leadId, lead.id))
      .orderBy(desc(schema.emailLog.createdAt)),
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
  ]);
  const first = lead.name.split(" ")[0];
  const draft = `Namaste ${first},\n\nThank you for your enquiry${lead.service ? ` about ${lead.service}` : ""}.\n\n\n\nRegards,\n${user.name}\n${settings.companyName}\n${settings.phonePrimary} · ${settings.email}`;

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
        <div className="space-y-6 lg:col-start-1">
          <form action={replyToLead}>
            <input type="hidden" name="id" value={lead.id} />
            <Card title={`Reply to ${first} by email`}>
              <div className="space-y-4">
                <TextField name="subject" label="Subject" defaultValue={`Re: Your enquiry to ${settings.companyName}`} required />
                <TextArea name="message" label="Message" defaultValue={draft} rows={12} />
                <p className="text-sm text-subtle">
                  Sent from the website&apos;s email account to {lead.email}. Replies come back to {settings.email}. Marks the enquiry as Contacted and adds a note.
                </p>
                <SubmitButton pendingLabel="Sending…">Send email</SubmitButton>
              </div>
            </Card>
          </form>
          {emails.length > 0 && (
            <Card title="Emails to this contact">
              <ul className="divide-y divide-hair">
                {emails.map(({ e, by }) => (
                  <li key={e.id} className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="min-w-0">
                        <span className="block font-semibold">{e.subject}</span>
                        <span className="block text-sm text-muted">
                          {e.kind === "lead_autoreply" ? "Automatic acknowledgement" : `Sent by ${by ?? "admin"}`} · {formatDateTime(e.createdAt)}
                        </span>
                      </span>
                      <Badge value={e.status === "sent" ? "published" : "new"} label={e.status} />
                    </div>
                    {e.error && <p className="mt-1 text-sm text-red-700">{e.error}</p>}
                    {e.body && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-subtle">Show message</summary>
                        <p className="mt-2 whitespace-pre-wrap text-muted">{e.body}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
