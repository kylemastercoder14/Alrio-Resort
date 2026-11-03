"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GuestDetails = {
  fullName: string;
  email: string;
  phone: string;
};

const emptyDetails: GuestDetails = {
  fullName: "",
  email: "",
  phone: "",
};

function storageKey(roomId: string, checkIn: string, checkOut: string) {
  return `resort-cloud:checkout-guest:${roomId}:${checkIn}:${checkOut}`;
}

export function GuestDetailsPanel({
  roomId,
  checkIn,
  checkOut,
}: {
  roomId: string;
  checkIn: string;
  checkOut: string;
}) {
  const key = storageKey(roomId || "listing", checkIn, checkOut);
  const [details, setDetails] = useState<GuestDetails>(() => {
    if (typeof window === "undefined") return emptyDetails;
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? { ...emptyDetails, ...JSON.parse(saved) } : emptyDetails;
    } catch {
      // A malformed or unavailable local-storage value must not block checkout.
      return emptyDetails;
    }
  });

  function update(field: keyof GuestDetails, value: string) {
    setDetails((current) => {
      const next = { ...current, [field]: value };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Checkout remains usable when browser storage is unavailable.
      }
      return next;
    });
  }

  return (
    <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-7 shadow-sm">
      <h2 className="text-2xl font-semibold">1. Guest details</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        These details are kept on this device while you sign in and continue to
        payment.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="guest-full-name">Full name</Label>
          <Input
            id="guest-full-name"
            name="guest-full-name"
            autoComplete="name"
            className="mt-2"
            value={details.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Guest name"
          />
        </div>
        <div>
          <Label htmlFor="guest-email">Email address</Label>
          <Input
            id="guest-email"
            name="guest-email"
            type="email"
            autoComplete="email"
            className="mt-2"
            value={details.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="guest@example.com"
          />
        </div>
        <div>
          <Label htmlFor="guest-phone">Phone number</Label>
          <Input
            id="guest-phone"
            name="guest-phone"
            type="tel"
            autoComplete="tel"
            className="mt-2"
            value={details.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
    </section>
  );
}
