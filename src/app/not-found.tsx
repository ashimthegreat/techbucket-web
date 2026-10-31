import Link from "next/link";
import Image from "next/image";
import { ArcMotif, ArrowRight } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-deep text-white">
      <ArcMotif className="pointer-events-none absolute -top-[300px] -right-[400px] h-[1000px] w-[1000px]" />
      <div className="container-site relative py-8">
        <Link href="/" className="inline-block">
          <Image src="/logo-light.png" alt="Tech Bucket" width={658} height={255} className="h-11 w-auto" />
        </Link>
      </div>
      <div className="container-site relative flex flex-1 flex-col justify-center py-20">
        <p className="eyebrow mb-6 text-accent-soft">Error 404</p>
        <h1 className="h-display max-w-[900px] text-[clamp(3rem,7vw,6.5rem)]">
          This page isn&apos;t in the bucket<span className="text-accent">.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg text-[#d9dee1]">The page may have moved or no longer exists.</p>
        <div className="mt-10 flex flex-wrap gap-6">
          <Link href="/" className="btn-accent">Back to home <ArrowRight /></Link>
          <Link href="/contact" className="link-underline self-center text-white">Contact us</Link>
        </div>
      </div>
    </main>
  );
}
