import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/client";
import { findPasswordToken } from "@/lib/password-tokens";
import { resetPasswordAction } from "../actions";
import { AuthShell, authInput } from "../auth-shell";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string; error?: string; expired?: string }> };

export default async function ResetPage({ searchParams }: Props) {
  const sp = await searchParams;
  const row = sp.token ? await findPasswordToken(sp.token) : null;
  if (!row) {
    return (
      <AuthShell title="This link has expired">
        <p className="mt-4 text-[15px] text-muted">Password links work once and only for a limited time. Ask for a new one.</p>
        <Link href="/admin/forgot" className="mt-8 inline-block text-sm font-semibold hover:underline">
          Send a new link →
        </Link>
      </AuthShell>
    );
  }
  const invite = row.t.purpose === "invite";
  return (
    <AuthShell
      title={invite ? `Welcome, ${row.name.split(" ")[0]}` : "Choose a new password"}
      lede={`${invite ? "Set a password for" : "New password for"} ${row.email}. Use at least 10 characters.`}
    >
      <form action={resetPasswordAction} className="space-y-5">
        <input type="hidden" name="token" value={sp.token} />
        <input type="hidden" name="username" value={row.email} autoComplete="username" />
        <div>
          <label htmlFor="next" className="mb-1.5 block text-sm font-semibold">New password</label>
          <input id="next" name="next" type="password" minLength={10} autoComplete="new-password" required className={authInput} />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold">Repeat it</label>
          <input id="confirm" name="confirm" type="password" minLength={10} autoComplete="new-password" required className={authInput} />
        </div>
        {sp.error && (
          <p role="alert" className="border-l-[3px] border-accent-ink bg-accent-wash px-3 py-2 text-sm text-accent-ink">
            {sp.error}
          </p>
        )}
        <SubmitButton className="min-h-12 w-full" pendingLabel="Saving…">
          {invite ? "Set password and sign in" : "Save and sign in"}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
