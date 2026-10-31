import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Checkbox, Flash, PageHeader, SelectField, TextField } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteFeatured, saveFeatured } from "../../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditFeatured({ params, searchParams }: Props) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.featuredItems).where(eq(schema.featuredItems.id, Number(id)));
  if (!isNew && !row) notFound();
  return (
    <>
      <PageHeader title={isNew ? "New featured card" : "Edit featured card"} back={{ href: "/admin/homepage", label: "Homepage" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveFeatured} className="max-w-2xl">
        <input type="hidden" name="id" value={id} />
        <Card>
          <div className="space-y-5">
            <TextField name="kicker" label="Label" defaultValue={row?.kicker} hint="e.g. Partnership" />
            <TextField name="title" label="Headline" defaultValue={row?.title} required />
            <TextField name="ctaLabel" label="Link text" defaultValue={row?.ctaLabel ?? "Read more"} />
            <TextField name="href" label="Link" defaultValue={row?.href} required hint="e.g. /services/cybersecurity" />
            <SelectField name="theme" label="Style" defaultValue={row?.theme ?? "light"} options={[{ value: "light", label: "White card" }, { value: "dark", label: "Charcoal card" }]} />
            <TextField name="sortOrder" label="Order" type="number" defaultValue={row?.sortOrder ?? 0} />
            <Checkbox name="published" label="Published" defaultChecked={row?.published ?? true} />
            <SubmitButton />
          </div>
        </Card>
      </form>
      {!isNew && (
        <form action={deleteFeatured} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this card?">Delete card</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
