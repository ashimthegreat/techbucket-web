import type { Metadata } from "next";
import { Dot, PageHero } from "@/components/site/sections";
import { getSettings } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Privacy policy", description: "How Tech Bucket collects, uses and protects personal information.", path: "/privacy" });
}

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero crumbs={[{ href: "/", label: "Home" }, { label: "Privacy" }]} title={<>Privacy policy<Dot /></>} />
      <section className="bg-white">
        <div className="container-site py-20">
          <div className="prose-tb">
            <p><strong>[Have this policy reviewed by your legal adviser before publishing.]</strong></p>
            <h2>What we collect</h2>
            <p>When you submit an enquiry or job application, we collect the details you provide: your name, organisation, email address, phone number, message and, for applications, your CV.</p>
            <h2>How we use it</h2>
            <p>We use this information only to respond to your enquiry, assess your application, and provide the services you ask for. We do not sell or share your information with third parties for marketing.</p>
            <h2>How long we keep it</h2>
            <p>Enquiries are kept for as long as needed to serve you. Applications are kept for up to 12 months unless you ask us to delete them sooner.</p>
            <h2>Security</h2>
            <p>Information is stored on secured servers with access limited to authorised staff.</p>
            <h2>Your choices</h2>
            <p>To see, correct or delete your information, email <a href={`mailto:${s.email}`}>{s.email}</a>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
