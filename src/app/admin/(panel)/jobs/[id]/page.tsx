import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Flash, PageHeader, SelectField, TextArea, TextField, markdownHint } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteJob, saveJob } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(new Date(d).getTime() + (5 * 60 + 45) * 60 * 1000).toISOString().slice(0, 10);
}

export default async function EditJob({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.jobs).where(eq(schema.jobs.id, Number(id)));
  if (!isNew && !row) notFound();

  return (
    <>
      <PageHeader title={isNew ? "Post a job" : row!.title} back={{ href: "/admin/jobs", label: "Jobs" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveJob} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <input type="hidden" name="id" value={id} />
        <Card>
          <div className="space-y-5">
            <TextField name="title" label="Job title" defaultValue={row?.title} required />
            <TextArea name="summary" label="Summary" defaultValue={row?.summary} rows={3} />
            <TextArea
              name="body"
              label="Description"
              defaultValue={row?.body ?? "## About the role\n\n## What you'll do\n\n- \n\n## What you'll bring\n\n- \n\n## Why Tech Bucket\n"}
              rows={20}
              hint={markdownHint}
              mono
            />
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Details">
            <div className="space-y-4">
              <SelectField name="status" label="Status" defaultValue={row?.status ?? "open"} options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />
              <TextField name="department" label="Department" defaultValue={row?.department} hint="e.g. Network engineering" />
              <TextField name="location" label="Location" defaultValue={row?.location ?? "Kathmandu"} />
              <SelectField
                name="employmentType"
                label="Type"
                defaultValue={row?.employmentType ?? "Full-time"}
                options={["Full-time", "Part-time", "Contract", "Internship"].map((v) => ({ value: v, label: v }))}
              />
              <TextField name="closesAt" label="Closing date" type="date" defaultValue={toDateInput(row?.closesAt)} />
              <TextField name="slug" label="URL slug" defaultValue={row?.slug} hint="auto from title" />
              <SubmitButton className="w-full" />
            </div>
          </Card>
        </div>
      </form>
      {!isNew && user.role === "admin" && (
        <form action={deleteJob} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this job? Its applications are kept as general applications.">Delete job</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
