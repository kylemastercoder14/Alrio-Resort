import Image from "next/image";
import {
  BadgeCheck,
  BedDouble,
  ClipboardCheck,
  CreditCard,
  Heart,
  Headphones,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  LandingSearchBar,
  type LandingLocation,
} from "@/app/_components/landing-search-bar";
import { LeafletResortMap } from "@/app/_components/leaflet-resort-map";
import { prisma } from "@/lib/prisma";
import { getPublicListings } from "@/lib/public-listings";

const differencePoints = [
  {
    title: "Verified resort inventory",
    description:
      "Rooms, packages, amenities, and add-on services come from tenant workspaces, so guests see offers the resort actually manages.",
    icon: BadgeCheck,
  },
  {
    title: "Support before check-in",
    description:
      "Guests can coordinate arrivals, pax changes, requests, and service questions with the resort team before they arrive.",
    icon: Headphones,
  },
  {
    title: "Built for Philippine stays",
    description:
      "Local destinations, group travel, day tours, family rooms, corporate outings, and PHP pricing are part of the search model.",
    icon: CreditCard,
  },
  {
    title: "Direct owner publishing",
    description:
      "Resort owners control what gets published, from room capacity and package inclusions to amenities and seasonal service rates.",
    icon: ClipboardCheck,
  },
  {
    title: "Clean operations behind every booking",
    description:
      "Published offers connect naturally to reservations, housekeeping, maintenance, invoices, staff coordination, and guest records.",
    icon: ShieldCheck,
  },
  {
    title: "One platform, every stay type",
    description:
      "Overnight rooms, day passes, venue rentals, food bundles, pool access, spa services, and activities can live in one storefront.",
    icon: BedDouble,
  },
];

const resortStats = [
  { value: "420+", label: "publishable room and package slots" },
  { value: "68", label: "sample resort services and amenities" },
  { value: "24/7", label: "guest request visibility" },
  { value: "1", label: "tenant workspace per resort brand" },
];

export const dynamic = "force-dynamic";

const roomImageFallback =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85";

async function getResortLocations(): Promise<LandingLocation[]> {
  const resorts = await prisma.tenantProfile.findMany({
    where: {
      OR: [
        { resortName: { not: null } },
        { businessName: { not: null } },
        { municipality: { not: null } },
        { province: { not: null } },
        { fullAddress: { not: null } },
      ],
    },
    select: {
      id: true,
      resortName: true,
      businessName: true,
      barangay: true,
      municipality: true,
      province: true,
      fullAddress: true,
      _count: {
        select: {
          rooms: true,
          services: true,
          amenities: true,
        },
      },
    },
    orderBy: [{ municipality: "asc" }, { resortName: "asc" }],
    take: 24,
  });

  return resorts.map((resort) => {
    const area = [resort.barangay, resort.municipality, resort.province]
      .filter(Boolean)
      .join(", ");
    const offerCount =
      resort._count.rooms + resort._count.services + resort._count.amenities;
    const offerLabel =
      offerCount > 0
        ? `${offerCount} rooms, services, and amenities`
        : "Published resort profile";

    return {
      id: resort.id,
      title:
        resort.resortName ??
        resort.businessName ??
        resort.municipality ??
        resort.province ??
        "Resort location",
      subtitle: area
        ? `${area} - ${offerLabel}`
        : (resort.fullAddress ?? offerLabel),
    };
  });
}

export default async function Home() {
  const resortLocations = await getResortLocations();
  const listings = await getPublicListings({});

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="relative z-30 border-b border-zinc-200 bg-zinc-950 text-white">
        <Image
          src="https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=2200&q=85"
          alt="Resort suite overlooking a tropical pool"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/65 via-black/45 to-black/70" />

        <div className="relative flex min-h-[620px] w-full flex-col px-4 pb-10 pt-24 sm:px-6 md:min-h-140 md:pb-12 md:pt-28 lg:px-20">
          <div className="flex flex-1 items-center">
            <div className="w-full max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                <Sparkles className="size-4 text-amber-400" />
                Resorts, rooms, amenities, and services in one search
              </div>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl">
                Find your next resort stay
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
                Choose the destination, dates, and pax count. Resort owners
                publish live packages, available rooms, amenities, and guest
                services.
              </p>

              <LandingSearchBar locations={resortLocations} />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 lg:px-20">
        <div className="flex items-end justify-between gap-5">
          <div><p className="text-sm font-semibold text-sky-700">Live inventory</p><h2 className="mt-2 text-3xl font-semibold">Rooms published by resort partners</h2></div>
          <a href="/search" className="font-semibold text-sky-700">View all stays</a>
        </div>
        {listings.length ? <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {listings.slice(0, 6).map((listing) => <a key={listing.id} href={`/resorts/${listing.id}`} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
              <Image
                src={listing.image ?? roomImageFallback}
                alt={`${listing.title} at ${listing.resortName}`}
                fill
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur">Guest favorite</span>
              <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur" aria-label={`Save ${listing.title}`}><Heart className="size-5" /></span>
            </div>
            <div className="pt-3">
              <p className="line-clamp-1 text-sm text-zinc-500">{listing.resortName} · {listing.location}</p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-950">{listing.title}</h3>
              <p className="mt-2 text-base font-semibold text-zinc-950">{listing.priceLabel} <span className="font-normal text-zinc-500">per night</span></p>
            </div>
          </a>)}
        </div> : <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-zinc-600">No resort rooms have been published yet.</div>}

        <div className="mt-12 grid gap-8 rounded-3xl bg-zinc-100 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold text-sky-700">Explore locations</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Find a resort near your next getaway</h2>
            <p className="mt-4 text-zinc-600">This map shows the Philippines while live room locations become available. Search a destination to see rooms published by resort partners.</p>
          </div>
          <div className="relative isolate z-0 min-h-90 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <LeafletResortMap points={[]} />
          </div>
        </div>
      </section>

      <section className="bg-black py-16 text-white lg:px-20 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase text-sky-300/80">
              The ResortCloud difference
            </p>
            <h2 className="mt-8 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              The standard of a resort.
              <span className="mt-4 block font-serif text-2xl italic text-amber-300">
                The reach of a booking platform.
              </span>
            </h2>
            <p className="mt-8 text-base font-light text-slate-300">
              ResortCloud is not just a public catalog. It is the guest-facing
              layer of a multi-tenant resort operations system, built so every
              published stay is backed by actual rooms, teams, services, and
              workflows.
            </p>

            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="relative aspect-4/3">
                <Image
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85"
                  alt="Resort room prepared for incoming guests"
                  fill
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {differencePoints.map((point) => {
              const Icon = point.icon;
              return (
                <article
                  key={point.title}
                  className="border-t border-white/10 pt-6"
                >
                  <div className="mb-6 grid size-12 place-items-center rounded-xl border border-amber-200/20 bg-white/10 text-amber-300">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-base text-slate-300">
                    {point.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-7xl gap-3 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {resortStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/6 p-5">
              <p className="text-3xl font-semibold text-amber-200">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
