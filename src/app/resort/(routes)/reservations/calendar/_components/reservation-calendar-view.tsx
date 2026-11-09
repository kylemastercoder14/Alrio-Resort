"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Hotel,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ReservationStatus =
  | "Canceled"
  | "Checked in"
  | "Checked out"
  | "Confirmed"
  | "Pending";

type Reservation = {
  adults: number;
  amountPaid: string;
  balanceDue: string;
  checkIn: string;
  checkOut: string;
  children: number;
  createdAt: Date | string;
  deposit: string;
  email: string;
  guest: string;
  id: string;
  invoiceStatus: string;
  nights: number;
  notes: string;
  paymentMethod: string;
  phone: string;
  room: string;
  roomCode: string;
  roomId: string;
  roomType: string;
  status: ReservationStatus;
  total: string;
  updatedAt: Date | string;
};

type ReservationRecord = {
  adults: number;
  amountPaid: string;
  balanceDue: string;
  checkIn: Date | string;
  checkOut: Date | string;
  children: number;
  createdAt: Date | string;
  deposit: string;
  guestEmail: string;
  guestName: string;
  guestPhone: string;
  id: string;
  invoiceStatus: string;
  nights: number;
  notes: string;
  paymentMethod: string;
  roomCode: string;
  roomId: string;
  roomName: string;
  roomType: string;
  status: ReservationStatus;
  totalAmount: string;
  updatedAt: Date | string;
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  "Checked in": "border-emerald-600 bg-emerald-600 text-white",
  "Checked out": "border-slate-300 bg-slate-100 text-slate-700",
  Canceled: "border-red-300 bg-red-100 text-red-800",
  Confirmed: "border-blue-300 bg-blue-100 text-blue-800",
  Pending: "border-amber-300 bg-amber-100 text-amber-900",
};

const STATUS_LEGEND: Array<{
  dotClassName: string;
  label: ReservationStatus;
}> = [
  { label: "Checked in", dotClassName: "bg-emerald-600" },
  { label: "Confirmed", dotClassName: "bg-blue-600" },
  { label: "Pending", dotClassName: "bg-amber-500" },
  { label: "Checked out", dotClassName: "bg-slate-500" },
  { label: "Canceled", dotClassName: "bg-red-600" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getStatusDotClass(status: ReservationStatus) {
  return (
    STATUS_LEGEND.find((item) => item.label === status)?.dotClassName ??
    "bg-zinc-500"
  );
}

export function ReservationCalendarView() {
  const trpc = useTRPC();
  const todayKey = toDateKey(new Date());
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [sheetOpen, setSheetOpen] = useState(false);
  const reservationsQuery = useQuery({
    ...trpc.resort.reservations.list.queryOptions(),
    retry: false,
  });
  const reservations = useMemo(
    () =>
      (reservationsQuery.data ?? []).map((reservation) =>
        toReservation(reservation as ReservationRecord),
      ),
    [reservationsQuery.data],
  );
  const filteredReservations = reservations;
  const monthDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedReservations = filteredReservations.filter((reservation) =>
    isDateWithinStay(selectedDate, reservation),
  );
  const metrics = useMemo(
    () => getMetrics(filteredReservations, todayKey),
    [filteredReservations, todayKey],
  );

  function selectDate(dateKey: string, reservationsForDay: Reservation[]) {
    setSelectedDate(dateKey);
    setSheetOpen(reservationsForDay.length > 0);
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <div className="flex h-[calc(100vh-6.75rem)] min-h-180 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResortBreadcrumb />
          <div className="flex items-center gap-3">
            <Button size="xs" asChild>
              <Link href="/resort/reservations/new">
                <Plus className="size-4" />
                New booking
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<CalendarDays className="size-4" />}
            label="Arrivals"
            loading={reservationsQuery.isPending}
            value={String(metrics.arrivals)}
          />
          <MetricCard
            icon={<DoorOpen className="size-4" />}
            label="Departures"
            loading={reservationsQuery.isPending}
            value={String(metrics.departures)}
          />
          <MetricCard
            icon={<Hotel className="size-4" />}
            label="Occupancy"
            loading={reservationsQuery.isPending}
            value={`${metrics.occupancy}%`}
          />
          <MetricCard
            icon={<Users className="size-4" />}
            label="In-house"
            loading={reservationsQuery.isPending}
            value={String(metrics.inHouse)}
          />
        </div>

        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border-zinc-200 bg-white p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <h1 className="text-lg font-bold text-[#303030]">{monthLabel}</h1>
              <p className="text-xs font-medium text-zinc-500">
                Click booked dates to inspect reservations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                {STATUS_LEGEND.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"
                  >
                    <span
                      className={cn("size-2 rounded-full", item.dotClassName)}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setViewDate(addMonths(viewDate, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(todayKey);
                  setSheetOpen(
                    filteredReservations.some((reservation) =>
                      isDateWithinStay(todayKey, reservation),
                    ),
                  );
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <div className="flex min-h-96 min-w-2xl flex-col lg:h-full">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-500"
              >
                {day}
              </div>
            ))}
          </div>

          {reservationsQuery.isPending ? (
            <CalendarSkeleton />
          ) : reservationsQuery.isError ? (
            <CalendarMessage message={reservationsQuery.error.message} />
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden">
              {monthDays.map((date) => {
                const dateKey = toDateKey(date);
                const dayReservations = filteredReservations.filter((reservation) =>
                  isDateWithinStay(dateKey, reservation),
                );
                const muted = date.getMonth() !== viewDate.getMonth();
                const selected = selectedDate === dateKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={cn(
                      "min-h-0 border-b border-r border-zinc-200 p-2 text-left transition hover:bg-zinc-50",
                      muted && "bg-zinc-50/60 text-zinc-400",
                      selected && "bg-zinc-100 ring-2 ring-inset ring-zinc-900",
                      dayReservations.length && "cursor-pointer",
                    )}
                    onClick={() => selectDate(dateKey, dayReservations)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">{date.getDate()}</span>
                      {dayReservations.length ? (
                        <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {dayReservations.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      {dayReservations.slice(0, 4).map((reservation) => {
                        const rangeSegment = getRangeSegment(
                          dateKey,
                          reservation,
                        );
                        const payment = getPaymentDetails(reservation);

                        return (
                          <div
                            key={reservation.id}
                            title={`${reservation.guest} · ${payment.label} · ${payment.detail}`}
                            className={cn(
                              "relative z-10 flex min-h-11 min-w-0 items-center border-y border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-950 shadow-sm",
                              rangeSegment.starts &&
                                rangeSegment.ends &&
                                "rounded-md border-x border-l-4 border-l-zinc-950",
                              rangeSegment.starts &&
                                !rangeSegment.ends &&
                                "-mr-2.25 rounded-l-md border-l-4 border-l-zinc-950 border-r-0",
                              !rangeSegment.starts &&
                                rangeSegment.ends &&
                                "-ml-2.25 rounded-r-md border-l-0 border-r",
                              !rangeSegment.starts &&
                                !rangeSegment.ends &&
                                "-mx-2.25 rounded-none border-x-0",
                            )}
                          >
                            {rangeSegment.starts ? (
                              <div className="min-w-0 whitespace-nowrap">
                                <span className="block truncate font-bold">
                                  {reservation.guest}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-zinc-600">
                                  <span
                                    className={cn(
                                      "size-1.5 shrink-0 rounded-full",
                                      getStatusDotClass(reservation.status),
                                    )}
                                  />
                                  <span>{reservation.status}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">
                                    {payment.calendarLabel}
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <span className="sr-only">
                                Continued booking for {reservation.guest}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {dayReservations.length > 4 ? (
                        <p className="px-1 text-[11px] font-semibold text-zinc-500">
                          +{dayReservations.length - 4} more
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>
          </div>
        </Card>
      </div>

      <SheetContent
        className="w-full gap-0 p-0 max-w-xl!"
        onInteractOutside={(event) => {
          const target = event.target;

          if (
            target instanceof Element &&
            target.closest('[data-slot="select-content"]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <SheetHeader className="border-b border-zinc-200 p-5">
          <SheetTitle className="text-xl font-bold">Bookings</SheetTitle>
          <p className="text-sm font-medium text-zinc-500">
            {formatFullDate(selectedDate)}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">
            {selectedReservations.map((reservation) => (
              <BookingCard key={reservation.id} reservation={reservation} />
            ))}
            {selectedReservations.length ? (
              <>
                <BookingManagement
                  key={selectedReservations[0].id}
                  reservation={selectedReservations[0]}
                />
                <BookingTimeline reservation={selectedReservations[0]} />
              </>
            ) : null}
          </div>
        </div>

        <SheetFooter className="border-t border-zinc-200 p-4">
          <Button variant="outline" onClick={() => setSheetOpen(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function BookingCard({ reservation }: { reservation: Reservation }) {
  const payment = getPaymentDetails(reservation);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className={STATUS_STYLES[reservation.status]}>
            {reservation.status}
          </Badge>
          <h3 className="mt-3 text-lg font-bold text-zinc-950">
            {reservation.id}
          </h3>
          <p className="mt-1 text-sm font-medium text-zinc-500">
            {reservation.guest}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <Hotel className="size-4" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-zinc-200 py-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-zinc-500">
            Payment status
          </p>
          <Badge className={cn("mt-1", payment.badgeClassName)}>
            {payment.label}
          </Badge>
        </div>
        <Detail
          label="Payment method"
          value={reservation.paymentMethod || "Not recorded"}
        />
        <Detail label="Amount paid" value={formatPeso(payment.paid)} />
        <Detail label="Balance due" value={formatPeso(payment.balance)} />
        <Detail label="Request type" value="Overnight stay" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Detail label="Booking" value="Exclusive use of Alrio Private Resort" />
        <Detail label="Nights" value={String(reservation.nights)} />
        <Detail label="Check-in" value={formatFullDate(reservation.checkIn)} />
        <Detail label="Check-out" value={formatFullDate(reservation.checkOut)} />
      </div>

      <div className="mt-5 rounded-lg border border-zinc-300 bg-zinc-50 p-3">
        <p className="text-xs font-bold uppercase text-zinc-700">Confirmed stay</p>
        <p className="mt-1 text-sm font-semibold text-zinc-950">
          Whole resort · {reservation.adults} adult
          {reservation.adults === 1 ? "" : "s"}, {reservation.children} child
          {reservation.children === 1 ? "" : "ren"}
        </p>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <Detail label="Email" value={reservation.email || "--"} />
        <Detail label="Contact" value={reservation.phone || "--"} />
        <Detail label="Notes" value={reservation.notes || "--"} />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm">
        <span className="font-medium text-zinc-500">Total</span>
        <span className="font-bold text-zinc-950">
          {formatPeso(reservation.total)}
        </span>
      </div>
    </div>
  );
}

function BookingManagement({ reservation }: { reservation: Reservation }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const payment = getPaymentDetails(reservation);
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [isStartingPayMongo, setIsStartingPayMongo] = useState(false);

  const refreshReservations = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.resort.reservations.list.queryKey(),
    });
  };
  const updateStatus = useMutation(
    trpc.resort.reservations.updateStatus.mutationOptions({
      onMutate: () => toast.loading("Updating booking status…", { id: "booking-status" }),
      onSuccess: async (result) => {
        await refreshReservations();
        setStatus(result.status as ReservationStatus);
        toast.success(`Booking marked as ${result.status.toLowerCase()}.`, {
          id: "booking-status",
        });
      },
      onError: (error) => toast.error(error.message, { id: "booking-status" }),
    }),
  );
  const recordPayment = useMutation(
    trpc.resort.reservations.recordPayment.mutationOptions({
      onMutate: () => toast.loading("Recording payment…", { id: "booking-payment" }),
      onSuccess: async (result) => {
        await refreshReservations();
        setAmount("");
        setNote("");
        toast.success(
          result.fullyPaid
            ? "Payment recorded. The booking is fully paid."
            : `Payment recorded. ${formatPeso(result.balanceDue)} remains.`,
          { id: "booking-payment" },
        );
      },
      onError: (error) => toast.error(error.message, { id: "booking-payment" }),
    }),
  );

  function submitPayment() {
    const paymentAmount = parseMoney(amount);

    if (paymentAmount <= 0) {
      toast.error("Enter a payment amount greater than zero.");
      return;
    }
    if (paymentAmount - payment.balance > 0.009) {
      toast.error("Payment cannot exceed the remaining balance.");
      return;
    }

    recordPayment.mutate({
      amount: String(paymentAmount),
      note: note.trim() || undefined,
      paymentMethod,
      reservationId: reservation.id,
    });
  }

  async function startPayMongoCheckout() {
    const requestedAmount = amount ? parseMoney(amount) : payment.balance;
    if (requestedAmount <= 0 || requestedAmount - payment.balance > 0.009) {
      toast.error("Enter a valid amount that does not exceed the remaining balance.");
      return;
    }

    setIsStartingPayMongo(true);
    const toastId = toast.loading("Creating secure PayMongo checkout…");
    try {
      const response = await fetch("/api/paymongo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: requestedAmount,
          reservationId: reservation.id,
        }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || "Unable to create PayMongo checkout.");
      }
      await navigator.clipboard?.writeText(result.checkoutUrl).catch(() => undefined);
      window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      toast.success("PayMongo checkout opened and payment link copied.", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start PayMongo checkout.", {
        id: toastId,
      });
    } finally {
      setIsStartingPayMongo(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
      <div>
        <h3 className="font-bold text-zinc-950">Manage booking</h3>
        <p className="mt-1 text-sm font-medium text-zinc-500">
          Update the stay status and record payments received from the guest.
        </p>
      </div>

      <div className="space-y-2 border-b border-zinc-200 pb-4">
        <Label htmlFor={`booking-status-${reservation.id}`}>Booking status</Label>
        <div className="flex gap-2">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ReservationStatus)}
          >
            <SelectTrigger id={`booking-status-${reservation.id}`} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_LEGEND.map((item) => (
                <SelectItem key={item.label} value={item.label}>
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", item.dotClassName)} />
                    {item.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => updateStatus.mutate({ id: reservation.id, status })}
            disabled={updateStatus.isPending || status === reservation.status}
          >
            {updateStatus.isPending ? "Updating…" : "Save status"}
          </Button>
        </div>
        {status === "Checked out" && payment.balance > 0 ? (
          <p className="text-xs font-medium text-amber-700">
            The remaining {formatPeso(payment.balance)} must be paid before checkout.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-zinc-950">Record a payment</p>
            <p className="text-xs font-medium text-zinc-500">
              Outstanding balance: {formatPeso(payment.balance)}
            </p>
          </div>
          {payment.balance > 0 ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setAmount(String(payment.balance))}
            >
              Pay full balance
            </Button>
          ) : (
            <Badge className="bg-emerald-700 text-white">Fully paid</Badge>
          )}
        </div>

        {payment.balance > 0 ? (
          <>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-bold text-zinc-950">Online payment</p>
              <p className="mt-1 text-xs font-medium leading-5 text-zinc-500">
                Open a secure PayMongo checkout for cards, GCash, or QR Ph. The
                reservation, invoice, and finance records update after PayMongo confirms payment.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full bg-white"
                onClick={startPayMongoCheckout}
                disabled={isStartingPayMongo}
              >
                {isStartingPayMongo ? "Creating checkout…" : "Pay online with PayMongo"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`payment-amount-${reservation.id}`}>Amount received</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
                    ₱
                  </span>
                  <Input
                    id={`payment-amount-${reservation.id}`}
                    type="number"
                    min="0.01"
                    max={payment.balance}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`payment-method-${reservation.id}`}>Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id={`payment-method-${reservation.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="GCash">GCash</SelectItem>
                    <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-note-${reservation.id}`}>Payment note (optional)</Label>
              <Textarea
                id={`payment-note-${reservation.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Reference number, collector, or payment details…"
                className="min-h-20"
              />
            </div>
            <Button
              className="w-full"
              onClick={submitPayment}
              disabled={recordPayment.isPending || !amount}
            >
              {recordPayment.isPending ? "Recording payment…" : "Record payment"}
            </Button>
          </>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            No payment is due for this booking.
          </div>
        )}
      </div>
    </div>
  );
}

function BookingTimeline({ reservation }: { reservation: Reservation }) {
  const events = [
    {
      actor: "System",
      body: "Exclusive whole-resort booking created.",
      meta: formatDateTime(reservation.createdAt),
      tag: "Created",
    },
    {
      actor: "Front desk",
      body: `Current booking status is ${reservation.status}.`,
      meta: formatDateTime(reservation.updatedAt),
      tag: reservation.status,
    },
  ];

  return (
    <div className="border-t border-zinc-200 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-950">Activity</p>
          <p className="text-xs font-medium text-zinc-500">
            Source trail and booking changes.
          </p>
        </div>
        <MessageCircle className="size-4 text-zinc-500" />
      </div>
      <div className="mt-4 space-y-4">
        {events.map((event, index) => (
          <div key={event.body} className="relative flex gap-3">
            {index < events.length - 1 ? (
              <span className="absolute left-2 top-5 h-[calc(100%+0.25rem)] w-px bg-zinc-200" />
            ) : null}
            <span className="relative z-10 mt-1 size-4 rounded-full border border-zinc-300 bg-white" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-bold text-zinc-900">
                  {event.actor}
                </p>
                <span className="shrink-0 text-xs font-medium text-zinc-500">
                  {event.meta}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-700">
                {event.body}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                {event.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 wrap-break-word font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  loading,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  value: string;
}) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-zinc-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-14" />
          ) : (
            <p className="text-xl font-bold text-zinc-950">{value}</p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden">
      {Array.from({ length: 42 }).map((_, index) => (
        <div key={index} className="border-b border-r border-zinc-200 p-2">
          <Skeleton className="mb-3 h-4 w-7" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <p className="text-sm font-semibold text-zinc-600">{message}</p>
    </div>
  );
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toReservation(reservation: ReservationRecord): Reservation {
  return {
    adults: reservation.adults,
    amountPaid: reservation.amountPaid,
    balanceDue: reservation.balanceDue,
    checkIn: toDateKeyFromValue(reservation.checkIn),
    checkOut: toDateKeyFromValue(reservation.checkOut),
    children: reservation.children,
    createdAt: reservation.createdAt,
    deposit: reservation.deposit,
    email: reservation.guestEmail,
    guest: reservation.guestName,
    id: reservation.id,
    invoiceStatus: reservation.invoiceStatus,
    nights: reservation.nights,
    notes: reservation.notes,
    paymentMethod: reservation.paymentMethod,
    phone: reservation.guestPhone,
    room: reservation.roomName,
    roomCode: reservation.roomCode,
    roomId: reservation.roomId,
    roomType: reservation.roomType,
    status: reservation.status,
    total: reservation.totalAmount,
    updatedAt: reservation.updatedAt,
  };
}

function getMetrics(
  reservations: Reservation[],
  dateKey: string,
) {
  const activeReservations = reservations.filter(
    (reservation) => reservation.status !== "Canceled",
  );
  const inHouseReservations = activeReservations.filter((reservation) =>
    isDateWithinStay(dateKey, reservation),
  );

  return {
    arrivals: activeReservations.filter((reservation) => reservation.checkIn === dateKey)
      .length,
    departures: activeReservations.filter(
      (reservation) => reservation.checkOut === dateKey,
    ).length,
    inHouse: inHouseReservations.reduce(
      (total, reservation) => total + reservation.adults + reservation.children,
      0,
    ),
    occupancy: inHouseReservations.length > 0 ? 100 : 0,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKeyFromValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return toDateKey(date);
}

function isDateWithinStay(dateKey: string, reservation: Reservation) {
  return dateKey >= reservation.checkIn && dateKey < reservation.checkOut;
}

function getRangeSegment(dateKey: string, reservation: Reservation) {
  const date = new Date(`${dateKey}T00:00:00`);
  const previousDate = new Date(date);
  const nextDate = new Date(date);
  previousDate.setDate(date.getDate() - 1);
  nextDate.setDate(date.getDate() + 1);

  return {
    starts:
      date.getDay() === 0 ||
      !isDateWithinStay(toDateKey(previousDate), reservation),
    ends:
      date.getDay() === 6 ||
      !isDateWithinStay(toDateKey(nextDate), reservation),
  };
}

function getPaymentDetails(reservation: Reservation) {
  const total = parseMoney(reservation.total);
  const requestedDeposit = Math.max(parseMoney(reservation.deposit), 0);
  const paid = Math.min(
    Math.max(
      reservation.amountPaid
        ? parseMoney(reservation.amountPaid)
        : requestedDeposit,
      0,
    ),
    total,
  );
  const balance = reservation.balanceDue
    ? Math.max(parseMoney(reservation.balanceDue), 0)
    : Math.max(total - paid, 0);

  if (total > 0 && (reservation.invoiceStatus === "PAID" || balance <= 0)) {
    return {
      badgeClassName: "border-emerald-700 bg-emerald-700 text-white",
      balance,
      calendarLabel: "Fully paid",
      paid,
      detail: `Fully paid · ${formatPeso(String(total))}`,
      label: "Fully paid",
    };
  }

  if (paid > 0) {
    const isDepositOnly =
      requestedDeposit > 0 && Math.abs(paid - requestedDeposit) < 0.01;

    return {
      badgeClassName: "border-zinc-900 bg-zinc-900 text-white",
      balance,
      calendarLabel: `${isDepositOnly ? "Dep." : "Paid"} ${formatCompactPeso(paid)}`,
      paid,
      detail: `${isDepositOnly ? "Deposit" : "Paid"} ${formatPeso(String(paid))} · ${formatPeso(String(balance))} due`,
      label: isDepositOnly ? "Deposit paid" : "Partially paid",
    };
  }

  return {
    badgeClassName: "border-red-700 bg-red-700 text-white",
    balance: total,
    calendarLabel: "Unpaid",
    paid: 0,
    detail: `${formatPeso(String(total))} due`,
    label: "Not paid",
  };
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatCompactPeso(value: number) {
  if (value >= 1_000_000) {
    return `₱${(value / 1_000_000).toLocaleString("en-PH", {
      maximumFractionDigits: 1,
    })}m`;
  }

  if (value >= 1_000) {
    return `₱${(value / 1_000).toLocaleString("en-PH", {
      maximumFractionDigits: 1,
    })}k`;
  }

  return `₱${value.toLocaleString("en-PH")}`;
}

function formatFullDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

function formatPeso(value: string | number) {
  const amount =
    typeof value === "number"
      ? value
      : Number(value.replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(amount)) return String(value || "--");

  return `\u20b1${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}
