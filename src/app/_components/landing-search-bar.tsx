"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Minus,
  Plus,
  Search,
  Sparkles,
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
import { ScrollArea } from "@/components/ui/scroll-area";

const stayTypes = [
  {
    value: "Overnight stay",
    description: "Exclusive overnight use of the whole private resort.",
  },
  {
    value: "Day tour",
    description: "Private daytime use of Alrio's grounds and amenities.",
  },
  {
    value: "Celebration package",
    description: "Exclusive resort access for birthdays and reunions.",
  },
  {
    value: "Exclusive resort use",
    description: "Reserve all of Alrio for your private gathering.",
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

type Panel = "stayType" | "when" | "who" | null;
type GuestKey = (typeof guestGroups)[number]["key"];
type WhenMode = "dates" | "flexible";
type StayLength = (typeof stayLengthOptions)[number] | null;

export function LandingSearchBar({
  variant = "default",
  placement,
}: {
  variant?: "default" | "footer";
  placement?: "top" | "bottom";
}) {
  const panelPosition =
    (placement ?? (variant === "footer" ? "top" : "bottom")) === "top"
      ? "sm:top-auto sm:bottom-[calc(100%+12px)] slide-in-from-bottom-2"
      : "sm:top-[calc(100%+12px)] slide-in-from-top-2";
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [stayType, setStayType] = useState("");
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

  const isPanelOpen = panel !== null;

  useEffect(() => {
    if (!isPanelOpen) return;
    const updatePanelHeight = () => {
      const element = searchRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const headerHeight =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--landing-header-height",
          ),
        ) || 80;
      const opensAbove =
        (placement ?? (variant === "footer" ? "top" : "bottom")) === "top";
      const available =
        window.innerWidth < 640
          ? window.innerHeight - headerHeight - 100
          : opensAbove
            ? rect.top - headerHeight - 24
            : window.innerHeight - rect.bottom - 24;
      element.style.setProperty(
        "--search-panel-height",
        `${Math.max(120, Math.min(window.innerHeight * 0.7, available))}px`,
      );
    };
    updatePanelHeight();
    window.addEventListener("resize", updatePanelHeight);
    window.addEventListener("scroll", updatePanelHeight, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePanelHeight);
      window.removeEventListener("scroll", updatePanelHeight);
    };
  }, [isPanelOpen, placement, variant]);

  const handleSearch = () => {
    const params = new URLSearchParams({
      where: stayType || "All stay types",
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

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const updateGuest = (key: GuestKey, direction: 1 | -1) => {
    setGuests((current) => ({
      ...current,
      [key]: Math.max(0, current[key] + direction),
    }));
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
      "relative flex min-h-13 min-w-0 cursor-pointer items-center gap-3 rounded-xl px-4 text-left transition-all duration-200 md:min-h-16 md:rounded-full md:px-5",
      active
        ? "z-10 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.15)] md:scale-[1.02]"
        : "hover:bg-zinc-100",
      withDivider && !active
        ? "border-t border-zinc-200 md:border-l md:border-t-0"
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
    <div
      ref={searchRef}
      className={`relative mt-10 ${isPanelOpen ? "z-1100" : "z-50"}`}
    >
      {variant === "footer" ? (
        <div className="grid gap-4 text-[#d7c69e] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          {(["Check In", "Check Out"] as const).map((label, index) => (
            <div key={label} className="min-w-0">
              <p className="mb-2 text-xs text-white/85">{label}</p>
              <button
                type="button"
                onClick={() => setPanel(panel === "when" ? null : "when")}
                className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-[#d7c69e]/65 bg-black/10 px-3 text-left text-xs hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
                aria-expanded={panel === "when"}
              >
                <span>
                  {(index === 0 ? date?.from : date?.to)
                    ? format(
                        (index === 0 ? date?.from : date?.to)!,
                        "MMM d, yyyy",
                      )
                    : "Select Date"}
                </span>
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="min-w-0">
            <p className="mb-2 text-xs text-white/85">Number of Guests</p>
            <button
              type="button"
              onClick={() => setPanel(panel === "who" ? null : "who")}
              className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-[#d7c69e]/65 bg-black/10 px-3 text-left text-xs hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
              aria-expanded={panel === "who"}
            >
              <span className="truncate">{guestLabel}</span>
              <Users className="size-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="flex h-10 items-center justify-center gap-3 rounded-full bg-[#f1d17c] px-5 text-sm font-medium text-[#343f52] transition-colors hover:bg-[#ffe4a0] focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Check Availability <Search className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/15 bg-white/95 p-2.5 text-zinc-950 shadow-2xl shadow-black/30 backdrop-blur md:rounded-full">
          <div className="grid gap-1.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.9fr)_auto] md:items-center">
            <button
              type="button"
              onClick={() => setPanel(panel === "stayType" ? null : "stayType")}
              className={segmentClass("stayType", false)}
            >
              <Sparkles className="size-5 shrink-0 text-amber-700" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold">Stay type</span>
                <span className="block truncate text-sm text-zinc-500">
                  {stayType || "Choose an experience"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPanel(panel === "when" ? null : "when")}
              className={segmentClass("when", true)}
            >
              <CalendarDays className="size-5 shrink-0 text-amber-700" />
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
              <Users className="size-5 shrink-0 text-amber-700" />
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
                "min-h-13 shrink-0 rounded-xl md:min-h-16 md:rounded-full",
                isPanelOpen ? "w-13 px-0 md:w-16" : "w-full px-8 text-sm",
              ].join(" ")}
            >
              <Search className="size-4" />
              {!isPanelOpen && "Check availability"}
            </Button>
          </div>
        </div>
      )}

      {panel === "stayType" ? (
        <div
          className={`animate-in fade-in-0 duration-200 fixed inset-x-4 top-[calc(var(--landing-header-height,5rem)+1rem)] z-[1100] w-auto overflow-hidden rounded-[1.75rem] bg-white text-zinc-950 shadow-2xl shadow-black/25 sm:absolute sm:inset-x-auto sm:left-0 sm:w-full sm:max-w-130 ${panelPosition}`}
        >
          <div className="flex justify-end px-4 pt-3 sm:hidden">
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="rounded-full px-3 py-2 text-sm hover:bg-accent"
            >
              Close stay types
            </button>
          </div>
          <ScrollArea className="h-fit [&_[data-slot=scroll-area-viewport]]:h-auto [&_[data-slot=scroll-area-viewport]]:max-h-[min(var(--search-panel-height,70vh),42rem)] [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            <div className="divide-y divide-zinc-200 p-6">
              {stayTypes.map((type) => {
                const selected = stayType === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setStayType(type.value);
                      setPanel(null);
                    }}
                    className={[
                      "flex w-full items-center rounded-xl px-3 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    <span>
                      <span className="block text-lg font-semibold">
                        {type.value}
                      </span>
                      <span className="mt-1 block text-base text-zinc-500">
                        {type.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : null}

      {panel === "when" ? (
        <div
          className={`animate-in fade-in-0 duration-200 fixed inset-x-4 top-[calc(var(--landing-header-height,5rem)+1rem)] z-[1100] w-auto overflow-hidden rounded-[1.75rem] bg-white text-zinc-950 shadow-2xl shadow-black/25 sm:absolute sm:inset-x-auto sm:left-1/2 sm:w-[min(850px,calc(100vw-2rem))] sm:-translate-x-1/2 ${panelPosition}`}
        >
          <div className="flex justify-end px-4 pt-3 sm:hidden">
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="rounded-full px-3 py-2 text-sm hover:bg-accent"
            >
              Close dates
            </button>
          </div>
          <ScrollArea
            className={
              whenMode === "flexible"
                ? "h-fit [&_[data-slot=scroll-area-viewport]]:h-auto [&_[data-slot=scroll-area-viewport]]:max-h-[min(var(--search-panel-height,70vh),42rem)] [&_[data-slot=scroll-area-viewport]>div]:!block"
                : "h-[min(var(--search-panel-height,70vh),42rem)] overscroll-contain [&_[data-slot=scroll-area-viewport]>div]:!block"
            }
          >
            <div className="p-5 sm:p-6">
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
                      className="mx-auto w-full max-w-195 [--cell-size:clamp(1.75rem,5vw,3rem)]"
                      classNames={{
                        root: "w-full",
                        months:
                          "relative mx-auto flex w-fit flex-col gap-8 md:grid md:grid-cols-2 md:gap-12",
                        month: "w-fit",
                        nav: "absolute inset-x-4 top-0 flex items-center justify-between",
                        button_previous:
                          "grid size-9 place-items-center rounded-full bg-white text-zinc-950 hover:bg-zinc-100 disabled:text-zinc-300",
                        button_next:
                          "grid size-9 place-items-center rounded-full bg-white text-zinc-950 hover:bg-zinc-100 disabled:text-zinc-300",
                        month_grid: "w-fit",
                        weekdays: "flex",
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

                <TabsContent
                  value="flexible"
                  className="mx-auto mt-6 w-full max-w-4xl"
                >
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
                  <Carousel
                    opts={{ align: "start" }}
                    className="mx-auto mt-3 grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-3"
                  >
                    <CarouselPrevious className="!static !m-0 !size-9 !shrink-0 !translate-x-0 !translate-y-0" />
                    <div className="min-w-0 overflow-hidden">
                      <CarouselContent className="-ml-3">
                        {upcomingMonths.map((option) => {
                          const active = flexibleMonth === option.key;
                          return (
                            <CarouselItem
                              key={option.key}
                              className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/5"
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
                    </div>
                    <CarouselNext className="!static !m-0 !size-9 !shrink-0 !translate-x-0 !translate-y-0" />
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
          </ScrollArea>
        </div>
      ) : null}

      {panel === "who" ? (
        <div
          className={`animate-in fade-in-0 duration-200 fixed inset-x-4 top-[calc(var(--landing-header-height,5rem)+1rem)] z-[1100] w-auto overflow-hidden rounded-[1.75rem] bg-white text-zinc-950 shadow-2xl shadow-black/25 sm:absolute sm:inset-x-auto sm:right-0 sm:w-full sm:max-w-130 ${panelPosition}`}
        >
          <div className="flex justify-end px-4 pt-3 sm:hidden">
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="rounded-full px-3 py-2 text-sm hover:bg-accent"
            >
              Close guests
            </button>
          </div>
          <ScrollArea className="h-fit [&_[data-slot=scroll-area-viewport]]:h-auto [&_[data-slot=scroll-area-viewport]]:max-h-[min(var(--search-panel-height,70vh),42rem)] [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
            <div className="divide-y divide-zinc-200 p-6">
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
          </ScrollArea>
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
