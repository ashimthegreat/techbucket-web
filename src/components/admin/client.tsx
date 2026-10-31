"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function SubmitButton({ children = "Save", pendingLabel = "Saving…", className }: { children?: React.ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("inline-flex min-h-11 items-center justify-center bg-ink px-6 text-sm font-semibold text-white hover:bg-charcoal disabled:opacity-60", className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ConfirmSubmit({ children = "Delete", message = "Delete this permanently?" }: { children?: React.ReactNode; message?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className="inline-flex min-h-11 items-center justify-center border border-accent-ink px-5 text-sm font-semibold text-accent-ink hover:bg-accent-wash disabled:opacity-60"
    >
      {pending ? "Working…" : children}
    </button>
  );
}

type NavItem = { href: string; label: string; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

export function AdminNav({ groups, user }: { groups: NavGroup[]; user: { name: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-7">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7f8b92]">{g.title}</p>
          <ul>
            {g.items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-10 items-center justify-between px-3 text-[14px] font-medium transition-colors",
                    isActive(i.href) ? "bg-white/10 text-white" : "text-[#c3cbd0] hover:bg-white/5 hover:text-white",
                  )}
                >
                  {i.label}
                  {!!i.badge && <span className="bg-accent px-1.5 text-xs font-bold text-ink">{i.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 text-white lg:hidden">
        <Link href="/admin" className="font-display text-lg font-semibold">
          Tech Bucket <span className="text-accent">Admin</span>
        </Link>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center">
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
      {open && <div className="fixed inset-0 top-14 z-30 overflow-y-auto bg-ink p-4 pb-20 lg:hidden">{nav}</div>}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-ink px-3 py-6 text-white lg:flex">
        <Link href="/admin" className="mb-8 block px-3">
          <Image src="/logo-light.png" alt="Tech Bucket" width={658} height={255} className="h-10 w-auto" />
          <span className="mt-1 block text-xs font-semibold tracking-[0.14em] text-accent uppercase">Admin</span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-white/10 px-3 pt-5 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-[#9aa5ab] capitalize">{user.role}</p>
        </div>
      </aside>
    </>
  );
}
