/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccountAvatar } from "@/components/resort/resort-header";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { LandingMenu } from "@/app/_components/landing-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import toast from "react-hot-toast";
import { IconBell, IconCalendarCheck, IconHelpCircle, IconLogout, IconMenu, IconSettings, IconUserCircle } from "@tabler/icons-react";

const navLinks = [
  { label: "Gallery", href: "/#gallery" },
  { label: "Amenities", href: "/#amenities" },
  { label: "Events", href: "/#events" },
  { label: "Experiences", href: "/#experiences" },
  { label: "Contact US", href: "/#contact" },
];

export function LandingHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const trpc = useTRPC();
  const session = useQuery(trpc.auth.session.queryOptions());
  const user = session.data?.user ?? null;
  const isLandingPage = pathname === "/";
  const [hasPassedHero, setHasPassedHero] = useState(false);
  const useSolidHeader = !isLandingPage || hasPassedHero;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty(
        "--landing-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--landing-header-height");
    };
  }, []);

  useEffect(() => {
    if (!isLandingPage) {
      setHasPassedHero(false);
      return;
    }

    const updateHeaderStyle = () => setHasPassedHero(window.scrollY > 0);

    updateHeaderStyle();
    window.addEventListener("scroll", updateHeaderStyle, { passive: true });
    window.addEventListener("resize", updateHeaderStyle);

    return () => {
      window.removeEventListener("scroll", updateHeaderStyle);
      window.removeEventListener("resize", updateHeaderStyle);
    };
  }, [isLandingPage]);

  return (
    <header
      ref={headerRef}
      className={[
        "fixed inset-x-0 top-0 z-1200 px-4 py-4 transition-colors duration-300 lg:px-20",
        useSolidHeader
          ? "bg-white text-zinc-950 shadow-sm"
          : "text-white",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-lg font-normal tracking-tightest sm:text-xl"
        >
          <Image
            src="/favicon.png"
            alt="Alrio Private Resort logo"
            width={44}
            height={44}
            className="size-10 shrink-0 object-contain sm:size-11"
            priority
          />
          <span className="hidden w-20 2xl:block" />
        </Link>

        <nav
          className={[
            "hidden items-center gap-6 whitespace-nowrap uppercase text-sm xl:flex",
            useSolidHeader ? "text-zinc-600" : "text-white/80",
          ].join(" ")}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                useSolidHeader ? "hover:text-zinc-950" : "hover:text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div>
              <AccountAvatar
                appearance={useSolidHeader ? "landing-light" : "landing-overlay"}
                initialUser={user}
              />
            </div>
          ) : (
            <Button asChild variant="secondary" className="hidden rounded-full px-5 sm:inline-flex">
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          )}
          {user ? (
            <GuestMenu />
          ) : (
            <>
              <Button
                asChild
                variant="default"
                className="rounded-full px-3 text-xs sm:px-5 sm:text-sm"
              >
                <Link href="/#reserve">Reserve Now</Link>
              </Button>
              <div className="xl:hidden"><LandingMenu dark={useSolidHeader} /></div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function GuestMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useMutation({
    retry: false,
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? "Unable to log out.");
    },
    onSuccess: () => {
      queryClient.clear();
      toast.success("You’ve been logged out.");
      router.replace("/");
      router.refresh();
    },
    onError: (error) => { toast.error(error.message); },
  });

  const itemClass = "cursor-pointer gap-3 rounded-lg px-3 py-2 text-base";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open guest menu"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          <IconMenu className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={10}
        className="z-1300 w-70 rounded-2xl"
      >

        <DropdownMenuItem asChild className={`${itemClass} font-medium`}>
          <Link href="/account"><IconUserCircle className="size-5" />Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={`${itemClass} font-medium`}>
          <Link href="/account"><IconCalendarCheck className="size-5" />Booking history</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className={`${itemClass} font-medium`}>
          <Link href="/notifications"><IconBell className="size-5" />Notifications</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/account"><IconSettings className="size-5" />Account settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/#contact"><IconHelpCircle className="size-5" />Help center</Link>
        </DropdownMenuItem>
        <div className="xl:hidden">
          <DropdownMenuSeparator />
          {navLinks.filter((link) => link.href !== "/#contact").map((link) => (
            <DropdownMenuItem key={link.href} asChild className={itemClass}>
              <Link href={link.href}>{link.label}</Link>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={itemClass}
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault();
            if (!logout.isPending) logout.mutate();
          }}
        >
          <IconLogout className="size-5" />{logout.isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
