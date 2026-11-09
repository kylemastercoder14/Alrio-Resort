"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconX } from "@tabler/icons-react";
import { useTRPC } from "@/trpc/client";
import type { HomeLocation } from "@/lib/guest-profile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const profileSelectClass =
  "w-full h-15 data-[size=default]:h-16 sm:h-[65px] sm:data-[size=default]:h-[65px] rounded-xl border-zinc-400 px-4 text-base shadow-none md:text-lg";
const locationSelectClass =
  "w-full min-w-0 data-[size=default]:h-11 rounded-lg px-3 shadow-none";
const locationMenuClass =
  "max-h-[min(16rem,var(--radix-select-content-available-height))]";

export function LocationDialog({
  initial,
  onSave,
  onClose,
}: {
  initial: HomeLocation | null;
  onSave: (location: HomeLocation) => void;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const [provinceCode, setProvinceCode] = useState(
    initial?.provinceCode ??
      (initial
        ? initial.regionCode === "130000000"
          ? "metro-manila"
          : "independent"
        : ""),
  );
  const [cityCode, setCityCode] = useState(initial?.cityCode ?? "");
  const options = { staleTime: 86400000, retry: false };
  const provinces = useQuery(
    trpc.geography.provinces.queryOptions(undefined, options),
  );
  const cities = useQuery(
    trpc.geography.cities.queryOptions(
      {
        provinceCode,
      },
      { ...options, enabled: Boolean(provinceCode) },
    ),
  );
  const pin = useQuery(
    trpc.geography.cityPin.queryOptions(
      {
        cityCode,
      },
      { ...options, enabled: Boolean(cityCode) },
    ),
  );
  const province = provinces.data?.find((area) => area.code === provinceCode);
  const city = cities.data?.find((area) => area.code === cityCode);
  const savedPoint =
    initial?.cityCode === cityCode &&
    initial.latitude !== null &&
    initial.longitude !== null
      ? {
          regionCode: initial.regionCode,
          regionName: initial.regionName,
          latitude: initial.latitude,
          longitude: initial.longitude,
        }
      : null;
  const point = pin.data ?? savedPoint;
  const parameters = new URLSearchParams({
    bbox: point
      ? [
          point.longitude - 0.08,
          point.latitude - 0.06,
          point.longitude + 0.08,
          point.latitude + 0.06,
        ].join(",")
      : "116,4,127,21",
    layer: "mapnik",
    ...(point ? { marker: `${point.latitude},${point.longitude}` } : {}),
  });
  const dataError = provinces.error ?? cities.error;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90svh] flex-col gap-0 overflow-hidden rounded-[2rem] p-0 sm:max-w-177.5 sm:rounded-[2.5rem]"
      >
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
            className="absolute left-5 top-5 rounded-full sm:left-6 sm:top-6"
          >
            <IconX className="size-5" />
          </Button>
        </DialogClose>
        <DialogHeader className="shrink-0 gap-2 px-6 pb-6 pt-20 text-left sm:px-8">
          <DialogTitle className="text-2xl font-semibold tracking-tighter">
            Where I live
          </DialogTitle>
          <DialogDescription className="text-base text-zinc-500">
            Choose your province and city to place a city-level pin on the map.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-6 pb-8 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="home-province">Province</Label>
              <Select
                value={provinceCode}
                onValueChange={(value) => {
                  setProvinceCode(value);
                  setCityCode("");
                }}
                disabled={!provinces.data}
              >
                <SelectTrigger
                  id="home-province"
                  className={locationSelectClass}
                >
                  <SelectValue
                    placeholder={
                      provinces.isPending
                        ? "Loading provinces…"
                        : "Select province"
                    }
                  />
                </SelectTrigger>
                <SelectContent position="popper" className={locationMenuClass}>
                  <SelectItem value="metro-manila">Metro Manila</SelectItem>
                  <SelectItem value="independent">
                    Other independent cities
                  </SelectItem>
                  {provinces.data?.map((area) => (
                    <SelectItem key={area.code} value={area.code}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="home-city">City / municipality</Label>
              <Select
                value={cityCode}
                onValueChange={setCityCode}
                disabled={!provinceCode || !cities.data?.length}
              >
                <SelectTrigger id="home-city" className={locationSelectClass}>
                  <SelectValue
                    placeholder={
                      cities.isFetching ? "Loading cities…" : "Select city"
                    }
                  />
                </SelectTrigger>
                <SelectContent position="popper" className={locationMenuClass}>
                  {cities.data?.map((area) => (
                    <SelectItem key={area.code} value={area.code}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {dataError && (
            <Alert variant="destructive">
              <AlertDescription>
                {dataError.message}
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    if (provinces.isError) void provinces.refetch();
                    else void cities.refetch();
                  }}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="relative isolate h-66 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 sm:h-74">
            <iframe
              key={parameters.toString()}
              src={`https://www.openstreetmap.org/export/embed.html?${parameters}`}
              title="Selected city on OpenStreetMap"
              className="size-full border-0"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          {pin.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {pin.error.message}
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => void pin.refetch()}
                >
                  Retry map lookup
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex shrink-0 justify-end border-t border-zinc-200 px-6 py-5 sm:px-8">
          <Button
            className="h-12 min-w-28 rounded-xl px-5 text-base sm:min-w-35"
            disabled={!provinces.data || !city || !point || pin.isFetching}
            onClick={() => {
              if (!city || !point) return;
              onSave({
                provinceCode: province?.code ?? null,
                provinceName: province?.name ?? null,
                cityCode,
                cityName: city.name,
                ...point,
              });
            }}
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
