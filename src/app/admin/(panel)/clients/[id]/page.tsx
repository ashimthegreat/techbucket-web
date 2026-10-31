import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Checkbox, Flash, ImageField, PageHeader, TextField } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteClient, saveClient } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditClient({ params, searchParams }: Props) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.clients).where(eq(schema.clients.id, Number(id)));
  if (!isNew && !row) notFound();

  return (
    <>
      <PageHeader title={isNew ? "New client" : row!.name} back={{ href: "/admin/clients", label: "Clients" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveClient} className="max-w-2xl">
        <input type="hidden" name="id" value={id} />
        <Card>
          <div className="space-y-5">
            <TextField name="name" label="Name" defaultValue={row?.name} required />
            <TextField name="sector" label="Sector" defaultValue={row?.sector} hint="e.g. Healthcare — groups clients on the About page" />
            <TextField name="website" label="Website" type="url" defaultValue={row?.website} />
            <ImageField name="logoUrl" label="Logo" current={row?.logoUrl} />
            <p className="text-sm text-subtle">Tip: SVG or a transparent PNG looks sharpest, but logos on a white background are fine: the white blends into the page automatically. Logos show in grey and turn full colour on hover.</p>
            <TextField name="sortOrder" label="Order" type="number" defaultValue={row?.sortOrder ?? 0} />
            <Checkbox name="showOnHome" label="Show on homepage" defaultChecked={row?.showOnHome ?? false} hint="Featured in the homepage logo row" />
            <Checkbox name="published" label="Published" defaultChecked={row?.published ?? true} />
            <SubmitButton />
          </div>
        </Card>
      </form>
      {!isNew && user.role === "admin" && (
        <form action={deleteClient} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this client?">Delete client</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
