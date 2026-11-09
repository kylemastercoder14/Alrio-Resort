"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Heart,
  ShowerHead,
  Sparkles,
  Star,
  Tv,
  Waves,
  Wifi,
} from "lucide-react";
import { useState } from "react";

import { LeafletResortMap } from "@/app/_components/leaflet-resort-map";

export const resortCards = [
  {
    title: "Azure Tide Beach Resort",
    location: "Nasugbu · Batangas",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=85",
    rating: "4.96",
    reviews: "38",
    stay: "Family villa · Pool access · Breakfast",
    capacity: "2 rooms · 2 baths · 8 guests",
    price: "₱8,450",
    date: "from Aug 28",
    lat: 14.0731,
    lng: 120.6319,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Mango Cove Garden Rooms",
    location: "San Juan · La Union",
    image:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=85",
    rating: "4.91",
    reviews: "24",
    stay: "Deluxe room · Garden view · Breakfast",
    capacity: "1 room · 1 bath · 4 guests",
    price: "₱5,900",
    date: "from Aug 31",
    lat: 16.6681,
    lng: 120.4042,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "Taal Ridge Lake Suites",
    location: "Tagaytay · Cavite",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85",
    rating: "4.88",
    reviews: "19",
    stay: "Lake suite · Spa credit · Dinner",
    capacity: "1 suite · 1 bath · 5 guests",
    price: "₱6,750",
    date: "from Sep 2",
    lat: 14.1153,
    lng: 120.9622,
    amenities: [Wifi, ShowerHead, ChefHat, Sparkles],
  },
  {
    title: "Coral Bay Day Tour",
    location: "Panglao · Bohol",
    image:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=900&q=85",
    rating: "4.94",
    reviews: "41",
    stay: "Day pass · Cabana · Pool access",
    capacity: "Cabana · 1 bath · 6 guests",
    price: "₱2,400",
    date: "from Sep 12",
    lat: 9.5784,
    lng: 123.7458,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Palm Grove Private Resort",
    location: "Dasmarinas · Cavite",
    image:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=900&q=85",
    rating: "4.97",
    reviews: "30",
    stay: "Private pool · Karaoke · Grill area",
    capacity: "3 rooms · 3 baths · 15 guests",
    price: "₱12,900",
    date: "from Sep 18",
    lat: 14.3294,
    lng: 120.9367,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "Seabreeze Family Resort",
    location: "Lian · Batangas",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=85",
    rating: "4.89",
    reviews: "17",
    stay: "Beachfront room · Bonfire · Breakfast",
    capacity: "2 rooms · 2 baths · 7 guests",
    price: "₱7,300",
    date: "from Sep 21",
    lat: 14.0392,
    lng: 120.6509,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Balay Kawayan Hot Spring Resort",
    location: "Calamba · Laguna",
    image:
      "https://images.unsplash.com/photo-1609949279531-cf48d64bed89?auto=format&fit=crop&w=900&q=85",
    rating: "4.86",
    reviews: "22",
    stay: "Hot spring pool · Family kitchen · Pavilion",
    capacity: "4 rooms · 4 baths · 18 guests",
    price: "₱15,200",
    date: "from Sep 23",
    lat: 14.1877,
    lng: 121.1251,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Maragondon River Resort",
    location: "Maragondon · Cavite",
    image:
      "https://images.unsplash.com/photo-1519449556851-5720b33024e7?auto=format&fit=crop&w=900&q=85",
    rating: "4.82",
    reviews: "15",
    stay: "River deck · Picnic huts · Pool pass",
    capacity: "2 rooms · 2 baths · 10 guests",
    price: "₱6,250",
    date: "from Sep 25",
    lat: 14.2738,
    lng: 120.7368,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Silang Garden Pool Villas",
    location: "Silang · Cavite",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
    rating: "4.93",
    reviews: "27",
    stay: "Garden villa · Heated pool · Event lawn",
    capacity: "3 rooms · 3 baths · 12 guests",
    price: "₱10,500",
    date: "from Sep 26",
    lat: 14.2157,
    lng: 120.9714,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "Amadeo Farm Stay Resort",
    location: "Amadeo · Cavite",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
    rating: "4.9",
    reviews: "18",
    stay: "Farm rooms · Breakfast tray · Bonfire",
    capacity: "2 rooms · 2 baths · 8 guests",
    price: "₱5,800",
    date: "from Sep 28",
    lat: 14.1694,
    lng: 120.9237,
    amenities: [Wifi, ShowerHead, ChefHat, Sparkles],
  },
  {
    title: "Laiya White Sand Cabins",
    location: "San Juan · Batangas",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
    rating: "4.87",
    reviews: "36",
    stay: "Beach cabin · Breakfast · Kayak rental",
    capacity: "1 cabin · 1 bath · 5 guests",
    price: "₱7,900",
    date: "from Oct 1",
    lat: 13.6796,
    lng: 121.3911,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Anilao Dive Lodge",
    location: "Mabini · Batangas",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=85",
    rating: "4.95",
    reviews: "44",
    stay: "Dive package · Gear wash · Sea view",
    capacity: "1 room · 1 bath · 3 guests",
    price: "₱8,200",
    date: "from Oct 3",
    lat: 13.7597,
    lng: 120.9267,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Puerto Galera Cove Resort",
    location: "Puerto Galera · Oriental Mindoro",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=85",
    rating: "4.84",
    reviews: "31",
    stay: "Cove room · Snorkeling · Sunset deck",
    capacity: "1 room · 1 bath · 4 guests",
    price: "₱6,400",
    date: "from Oct 5",
    lat: 13.5003,
    lng: 120.9544,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Subic Bay Family Suites",
    location: "Subic · Zambales",
    image:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=85",
    rating: "4.8",
    reviews: "29",
    stay: "Family suite · Breakfast · Pool access",
    capacity: "2 rooms · 1 bath · 6 guests",
    price: "₱6,950",
    date: "from Oct 7",
    lat: 14.8799,
    lng: 120.2343,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "Baler Surf House Resort",
    location: "Baler · Aurora",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85",
    rating: "4.92",
    reviews: "33",
    stay: "Surf room · Board rental · Breakfast",
    capacity: "1 room · 1 bath · 4 guests",
    price: "₱4,900",
    date: "from Oct 9",
    lat: 15.7589,
    lng: 121.5623,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Baguio Pineview Retreat",
    location: "Baguio · Benguet",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85",
    rating: "4.79",
    reviews: "21",
    stay: "Pine view room · Fireplace · Breakfast",
    capacity: "2 rooms · 1 bath · 5 guests",
    price: "₱5,450",
    date: "from Oct 10",
    lat: 16.4023,
    lng: 120.596,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "El Nido Lagoon Cottages",
    location: "El Nido · Palawan",
    image:
      "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=900&q=85",
    rating: "4.98",
    reviews: "52",
    stay: "Lagoon cottage · Island tour · Breakfast",
    capacity: "1 cottage · 1 bath · 3 guests",
    price: "₱11,800",
    date: "from Oct 12",
    lat: 11.2027,
    lng: 119.4166,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Coron Bayview Resort",
    location: "Coron · Palawan",
    image:
      "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=85",
    rating: "4.96",
    reviews: "48",
    stay: "Bayview room · Breakfast · Dock shuttle",
    capacity: "1 room · 1 bath · 4 guests",
    price: "₱9,700",
    date: "from Oct 14",
    lat: 12.0049,
    lng: 120.2043,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Boracay Station Pool Resort",
    location: "Boracay · Aklan",
    image:
      "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=900&q=85",
    rating: "4.9",
    reviews: "63",
    stay: "Pool room · Breakfast · Beach shuttle",
    capacity: "1 room · 1 bath · 4 guests",
    price: "₱8,850",
    date: "from Oct 16",
    lat: 11.9674,
    lng: 121.9248,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Cebu Mactan Seaside Resort",
    location: "Lapu-Lapu · Cebu",
    image:
      "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=900&q=85",
    rating: "4.85",
    reviews: "40",
    stay: "Seaside suite · Breakfast · Pool pass",
    capacity: "1 suite · 1 bath · 4 guests",
    price: "₱7,650",
    date: "from Oct 18",
    lat: 10.3075,
    lng: 123.9794,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Davao Highland Resort",
    location: "Davao City · Davao del Sur",
    image:
      "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=900&q=85",
    rating: "4.83",
    reviews: "26",
    stay: "Mountain room · Pool access · Breakfast",
    capacity: "2 rooms · 2 baths · 6 guests",
    price: "₱6,100",
    date: "from Oct 20",
    lat: 7.1907,
    lng: 125.4553,
    amenities: [Wifi, ShowerHead, ChefHat, Sparkles],
  },
  {
    title: "Siargao Surf Villas",
    location: "General Luna · Siargao",
    image:
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=900&q=85",
    rating: "4.99",
    reviews: "58",
    stay: "Surf villa · Board rack · Breakfast",
    capacity: "1 villa · 1 bath · 4 guests",
    price: "₱10,400",
    date: "from Oct 22",
    lat: 9.7847,
    lng: 126.1589,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
];

export function getResortSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ResortMarketplaceSection({
  resortCount,
}: {
  resortCount: number;
}) {
  const [view, setView] = useState<"grid" | "map">("grid");
  const isMap = view === "map";

  return (
    <section className="border-b border-zinc-200 bg-white">
      <div className="lg:px-20 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">
              Published by resort owners
            </p>
            <h2 className="mt-2 text-3xl font-light tracking-tight text-zinc-950 sm:text-4xl">
              Explore resorts
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-600">
              {resortCount || 34} resort locations
            </p>
            <div className="flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`rounded-full px-5 py-2 text-sm font-semibold ${
                  view === "grid"
                    ? "bg-sky-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={`rounded-full px-5 py-2 text-sm font-semibold ${
                  view === "map"
                    ? "bg-sky-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        <div
          className={
            isMap
              ? "mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_550px]"
              : "mt-10"
          }
        >
          <div
            className={`grid gap-x-5 gap-y-9 sm:grid-cols-2 ${
              isMap ? "xl:grid-cols-3" : "lg:grid-cols-4 xl:grid-cols-5"
            }`}
          >
            {resortCards.map((resort) => (
              <ResortCard key={resort.title} resort={resort} />
            ))}
          </div>

          {isMap ? <ResortMap /> : null}
        </div>
      </div>
    </section>
  );
}

function ResortCard({ resort }: { resort: (typeof resortCards)[number] }) {
  const router = useRouter();
  const href = `/resorts/${getResortSlug(resort.title)}`;

  return (
    <article
      className="group cursor-pointer"
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
        <Image
          src={resort.image}
          alt={resort.title}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          aria-label={`Save ${resort.title}`}
          onClick={(event) => event.stopPropagation()}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur"
        >
          <Heart className="size-5" />
        </button>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1">
          <span className="h-1.5 w-6 rounded-full bg-white" />
          {[1, 2, 3, 4, 5].map((dot) => (
            <span key={dot} className="size-1.5 rounded-full bg-white/65" />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <p className="text-sm leading-5 text-zinc-500">{resort.location}</p>
        <p className="flex shrink-0 items-center gap-1 text-sm">
          <Star className="size-3.5 fill-amber-300 text-amber-300" />
          <span className="font-semibold">{resort.rating}</span>
          <span className="text-zinc-500">({resort.reviews})</span>
        </p>
      </div>

      <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-semibold">
        {resort.title} · {resort.stay}
      </h3>
      <p className="mt-1 text-xs text-zinc-500">{resort.capacity}</p>

      <div className="mt-3 flex items-center gap-3 text-zinc-500">
        {resort.amenities.map((Icon, index) => (
          <Icon key={index} className="size-4" />
        ))}
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        <span className="text-xl font-semibold text-zinc-950">
          {resort.price}
        </span>{" "}
        total · 1 night
      </p>
      <p className="mt-1 text-xs text-zinc-400">{resort.date}</p>
    </article>
  );
}

function ResortMap() {
  const mapSlots = [
    [14.0731, 120.6319],
    [14.0392, 120.6509],
    [14.1153, 120.9622],
    [14.3294, 120.9367],
    [14.2738, 120.7368],
    [14.2157, 120.9714],
    [14.1694, 120.9237],
    [14.1877, 121.012],
    [14.2408, 120.888],
    [14.3075, 120.842],
    [14.3892, 120.912],
    [14.4268, 120.965],
    [14.0184, 120.701],
    [13.9562, 120.724],
    [14.0925, 120.784],
    [14.1428, 120.831],
    [14.2624, 120.999],
    [14.3501, 121.045],
    [14.0623, 120.91],
    [13.9157, 120.645],
    [14.4612, 120.823],
    [14.5024, 120.948],
  ] as const;

  const points = resortCards.map((resort, index) => ({
    title: resort.title,
    price: resort.price,
    lat: mapSlots[index]?.[0] ?? resort.lat,
    lng: mapSlots[index]?.[1] ?? resort.lng,
  }));

  return (
    <aside className="sticky top-5 hidden h-195 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm lg:block">
      <LeafletResortMap points={points} />
    </aside>
  );
}
