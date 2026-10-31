import { requireUser } from "@/lib/auth";
import { Card, Flash, PageHeader, TextField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { changePasswordAction } from "../../actions";

export const metadata = { title: "My account" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AccountPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="My account" description={`${user.name} · ${user.email} · ${user.role}`} />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={changePasswordAction} className="max-w-xl">
        <Card title="Change password">
          <div className="space-y-5">
            <TextField name="current" label="Current password" type="password" required />
            <TextField name="next" label="New password" type="password" required hint="at least 10 characters" />
            <TextField name="confirm" label="Confirm new password" type="password" required />
            <SubmitButton>Change password</SubmitButton>
          </div>
        </Card>
      </form>
    </>
  );
}
