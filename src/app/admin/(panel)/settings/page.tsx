import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Flash, PageHeader, TextArea, TextField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { saveSettings } from "../../actions";

export const metadata = { title: "Site settings" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function SettingsAdmin({ searchParams }: Props) {
  await requireUser("admin");
  const sp = await searchParams;
  const [s] = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1));
  const socials = s.socials ?? {};
  return (
    <>
      <PageHeader title="Site settings" description="Company details, homepage hero, about text and default SEO." />
      <Flash saved={sp.saved} error={sp.error} />
      <form action={saveSettings} className="space-y-6">
        <Card title="Homepage hero">
          <div className="grid gap-5">
            <TextField name="heroEyebrow" label="Eyebrow line" defaultValue={s.heroEyebrow} />
            <TextField name="heroTitle" label="Headline" defaultValue={s.heroTitle} required hint="An orange full stop is added automatically." />
            <TextArea name="heroSubtitle" label="Subtitle" defaultValue={s.heroSubtitle} rows={3} />
          </div>
        </Card>
        <Card title="About">
          <div className="grid gap-5">
            <TextArea name="aboutStatement" label="Statement (dark text)" defaultValue={s.aboutStatement} rows={2} />
            <TextArea name="aboutStatementMuted" label="Statement continued (grey text)" defaultValue={s.aboutStatementMuted} rows={3} />
            <TextArea name="aboutBody" label="About page body" defaultValue={s.aboutBody} rows={6} hint="Separate paragraphs with a blank line." />
            <div className="grid gap-5 md:grid-cols-2">
              <TextArea name="mission" label="Mission" defaultValue={s.mission} rows={4} />
              <TextArea name="vision" label="Vision" defaultValue={s.vision} rows={4} />
            </div>
            <TextArea name="values" label="Values" defaultValue={s.values.join("\n")} rows={3} hint="One per line" />
          </div>
        </Card>
        <Card title="Company & contact">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField name="companyName" label="Company name" defaultValue={s.companyName} required />
            <TextField name="tagline" label="Tagline" defaultValue={s.tagline} />
            <TextField name="address" label="Address" defaultValue={s.address} />
            <TextField name="addressLocality" label="City" defaultValue={s.addressLocality} />
            <TextField name="addressRegion" label="Province" defaultValue={s.addressRegion} />
            <TextField name="foundedYear" label="Founded (year)" type="number" defaultValue={s.foundedYear} />
            <TextField name="phonePrimary" label="Primary phone" defaultValue={s.phonePrimary} required />
            <TextField name="phoneSecondary" label="Second phone" defaultValue={s.phoneSecondary} />
            <TextField name="email" label="Public email" type="email" defaultValue={s.email} required />
            <TextField name="leadNotifyEmail" label="Send new enquiries to" type="email" defaultValue={s.leadNotifyEmail} hint="needs SMTP in .env" />
            <TextField name="vatNumber" label="VAT / PAN number" defaultValue={s.vatNumber} />
          </div>
        </Card>
        <Card title="Social profiles">
          <div className="grid gap-5 md:grid-cols-2">
            {(["linkedin", "facebook", "x", "youtube", "instagram"] as const).map((k) => (
              <TextField key={k} name={`social_${k}`} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} type="url" defaultValue={socials[k]} placeholder="https://" />
            ))}
          </div>
        </Card>
        <Card title="Default SEO">
          <div className="grid gap-5">
            <TextField name="defaultSeoTitle" label="Homepage title" defaultValue={s.defaultSeoTitle} hint="~60 characters" />
            <TextArea name="defaultSeoDescription" label="Homepage description" defaultValue={s.defaultSeoDescription} rows={3} hint="~155 characters" />
          </div>
        </Card>
        <div className="sticky bottom-0 -mx-5 border-t border-hair bg-white/95 px-5 py-4 sm:-mx-8 sm:px-8">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>
    </>
  );
}
