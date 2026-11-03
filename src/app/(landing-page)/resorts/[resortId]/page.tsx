import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AirVent,
  Car,
  ChefHat,
  ChevronDown,
  Flag,
  Heart,
  KeyRound,
  Medal,
  Share,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  UsersRound,
  Waves,
  Wifi,
} from "lucide-react";

import { LeafletResortMap } from "@/app/_components/leaflet-resort-map";
import { ResortCheckoutSheet } from "@/app/_components/resort-checkout-sheet";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/public-listings";

export const dynamic = "force-dynamic";

const fallbackImages = [
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=85",
];

type DetailListing = {
  title: string;
  subtitle: string;
  location: string;
  description: string;
  images: string[];
  price: string;
  rating: string;
  reviews: string;
  guests: number;
  bedrooms: string;
  baths: string;
  host: string;
  ownerName: string;
  roomId: string;
  tenantProfileId?: string;
  lat: number;
  lng: number;
  amenities: string[];
};

async function getListing(resortId: string): Promise<DetailListing | null> {
  const dbRoom = await prisma.tenantRoom.findUnique({
    where: { id: resortId },
    include: {
      tenantProfile: {
        include: {
          appUser: {
            select: {
              displayName: true,
            },
          },
        },
      },
      amenities: true,
      photos: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (dbRoom) {
    const resortName =
      dbRoom.tenantProfile.resortName ??
      dbRoom.tenantProfile.businessName ??
      "ResortCloud partner resort";
    const location = [
      dbRoom.tenantProfile.municipality,
      dbRoom.tenantProfile.province,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      title: `${dbRoom.name} at ${resortName}`,
      roomId: dbRoom.id,
      subtitle: `${dbRoom.type} in ${location || "Philippines"}`,
      location: location || dbRoom.tenantProfile.fullAddress || "Philippines",
      description:
        dbRoom.guestNote ??
        dbRoom.tenantProfile.shortDescription ??
        "Published directly by the resort owner through ResortCloud. Guests can choose dates, pax count, rooms, amenities, and services while the resort team manages reservations, payments, housekeeping, and guest requests behind the scenes.",
      images:
        dbRoom.photos.length > 0
          ? dbRoom.photos.map((photo) => photo.url)
          : [
              "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
              ...fallbackImages,
            ],
      price: `PHP ${dbRoom.baseRate}`,
      rating: "4.92",
      reviews: "38",
      guests: dbRoom.maxAdults + dbRoom.childrenOccupancy || 4,
      bedrooms: dbRoom.bedConfiguration,
      baths: "1 bath",
      host: resortName,
      ownerName: dbRoom.tenantProfile.appUser.displayName,
      tenantProfileId: dbRoom.tenantProfile.id,
      lat: 14.1153,
      lng: 120.9622,
      amenities: dbRoom.amenities.map((amenity) => amenity.name).slice(0, 8),
    };
  }

  return null;
}

function formatStayDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function ResortDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ resortId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { resortId } = await params;
  const query = await searchParams;
  const listing = await getListing(resortId);

  if (!listing) notFound();

  const photos = [listing.images[0], ...listing.images.slice(1, 5)];
  const defaultCheckIn = new Date();
  defaultCheckIn.setUTCDate(defaultCheckIn.getUTCDate() + 1);
  const defaultCheckOut = new Date(defaultCheckIn);
  defaultCheckOut.setUTCDate(defaultCheckOut.getUTCDate() + 1);
  const checkIn = parseDate(typeof query.checkIn === "string" ? query.checkIn : undefined) ?? defaultCheckIn;
  const checkOut = parseDate(typeof query.checkOut === "string" ? query.checkOut : undefined) ?? defaultCheckOut;
  const guests = Math.max(1, Number(typeof query.guests === "string" ? query.guests : listing.guests) || listing.guests);
  const cancellationDeadline = new Date(checkIn);
  cancellationDeadline.setUTCDate(cancellationDeadline.getUTCDate() - 1);

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="h-24" aria-hidden="true" />

      <section className="py-8 lg:px-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              ResortCloud stay
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {listing.title}
            </h1>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            <button className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-zinc-100">
              <Share className="size-4" />
              Share
            </button>
            <button className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-zinc-100">
              <Heart className="size-4" />
              Save
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-2 overflow-hidden rounded-2xl lg:grid-cols-2">
          <div className="relative min-h-90 overflow-hidden bg-zinc-100">
            <Image
              src={photos[0]}
              alt={listing.title}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {photos.slice(1, 5).map((photo, index) => (
              <div
                key={photo}
                className="relative min-h-44 overflow-hidden bg-zinc-100"
              >
                <Image
                  src={photo}
                  alt={`${listing.title} photo ${index + 2}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover"
                />
                {index === 3 ? (
                  <Button className="absolute bottom-4 right-4 rounded-xl bg-white text-zinc-950 shadow-lg hover:bg-zinc-100">
                    Show all photos
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-12 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-20">
        <div>
          <div className="border-b border-zinc-200 pb-8">
            <h2 className="text-2xl font-semibold">{listing.subtitle}</h2>
            <p className="mt-2 text-lg text-zinc-700">
              {listing.guests} guests - {listing.bedrooms} - {listing.baths}
            </p>
            <span className="mt-4 inline-flex rounded-md bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
              Free cancellation
            </span>
          </div>

          <div className="my-8 grid items-center gap-5 rounded-2xl border border-zinc-200 p-6 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-4">
              <Medal className="size-9" />
              <div>
                <p className="text-xl font-semibold">Guest favorite</p>
                <p className="text-sm text-zinc-600">
                  One of the most loved resort stays on ResortCloud.
                </p>
              </div>
            </div>
            <div className="border-zinc-200 sm:border-l sm:pl-6">
              <p className="text-2xl font-semibold">{listing.rating}</p>
              <p className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="size-3 fill-zinc-950" />
                ))}
              </p>
            </div>
            <div className="border-zinc-200 sm:border-l sm:pl-6">
              <p className="text-2xl font-semibold">{listing.reviews}</p>
              <p className="text-sm text-zinc-600">Reviews</p>
            </div>
          </div>

          <div className="flex gap-4 border-b border-zinc-200 pb-8">
            <div className="relative size-12 overflow-hidden rounded-full bg-zinc-100">
              <Image
                src={listing.images[0]}
                alt={listing.host}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-lg font-semibold">Hosted by {listing.host}</p>
              <p className="text-zinc-600">
                Resort owner - verified tenant workspace
              </p>
            </div>
          </div>

          <div className="space-y-7 border-b border-zinc-200 py-8">
            {[
              {
                icon: UsersRound,
                title: "Built for group stays",
                text: "Pax count, room capacity, and add-on services are visible before booking.",
              },
              {
                icon: Waves,
                title: "Resort amenities included",
                text: "Pool, dining, parking, room service, and guest requests can be managed by the resort team.",
              },
              {
                icon: KeyRound,
                title: "Smooth check-in",
                text: "Reservation details, payments, and staff notes stay attached to the booking record.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-5">
                  <Icon className="mt-1 size-6" />
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-zinc-600">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-b border-zinc-200 py-8">
            <p className="max-w-3xl whitespace-pre-line text-lg leading-8 text-zinc-800">
              {listing.description}
            </p>
          </div>

          <div className="border-b border-zinc-200 py-8">
            <h2 className="text-2xl font-semibold">What this resort offers</h2>
            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              {listing.amenities.map((amenity, index) => {
                const icons = [
                  Wifi,
                  Waves,
                  Car,
                  AirVent,
                  ChefHat,
                  Sparkles,
                  ShieldCheck,
                  Tv,
                ];
                const Icon = icons[index % icons.length];
                return (
                  <div key={amenity} className="flex items-center gap-4">
                    <Icon className="size-6" />
                    <span className="text-lg">{amenity}</span>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" className="mt-8 rounded-xl px-6">
              Show all amenities
            </Button>
          </div>

          <div className="py-10 text-center">
            <div className="flex items-center justify-center gap-6">
              <Sparkles className="size-12 text-zinc-800" />
              <p className="text-7xl font-semibold tracking-tight">
                {listing.rating}
              </p>
              <Sparkles className="size-12 text-zinc-800" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">Guest favorite</h2>
            <p className="mx-auto mt-2 max-w-md text-zinc-600">
              This stay is a guest favorite based on ratings, reviews, and
              direct resort reliability.
            </p>
          </div>

          <div className="grid gap-8 border-t border-zinc-200 py-10 md:grid-cols-2">
            {[
              {
                name: "Marl",
                text: "Great stay. Staff were responsive, rooms were clean, and pool access was easy for the whole family.",
              },
              {
                name: "Corie",
                text: "Smooth booking and check-in. The resort had everything listed, and the view was better than expected.",
              },
            ].map((review) => (
              <article key={review.name}>
                <p className="font-semibold">{review.name}</p>
                <p className="mt-2 text-sm">★★★★★ - recent stay</p>
                <p className="mt-3 leading-7 text-zinc-700">{review.text}</p>
              </article>
            ))}
          </div>

          <div className="border-t border-zinc-200 py-10">
            <h2 className="text-2xl font-semibold">Where you will be</h2>
            <p className="mt-4 text-lg text-zinc-700">{listing.location}</p>
            <div className="relative mt-7 h-105 overflow-hidden rounded-2xl border border-zinc-200">
              <LeafletResortMap
                points={[
                  {
                    title: listing.title,
                    price: listing.price,
                    lat: listing.lat,
                    lng: listing.lng,
                  },
                ]}
              />
            </div>
            <p className="mt-5 text-zinc-700">
              Exact location will be provided after booking confirmation.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-zinc-200">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-sky-50 p-2 text-sky-600">
                <ShieldCheck className="size-5" />
              </span>
              <p className="font-semibold">Prices include all fees</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200">
            <p className="text-lg">
              <span className="text-3xl font-semibold underline">
                {listing.price}
              </span>{" "}
              for 1 night
            </p>

            <div className="mt-7 overflow-hidden rounded-xl border border-zinc-400">
              <div className="grid grid-cols-2 divide-x divide-zinc-400">
                <div className="p-4">
                  <p className="text-xs font-bold">CHECK-IN</p>
                  <p>{formatStayDate(checkIn)}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold">CHECKOUT</p>
                  <p>{formatStayDate(checkOut)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-400 p-4">
                <div>
                  <p className="text-xs font-bold">GUESTS</p>
                  <p>{guests} {guests === 1 ? "guest" : "guests"}</p>
                </div>
                <ChevronDown className="size-5" />
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-zinc-100 px-4 py-3 text-center text-sm">
              Free cancellation before {formatStayDate(cancellationDeadline)}
            </div>

            <ResortCheckoutSheet
              title={listing.title}
              location={listing.location}
              price={listing.price}
              guests={guests}
              image={listing.images[0]}
              roomId={listing.roomId}
              checkIn={checkIn.toISOString().slice(0, 10)}
              checkOut={checkOut.toISOString().slice(0, 10)}
              tenantProfileId={listing.tenantProfileId}
              operatorName={listing.host}
              ownerName={listing.ownerName}
            />
            <p className="mt-4 text-center text-sm text-zinc-600">
              You will not be charged yet
            </p>
          </div>

          <Link
            href="#"
            className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-zinc-600 underline"
          >
            <Flag className="size-4" />
            Report this listing
          </Link>
        </aside>
      </section>
    </main>
  );
}
