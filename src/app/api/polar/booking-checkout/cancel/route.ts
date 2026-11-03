import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const checkoutParams = [
  "title",
  "location",
  "price",
  "image",
  "guests",
  "checkIn",
  "checkOut",
  "tenantProfileId",
  "roomId",
  "operatorName",
  "ownerName",
] as const;

function checkoutRedirect(request: NextRequest, status: string) {
  const url = new URL("/checkout", appUrl);
  for (const key of checkoutParams) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("checkout", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const reservationId = request.nextUrl.searchParams.get("reservationId");
  if (!session?.user?.email || !reservationId) {
    return checkoutRedirect(request, "checkout-canceled");
  }

  const reservation = await prisma.tenantReservation.findUnique({
    where: { id: reservationId },
    select: { guestEmail: true, status: true },
  });
  if (
    reservation?.guestEmail === session.user.email &&
    reservation.status === "PENDING"
  ) {
    await prisma.tenantReservation.update({
      where: { id: reservationId },
      data: {
        status: "CANCELED",
        notes: "Polar checkout canceled before payment.",
      },
    });
  }

  return checkoutRedirect(request, "checkout-canceled");
}
