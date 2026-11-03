"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { type DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const recentSearches = [
  {
    title: "Dasmarinas City",
    subtitle: "Dasmarinas City · Any dates · 3 guests",
  },
];

const fallbackRegions = [
  {
    id: "fallback-dasmarinas",
    title: "Dasmarinas City",
    subtitle: "34 published resort stays",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=120&q=80",
  },
  {
    id: "fallback-bajada",
    title: "Bajada / Abreeza",
    subtitle: "District in Dasmarinas City",
  },
  {
    id: "fallback-cabantian",
    title: "Cabantian",
    subtitle: "District in Dasmarinas City",
  },
  {
    id: "fallback-central-dasmarinas",
    title: "Central Dasmarinas",
    subtitle: "District in Dasmarinas City",
  },
  {
    id: "fallback-jp-laurel",
    title: "JP Laurel Avenue",
    subtitle: "District in Dasmarinas City",
  },
  {
    id: "fallback-samal",
    title: "Samal Island",
    subtitle: "Beach resorts and day tours",
  },
];

const guestGroups = [
  { key: "adults", label: "Adults", helper: "Ages 13 or above" },
  { key: "children", label: "Children", helper: "Ages 2-12" },
  { key: "infants", label: "Infants", helper: "Under 2" },
  { key: "pets", label: "Pets", helper: "Bringing a service animal?" },
] as const;

const flexibilityOptions = [
  { label: "Exact dates", value: 0 },
  { label: "± 1 day", value: 1 },
  { label: "± 2 days", value: 2 },
  { label: "± 3 days", value: 3 },
  { label: "± 7 days", value: 7 },
  { label: "± 14 days", value: 14 },
] as const;

const stayLengthOptions = ["Weekend", "Week", "Month"] as const;

type Panel = "where" | "when" | "who" | null;
type GuestKey = (typeof guestGroups)[number]["key"];
type WhenMode = "dates" | "flexible";
type StayLength = (typeof stayLengthOptions)[number] | null;

export type LandingLocation = {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
};

export function LandingSearchBar({
  locations,
}: {
  locations: LandingLocation[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [location, setLocation] = useState("");
  const [nearbyStatus, setNearbyStatus] = useState<
    "idle" | "loading" | "ready" | "denied" | "unsupported"
  >("idle");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2026, 7, 29),
    to: new Date(2026, 7, 30),
  });
  const [dateFlexibility, setDateFlexibility] = useState<number>(0);
  const [whenMode, setWhenMode] = useState<WhenMode>("dates");
  const [stayLength, setStayLength] = useState<StayLength>(null);
  const [flexibleMonth, setFlexibleMonth] = useState<string | null>(null);
  const [serviceAnimalOpen, setServiceAnimalOpen] = useState(false);
  const [guests, setGuests] = useState<Record<GuestKey, number>>({
    adults: 2,
    children: 0,
    infants: 0,
    pets: 0,
  });

  const guestLabel = useMemo(() => {
    const totalGuests = guests.adults + guests.children;
    const guestText = totalGuests === 1 ? "1 guest" : `${totalGuests} guests`;
    const extras = [
      guests.infants
        ? `${guests.infants} infant${guests.infants > 1 ? "s" : ""}`
        : "",
      guests.pets ? `${guests.pets} pet${guests.pets > 1 ? "s" : ""}` : "",
    ].filter(Boolean);

    return [guestText, ...extras].join(" · ");
  }, [guests]);

  const exactDateLabel = date?.from
    ? date.to
      ? `${format(date.from, "MMM d")} - ${format(date.to, "MMM d")}`
      : format(date.from, "MMM d")
    : "Add dates";

  const whenLabel =
    whenMode === "flexible"
      ? flexibleMonth
        ? [flexibleMonth, stayLength].filter(Boolean).join(" · ")
        : "Anytime"
      : exactDateLabel;

  const suggestedLocations = locations.length > 0 ? locations : fallbackRegions;
  const isPanelOpen = panel !== null;

  const handleSearch = () => {
    const params = new URLSearchParams({
      where: location || "Any destination",
      when: whenLabel,
      guests: guestLabel,
      adults: String(guests.adults),
      children: String(guests.children),
      infants: String(guests.infants),
      pets: String(guests.pets),
    });

    setPanel(null);
    router.push(`/search?${params.toString()}`);
  };

  // Upcoming months for the "Go anytime" grid, anchored to the trip's
  // reference month so it stays consistent with the rest of the mock data.
  const upcomingMonths = useMemo(() => {
    const anchor = date?.from ?? new Date(2026, 7, 26);
    return Array.from({ length: 12 }, (_, index) => {
      const month = new Date(
        anchor.getFullYear(),
        anchor.getMonth() + 1 + index,
        1,
      );
      return {
        key: format(month, "MMMM yyyy"),
        month: format(month, "MMMM"),
        year: format(month, "yyyy"),
      };
    });
  }, [date?.from]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setPanel(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const updateGuest = (key: GuestKey, direction: 1 | -1) => {
    setGuests((current) => ({
      ...current,
      [key]: Math.max(0, current[key] + direction),
    }));
  };

  const requestNearby = () => {
    if (!("geolocation" in navigator)) {
      setNearbyStatus("unsupported");
      return;
    }

    setNearbyStatus("loading");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation("Nearby resorts");
        setNearbyStatus("ready");
      },
      () => setNearbyStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 300000, timeout: 10000 },
    );
  };

  // Segment styling helper — active segment lifts off the pill like a
  // floating card (Airbnb-style), inactive segments stay flush and get a
  // subtle hover state.
  const segmentClass = (
    segment: Exclude<Panel, null>,
    withDivider: boolean,
  ) => {
    const active = panel === segment;
    return [
      "relative flex min-h-13 cursor-pointer items-center gap-3 rounded-xl px-4 text-left transition-all duration-200 md:min-h-16 md:rounded-full",
      active
        ? "z-10 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.15)] md:scale-[1.02]"
        : "hover:bg-zinc-100",
      withDivider && !active
        ? "border-t border-zinc-200 md:border-l md:border-t-0 md:rounded-l-none"
        : "",
    ].join(" ");
  };

  const pillClass = (active: boolean) =>
    [
      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "border-zinc-950 bg-zinc-950 text-white"
        : "border-zinc-300 text-zinc-700 hover:border-zinc-950",
    ].join(" ");

  return (
    <div ref={searchRef} className="relative z-50 mt-10">
      <div className="rounded-3xl border border-white/15 bg-white/95 p-2 text-zinc-950 shadow-2xl shadow-black/30 backdrop-blur md:rounded-full">
        <div className="grid gap-1 md:grid-cols-[1.2fr_1fr_.9fr_auto] md:items-center">
          <button
            type="button"
            onClick={() => setPanel(panel === "where" ? null : "where")}
            className={segmentClass("where", false)}
          >
            <MapPin className="size-5 shrink-0 text-sky-700" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold">Where</span>
              <span className="block truncate text-sm text-zinc-500">
                {location || "Search destinations"}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPanel(panel === "when" ? null : "when")}
            className={segmentClass("when", true)}
          >
            <CalendarDays className="size-5 shrink-0 text-sky-700" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold">When</span>
              <span className="block truncate text-sm text-zinc-500">
                {whenLabel}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPanel(panel === "who" ? null : "who")}
            className={segmentClass("who", true)}
          >
            <Users className="size-5 shrink-0 text-sky-700" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold">Who</span>
              <span className="block truncate text-sm text-zinc-500">
                {guestLabel}
              </span>
            </span>
          </button>

          <Button
            type="button"
            onClick={handleSearch}
            className={[
              "min-h-13 shrink-0 rounded-xl bg-sky-700 transition-all duration-200 hover:bg-sky-800 md:min-h-16 md:rounded-full",
              isPanelOpen ? "w-13 px-0 md:w-16" : "w-full px-8 text-sm",
            ].join(" ")}
          >
            <Search className="size-4" />
            {!isPanelOpen && "Search"}
          </Button>
        </div>
      </div>

      {panel === "where" ? (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200 absolute left-0 top-[calc(100%+12px)] z-[100] max-h-[min(70vh,42rem)] w-full max-w-130 overflow-y-auto rounded-[1.75rem] bg-white p-5 text-zinc-950 shadow-2xl shadow-black/25">
          <label className="flex h-14 items-center gap-3 rounded-full border-2 border-sky-700 px-4">
            <Search className="size-5 text-zinc-400" />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Search locations..."
              className="w-full bg-transparent text-lg outline-none tracking-tight placeholder:text-zinc-400"
              autoFocus
            />
          </label>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Recent searches
            </p>
            <div className="mt-4 space-y-3">
              {recentSearches.map((search) => (
                <LocationOption
                  key={search.title}
                  title={search.title}
                  subtitle={search.subtitle}
                  icon={<Clock3 className="size-5 text-zinc-500" />}
                  onClick={() => {
                    setLocation(search.title);
                    setPanel(null);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={requestNearby}
              className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 p-3 text-left transition-colors hover:border-sky-700 hover:bg-sky-50"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">
                {nearbyStatus === "loading" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <MapPin className="size-5" />
                )}
              </span>
              <span>
                <span className="block text-lg font-medium leading-6">
                  Use current location
                </span>
                <span className="block text-sm text-zinc-500">
                  {nearbyStatus === "ready"
                    ? "Location enabled · showing nearby resorts"
                    : nearbyStatus === "denied"
                      ? "Permission denied · choose a location instead"
                      : nearbyStatus === "unsupported"
                        ? "Browser location unavailable"
                        : "Allow location access to search nearby"}
                </span>
              </span>
            </button>
          </div>

          <div className="mt-7 max-h-80 overflow-y-auto pr-1">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Resort locations
            </p>
            <div className="mt-4 space-y-3">
              {suggestedLocations.map((region) => (
                <LocationOption
                  key={region.id ?? region.title}
                  title={region.title}
                  subtitle={region.subtitle}
                  image={region.image}
                  onClick={() => {
                    setLocation(region.title);
                    setPanel(null);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {panel === "when" ? (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200 absolute left-1/2 top-[calc(100%+12px)] z-[100] max-h-[min(70vh,42rem)] w-[min(850px,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-[1.75rem] bg-white p-5 text-zinc-950 shadow-2xl shadow-black/25 sm:p-6">
          <Tabs
            value={whenMode}
            onValueChange={(value) => setWhenMode(value as WhenMode)}
          >
            <div className="flex justify-center">
              <TabsList className="h-auto rounded-full bg-zinc-100 p-1">
                <TabsTrigger
                  value="dates"
                  className="rounded-full px-6 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Dates
                </TabsTrigger>
                <TabsTrigger
                  value="flexible"
                  className="rounded-full px-6 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Flexible
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dates" className="mt-5">
              <div className="overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  showOutsideDays={false}
                  disabled={{ before: new Date(2026, 7, 26) }}
                  className="mx-auto w-full max-w-195 [--cell-size:3rem]"
                  classNames={{
                    root: "w-full",
                    months:
                      "relative mx-auto w-fit gap-12 md:grid md:grid-cols-2",
                    month: "w-fit",
                    nav: "absolute inset-x-4 top-0 flex items-center justify-between",
                    button_previous:
                      "grid size-9 place-items-center rounded-full bg-white text-zinc-950 hover:bg-zinc-100 disabled:text-zinc-300",
                    button_next:
                      "grid size-9 place-items-center rounded-full bg-white text-zinc-950 hover:bg-zinc-100 disabled:text-zinc-300",
                    month_grid: "w-fit",
                    weekdays: "flex gap-1",
                    weekday:
                      "grid w-(--cell-size) flex-none place-items-center text-sm text-zinc-500",
                    week: "mt-2 flex",
                    day: "grid size-(--cell-size) flex-none place-items-center rounded-full p-0",
                    day_button:
                      "!size-(--cell-size) !min-w-0 !rounded-full text-base data-[selected-single=true]:!bg-zinc-950 data-[selected-single=true]:!text-white data-[range-start=true]:!bg-zinc-950 data-[range-start=true]:!text-white data-[range-middle=true]:!bg-transparent data-[range-middle=true]:!text-zinc-950 data-[range-end=true]:!bg-zinc-950 data-[range-end=true]:!text-white",
                    range_start:
                      "relative !rounded-l-full !bg-zinc-100 after:absolute after:inset-y-0 after:right-0 after:w-1/2 after:bg-zinc-100",
                    range_middle: "!rounded-none !bg-zinc-100",
                    range_end:
                      "relative !rounded-r-full !bg-zinc-100 after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-zinc-100",
                  }}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200 pt-5">
                {flexibilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDateFlexibility(option.value)}
                    className={pillClass(dateFlexibility === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPanel(null)}
                >
                  Done
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="flexible" className="mt-6">
              <p className="text-center text-base font-medium">
                How long would you like to stay?
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {stayLengthOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setStayLength((current) =>
                        current === option ? null : option,
                      )
                    }
                    className={pillClass(stayLength === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-base font-medium">
                Go anytime
              </p>
              <Carousel opts={{ align: "start" }} className="mt-3">
                <CarouselContent className="-ml-3">
                  {upcomingMonths.map((option) => {
                    const active = flexibleMonth === option.key;
                    return (
                      <CarouselItem
                        key={option.key}
                        className="basis-1/3 pl-3 sm:basis-1/4 lg:basis-1/6"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setFlexibleMonth((current) =>
                              current === option.key ? null : option.key,
                            )
                          }
                          className={[
                            "flex w-full flex-col items-center gap-2 rounded-2xl border p-4 transition-colors",
                            active
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-200 text-zinc-950 hover:border-zinc-950",
                          ].join(" ")}
                        >
                          <CalendarDays
                            className={
                              active
                                ? "size-5 text-white"
                                : "size-5 text-zinc-500"
                            }
                          />
                          <span className="text-center text-xs font-semibold leading-tight">
                            {option.month}
                            <br />
                            {option.year}
                          </span>
                        </button>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-0 size-8 -translate-x-1/2" />
                <CarouselNext className="right-0 size-8 translate-x-1/2" />
              </Carousel>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPanel(null)}
                >
                  Done
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      {panel === "who" ? (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200 absolute right-0 top-[calc(100%+12px)] z-[100] max-h-[min(70vh,42rem)] w-full max-w-130 overflow-y-auto rounded-[1.75rem] bg-white p-6 text-zinc-950 shadow-2xl shadow-black/25">
          <div className="divide-y divide-zinc-200">
            {guestGroups.map((group) => (
              <div
                key={group.key}
                className="flex items-center justify-between gap-6 py-5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-lg font-semibold">{group.label}</p>
                  {group.key === "pets" ? (
                    <button
                      type="button"
                      onClick={() => setServiceAnimalOpen(true)}
                      className="mt-1 text-left text-base text-zinc-500 underline underline-offset-2 hover:text-zinc-950"
                    >
                      {group.helper}
                    </button>
                  ) : (
                    <p className="mt-1 text-base text-zinc-500">
                      {group.helper}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label={`Decrease ${group.label}`}
                    onClick={() => updateGuest(group.key, -1)}
                    disabled={guests[group.key] === 0}
                    className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-100"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-5 text-center text-xl">
                    {guests[group.key]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${group.label}`}
                    onClick={() => updateGuest(group.key, 1)}
                    className="grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={serviceAnimalOpen} onOpenChange={setServiceAnimalOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(500px,calc(100vw-2rem))]! rounded-[2.5rem]"
        >
          <div className="relative aspect-[1.18/1] overflow-hidden rounded-[2rem]">
            <Image
              src="https://a0.muscache.com/pictures/adafb11b-41e9-49d3-908e-049dfd6934b6.jpg"
              alt="Guest arriving with a service animal"
              fill
              sizes="(min-width: 640px) 540px, calc(100vw - 4rem)"
              className="object-cover"
            />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold">
              Service animals
            </DialogTitle>
            <DialogDescription className="mt-2 text-base text-zinc-700">
              Service animals aren&apos;t pets, so there&apos;s no need to add
              them here.
            </DialogDescription>
            <p className="mt-6 text-base text-zinc-700">
              Traveling with an emotional support animal? Check out our{" "}
              <a
                href="#"
                className="font-semibold underline underline-offset-2"
              >
                accessibility policy
              </a>
              .
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LocationOption({
  title,
  subtitle,
  icon,
  image,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  image?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-zinc-50"
    >
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-zinc-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          icon || <MapPin className="size-5 text-sky-700" />
        )}
      </span>
      <span>
        <span className="block text-lg font-medium leading-6">{title}</span>
        <span className="block text-sm text-zinc-500">{subtitle}</span>
      </span>
    </button>
  );
}
