import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/admin/client";
import { requestPasswordReset } from "../actions";
import { AuthShell, authInput } from "../auth-shell";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function ForgotPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (sp.sent) {
    return (
      <AuthShell title="Check your email">
        <p className="mt-4 text-[15px] text-muted">
          If that address belongs to an admin account, a link to choose a new password is on its way. It works once, for 1 hour.
          Check the spam folder if it doesn&apos;t arrive in a few minutes.
        </p>
        <Link href="/admin/login" className="mt-8 inline-block text-sm font-semibold hover:underline">
          ← Back to sign in
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Forgot your password?" lede="Enter your admin email and we'll send you a link to choose a new one.">
      <form action={requestPasswordReset} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className={authInput} />
        </div>
        {sp.error && (
          <p role="alert" className="border-l-[3px] border-accent-ink bg-accent-wash px-3 py-2 text-sm text-accent-ink">
            Too many requests. Wait 15 minutes and try again.
          </p>
        )}
        <SubmitButton className="min-h-12 w-full" pendingLabel="Sending…">Email me a reset link</SubmitButton>
      </form>
      <Link href="/admin/login" className="mt-6 inline-block text-sm font-semibold hover:underline">
        ← Back to sign in
      </Link>
    </AuthShell>
  );
}
