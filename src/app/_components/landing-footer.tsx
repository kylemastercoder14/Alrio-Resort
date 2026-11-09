import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Phone, CalendarDays } from "lucide-react";
import { LandingSearchBar } from "@/app/_components/landing-search-bar";
import { getQueryClient, trpc } from "@/trpc/server";

const footerColumns = [
  {
    title: "Gatherings",
    links: [
      { label: "Family getaways", href: "/#experiences" },
      { label: "Birthday celebrations", href: "/#experiences" },
      { label: "Reunions with friends", href: "/#experiences" },
      { label: "Overnight escapes", href: "/#explore" },
    ],
  },
  {
    title: "Quick Links",
    links: [
      { label: "Gallery", href: "/gallery" },
      { label: "Amenities", href: "/#amenities" },
      { label: "Activities", href: "/#experiences" },
    ],
  },
];

export async function LandingFooter() {
  const contact = await getQueryClient().fetchQuery(
    trpc.public.contact.queryOptions(),
  );
  const phone = contact?.phoneNumber?.trim();
  const address = contact?.fullAddress?.trim();

  return (
    <footer className="relative isolate flex min-h-[calc(100svh-var(--landing-header-height,5rem))] flex-col bg-zinc-800 px-4 pb-8 pt-10 text-[#cfc193] sm:px-6 lg:px-14 lg:pt-14">
      <div
        className="pointer-events-none absolute inset-0 z-10 hidden overflow-hidden rounded-b-3xl lg:block"
      >
        <div className="absolute -bottom-16 -left-20 size-[min(40vw,36rem)]">
        <svg
          aria-hidden="true"
          viewBox="0 0 500 500"
          className="absolute inset-0 size-full text-[#c8be8f]/35"
          fill="none"
        >
          <circle
            cx="250"
            cy="250"
            r="226"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="250"
            cy="250"
            r="155"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle
            cx="250"
            cy="250"
            r="143"
            stroke="currentColor"
            strokeWidth="2"
          />
          {Array.from({ length: 40 }, (_, index) => (
            <line
              key={index}
              x1="250"
              y1="92"
              x2="250"
              y2={index % 5 === 0 ? "5" : "30"}
              transform={`rotate(${index * 9} 250 250)`}
              stroke="currentColor"
              strokeWidth={index % 5 === 0 ? 4 : 2}
            />
          ))}
        </svg>
      <Link
        href="/"
        aria-label="Alrio Private Resort home"
        className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-8"
      >
        <Image
          src="/favicon.png"
          alt=""
          width={120}
          height={120}
          className="size-40 object-contain"
        />
      </Link>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-360 flex-1 flex-col justify-between">
        <section
          id="footer-reserve"
          aria-labelledby="footer-reserve-heading"
          className="relative isolate z-1100 scroll-mt-28 rounded-2xl border border-[#cdb98d]/65 bg-slate-950 px-5 py-20 sm:px-9"
        >
          <Image
            src="/hero.jpg"
            alt=""
            fill
            className="-z-20 rounded-2xl object-cover opacity-65"
          />
          <div className="absolute inset-0 -z-10 rounded-2xl bg-black/45" />
          <div className="text-center">
            <h2
              id="footer-reserve-heading"
              className="text-3xl font-normal leading-tight tracking-tight text-[#f4eddf] lg:text-4xl"
            >
              Extraordinary family experiences start here.
            </h2>
            <p className="mt-2 text-lg text-white/80">
              Discover unforgettable moments together.
            </p>
          </div>
          <LandingSearchBar placement="top" />
        </section>

        <div className="relative grid gap-10 pb-12 pt-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_.8fr_1fr] lg:gap-12 lg:pb-10 lg:pt-14">
          <div className="flex items-center justify-center py-4 lg:min-h-52 lg:justify-start lg:py-0">
            <Link href="/" aria-label="Alrio Private Resort home" className="lg:hidden">
              <Image src="/favicon.png" alt="" width={120} height={120} className="size-30 object-contain" />
            </Link>
          </div>
          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-base font-medium">{column.title}</h2>
              <ul className="mt-5 space-y-4">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[#cfc193]/75 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <section
            id="footer-contact"
            aria-label="Contact us"
            className="scroll-mt-28 space-y-5"
          >
            <h2 className="sr-only">Contact us</h2>
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="flex items-start gap-3 text-xs hover:text-white"
              >
                <Phone className="mt-1 size-4 shrink-0" aria-hidden="true" />
                {phone}
              </a>
            ) : (
              <Link
                href="#footer-reserve"
                className="flex items-center gap-3 text-xs hover:text-white"
              >
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                Reservation enquiries{" "}
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            )}
            {address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-xs hover:text-white"
              >
                <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
                {address}
              </a>
            ) : (
              <Link
                href="/gallery"
                className="flex items-center gap-3 text-xs leading-6 hover:text-white"
              >
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                Explore Alrio Private Resort
              </Link>
            )}
            <Link
              href="#footer-reserve"
              className="inline-flex items-center gap-3 text-xs hover:text-white"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              Plan your visit
            </Link>
          </section>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr_.8fr_1fr] lg:gap-12">
          <div className="hidden lg:block" />
          <div className="grid items-start gap-4 border-t border-[#cfc193]/15 pt-5 text-xs uppercase tracking-tight text-[#cfc193]/70 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-subgrid lg:gap-x-12">
            <p>© {new Date().getFullYear()} Alrio Private Resort</p>
            <Link href="#contact" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="#footer-reserve" className="hover:text-white">
              terms & conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
