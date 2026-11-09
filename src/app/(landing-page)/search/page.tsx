import Image from "next/image";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { parseDate } from "@/lib/public-listings";

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
  const checkIn = parseDate(value(params, "checkIn") ?? value(params, "when"));
  const checkOut = parseDate(value(params, "checkOut"));
  const guests = Math.max(1, Number(value(params, "guests")) || 1);
  const experience = value(params, "where") ?? "Exclusive resort stay";
  const resort = await prisma.resortProfile.findFirst({
    include: {
      rooms: {
        include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const conflict = resort && checkIn && checkOut
    ? await prisma.resortReservation.findFirst({
        where: {
          resortProfileId: resort.id,
          status: { notIn: ["CANCELED", "CHECKED_OUT"] },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
        select: { id: true },
      })
    : null;
  const available = !conflict;
  const image = resort?.rooms.flatMap((room) => room.photos)[0]?.url;

  return (
    <main className="min-h-screen bg-white px-4 pb-16 pt-28 text-zinc-950 lg:px-20">
      <p className="text-sm font-semibold text-[#AE7B0C]">Alrio Private Resort</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {available ? "Your private resort dates are available" : "Those dates are already reserved"}
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Alrio is booked as one exclusive private resort. Every guest room and
        published resort inclusion comes with the booking; rooms are never sold separately.
      </p>
      <section className="mt-9 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <div className="relative min-h-72 bg-zinc-100 lg:min-h-[460px]">
          {image ? <Image src={image} alt="Alrio Private Resort" fill sizes="65vw" className="object-cover" /> : null}
        </div>
        <div className="flex flex-col justify-center p-7 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#AE7B0C]">{experience}</p>
          <h2 className="mt-3 text-3xl font-semibold">Exclusive use of the whole resort</h2>
          <div className="mt-6 space-y-2 text-sm text-zinc-600">
            <p>Guests: {guests}</p>
            <p>Check-in: {checkIn ? checkIn.toLocaleDateString("en-PH") : "Choose a date"}</p>
            <p>Check-out: {checkOut ? checkOut.toLocaleDateString("en-PH") : "Choose a date"}</p>
          </div>
          <div className={`mt-6 rounded-xl p-4 text-sm font-semibold ${available ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {available ? "Available — continue with your reservation enquiry." : "Unavailable — please choose another date range."}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={available ? "/#contact" : "/#reserve"} className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white">
              {available ? "Request reservation" : "Choose other dates"}
            </Link>
            <Link href="/#amenities" className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold">View inclusions</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
