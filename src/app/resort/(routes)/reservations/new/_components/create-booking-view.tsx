"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CreditCard,
  Loader2,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import { PhoneNumberInput } from "@/components/reusable/phone-number-input";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

const STATUS_OPTIONS = ["Confirmed", "Pending", "Checked in"] as const;
const PAYMENT_METHODS = [
  "Cash",
  "Bank transfer",
  "E-wallet",
  "Credit card",
] as const;

function getDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return {
    checkIn: toDateInput(today),
    checkOut: toDateInput(tomorrow),
  };
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

const defaultDates = getDefaultDates();

export function CreateBookingView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const registeredGuests = useQuery({
    ...trpc.resort.reservations.guestOptions.queryOptions(),
    retry: false,
  });
  const createBooking = useMutation(
    trpc.resort.reservations.create.mutationOptions({
      onSuccess: async (booking) => {
        await queryClient.invalidateQueries(
          trpc.resort.reservations.list.queryFilter(),
        );
        if (values.email && booking.emailNotificationSent) {
          toast.success("Booking saved. Confirmation email sent.");
        } else if (values.email && booking.emailNotificationError) {
          toast(
            `Booking saved, but email failed: ${booking.emailNotificationError}`,
            { icon: "⚠️" },
          );
        } else {
          toast.success("Booking saved.");
        }
        router.push("/resort/reservations/calendar");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const [guestMode, setGuestMode] = useState<GuestMode>("registered");
  const [values, setValues] = useState({
    adults: 1,
    checkIn: defaultDates.checkIn,
    checkOut: defaultDates.checkOut,
    children: 0,
    deposit: "",
    email: "",
    firstName: "",
    guestAccountId: "",
    lastName: "",
    notes: "",
    paymentMethod: "Cash",
    phone: "",
    rate: "",
    status: "Confirmed",
  });
  const nights = getNights(values.checkIn, values.checkOut);
  const rateAmount = parseMoney(values.rate);
  const roomTotal = rateAmount * nights;
  const depositAmount = parseMoney(values.deposit);
  const balance = Math.max(roomTotal - depositAmount, 0);
  const guestName = [values.firstName, values.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const canSubmit =
    Boolean(guestName && values.checkIn && values.checkOut && rateAmount > 0) &&
    nights > 0 &&
    !createBooking.isPending;

  function updateValue<Key extends keyof typeof values>(
    key: Key,
    value: (typeof values)[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function changeGuestMode(mode: GuestMode) {
    setValues((current) => ({
      ...current,
      email: "",
      firstName: "",
      guestAccountId: "",
      lastName: "",
      phone: "",
    }));
    setGuestMode(mode);
  }

  function selectRegisteredGuest(guestId: string) {
    const guest = registeredGuests.data?.find((item) => item.id === guestId);
    if (!guest) return;

    const displayNameParts = guest.displayName.trim().split(/\s+/);
    setValues((current) => ({
      ...current,
      email: guest.email,
      firstName: guest.firstName || displayNameParts[0] || "",
      guestAccountId: guest.id,
      lastName:
        guest.lastName ||
        (displayNameParts.length > 1
          ? displayNameParts.slice(1).join(" ")
          : ""),
      phone: guest.phone,
    }));
  }

  function saveBooking() {
    if (!guestName) {
      toast.error("Guest name is required.");
      return;
    }

    if (nights < 1) {
      toast.error("Check-out must be after check-in.");
      return;
    }

    if (rateAmount <= 0) {
      toast.error("A nightly resort rate is required.");
      return;
    }

    createBooking.mutate({
      adults: values.adults,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      children: values.children,
      deposit: values.deposit,
      guestAccountId: values.guestAccountId,
      guestEmail: values.email,
      guestName,
      guestPhone: values.phone,
      notes: values.notes,
      paymentMethod: values.paymentMethod,
      rate: String(rateAmount || values.rate),
      status: values.status as (typeof STATUS_OPTIONS)[number],
      totalAmount: String(roomTotal),
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/reservations/calendar">Cancel</Link>
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={saveBooking}>
            {createBooking.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              "Save booking"
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <GuestCard
            guestMode={guestMode}
            guests={registeredGuests.data ?? []}
            loadingGuests={registeredGuests.isPending}
            onChange={updateValue}
            onGuestModeChange={changeGuestMode}
            onGuestSelect={selectRegisteredGuest}
            values={values}
          />
          <StayCard
            onChange={updateValue}
            values={values}
          />
          <PaymentCard
            balance={balance}
            roomTotal={roomTotal}
            values={values}
            onChange={updateValue}
          />
        </div>
        <aside className="space-y-5">
          <BookingSummary
            balance={balance}
            depositAmount={depositAmount}
            nights={nights}
            roomTotal={roomTotal}
            values={values}
          />
          <NotesCard
            value={values.notes}
            onChange={(notes) => updateValue("notes", notes)}
          />
        </aside>
      </div>
    </div>
  );
}

function GuestCard({
  guestMode,
  guests,
  loadingGuests,
  onChange,
  onGuestModeChange,
  onGuestSelect,
  values,
}: {
  guestMode: GuestMode;
  guests: RegisteredGuestOption[];
  loadingGuests: boolean;
  onChange: <Key extends keyof BookingValues>(
    key: Key,
    value: BookingValues[Key],
  ) => void;
  onGuestModeChange: (mode: GuestMode) => void;
  onGuestSelect: (guestId: string) => void;
  values: BookingValues;
}) {
  const isRegisteredGuest = guestMode === "registered";

  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <CardTitle icon={<UserRound className="size-4" />} title="Guest details">
        Select an Alrio guest account or enter a walk-in guest manually.
      </CardTitle>

      <Tabs
        value={guestMode}
        onValueChange={(value) => onGuestModeChange(value as GuestMode)}
      >
        <TabsList className="grid h-10 w-full grid-cols-2 md:w-[420px]">
          <TabsTrigger value="registered">Registered guest</TabsTrigger>
          <TabsTrigger value="manual">Manual entry</TabsTrigger>
        </TabsList>
      </Tabs>

      {isRegisteredGuest ? (
        <Field label="Guest account">
          <Select value={values.guestAccountId} onValueChange={onGuestSelect}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select a registered guest" />
            </SelectTrigger>
            <SelectContent>
              {loadingGuests ? (
                <SelectItem value="loading" disabled>
                  Loading registered guests...
                </SelectItem>
              ) : null}
              {!loadingGuests && !guests.length ? (
                <SelectItem value="empty" disabled>
                  No active guest accounts found
                </SelectItem>
              ) : null}
              {guests.map((guest) => (
                <SelectItem key={guest.id} value={guest.id}>
                  {guest.displayName} · {guest.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            Choosing an account links this reservation to the registered guest.
          </p>
        </Field>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name">
          <Input
            value={values.firstName}
            placeholder="Mika"
            className="rounded-lg read-only:bg-zinc-50 read-only:text-zinc-600"
            readOnly={isRegisteredGuest}
            onChange={(event) => onChange("firstName", event.target.value)}
          />
        </Field>
        <Field label="Last name">
          <Input
            value={values.lastName}
            placeholder="Santos"
            className="rounded-lg read-only:bg-zinc-50 read-only:text-zinc-600"
            readOnly={isRegisteredGuest}
            onChange={(event) => onChange("lastName", event.target.value)}
          />
        </Field>
      </div>

      <Field label="Email (optional)">
        <Input
          value={values.email}
          type="email"
          placeholder="guest@email.com"
          className="rounded-lg read-only:bg-zinc-50 read-only:text-zinc-600"
          readOnly={isRegisteredGuest}
          onChange={(event) => onChange("email", event.target.value)}
        />
      </Field>

      <Field label="Phone number (optional)">
        <PhoneNumberInput
          id="reservationGuestPhone"
          value={values.phone}
          onChange={(value) => onChange("phone", value)}
          groupClassName="rounded-lg"
        />
      </Field>

      <div className="-mx-5 -mb-5 border-t bg-zinc-50 px-5 py-4 text-xs font-medium text-zinc-500">
        {isRegisteredGuest
          ? "This booking will appear in the registered guest's reservation history."
          : "Manual entry is intended for walk-ins or guests without an Alrio account."}
      </div>
    </Card>
  );
}

function StayCard({
  onChange,
  values,
}: {
  onChange: <Key extends keyof BookingValues>(
    key: Key,
    value: BookingValues[Key],
  ) => void;
  values: BookingValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <CardTitle
        icon={<CalendarDays className="size-4" />}
        title="Stay details"
      >
        Reserve Alrio exclusively for the selected dates and guest count.
      </CardTitle>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Check-in">
          <Input
            type="date"
            value={values.checkIn}
            className="rounded-lg"
            onChange={(event) => onChange("checkIn", event.target.value)}
          />
        </Field>
        <Field label="Check-out">
          <Input
            type="date"
            value={values.checkOut}
            className="rounded-lg"
            onChange={(event) => onChange("checkOut", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Booking status">
          <Select
            value={values.status}
            onValueChange={(value) => onChange("status", value)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Adults">
          <Input
            type="number"
            min="1"
            value={values.adults}
            className="rounded-lg"
            onChange={(event) => onChange("adults", Number(event.target.value))}
          />
        </Field>
        <Field label="Children">
          <Input
            type="number"
            min="0"
            value={values.children}
            className="rounded-lg"
            onChange={(event) =>
              onChange("children", Number(event.target.value))
            }
          />
        </Field>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        This booking blocks the entire Alrio Private Resort. All guest rooms and
        published resort inclusions are part of the exclusive stay; no room is
        assigned separately.
      </div>
    </Card>
  );
}

function PaymentCard({
  balance,
  onChange,
  roomTotal,
  values,
}: {
  balance: number;
  onChange: <Key extends keyof BookingValues>(
    key: Key,
    value: BookingValues[Key],
  ) => void;
  roomTotal: number;
  values: BookingValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <CardTitle icon={<CreditCard className="size-4" />} title="Payment">
        Track deposit, balance, and collection method.
      </CardTitle>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Whole-resort rate per night">
          <Input
            value={values.rate}
            placeholder="6000"
            className="rounded-lg"
            onChange={(event) => onChange("rate", event.target.value)}
          />
        </Field>
        <Field label="Payment method (optional)">
          <Select
            value={values.paymentMethod}
            onValueChange={(value) => onChange("paymentMethod", value)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReadOnlyMoneyField label="Resort total" value={roomTotal} />
        <Field label="Deposit (optional)">
          <Input
            value={values.deposit}
            placeholder="0"
            className="rounded-lg"
            onChange={(event) => onChange("deposit", event.target.value)}
          />
        </Field>
        <ReadOnlyMoneyField label="Balance" value={balance} />
      </div>
    </Card>
  );
}

function BookingSummary({
  balance,
  depositAmount,
  nights,
  roomTotal,
  values,
}: {
  balance: number;
  depositAmount: number;
  nights: number;
  roomTotal: number;
  values: BookingValues;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase text-zinc-500">Summary</p>
        <h2 className="mt-1 text-xl font-bold text-[#303030]">
          Exclusive resort booking · {Math.max(nights, 0)} night
          {nights === 1 ? "" : "s"}
        </h2>
      </div>
      <SummaryRow label="Check-in" value={formatDate(values.checkIn)} />
      <SummaryRow label="Check-out" value={formatDate(values.checkOut)} />
      <SummaryRow
        label="Guests"
        value={`${values.adults} adult${values.adults === 1 ? "" : "s"}, ${values.children} child${values.children === 1 ? "" : "ren"}`}
      />
      <SummaryRow label="Resort total" value={formatPeso(roomTotal)} />
      <SummaryRow label="Inventory" value="Whole Alrio Private Resort" />
      <SummaryRow label="Deposit" value={formatPeso(depositAmount)} />
      <div className="border-t border-zinc-200 pt-4">
        <SummaryRow label="Balance due" value={formatPeso(balance)} strong />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800">
        All rooms and resort facilities are included in this reservation.
      </div>
    </Card>
  );
}

function NotesCard({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-[#303030]">Internal notes</h2>
      <Textarea
        value={value}
        placeholder="Arrival requests, dietary notes, billing instructions..."
        className="min-h-28 rounded-lg"
        onChange={(event) => onChange(event.target.value)}
      />
    </Card>
  );
}

function CardTitle({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-[#303030]">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{children}</p>
      </div>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#303030]">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyMoneyField({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Field label={label}>
      <Input
        value={formatPeso(value)}
        readOnly
        className="rounded-lg bg-zinc-50"
      />
    </Field>
  );
}

function SummaryRow({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-medium text-zinc-500">{label}</span>
      <span
        className={
          strong ? "font-bold text-zinc-950" : "font-semibold text-zinc-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

function getNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;

  const arrival = new Date(`${checkIn}T00:00:00`);
  const departure = new Date(`${checkOut}T00:00:00`);
  const nights = Math.ceil(
    (departure.getTime() - arrival.getTime()) / 86_400_000,
  );

  return Number.isFinite(nights) ? nights : 0;
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: number) {
  return `\u20b1${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "--";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type BookingValues = {
  adults: number;
  checkIn: string;
  checkOut: string;
  children: number;
  deposit: string;
  email: string;
  firstName: string;
  guestAccountId: string;
  lastName: string;
  notes: string;
  paymentMethod: string;
  phone: string;
  rate: string;
  status: string;
};

type GuestMode = "manual" | "registered";

type RegisteredGuestOption = {
  displayName: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
};

