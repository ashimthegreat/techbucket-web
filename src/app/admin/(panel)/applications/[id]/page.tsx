import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Flash, PageHeader, SelectField, TextArea } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteApplication, updateApplication } from "../../../actions";
import { formatDateTime, telHref } from "@/lib/utils";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ApplicationPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [row] = await db
    .select({ a: schema.applications, jobTitle: schema.jobs.title })
    .from(schema.applications)
    .leftJoin(schema.jobs, eq(schema.applications.jobId, schema.jobs.id))
    .where(eq(schema.applications.id, Number(id)));
  if (!row) notFound();
  const { a, jobTitle } = row;

  return (
    <>
      <PageHeader title={a.name} description={`${jobTitle ?? "General application"} · received ${formatDateTime(a.createdAt)}`} back={{ href: "/admin/applications", label: "Applications" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Applicant">
          <dl className="space-y-3 text-[15px]">
            <div><dt className="text-sm font-semibold text-subtle">Email</dt><dd><a className="text-accent-ink hover:underline" href={`mailto:${a.email}`}>{a.email}</a></dd></div>
            <div><dt className="text-sm font-semibold text-subtle">Phone</dt><dd>{a.phone ? <a className="text-accent-ink hover:underline" href={telHref(a.phone)}>{a.phone}</a> : "—"}</dd></div>
            <div>
              <dt className="text-sm font-semibold text-subtle">CV</dt>
              <dd>
                {a.cvPath ? (
                  <a href={`/admin/applications/${a.id}/cv`} className="inline-flex min-h-10 items-center bg-ink px-4 text-sm font-semibold text-white">
                    Download {a.cvOriginalName ?? "CV"}
                  </a>
                ) : "—"}
              </dd>
            </div>
          </dl>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-subtle">Cover note</h3>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{a.coverLetter || "—"}</p>
        </Card>
        <div className="space-y-6">
          <Card title="Review">
            <form action={updateApplication} className="space-y-4">
              <input type="hidden" name="id" value={a.id} />
              <SelectField
                name="status"
                label="Status"
                defaultValue={a.status}
                options={["new", "shortlisted", "interview", "offer", "rejected"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
              />
              <TextArea name="notes" label="Internal notes" defaultValue={a.notes} rows={6} />
              <SubmitButton />
            </form>
          </Card>
          {user.role === "admin" && (
            <form action={deleteApplication}>
              <input type="hidden" name="id" value={a.id} />
              <ConfirmSubmit message="Delete this application and its CV permanently?">Delete application</ConfirmSubmit>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
