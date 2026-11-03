"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LandingMenu } from "@/app/_components/landing-menu";
import { AccountDropdown } from "@/components/tenant/tenant-header";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Beachfront", href: "/#beachfront" },
  { label: "Rooms", href: "/#rooms" },
  { label: "Packages", href: "/#packages" },
  { label: "Amenities", href: "/#amenities" },
  { label: "Partners", href: "/partners" },
];

type LandingHeaderClientProps = {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

export function LandingHeaderClient({ user }: LandingHeaderClientProps) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  return (
    <header
      className={[
        "absolute inset-x-0 top-0 z-50 px-4 py-4 sm:px-6 sm:py-5 lg:px-20",
        isLandingPage
          ? "text-white"
          : "border-b border-zinc-200 bg-white text-zinc-950 shadow-xs",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight sm:text-xl">
          <Image src={isLandingPage ? "/main/logo-dark.png" : "/main/logo-light.png"} alt="ResortCloud logo" width={44} height={44} className="size-10 object-contain sm:size-11" priority />
          ResortCloud
        </Link>

        <nav className={["hidden items-center gap-8 text-sm font-medium lg:flex", isLandingPage ? "text-white/80" : "text-zinc-600"].join(" ")}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={isLandingPage ? "hover:text-white" : "hover:text-zinc-950"}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className={["hidden rounded-full px-4 shadow-none sm:inline-flex", isLandingPage ? "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" : "border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100 hover:text-zinc-950"].join(" ")}>
            <Link href="/partners">List your property</Link>
          </Button>
          {user ? (
            <div className="hidden sm:block">
              <AccountDropdown appearance={isLandingPage ? "landing-overlay" : "landing-light"} signOutRedirect="/" includeTenantLinks={false} initialUser={user} />
            </div>
          ) : (
            <Button asChild variant="outline" className={["hidden rounded-full px-4 shadow-none sm:inline-flex", isLandingPage ? "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" : "border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100 hover:text-zinc-950"].join(" ")}>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          )}
          <LandingMenu dark={!isLandingPage} />
        </div>
      </div>
    </header>
  );
}
