"use client";

import Image from "next/image";
import Link from "next/link";
import { KeyRound, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const menuLinks = [
  { label: "Stays", href: "#stays" },
  { label: "Davao guide", href: "#guide" },
  { label: "About", href: "#about" },
  { label: "Guest support", href: "#support" },
  { label: "Journal", href: "#journal" },
];

export function LandingMenu({ dark = false }: { dark?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className={[
            "grid size-11 place-items-center rounded-full border",
            dark
              ? "border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100"
              : "border-white/25 bg-white/10 text-white hover:bg-white/20",
          ].join(" ")}
        >
          <Menu className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="left-0 top-0 h-dvh max-h-dvh w-screen max-w-full! translate-x-0 translate-y-0 rounded-none border-0 bg-[#faf9f7] p-0 text-zinc-950"
      >
        <DialogTitle className="sr-only">ResortCloud menu</DialogTitle>
        <div className="flex h-full flex-col">
          <header className="flex h-22 items-center justify-between border-b border-zinc-200 px-6">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/main/logo-light.png"
                alt="ResortCloud logo"
                width={34}
                height={34}
                className="size-9 object-contain"
              />
            </Link>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close menu"
                className="grid size-11 place-items-center rounded-full text-zinc-950 hover:bg-zinc-100"
              >
                <X className="size-7" />
              </button>
            </DialogClose>
          </header>

          <div className="flex flex-1 flex-col px-6 py-10">
            <Button
              asChild
              variant="link"
              className="h-auto w-fit justify-start gap-3 p-0 text-2xl font-normal text-sky-900 hover:no-underline"
            >
              <Link href="/auth/sign-up">
                <KeyRound className="size-5 text-amber-500" />
                List your property
              </Link>
            </Button>

            <nav className="mt-10 flex flex-col gap-9 text-2xl font-light text-zinc-800">
              {menuLinks.map((link) => (
                <Link key={link.label} href={link.href} className="w-fit hover:text-sky-900">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <footer className="border-t border-zinc-200 px-6 py-7">
            <Button
              asChild
              className="h-17 w-full rounded-full bg-sky-900 text-base font-semibold text-white hover:bg-sky-950"
            >
              <Link href="/auth/sign-in">Sign in or create account</Link>
            </Button>
            <p className="mt-5 text-center text-sm font-medium text-sky-900">
              Join ResortCloud Circle - member rates + points
            </p>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
