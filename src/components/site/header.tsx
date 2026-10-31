"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, CloseIcon, MenuIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };
type Props = {
  services: NavLink[];
  industries: NavLink[];
};

const primary: NavLink[] = [
  { href: "/insights", label: "Insights" },
  { href: "/case-studies", label: "Case studies" },
  { href: "/about", label: "About us" },
  { href: "/careers", label: "Careers" },
];

export function SiteHeader({ services, industries }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<"services" | "industries" | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on route change (adjust state during render, per React docs).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setMenu(null);
  }

  // Lock page scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close desktop dropdown on outside click / Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(null);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const dropdown = (key: "services" | "industries", label: string, items: NavLink[], allHref: string) => (
    <div className="relative">
      <button
        type="button"
        aria-expanded={menu === key}
        aria-controls={`menu-${key}`}
        onClick={() => setMenu(menu === key ? null : key)}
        className={cn(
          "flex min-h-11 items-center gap-1.5 text-[15px] font-medium transition-colors hover:text-accent-ink",
          isActive(allHref) && "text-accent-ink",
        )}
      >
        {label}
        <ChevronDown className={cn("transition-transform", menu === key && "rotate-180")} />
      </button>
      {menu === key && (
        <div
          id={`menu-${key}`}
          className="absolute top-full left-1/2 z-50 mt-3 w-[min(640px,90vw)] -translate-x-1/2 border-t-[3px] border-accent bg-white p-8 shadow-[0_24px_60px_rgba(10,14,17,0.16)]"
        >
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2.5 text-[15px] font-medium hover:text-accent-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={allHref} className="mt-6 inline-flex items-center gap-2 border-t border-hair pt-5 text-sm font-semibold text-accent-ink">
            View all {label.toLowerCase()} <ArrowRight />
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-white">
      <nav ref={navRef} aria-label="Main" className="container-site flex min-h-[72px] items-center justify-between gap-6 lg:min-h-20">
        <Link href="/" aria-label="Tech Bucket home" className="flex shrink-0 items-center py-3">
          <Image src="/logo.png" alt="Tech Bucket" width={658} height={255} priority className="h-10 w-auto lg:h-11" />
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
          {dropdown("services", "What we do", services, "/services")}
          {dropdown("industries", "Industries", industries, "/industries")}
          {primary.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex min-h-11 items-center text-[15px] font-medium transition-colors hover:text-accent-ink",
                isActive(l.href) && "text-accent-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center lg:flex">
          <Link href="/contact" className="flex min-h-11 items-center gap-2 text-[15px] font-semibold">
            Contact us <ArrowRight className="text-accent" />
          </Link>
        </div>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[73px] bottom-0 z-50 overflow-y-auto overscroll-contain bg-white lg:hidden">
          <div className="container-site pb-16">
            <MobileGroup title="What we do" items={services} allHref="/services" />
            <MobileGroup title="Industries" items={industries} allHref="/industries" />
            <ul className="border-b border-hair">
              {primary.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-14 items-center font-display text-2xl font-medium">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/contact" className="btn-accent mt-8 w-full justify-center">
              Contact us <ArrowRight />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileGroup({ title, items, allHref }: { title: string; items: NavLink[]; allHref: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-hair">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-16 w-full items-center justify-between font-display text-2xl font-medium"
      >
        {title}
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="pb-5">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex min-h-11 items-center text-base text-slate">
                {i.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={allHref} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-ink">
              View all <ArrowRight />
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
