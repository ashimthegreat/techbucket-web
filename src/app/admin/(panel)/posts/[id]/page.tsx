import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Flash, ImageField, PageHeader, SelectField, SeoFields, TextArea, TextField, markdownHint } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deletePost, savePost } from "../../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; type?: string }> };

function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  // Render in Nepal time for the datetime-local input.
  const npt = new Date(new Date(d).getTime() + (5 * 60 + 45) * 60 * 1000);
  return npt.toISOString().slice(0, 16);
}

export default async function EditPost({ params, searchParams }: Props) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const [row] = isNew ? [null] : await db.select().from(schema.posts).where(eq(schema.posts.id, Number(id)));
  if (!isNew && !row) notFound();
  const type = row?.type ?? (sp.type === "case_study" ? "case_study" : "insight");
  const liveHref = row && row.status === "published" ? `/${row.type === "case_study" ? "case-studies" : "insights"}/${row.slug}` : null;

  return (
    <>
      <PageHeader title={isNew ? "New post" : row!.title} back={{ href: "/admin/posts", label: "Insights & case studies" }} />
      <Flash saved={sp.saved} error={sp.error} />
      {liveHref && (
        <p className="mb-6 text-sm">
          Live at <Link href={liveHref} target="_blank" className="font-semibold text-accent-ink hover:underline">{liveHref} ↗</Link>
        </p>
      )}
      <form action={savePost} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <input type="hidden" name="id" value={id} />
        <div className="space-y-6">
          <Card>
            <div className="space-y-5">
              <TextField name="title" label="Title" defaultValue={row?.title} required />
              <TextArea name="excerpt" label="Excerpt" defaultValue={row?.excerpt} rows={3} hint="One or two sentences shown on cards and in Google." />
              <TextArea name="body" label="Content" defaultValue={row?.body} rows={24} hint={markdownHint} mono />
            </div>
          </Card>
          <SeoFields title={row?.seoTitle} description={row?.seoDescription} />
        </div>
        <div className="space-y-6">
          <Card title="Publishing">
            <div className="space-y-4">
              <SelectField name="status" label="Status" defaultValue={row?.status ?? "draft"} options={[{ value: "draft", label: "Draft (hidden)" }, { value: "published", label: "Published" }]} />
              <SelectField name="type" label="Type" defaultValue={type} options={[{ value: "insight", label: "Insight / article" }, { value: "case_study", label: "Case study" }]} />
              <TextField name="publishedAt" label="Publish date" type="datetime-local" defaultValue={toLocalInput(row?.publishedAt)} hint="blank = now" />
              <TextField name="slug" label="URL slug" defaultValue={row?.slug} hint="auto from title" />
              <SubmitButton className="w-full" />
            </div>
          </Card>
          <Card title="Details">
            <div className="space-y-4">
              <TextField name="category" label="Category" defaultValue={row?.category} hint="e.g. Cybersecurity" />
              <TextField name="clientName" label="Client (case studies)" defaultValue={row?.clientName} />
            </div>
          </Card>
          <Card title="Cover">
            <div className="space-y-4">
              <ImageField name="coverUrl" label="Cover image" current={row?.coverUrl} />
              <TextField name="coverHeadline" label="Or a typographic cover" defaultValue={row?.coverHeadline} hint="2–4 words, e.g. Secure every ward." />
            </div>
          </Card>
        </div>
      </form>
      {!isNew && (
        <form action={deletePost} className="mt-8">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="Delete this post permanently?">Delete post</ConfirmSubmit>
        </form>
      )}
    </>
  );
}
