"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { label: "Gallery", href: "/#gallery" },
  { label: "Amenities", href: "/#amenities" },
  { label: "Activities & experiences", href: "/#experiences" },
  { label: "Guest stories", href: "/#testimonials" },
  { label: "Contact us", href: "/#contact" },
];

export function LandingMenu({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={`grid size-10 shrink-0 place-items-center rounded-full border ${dark ? "border-zinc-300 text-zinc-950 hover:bg-zinc-100" : "border-white/25 text-white hover:bg-white/10"}`}
        >
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        className="z-1300 gap-0 overflow-y-auto bg-[#fafaf8] text-zinc-900"
        aria-describedby={undefined}
      >
        <div className="border-b border-zinc-200 px-6 pb-5 pt-8">
          <Image src="/favicon.png" alt="" width={40} height={40} />
          <SheetTitle className="mt-4 font-serif text-2xl">
            Explore Alrio
          </SheetTitle>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="flex flex-col gap-1 px-3 py-5"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-sm hover:bg-accent"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/auth/sign-in"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-lg border-t border-zinc-200 px-3 py-4 text-sm"
          >
            Sign in
          </Link>
        </nav>
        <Link
          href="/#reserve"
          onClick={() => setOpen(false)}
          className="mx-6 mb-6 mt-auto rounded-full bg-zinc-900 px-5 py-3 text-center text-sm text-white"
        >
          Reserve your stay
        </Link>
      </SheetContent>
    </Sheet>
  );
}
