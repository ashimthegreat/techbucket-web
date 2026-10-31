import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Card, Empty, Flash, PageHeader } from "@/components/admin/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/client";
import { deleteMedia, uploadMedia } from "../../actions";

export const metadata = { title: "Media library" };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function MediaAdmin({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const rows = await db.select().from(schema.media).orderBy(desc(schema.media.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Media library" description="Upload images, then copy the link into an article using Markdown: ![description](/media/…)" />
      <Flash saved={sp.saved} error={sp.error} />
      <Card className="mb-6" title="Upload images">
        <form action={uploadMedia} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="files" className="mb-1.5 block text-sm font-semibold">Images (up to 10, max 5 MB each)</label>
            <input id="files" name="files" type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="block w-full text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-2 file:font-semibold file:text-white" />
          </div>
          <div className="flex-1">
            <label htmlFor="alt" className="mb-1.5 block text-sm font-semibold">Description (alt text)</label>
            <input id="alt" name="alt" className="w-full border border-line px-3 py-2.5 text-[15px]" />
          </div>
          <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
        </form>
      </Card>
      {rows.length === 0 ? (
        <Empty>No images uploaded yet.</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-col border border-hair bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt} className="aspect-[4/3] w-full bg-mist object-contain p-2" loading="lazy" />
              <div className="flex flex-1 flex-col gap-2 p-3 text-xs">
                <span className="truncate font-semibold" title={m.originalName}>{m.originalName}</span>
                <input readOnly value={m.url} aria-label="Image URL" className="w-full border border-hair bg-mist px-2 py-1.5 font-mono" />
                <span className="text-subtle">{Math.round(m.size / 1024)} KB</span>
                <form action={deleteMedia} className="mt-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmSubmit message="Delete this image? Pages using it will show a broken image.">Delete</ConfirmSubmit>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
