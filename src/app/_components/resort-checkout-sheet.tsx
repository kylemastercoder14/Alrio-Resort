"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ResortCheckoutSheetProps = {
  title: string;
  location: string;
  price: string;
  guests: number;
  image: string;
  roomId: string;
  checkIn?: string;
  checkOut?: string;
  tenantProfileId?: string;
  operatorName?: string;
  ownerName?: string;
};

export function ResortCheckoutSheet({
  title,
  location,
  price,
  guests,
  image,
  roomId,
  checkIn,
  checkOut,
  tenantProfileId,
  operatorName,
  ownerName,
}: ResortCheckoutSheetProps) {
  const router = useRouter();

  function handleReserve() {
    const params = new URLSearchParams({
      title,
      location,
      price,
      guests: String(guests),
      image,
      roomId,
      checkIn: checkIn ?? "",
      checkOut: checkOut ?? "",
    });

    if (tenantProfileId) params.set("tenantProfileId", tenantProfileId);
    if (operatorName) params.set("operatorName", operatorName);
    if (ownerName) params.set("ownerName", ownerName);

    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <Button
      type="button"
      onClick={handleReserve}
      className="mt-5 h-14 w-full rounded-full bg-sky-600 text-lg font-semibold hover:bg-sky-700"
    >
      Reserve
    </Button>
  );
}
