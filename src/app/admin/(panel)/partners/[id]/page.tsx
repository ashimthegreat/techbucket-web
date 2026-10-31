import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Checkbox, Flash, ImageField, PageHeader, TextField } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deletePartner, savePartner } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditPartner({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.partners).where(eq(schema.partners.id, Number(id)));
  if (!isNew && !row) notFound();

  return (
    <>
      <PageHeader title={isNew ? "New partner" : row!.name} back={{ href: "/admin/partners", label: "Technology partners" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={savePartner} className="max-w-2xl">
        <input type="hidden" name="id" value={id} />
        <Card>
          <div className="space-y-5">
            <TextField name="name" label="Brand name" defaultValue={row?.name} required />
            <TextField name="website" label="Website" type="url" defaultValue={row?.website} />
            <ImageField name="logoUrl" label="Logo" current={row?.logoUrl} />
            <TextField name="sortOrder" label="Order" type="number" defaultValue={row?.sortOrder ?? 0} />
            <Checkbox name="published" label="Published" defaultChecked={row?.published ?? true} />
            <SubmitButton />
          </div>
        </Card>
      </form>
      {!isNew && user.role === "admin" && (
        <form action={deletePartner} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this partner?">Delete partner</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
