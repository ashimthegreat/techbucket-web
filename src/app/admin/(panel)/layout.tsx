import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/client";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Tech Bucket" },
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [[newLeads], [newApps]] = await Promise.all([
    db.select({ n: count() }).from(schema.leads).where(eq(schema.leads.status, "new")),
    db.select({ n: count() }).from(schema.applications).where(eq(schema.applications.status, "new")),
  ]);

  const groups = [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/leads", label: "Enquiries", badge: newLeads.n },
        { href: "/admin/applications", label: "Applications", badge: newApps.n },
      ],
    },
    {
      title: "Content",
      items: [
        { href: "/admin/homepage", label: "Homepage" },
        { href: "/admin/posts", label: "Insights & case studies" },
        { href: "/admin/services", label: "Services" },
        { href: "/admin/industries", label: "Industries" },
        { href: "/admin/clients", label: "Clients" },
        { href: "/admin/partners", label: "Technology partners" },
        { href: "/admin/jobs", label: "Jobs" },
        { href: "/admin/media", label: "Media library" },
      ],
    },
    {
      title: "System",
      items: [
        ...(user.role === "admin"
          ? [
              { href: "/admin/settings", label: "Site settings" },
              { href: "/admin/users", label: "Users" },
            ]
          : []),
        { href: "/admin/account", label: "My account" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-mist lg:flex">
      <AdminNav groups={groups} user={user} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-end gap-5 border-b border-hair bg-white px-5 py-3 text-sm sm:px-8">
          <Link href="/" target="_blank" className="font-medium text-subtle hover:text-ink">
            View site ↗
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="min-h-9 font-semibold hover:text-accent-ink">Sign out</button>
          </form>
        </div>
        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10">{children}</div>
      </div>
    </div>
  );
}
