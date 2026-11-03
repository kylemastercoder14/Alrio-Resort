import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { decimal, getNights, getPublicRoom, parseDate } from "@/lib/public-listings";
import { prisma } from "@/lib/prisma";
import { getPolarClient } from "@/lib/subscription/polar";

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

function errorRedirect(request: NextRequest, reason: string) {
  const url = new URL("/checkout", appUrl);
  for (const key of checkoutParams) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("checkout", reason);
  return NextResponse.redirect(url);
}

function copyCheckoutParams(source: URLSearchParams, target: URL) {
  for (const key of checkoutParams) {
    const value = source.get(key);
    if (value) target.searchParams.set(key, value);
  }
}

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId") ?? "";
  const checkIn = parseDate(request.nextUrl.searchParams.get("checkIn") ?? undefined);
  const checkOut = parseDate(request.nextUrl.searchParams.get("checkOut") ?? undefined);
  const rawGuests = Number(request.nextUrl.searchParams.get("guests"));
  if (
    !roomId ||
    !checkIn ||
    !checkOut ||
    checkOut <= checkIn ||
    !Number.isInteger(rawGuests) ||
    rawGuests < 1
  ) {
    return errorRedirect(request, "invalid-booking");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.email) return errorRedirect(request, "auth-required");

  const appUser = await prisma.appUser.findUnique({
    where: { authUserId: session.user.id },
    include: { tenantProfile: true, staffProfile: true },
  });
  if (!appUser || !["CUSTOMER", "TENANT", "TENANT_STAFF"].includes(appUser.role)) {
    return errorRedirect(request, "customer-required");
  }

  const guests = rawGuests;

  const room = await getPublicRoom(roomId);
  if (!room || guests > room.maxAdults + room.childrenOccupancy) return errorRedirect(request, "unavailable");
  const memberTenantProfileId =
    appUser.tenantProfile?.id ?? appUser.staffProfile?.tenantProfileId;
  if (memberTenantProfileId === room.tenantProfileId) {
    return errorRedirect(request, "own-listing");
  }
  const nights = getNights(checkIn, checkOut);
  if (nights < room.minNights) return errorRedirect(request, "minimum-stay");

  const conflict = await prisma.tenantReservation.findFirst({
    where: { roomId, status: { notIn: ["CANCELED", "CHECKED_OUT"] }, checkIn: { lt: checkOut }, checkOut: { gt: checkIn } },
    select: { id: true },
  });
  if (conflict) return errorRedirect(request, "unavailable");

  const amount = decimal(room.baseRate) * nights;
  if (!process.env.POLAR_ACCESS_TOKEN || !process.env.POLAR_PRODUCT_RESORT_BOOKING) return errorRedirect(request, "polar-missing-config");

  const reservation = await prisma.tenantReservation.create({
    data: {
      tenantProfileId: room.tenantProfileId,
      roomId,
      guestName: appUser.displayName,
      guestEmail: appUser.email,
      checkIn,
      checkOut,
      adults: guests,
      children: 0,
      nights,
      rate: String(decimal(room.baseRate)),
      totalAmount: String(amount),
      paymentMethod: "Polar",
      status: "PENDING",
      notes: "Awaiting Polar checkout confirmation.",
    },
  });

  const successUrl = new URL("/checkout/success", appUrl);
  successUrl.searchParams.set("reservationId", reservation.id);
  successUrl.searchParams.set("checkoutId", "{CHECKOUT_ID}");
  try {
    const checkout = await getPolarClient().checkouts.create({
      products: [process.env.POLAR_PRODUCT_RESORT_BOOKING],
      prices: { [process.env.POLAR_PRODUCT_RESORT_BOOKING]: [{ amountType: "fixed", priceCurrency: "php", priceAmount: Math.round(amount * 100) }] },
      currency: "php",
      customerEmail: session.user.email,
      customerName: session.user.name,
      externalCustomerId: session.user.id,
      metadata: { kind: "resort_booking", reservationId: reservation.id, roomId, tenantProfileId: room.tenantProfileId },
      successUrl: successUrl.toString(),
      returnUrl: (() => {
        const returnUrl = new URL("/api/polar/booking-checkout/cancel", appUrl);
        copyCheckoutParams(request.nextUrl.searchParams, returnUrl);
        returnUrl.searchParams.set("reservationId", reservation.id);
        return returnUrl.toString();
      })(),
    });
    await prisma.tenantReservation.update({ where: { id: reservation.id }, data: { notes: `Polar checkout: ${checkout.id}` } });
    return NextResponse.redirect(checkout.url);
  } catch (error) {
    await prisma.tenantReservation.update({ where: { id: reservation.id }, data: { status: "CANCELED", notes: "Polar checkout could not be created." } });
    console.error("Unable to create Polar booking checkout", error);
    return errorRedirect(request, "polar-error");
  }
}
