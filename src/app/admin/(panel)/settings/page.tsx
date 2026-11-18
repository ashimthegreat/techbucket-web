import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Badge, Card, Checkbox, Flash, PageHeader, TextArea, TextField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { saveEmailSettings, saveSettings, sendTestEmail } from "../../actions";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Site settings" };
type Props = { searchParams: Promise<{ saved?: string; error?: string; mailed?: string }> };

export default async function SettingsAdmin({ searchParams }: Props) {
  const me = await requireUser("admin");
  const sp = await searchParams;
  const [[s], emails] = await Promise.all([
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)),
    db.select().from(schema.emailLog).orderBy(desc(schema.emailLog.createdAt)).limit(12),
  ]);
  const envMail = !s.smtpHost && !!process.env.SMTP_HOST;
  const socials = s.socials ?? {};
  return (
    <>
      <PageHeader title="Site settings" description="Company details, homepage hero, about text and default SEO." />
      <Flash saved={sp.saved} error={sp.error} />
      {sp.mailed && (
        <p role="status" className="mb-6 border-l-[3px] border-emerald-600 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Test email sent to {sp.mailed}. Check that inbox (and spam).
        </p>
      )}
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
            {(
              [
                ["google", "Google Business Profile"],
                ["linkedin", "LinkedIn"],
                ["facebook", "Facebook"],
                ["youtube", "YouTube"],
                ["instagram", "Instagram"],
                ["x", "X (Twitter)"],
                ["tiktok", "TikTok"],
              ] as const
            ).map(([k, label]) => (
              <TextField key={k} name={`social_${k}`} label={label} type="url" defaultValue={socials[k]} placeholder="https://" />
            ))}
          </div>
        </Card>
        <Card title="Default SEO">
          <div className="grid gap-5">
            <TextField name="defaultSeoTitle" label="Homepage title" defaultValue={s.defaultSeoTitle} hint="~60 characters" />
            <TextArea name="defaultSeoDescription" label="Homepage description" defaultValue={s.defaultSeoDescription} rows={3} hint="~155 characters" />
          </div>
        </Card>
        <Card title="Search engines & AI search">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              name="googleVerification"
              label="Google Search Console code"
              defaultValue={s.googleVerification}
              hint="paste the HTML tag or just the code"
            />
            <TextField
              name="bingVerification"
              label="Bing Webmaster Tools code"
              defaultValue={s.bingVerification}
              hint="paste the HTML tag or just the code"
            />
            <TextField name="latitude" label="Office latitude" defaultValue={s.latitude} placeholder="27.7339" hint="from Google Maps" />
            <TextField name="longitude" label="Office longitude" defaultValue={s.longitude} placeholder="85.3002" />
            <TextField
              name="openingHours"
              label="Opening hours"
              defaultValue={s.openingHours}
              placeholder="Su-Fr 09:30-17:30"
              hint="days Su Mo Tu We Th Fr Sa; separate groups with a comma"
            />
            <TextField name="mapUrl" label="Google Maps link" type="url" defaultValue={s.mapUrl} placeholder="https://maps.app.goo.gl/…" />
          </div>
          <div className="mt-5">
            <Checkbox
              name="allowAiTraining"
              label="Let AI companies learn about Tech Bucket from this site (GPTBot, ClaudeBot, Google-Extended…)"
              defaultChecked={s.allowAiTraining}
              hint="AI search engines (ChatGPT search, Claude, Perplexity, Copilot, Google AI Overviews) can always read and cite the site; this only controls collection for training AI models."
            />
          </div>
        </Card>
        <div className="sticky bottom-0 -mx-5 border-t border-hair bg-white/95 px-5 py-4 sm:-mx-8 sm:px-8">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>

      <section id="mail" className="mt-10 scroll-mt-8 space-y-6">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em]">Email</h2>
        <p className="max-w-2xl text-[15px] text-muted">
          Used for enquiry and application alerts, the automatic “we received your message” reply, password resets, invites,
          replies to enquiries from the admin and the weekly site health report.
        </p>
        <form action={saveEmailSettings}>
          <Card title="Outgoing mail server (SMTP)">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                name="smtpHost"
                label="SMTP server"
                defaultValue={s.smtpHost}
                placeholder="smtppro.zoho.com"
                hint="Zoho: Settings → Mail Accounts → SMTP shows yours (.com, .in or .eu)"
              />
              <TextField name="smtpPort" label="Port" type="number" defaultValue={s.smtpPort ?? 465} hint="465 (SSL) or 587 (TLS)" />
              <TextField name="smtpUser" label="Username (mailbox)" type="email" defaultValue={s.smtpUser} placeholder="admin@techbucket.com.np" />
              <div>
                <TextField
                  name="smtpPass"
                  label="Password"
                  type="password"
                  placeholder={s.smtpPassEnc ? "•••••••• saved; leave blank to keep" : ""}
                  hint="use a Zoho app password"
                />
                {s.smtpPassEnc && <Checkbox name="smtpClear" label="Remove the saved password" />}
              </div>
              <TextField
                name="smtpFromAddress"
                label="Send from"
                type="email"
                defaultValue={s.smtpFromAddress}
                placeholder={s.smtpUser || "noreply@techbucket.com.np"}
                hint="e.g. noreply@ group; blank = the username"
              />
              <TextField name="smtpFromName" label="Sender name" defaultValue={s.smtpFromName} placeholder={s.companyName} hint="shown as the From name" />
            </div>
            <div className="mt-5">
              <Checkbox
                name="autoReply"
                label="Send visitors an automatic “we received your enquiry/application” email"
                defaultChecked={s.autoReply}
              />
            </div>
            {envMail && (
              <p className="mt-4 text-sm text-subtle">
                Currently using the SMTP settings from the server&apos;s .env file. Settings saved here take priority.
              </p>
            )}
            <div className="mt-6">
              <SubmitButton>Save email settings</SubmitButton>
            </div>
          </Card>
        </form>

        <form action={sendTestEmail}>
          <Card title="Send a test email">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <TextField name="to" label="Send to" type="email" defaultValue={me.email} className="sm:flex-1" />
              <SubmitButton pendingLabel="Sending…">Send test</SubmitButton>
            </div>
          </Card>
        </form>

        <Card title="Recent emails">
          {emails.length === 0 ? (
            <p className="text-[15px] text-muted">Nothing sent yet.</p>
          ) : (
            <ul className="divide-y divide-hair">
              {emails.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{e.subject}</span>
                    <span className="block truncate text-sm text-muted">
                      to {e.to} · {e.kind.replace(/_/g, " ")}
                    </span>
                    {e.error && <span className="block text-sm break-words text-red-700">{e.error}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <Badge value={e.status === "sent" ? "published" : e.status === "failed" ? "new" : "draft"} label={e.status} />
                    <span className="text-xs text-subtle">{formatDateTime(e.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
