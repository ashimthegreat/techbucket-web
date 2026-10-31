import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Checkbox, Flash, PageHeader, SeoFields, TextArea, TextField, markdownHint } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteService, saveService } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditService({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.services).where(eq(schema.services.id, Number(id)));
  if (!isNew && !row) notFound();

  return (
    <>
      <PageHeader title={isNew ? "New service" : row!.title} back={{ href: "/admin/services", label: "Services" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveService} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <input type="hidden" name="id" value={id} />
        <div className="space-y-6">
          <Card>
            <div className="space-y-5">
              <TextField name="title" label="Title" defaultValue={row?.title} required />
              <TextArea name="summary" label="Summary" defaultValue={row?.summary} rows={3} hint="Shown on cards and as the page intro." />
              <TextArea name="body" label="Page content" defaultValue={row?.body} rows={18} hint={markdownHint} mono />
            </div>
          </Card>
          <SeoFields title={row?.seoTitle} description={row?.seoDescription} />
        </div>
        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-4">
              <Checkbox name="published" label="Published" defaultChecked={row?.published ?? true} />
              <TextField name="slug" label="URL slug" defaultValue={row?.slug} hint="auto from title" />
              <TextField name="sortOrder" label="Order" type="number" defaultValue={row?.sortOrder ?? 0} />
              <SubmitButton className="w-full" />
            </div>
          </Card>
          <Card title="At a glance">
            <TextArea name="highlights" label="Highlights" defaultValue={row?.highlights.join("\n")} rows={6} hint="One per line" />
          </Card>
        </div>
      </form>
      {!isNew && user.role === "admin" && (
        <form action={deleteService} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this service? Its page will disappear from the website.">Delete service</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
