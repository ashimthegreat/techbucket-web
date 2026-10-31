import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { ArcMotif } from "@/components/icons";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep px-5 py-16">
      <ArcMotif className="pointer-events-none absolute -top-[300px] -right-[420px] h-[1000px] w-[1000px]" />
      <div className="relative w-full max-w-[420px] bg-white p-8 sm:p-10">
        <Image src="/logo.png" alt="Tech Bucket" width={658} height={255} className="mb-8 h-11 w-auto" priority />
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Sign in to admin</h1>
        <p className="mt-2 mb-8 text-sm text-muted">Manage website content, enquiries and applications.</p>
        <LoginForm />
      </div>
    </main>
  );
}
