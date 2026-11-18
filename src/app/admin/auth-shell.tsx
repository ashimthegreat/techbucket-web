import Image from "next/image";
import { ArcMotif } from "@/components/icons";

/** Shared frame for the signed-out admin pages (sign in, forgot, reset). */
export function AuthShell({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep px-5 py-16">
      <ArcMotif className="pointer-events-none absolute -top-[300px] -right-[420px] h-[1000px] w-[1000px]" />
      <div className="relative w-full max-w-[420px] bg-white p-8 sm:p-10">
        <Image src="/logo.png" alt="Tech Bucket" width={658} height={255} className="mb-8 h-11 w-auto" priority />
        <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {lede && <p className="mt-2 mb-8 text-sm text-muted">{lede}</p>}
        {children}
      </div>
    </main>
  );
}

export const authInput = "w-full border border-line px-3 py-3 text-base focus:border-ink focus:outline-none";
export const authButton =
  "flex min-h-12 w-full items-center justify-center bg-ink font-semibold text-white hover:bg-charcoal disabled:opacity-60";
