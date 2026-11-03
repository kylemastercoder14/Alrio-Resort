import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  ReceiptText,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getPolarClient } from "@/lib/subscription/polar";

type CheckoutSuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=85";

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
  fallback: string,
) {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function formatDisplayPrice(price: string) {
  if (price.toUpperCase().startsWith("PHP")) {
    return price.replace(/^PHP\s*/i, "PHP ");
  }

  return price
    .replace("Ã¢â€šÂ±", "PHP ")
    .replace("ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â±", "PHP ")
    .replace("â‚±", "PHP ");
}

function parseAmount(price: string) {
  const parsed = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPeso(amount: number) {
  return `PHP ${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function makeBookingReference(checkoutId: string) {
  const seed = checkoutId && checkoutId !== "{CHECKOUT_ID}" ? checkoutId : "";
  const suffix = seed
    ? seed.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()
    : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `RC-${suffix}`;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const title = param(
    params,
    "title",
    "ResortCloud resort stay and guest services",
  );
  const location = param(params, "location", "Philippines");
  const price = formatDisplayPrice(param(params, "price", "PHP 3,600"));
  const image = param(params, "image", fallbackImage);
  const guests = Number(param(params, "guests", "2")) || 2;
  const checkIn = param(params, "checkIn", "2026-08-31");
  const checkOut = param(params, "checkOut", "2026-09-02");
  const checkoutId = param(params, "checkoutId", "");
  const reservationId = param(params, "reservationId", "");
  const ownerName = param(params, "ownerName", "resort operations team");
  const operatorName = param(params, "operatorName", title.split(" - ")[0]);

  let paymentConfirmed = false;
  let reservation = null;
  if (reservationId && checkoutId && checkoutId !== "{CHECKOUT_ID}" && process.env.POLAR_ACCESS_TOKEN) {
    try {
      const checkout = await getPolarClient().checkouts.get({ id: checkoutId });
      const metadataReservationId = String(checkout.metadata.reservationId ?? "");
      if (checkout.status === "succeeded" && metadataReservationId === reservationId) {
        reservation = await prisma.tenantReservation.findUnique({ where: { id: reservationId } });
        if (reservation && reservation.status === "PENDING") {
          const paymentCode = `POLAR-${checkoutId}`.slice(0, 120);
          await prisma.$transaction(async (tx) => {
            await tx.tenantReservation.update({ where: { id: reservationId }, data: { status: "CONFIRMED", notes: `Paid with Polar checkout ${checkoutId}.` } });
            const existingPayment = await tx.tenantPaymentLog.findFirst({ where: { code: paymentCode }, select: { id: true } });
            if (!existingPayment) await tx.tenantPaymentLog.create({ data: { tenantProfileId: reservation!.tenantProfileId, reservationId, code: paymentCode, amount: reservation!.totalAmount, paymentMethod: "Polar", status: "RECORDED" } });
          });
          reservation = await prisma.tenantReservation.findUnique({ where: { id: reservationId } });
        }
        paymentConfirmed = reservation?.status === "CONFIRMED";
      }
    } catch (error) {
      console.error("Unable to verify Polar booking checkout", error);
    }
  }

  const nightlyRate = reservation ? Number(reservation.rate) : parseAmount(price) || 3600;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${checkOut}T00:00:00`).getTime() -
        new Date(`${checkIn}T00:00:00`).getTime()) /
        86_400_000,
    ) || 1,
  );
  const subtotal = nightlyRate * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee;
  const bookingReference = makeBookingReference(checkoutId);

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800">
              <CheckCircle2 className="size-5" />
              {paymentConfirmed ? "Payment confirmed" : "Payment verification pending"}
            </div>

            <h1 className="mt-7 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {paymentConfirmed ? "Your resort booking is confirmed." : "We are verifying your payment."}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
              {paymentConfirmed
                ? `We sent the payment reference to ${operatorName}. The resort team can now prepare your reservation, guest services, room setup, and arrival notes.`
                : "Do not rely on this page as a booking confirmation until payment verification finishes."}
            </p>

            <div className="mt-8 rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/70">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                Booking reference
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {bookingReference}
                  </p>
                  {checkoutId ? (
                    <p className="mt-2 break-all text-sm text-zinc-500">
                      Polar checkout ID: {checkoutId}
                    </p>
                  ) : null}
                </div>
                <Button asChild className="rounded-full bg-sky-600 px-6">
                  <Link href="/search">Book another stay</Link>
                </Button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: ReceiptText,
                  title: "Receipt saved",
                  text: "Payment record attached to this booking.",
                },
                {
                  icon: MessageCircle,
                  title: "Resort notified",
                  text: `${ownerName} receives your booking notes.`,
                },
                {
                  icon: ClipboardCheck,
                  title: "Operations ready",
                  text: "Front desk can prepare rooms and services.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-zinc-200 p-5"
                  >
                    <Icon className="size-6 text-sky-700" />
                    <h2 className="mt-4 font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {item.text}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-zinc-950 p-6 text-white">
              <h2 className="text-xl font-semibold">What happens next</h2>
              <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-300">
                <p>
                  1. ResortCloud records the booking payment reference for the
                  resort owner workspace.
                </p>
                <p>
                  2. The resort team confirms room setup, amenities, and guest
                  services before arrival.
                </p>
                <p>
                  3. Final check-in details are shared before {formatDate(checkIn)}.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-10">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-zinc-100">
              <Image
                src={image}
                alt={title}
                fill
                priority
                sizes="(min-width: 1024px) 430px, 100vw"
                className="object-cover"
              />
            </div>

            <h2 className="mt-5 text-2xl font-semibold leading-tight">
              {title}
            </h2>
            <p className="mt-2 text-zinc-500">{location}</p>

            <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
              <SummaryRow
                icon={CalendarDays}
                title="Dates"
                value={`${formatDate(checkIn)} - ${formatDate(checkOut)}`}
              />
              <SummaryRow
                icon={UsersRound}
                title="Guests"
                value={`${guests} ${guests === 1 ? "guest" : "guests"}`}
              />
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <PriceLine
                label={`${nights} nights x ${formatPeso(nightlyRate)}`}
                value={formatPeso(subtotal)}
              />
              <PriceLine
                label="Service and processing"
                value={formatPeso(serviceFee)}
              />
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-base font-semibold">
                <span>Total PHP</span>
                <span>{formatPeso(total)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-950">
              Keep this reference for front desk validation and payment
              reconciliation.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({
  icon: Icon,
  title,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-5">
      <Icon className="size-5 text-sky-700" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-zinc-600">{value}</p>
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-zinc-600">
      <span>{label}</span>
      <span className="font-medium text-zinc-950">{value}</span>
    </div>
  );
}
