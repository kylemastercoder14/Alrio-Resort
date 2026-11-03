import Image from "next/image";
import Link from "next/link";

import { getPublicListings, parseDate } from "@/lib/public-listings";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const result = params[key];
  return Array.isArray(result) ? result[0] : result;
}

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const where = value(params, "where") ?? "";
  const checkIn = parseDate(value(params, "checkIn") ?? value(params, "when"));
  const checkOut = parseDate(value(params, "checkOut"));
  const guests = Math.max(1, Number(value(params, "guests")) || 1);
  const listings = await getPublicListings({ where, checkIn, checkOut, guests });
  const query = new URLSearchParams();
  if (checkIn) query.set("checkIn", checkIn.toISOString().slice(0, 10));
  if (checkOut) query.set("checkOut", checkOut.toISOString().slice(0, 10));
  query.set("guests", String(guests));

  return (
    <main className="min-h-screen bg-white px-4 pb-16 pt-28 text-zinc-950 lg:px-20">
      <p className="text-sm font-semibold text-sky-700">Live ResortCloud inventory</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {listings.length} available stay{listings.length === 1 ? "" : "s"}{where ? ` in ${where}` : ""}
      </h1>
      <p className="mt-2 text-zinc-600">Results reflect active rooms and, when dates are provided, existing reservations.</p>

      {listings.length ? (
        <section className="mt-9 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/resorts/${listing.id}?${query.toString()}`} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg">
              <div className="relative aspect-[4/3] bg-zinc-100">
                {listing.image ? <Image src={listing.image} alt={listing.title} fill sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition group-hover:scale-105" /> : null}
              </div>
              <div className="p-5">
                <p className="text-sm text-zinc-500">{listing.resortName} · {listing.location}</p>
                <h2 className="mt-1 text-xl font-semibold">{listing.title}</h2>
                <p className="mt-2 min-h-10 text-sm text-zinc-600">{listing.description ?? `${listing.maxGuests} guests · Direct booking`}</p>
                <p className="mt-4 text-lg font-semibold">{listing.priceLabel} <span className="text-sm font-normal text-zinc-500">per night</span></p>
              </div>
            </Link>
          ))}
        </section>
      ) : <div className="mt-9 rounded-2xl border border-dashed border-zinc-300 p-10 text-zinc-600">No active rooms match this search. Try another destination, date range, or guest count.</div>}
    </main>
  );
}
