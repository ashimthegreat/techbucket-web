import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <AuthShell title="Sign in to admin" lede="Manage website content, enquiries and applications.">
      <LoginForm />
      <Link href="/admin/forgot" className="mt-6 inline-block text-sm font-semibold text-subtle hover:text-ink hover:underline">
        Forgot your password?
      </Link>
    </AuthShell>
  );
}
