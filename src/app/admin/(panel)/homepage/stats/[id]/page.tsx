import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Checkbox, Flash, PageHeader, TextField } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteStat, saveStat } from "../../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditStat({ params, searchParams }: Props) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.stats).where(eq(schema.stats.id, Number(id)));
  if (!isNew && !row) notFound();
  return (
    <>
      <PageHeader title={isNew ? "New figure" : "Edit figure"} back={{ href: "/admin/homepage", label: "Homepage" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveStat} className="max-w-xl">
        <input type="hidden" name="id" value={id} />
        <Card>
          <div className="space-y-5">
            <div className="grid grid-cols-[1fr_100px] gap-4">
              <TextField name="value" label="Value" defaultValue={row?.value} required hint="e.g. 50" />
              <TextField name="suffix" label="Suffix" defaultValue={row?.suffix} hint="+, %" />
            </div>
            <TextField name="label" label="Label" defaultValue={row?.label} required />
            <TextField name="sortOrder" label="Order" type="number" defaultValue={row?.sortOrder ?? 0} />
            <Checkbox name="published" label="Published" defaultChecked={row?.published ?? true} />
            <SubmitButton />
          </div>
        </Card>
      </form>
      {!isNew && (
        <form action={deleteStat} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this figure?">Delete figure</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
