import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Checkbox, Flash, PageHeader, SelectField, TextField } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteUser, saveUser } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EditUser({ params, searchParams }: Props) {
  const me = await requireUser("admin");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.users).where(eq(schema.users.id, Number(id)));
  if (!isNew && !row) notFound();
  return (
    <>
      <PageHeader title={isNew ? "New user" : row!.name} back={{ href: "/admin/users", label: "Users" }} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveUser} className="max-w-xl">
        <input type="hidden" name="id" value={id} />
        <Card>
          <div className="space-y-5">
            <TextField name="name" label="Name" defaultValue={row?.name} required />
            <TextField name="email" label="Email" type="email" defaultValue={row?.email} required />
            <SelectField name="role" label="Role" defaultValue={row?.role ?? "editor"} options={[{ value: "editor", label: "Editor" }, { value: "admin", label: "Admin" }]} />
            <TextField name="password" label={isNew ? "Password" : "New password"} type="password" required={isNew} hint={isNew ? "at least 10 characters" : "leave blank to keep"} />
            <Checkbox name="active" label="Active" defaultChecked={row?.active ?? true} hint="Disabled users can't sign in" />
            <SubmitButton />
          </div>
        </Card>
      </form>
      {!isNew && row!.id !== me.id && (
        <form action={deleteUser} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this user?">Delete user</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
