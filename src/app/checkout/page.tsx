import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Gem,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentAppUser } from "@/lib/current-app-user";
import { prisma } from "@/lib/prisma";
import { CustomerAuthDialog } from "./_components/customer-auth-dialog";
import { GuestDetailsPanel } from "./_components/guest-details-panel";
import { OperatorMessagePanel } from "./_components/operator-message-panel";

type CheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=85";

type CheckoutOperator = {
  resortName: string;
  ownerName: string;
  avatar: string;
};

function param(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
  fallback: string,
) {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function parseAmount(price: string) {
  const parsed = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDisplayPrice(price: string) {
  if (price.toUpperCase().startsWith("PHP")) {
    return price.replace(/^PHP\s*/i, "₱");
  }

  return price.replace("â‚±", "₱").replace("Ã¢â€šÂ±", "₱");
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const { session, appUser } = await getCurrentAppUser();
  let canBookStay = appUser
    ? ["CUSTOMER", "TENANT", "TENANT_STAFF"].includes(appUser.role)
    : false;

  if (!appUser && session?.user?.id && session.user.email) {
    const [firstName, ...lastNameParts] = (
      session.user.name ||
      session.user.email.split("@")[0] ||
      "Guest"
    )
      .trim()
      .split(/\s+/);
    const createdCustomer = await prisma.appUser.upsert({
      where: {
        authUserId: session.user.id,
      },
      create: {
        authUserId: session.user.id,
        email: session.user.email,
        firstName,
        lastName: lastNameParts.join(" "),
        displayName: session.user.name || session.user.email,
        role: "CUSTOMER",
      },
      update: {},
    });

    canBookStay = createdCustomer.role === "CUSTOMER";
  }

  const title = param(
    resolvedSearchParams,
    "title",
    "An Oasis in Tagaytay Deluxe Family Room: Serene",
  );
  const location = param(resolvedSearchParams, "location", "Tagaytay, Cavite");
  const price = formatDisplayPrice(
    param(resolvedSearchParams, "price", "₱3,600"),
  );
  const image = param(resolvedSearchParams, "image", fallbackImage);
  const guests = Number(param(resolvedSearchParams, "guests", "2")) || 2;
  const checkIn = param(resolvedSearchParams, "checkIn", "2026-08-31");
  const checkOut = param(resolvedSearchParams, "checkOut", "2026-09-02");
  const checkoutStatus = param(resolvedSearchParams, "checkout", "");
  const tenantProfileId = param(resolvedSearchParams, "tenantProfileId", "");
  const roomId = param(resolvedSearchParams, "roomId", "");
  const listing = roomId
    ? await prisma.tenantRoom.findUnique({
        where: { id: roomId },
        select: { tenantProfileId: true },
      })
    : null;
  const memberTenantProfileId =
    appUser?.tenantProfile?.id ?? appUser?.staffProfile?.tenantProfileId;
  const isOwnListing = Boolean(
    listing && memberTenantProfileId === listing.tenantProfileId,
  );
  const queryOperatorName = param(
    resolvedSearchParams,
    "operatorName",
    title.split(" - ")[0] || "ResortCloud partner resort",
  );
  const queryOwnerName = param(
    resolvedSearchParams,
    "ownerName",
    `${queryOperatorName} operations`,
  );

  const tenantOperator = tenantProfileId
    ? await prisma.tenantProfile.findUnique({
        where: { id: tenantProfileId },
        select: {
          resortName: true,
          businessName: true,
          appUser: {
            select: {
              displayName: true,
            },
          },
        },
      })
    : null;
  const operator: CheckoutOperator = {
    resortName:
      tenantOperator?.resortName ??
      tenantOperator?.businessName ??
      queryOperatorName,
    ownerName: tenantOperator?.appUser.displayName ?? queryOwnerName,
    avatar: image,
  };

  const nightlyRate = parseAmount(price) || 3600;
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

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="py-10 lg:px-20">
        <div className="flex items-center gap-6">
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="size-10 rounded-full"
          >
            <Link href={`/resorts/${slugify(title)}`} aria-label="Back">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Confirm and pay
          </h1>
        </div>

        <CheckoutStatusBanner
          status={checkoutStatus || (isOwnListing ? "own-listing" : "")}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_600px] lg:items-start">
          <div className="space-y-7">
            {isOwnListing ? (
              <CheckoutStep number="1" title="Choose another resort">
                <span className="max-w-xs text-right text-sm leading-5 text-zinc-500">
                  Book another resort&apos;s published room or service to continue.
                </span>
              </CheckoutStep>
            ) : canBookStay ? (
              <>
                <PaymentMethodPanel />
                <OperatorMessagePanel operator={operator} />
                <ReviewReservationPanel
                  amountMinor={Math.round(total * 100)}
                  title={title}
                  location={location}
                  price={price}
                  guests={guests}
                  image={image}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  tenantProfileId={tenantProfileId}
                  roomId={roomId}
                  operator={operator}
                />
              </>
            ) : (
              <>
                <GuestDetailsPanel
                  roomId={roomId}
                  checkIn={checkIn}
                  checkOut={checkOut}
                />
                <CheckoutStep active number="2" title="Log in or sign up">
                  <CustomerAuthDialog />
                </CheckoutStep>
                <CheckoutStep number="3" title="Add a payment method" />
                <CheckoutStep
                  number="4"
                  title="Send booking notes to the resort"
                />
                <CheckoutStep number="5" title="Review your reservation" />
                <p className="max-w-2xl text-sm leading-6 text-zinc-500">
                  Sign in before payment details and final reservation review
                  are enabled. Your guest details will remain on this device.
                </p>
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-28">
            {canBookStay && !isOwnListing ? (
              <RareFindBanner className="mb-6" />
            ) : null}
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="line-clamp-3 text-xl font-semibold leading-tight">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">{location}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Star className="size-4 fill-zinc-950" />
                      4.95 (328)
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span>Guest favorite</span>
                  </p>
                </div>
              </div>

              <p className="mt-6 border-b border-zinc-200 pb-5 text-base text-zinc-700">
                Cancel before check-in on August 31 for a partial refund.{" "}
                <a href="#" className="font-semibold underline">
                  Full policy
                </a>
              </p>

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

              <div className="border-t border-zinc-200 py-5">
                <h3 className="font-semibold">Price details</h3>
                <PriceLine
                  label={`${nights} nights x ${formatPeso(nightlyRate)}`}
                  value={formatPeso(subtotal)}
                />
                <PriceLine
                  label="Service and processing"
                  value={formatPeso(serviceFee)}
                />
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-5 text-base font-semibold">
                <span>
                  Total <span className="underline">PHP</span>
                </span>
                <span>{formatPeso(total)}</span>
              </div>
              <a href="#" className="mt-3 inline-flex font-semibold underline">
                Price breakdown
              </a>
            </div>

            {!(canBookStay && !isOwnListing) ? (
              <RareFindBanner className="mt-8" />
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function PaymentMethodPanel() {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-7 shadow-xl shadow-zinc-200/80">
      <h2 className="text-2xl font-semibold">1. Add a payment method</h2>

      <div className="mt-10 space-y-5">
        <PaymentOption
          selected
          icon={<CreditCard className="size-6" />}
          title="Credit or debit card"
          helper={
            <span className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-5 w-10 items-center justify-center rounded border border-zinc-200 bg-white px-1">
                <Image
                  src="https://onemarketphilippines.com/icons/payments/visa-logo.svg"
                  alt="Visa"
                  width={32}
                  height={14}
                  className="max-h-3.5 w-auto"
                />
              </span>
              <span className="inline-flex h-5 w-10 items-center justify-center rounded border border-zinc-200 bg-white px-1">
                <Image
                  src="https://onemarketphilippines.com/icons/payments/mastercard-logo.svg"
                  alt="Mastercard"
                  width={32}
                  height={14}
                  className="max-h-3.5 w-auto"
                />
              </span>
              <span className="inline-flex h-5 w-10 items-center justify-center rounded border border-zinc-200 bg-white px-1">
                <Image
                  src="https://onemarketphilippines.com/_next/image?url=%2Ficons%2Fpayments%2Fjcb-logo.avif&w=1920&q=75"
                  alt="JCB"
                  width={32}
                  height={14}
                  className="max-h-3.5 w-auto"
                />
              </span>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                Secured by Polar
              </span>
            </span>
          }
        />

        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-700" />
            <p>
              Card details are entered on Polar&apos;s hosted checkout.
              ResortCloud stores only the booking reference and Polar checkout
              ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewReservationPanel({
  amountMinor,
  title,
  location,
  price,
  guests,
  image,
  checkIn,
  checkOut,
  tenantProfileId,
  roomId,
  operator,
}: {
  amountMinor: number;
  title: string;
  location: string;
  price: string;
  guests: number;
  image: string;
  checkIn: string;
  checkOut: string;
  tenantProfileId: string;
  roomId: string;
  operator: CheckoutOperator;
}) {
  return (
    <div
      id="review-reservation"
      className="rounded-[1.5rem] border border-zinc-200 bg-white p-7 shadow-sm"
    >
      <h2 className="text-2xl font-semibold">3. Review your reservation</h2>
      <p className="mt-5 text-sm">
        By selecting the button, I agree to the{" "}
        <a href="#" className="font-semibold underline">
          booking terms
        </a>
        .
      </p>
      <form
        id="polar-booking-form"
        action="/api/polar/booking-checkout"
        method="get"
        className="mt-5"
      >
        <input type="hidden" name="amount" value={amountMinor} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="location" value={location} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="guests" value={guests} />
        <input type="hidden" name="image" value={image} />
        <input type="hidden" name="checkIn" value={checkIn} />
        <input type="hidden" name="checkOut" value={checkOut} />
        <input type="hidden" name="tenantProfileId" value={tenantProfileId} />
        <input type="hidden" name="roomId" value={roomId} />
        <input type="hidden" name="operatorName" value={operator.resortName} />
        <input type="hidden" name="ownerName" value={operator.ownerName} />
        <Button
          type="submit"
          className="h-15 w-full rounded-xl bg-sky-600 text-lg font-semibold hover:bg-sky-700"
        >
          Confirm and pay with Polar
        </Button>
      </form>
    </div>
  );
}

function CheckoutStatusBanner({ status }: { status: string }) {
  const messages: Record<string, { tone: string; text: string }> = {
    "polar-success": {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "Payment completed. Your Polar checkout reference is attached to this booking.",
    },
    "polar-missing-config": {
      tone: "border-amber-200 bg-amber-50 text-amber-800",
      text: "Polar booking checkout is not configured yet. Add POLAR_ACCESS_TOKEN and POLAR_PRODUCT_RESORT_BOOKING.",
    },
    "polar-error": {
      tone: "border-red-200 bg-red-50 text-red-800",
      text: "Polar could not start checkout. Check product setup and Polar sandbox settings.",
    },
    "invalid-amount": {
      tone: "border-red-200 bg-red-50 text-red-800",
      text: "Invalid booking amount. Please review the reservation price.",
    },
    "invalid-booking": {
      tone: "border-red-200 bg-red-50 text-red-800",
      text: "Choose valid check-in and check-out dates and at least one guest before continuing.",
    },
    "unavailable": {
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      text: "This room is no longer available for the selected dates or guest count. Update your search and try again.",
    },
    "minimum-stay": {
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      text: "This stay does not meet the room's minimum-night requirement. Choose longer dates and try again.",
    },
    "auth-required": {
      tone: "border-sky-200 bg-sky-50 text-sky-950",
      text: "Sign in or create a customer account to continue to payment.",
    },
    "customer-required": {
      tone: "border-red-200 bg-red-50 text-red-800",
      text: "This account cannot book stays. Sign in with a customer, tenant, or tenant-staff account to continue.",
    },
    "own-listing": {
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      text: "You cannot book rooms or services from your own resort workspace. Choose another resort to continue.",
    },
    "checkout-canceled": {
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      text: "Checkout was canceled. No payment was recorded, and you can safely review your stay and try again.",
    },
  };
  const message = messages[status];

  if (!message) return null;

  return (
    <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${message.tone}`}>
      {message.text}
    </div>
  );
}
function PaymentOption({
  icon,
  title,
  helper,
  selected,
}: {
  icon: ReactNode;
  title: string;
  helper?: ReactNode;
  selected?: boolean;
}) {
  return (
    <div className="flex items-center gap-5 py-4">
      <div className="grid w-9 place-items-center text-zinc-800">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xl">{title}</p>
        {helper}
      </div>
      <span
        className={[
          "grid size-7 place-items-center rounded-full border",
          selected ? "border-zinc-950" : "border-zinc-400",
        ].join(" ")}
        aria-hidden="true"
      >
        {selected ? <span className="size-4 rounded-full bg-zinc-950" /> : null}
      </span>
    </div>
  );
}

function RareFindBanner({ className }: { className?: string }) {
  return (
    <div
      className={[
        "flex items-center justify-center gap-3 rounded-2xl bg-sky-50 px-6 py-5 text-center font-semibold text-sky-950",
        className ?? "",
      ].join(" ")}
    >
      <Gem className="size-6 text-sky-600" />
      Rare find. This place is usually booked
    </div>
  );
}

function CheckoutStep({
  number,
  title,
  active,
  children,
}: {
  number: string;
  title: string;
  active?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={[
        "flex min-h-17 items-center justify-between gap-5 rounded-[1.5rem] border border-zinc-200 bg-white px-5 py-4",
        active ? "shadow-xl shadow-zinc-200/80" : "",
      ].join(" ")}
    >
      <h2 className="text-xl tracking-tight font-semibold">
        {number}. {title}
      </h2>
      {children}
    </div>
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
    <div className="flex items-center justify-between border-b border-zinc-200 py-5">
      <div className="flex gap-3">
        <Icon className="mt-1 size-5 text-sky-700" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-2 text-zinc-700">{value}</p>
        </div>
      </div>
      <Button variant="secondary" className="rounded-xl">
        Change
      </Button>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4 text-zinc-700">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
