import type { Metadata } from "next";
import { Dot, PageHero } from "@/components/site/sections";
import { getSettings } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "Terms of use", description: "Terms of use for the Tech Bucket website.", path: "/terms" });
}

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero crumbs={[{ href: "/", label: "Home" }, { label: "Terms" }]} title={<>Terms of use<Dot /></>} />
      <section className="bg-white">
        <div className="container-site py-20">
          <div className="prose-tb">
            <p><strong>[Have these terms reviewed by your legal adviser before publishing.]</strong></p>
            <h2>About this website</h2>
            <p>This website is operated by {s.companyName}, {s.address}, Nepal. By using it you agree to these terms.</p>
            <h2>Information on this site</h2>
            <p>Content is provided for general information. It is not a quotation or a contractual offer; services are provided under separate written agreements.</p>
            <h2>Trademarks</h2>
            <p>Brand and client names are the property of their respective owners and are shown to describe products we supply or organisations we have worked with.</p>
            <h2>Contact</h2>
            <p>Questions about these terms: <a href={`mailto:${s.email}`}>{s.email}</a>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
