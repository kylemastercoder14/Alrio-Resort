"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DoorClosed,
  DoorOpen,
  FileText,
  Loader2,
  MessageSquareText,
  MoreVertical,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Send,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { PhoneNumberInput } from "@/components/reusable/phone-number-input";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ReceptionStatus = "Arriving" | "In-house" | "Checking out" | "Completed";
type ReceptionPriority = "Normal" | "Attention";

type ReceptionGuest = {
  balance: number;
  checkIn: Date | string;
  checkOut: Date | string;
  invoiceCodes: string[];
  guestPhone: string;
  guest: string;
  id: string;
  note: string;
  pax: string;
  priority: ReceptionPriority;
  room: string;
  source: string;
  status: ReceptionStatus;
  subFolioTotal: number;
  time: string;
  unbilledTotal: number;
};

type ReceptionRequest = {
  createdAt: Date | string;
  department: string;
  id: string;
  note: string;
  priority: "Normal" | "Urgent";
  roomOrArea: string;
  status: string;
};

type ReceptionShiftNote = {
  createdAt: Date | string;
  id: string;
  note: string;
  title: string;
};

type ReceptionDepartment = {
  id: string;
  name: string;
  status: string;
};

const STATUS_ORDER: ReceptionStatus[] = [
  "Arriving",
  "In-house",
  "Checking out",
  "Completed",
];

const STATUS_STYLES: Record<ReceptionStatus, string> = {
  Arriving: "border-black bg-black text-white",
  "In-house": "border-zinc-300 bg-white text-zinc-900",
  "Checking out": "border-zinc-200 bg-zinc-100 text-zinc-950",
  Completed: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

const PRIORITY_STYLES: Record<ReceptionPriority, string> = {
  Normal: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Attention: "border-black bg-black text-white",
};

const currency = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  maximumFractionDigits: 0,
  style: "currency",
});

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

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);

  return Number.isFinite(nights) ? nights : 0;
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "--"
    : date.toLocaleDateString("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function ReceptionView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [billingReservationId, setBillingReservationId] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const reception = useQuery({
    ...trpc.resort.reception.list.queryOptions(),
    retry: false,
  });
  const registeredGuests = useQuery({
    ...trpc.resort.reservations.guestOptions.queryOptions(),
    retry: false,
  });
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
    retry: false,
  });
  const createWalkIn = useMutation(
    trpc.resort.reservations.create.mutationOptions({
      onSuccess: async (booking) => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter()),
          queryClient.invalidateQueries(trpc.resort.reservations.list.queryFilter()),
          queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter()),
        ]);
        setWalkInOpen(false);

        if (booking.emailNotificationSent) {
          toast.success("Walk-in saved. Confirmation email sent.");
        } else if (booking.emailNotificationError) {
          toast(`Walk-in saved, but email failed: ${booking.emailNotificationError}`, {
            icon: "⚠️",
          });
        } else {
          toast.success("Walk-in saved.");
        }
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateStatus = useMutation(
    trpc.resort.reception.updateReservationStatus.mutationOptions({
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter());
        toast.success(
          variables.status === "Completed"
            ? "Check-out completed."
            : variables.status === "Checking out"
              ? "Check-out started."
              : "Guest checked in.",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createRequest = useMutation(
    trpc.resort.reception.createRequest.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter());
        toast.success("Request sent.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createShiftNote = useMutation(
    trpc.resort.reception.createShiftNote.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter());
        toast.success("Shift note saved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const resolveRequest = useMutation(
    trpc.resort.reception.resolveRequest.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter());
        toast.success("Request resolved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const billing = useQuery({
    ...trpc.resort.reception.getBilling.queryOptions({
      reservationId: billingReservationId,
    }),
    enabled: Boolean(billingReservationId),
    retry: false,
  });
  const createCharge = useMutation(
    trpc.resort.reception.createFolioCharge.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter()),
          queryClient.invalidateQueries(
            trpc.resort.reception.getBilling.queryFilter({
              reservationId: billingReservationId,
            }),
          ),
        ]);
        toast.success("Folio charge added.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const generateInvoice = useMutation(
    trpc.resort.reception.generateInvoiceFromFolio.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter()),
          queryClient.invalidateQueries(
            trpc.resort.reception.getBilling.queryFilter({
              reservationId: billingReservationId,
            }),
          ),
          queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter()),
        ]);
        toast.success("Invoice generated from folio.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const recordPayment = useMutation(
    trpc.resort.reception.recordPayment.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.resort.reception.list.queryFilter()),
          queryClient.invalidateQueries(
            trpc.resort.reception.getBilling.queryFilter({
              reservationId: billingReservationId,
            }),
          ),
          queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter()),
          queryClient.invalidateQueries(trpc.resort.financeEntries.list.queryFilter()),
        ]);
        toast.success("Payment recorded. Invoices marked paid.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const guests = useMemo(
    () => (reception.data?.guests ?? []) as ReceptionGuest[],
    [reception.data?.guests],
  );
  const requests = useMemo(
    () => (reception.data?.requests ?? []) as ReceptionRequest[],
    [reception.data?.requests],
  );
  const shiftNotes = useMemo(
    () => (reception.data?.shiftNotes ?? []) as ReceptionShiftNote[],
    [reception.data?.shiftNotes],
  );

  const filteredGuests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return guests;
    }

    return guests.filter((guest) =>
      [guest.guest, guest.room, guest.id, guest.source, guest.note]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [guests, search]);

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Arrivals",
        value: String(guests.filter((guest) => guest.status === "Arriving").length),
        note: "Expected today",
        icon: <DoorOpen className="size-4" />,
      },
      {
        title: "In-house",
        value: String(guests.filter((guest) => guest.status === "In-house").length),
        note: "Currently checked in",
        icon: <Users className="size-4" />,
      },
      {
        title: "Check-outs",
        value: String(
          guests.filter((guest) => guest.status === "Checking out").length,
        ),
        note: "Due today",
        icon: <DoorClosed className="size-4" />,
      },
      {
        title: "Needs attention",
        value: String(
          guests.filter((guest) => guest.priority === "Attention").length,
        ),
        note: "Balance, ID, or request",
        icon: <MessageSquareText className="size-4" />,
      },
    ],
    [guests],
  );

  function handleUpdateStatus(id: string, status: ReceptionStatus) {
    if (status === "Arriving") {
      return;
    }

    updateStatus.mutate({
      id,
      status,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button size="xs" onClick={() => setWalkInOpen(true)} type="button">
          <Plus className="size-4" />
          New walk-in
        </Button>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <Card className="gap-0! h-fit overflow-hidden rounded-xl border-zinc-200 bg-white p-0!">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <h1 className="text-base font-bold text-zinc-950">
                Front desk queue
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Handle arrivals, in-house requests, and check-outs.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                className="h-9 rounded-lg pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search guest, room, or note"
                value={search}
              />
            </div>
          </div>

          <div className="grid min-h-160 divide-y divide-zinc-200 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
            {STATUS_ORDER.filter((status) => status !== "Completed").map(
              (status) => (
                <ReceptionColumn
                  guests={filteredGuests.filter((guest) => guest.status === status)}
                  key={status}
                  status={status}
                  updatingId={
                    updateStatus.isPending ? (updateStatus.variables?.id ?? "") : ""
                  }
                  onOpenBilling={setBillingReservationId}
                  onUpdateStatus={handleUpdateStatus}
                />
              ),
            )}
          </div>
        </Card>

        <aside className="space-y-5">
          <GuestLookupCard guests={guests} />
          <RequestHandoffCard
            departments={(departments.data ?? []) as ReceptionDepartment[]}
            guests={guests}
            isPending={createRequest.isPending}
            requests={requests}
            resolvingId={resolveRequest.variables?.id ?? ""}
            onCreate={(input) => createRequest.mutateAsync(input)}
            onResolve={(id) => resolveRequest.mutate({ id })}
          />
          <ShiftNotesCard
            isPending={createShiftNote.isPending}
            notes={shiftNotes}
            onCreate={(input) => createShiftNote.mutateAsync(input)}
          />
        </aside>
      </div>

      <NewWalkInDialog
        isPending={createWalkIn.isPending}
        open={walkInOpen}
        guests={registeredGuests.data ?? []}
        guestsLoading={registeredGuests.isPending}
        onOpenChange={setWalkInOpen}
        onSave={(input) => createWalkIn.mutate(input)}
      />
      <BillingSheet
        billing={billing.data}
        isLoading={billing.isPending}
        open={Boolean(billingReservationId)}
        reservationId={billingReservationId}
        addingCharge={createCharge.isPending}
        generatingInvoice={generateInvoice.isPending}
        recordingPayment={recordPayment.isPending}
        onAddCharge={(input) => createCharge.mutate(input)}
        onGenerateInvoice={() =>
          generateInvoice.mutate({ reservationId: billingReservationId })
        }
        onOpenChange={(open) => setBillingReservationId(open ? billingReservationId : "")}
        onRecordPayment={(input) => recordPayment.mutate(input)}
      />
    </div>
  );
}

function ReceptionColumn({
  guests,
  onUpdateStatus,
  onOpenBilling,
  status,
  updatingId,
}: {
  guests: ReceptionGuest[];
  onOpenBilling: (id: string) => void;
  onUpdateStatus: (id: string, status: ReceptionStatus) => void;
  status: ReceptionStatus;
  updatingId: string;
}) {
  return (
    <section className="bg-zinc-50/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("rounded-md", STATUS_STYLES[status])} variant="outline">
            {status}
          </Badge>
          <span className="text-xs font-bold text-zinc-500">{guests.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {guests.map((guest) => (
          <GuestQueueCard
            guest={guest}
            key={guest.id}
            isUpdating={updatingId === guest.id}
            onOpenBilling={onOpenBilling}
            onUpdateStatus={onUpdateStatus}
          />
        ))}

        {guests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
            <CheckCircle2 className="mx-auto size-6 text-zinc-500" />
            <p className="mt-3 text-sm font-bold text-zinc-950">Queue clear</p>
            <p className="mt-1 text-xs text-zinc-500">
              No guests in this lane.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GuestQueueCard({
  guest,
  isUpdating,
  onUpdateStatus,
  onOpenBilling,
}: {
  guest: ReceptionGuest;
  isUpdating: boolean;
  onOpenBilling: (id: string) => void;
  onUpdateStatus: (id: string, status: ReceptionStatus) => void;
}) {
  function contactGuest() {
    if (!guest.guestPhone) {
      toast.error("No phone number on this guest.");
      return;
    }

    window.open(`tel:${guest.guestPhone.replace(/[^\d+]/g, "")}`, "_self");
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-bold text-zinc-950">{guest.guest}</h2>
            <Badge
              className={cn("rounded-md", PRIORITY_STYLES[guest.priority])}
              variant="outline"
            >
              {guest.priority}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {guest.id} • {guest.source}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" type="button" variant="ghost">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              disabled={isUpdating}
              onClick={() => onUpdateStatus(guest.id, "In-house")}
            >
              <UserRoundCheck className="size-4" />
              Mark checked in
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdating}
              onClick={() => onUpdateStatus(guest.id, "Checking out")}
            >
              <DoorClosed className="size-4" />
              Start check-out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOpenBilling(guest.id)}>
              <ReceiptText className="size-4" />
              Payment / bills
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUpdating}
              onClick={() => onUpdateStatus(guest.id, "Completed")}
            >
              <CheckCircle2 className="size-4" />
              Complete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Detail label="Room" value={guest.room} />
        <Detail label="Time" value={guest.time} />
        <Detail label="Guests" value={guest.pax} />
        <Detail
          label="Balance"
          value={guest.balance > 0 ? currency.format(guest.balance) : "--"}
        />
        <Detail
          label="Check-in date"
          value={formatDate(guest.checkIn)}
        />
      </div>

      <NotePreview className="mt-4" note={guest.note} />

      <div className="mt-4 flex items-center gap-2">
        {guest.status === "Arriving" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Check in guest"
                disabled={isUpdating}
                onClick={() => onUpdateStatus(guest.id, "In-house")}
                size="icon-sm"
                type="button"
              >
                <UserRoundCheck className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Check in guest</TooltipContent>
          </Tooltip>
        ) : null}
        {guest.status === "Checking out" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Complete check-out"
                disabled={isUpdating}
                onClick={() => onUpdateStatus(guest.id, "Completed")}
                size="icon-sm"
                type="button"
              >
                <CheckCircle2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Complete check-out</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Open billing"
              onClick={() => onOpenBilling(guest.id)}
              size="icon-sm"
              type="button"
              variant={guest.balance > 0 ? "default" : "outline"}
            >
              <ReceiptText className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Payment and bills</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Contact guest"
              onClick={contactGuest}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <Phone className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Contact guest</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function NotePreview({
  className,
  note,
}: {
  className?: string;
  note: string;
}) {
  const hasNote = Boolean(note.trim());

  return (
    <div className={cn("rounded-lg border border-zinc-200 bg-zinc-50 p-3", className)}>
      <p className="line-clamp-3 text-sm font-medium leading-5 text-zinc-700">
        {hasNote ? note : "No internal notes."}
      </p>
      {hasNote ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="mt-2 text-xs font-semibold text-zinc-950 underline underline-offset-4 hover:text-zinc-600"
              type="button"
            >
              View full notes
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-96 max-w-[calc(100vw-2rem)] gap-2 p-4">
            <p className="text-sm font-bold text-zinc-950">Internal notes</p>
            <p className="max-h-72 overflow-y-auto pr-1 text-sm leading-6 whitespace-pre-wrap text-zinc-700">
              {note}
            </p>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

function GuestLookupCard({ guests }: { guests: ReceptionGuest[] }) {
  const [query, setQuery] = useState("");
  const lookupGuests = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = term
      ? guests.filter((guest) =>
          [guest.guest, guest.room, guest.status, guest.note, guest.pax]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : [...guests].sort((a, b) =>
          a.priority === b.priority ? 0 : a.priority === "Attention" ? -1 : 1,
        );

    return source.slice(0, 5);
  }, [guests, query]);

  function contactGuest(guest: ReceptionGuest) {
    if (!guest.guestPhone) {
      toast.error("No phone number on this guest.");
      return;
    }

    window.open(`tel:${guest.guestPhone.replace(/[^\d+]/g, "")}`, "_self");
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Search className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">Guest lookup</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quick search for front desk handoff.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Search</Label>
        <Input
          className="rounded-lg"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Guest name, room code, status, or note"
          value={query}
        />
      </div>

      <div className="space-y-3">
        {lookupGuests.map((guest) => (
          <div
            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3"
            key={guest.id}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold text-zinc-950">
                  {guest.guest}
                </p>
                <Badge
                  className={cn("rounded-md", STATUS_STYLES[guest.status])}
                  variant="outline"
                >
                  {guest.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-medium text-zinc-500">{guest.room}</p>
              <NotePreview className="mt-3" note={guest.note} />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Contact ${guest.guest}`}
                  onClick={() => contactGuest(guest)}
                  size="icon-xs"
                  type="button"
                  variant="outline"
                >
                  <Phone className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Contact guest</TooltipContent>
            </Tooltip>
          </div>
        ))}
        {lookupGuests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
            No matching guest found.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

type WalkInGuestMode = "manual" | "registered";

type WalkInGuestOption = {
  displayName: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
};

function NewWalkInDialog({
  guests,
  guestsLoading,
  isPending,
  onOpenChange,
  onSave,
  open,
}: {
  guests: WalkInGuestOption[];
  guestsLoading: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    adults: number;
    checkIn: string;
    checkOut: string;
    children: number;
    deposit?: string;
    guestAccountId?: string;
    guestEmail?: string;
    guestName: string;
    guestPhone?: string;
    notes?: string;
    paymentMethod?: string;
    rate: string;
    status: "Checked in";
    totalAmount: string;
  }) => void;
  open: boolean;
}) {
  const defaultDates = getDefaultDates();
  const [guestMode, setGuestMode] = useState<WalkInGuestMode>("registered");
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
  });
  const nights = getNights(values.checkIn, values.checkOut);
  const rateAmount = parseMoney(values.rate);
  const resortTotal = Math.max(rateAmount * nights, 0);
  const depositAmount = parseMoney(values.deposit);
  const balance = Math.max(resortTotal - depositAmount, 0);
  const guestName = [values.firstName, values.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const isRegisteredGuest = guestMode === "registered";
  const canSubmit =
    Boolean(guestName && values.checkIn && values.checkOut && rateAmount > 0) &&
    nights > 0 &&
    !isPending;

  function updateValue<Key extends keyof typeof values>(
    key: Key,
    value: (typeof values)[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function changeGuestMode(mode: WalkInGuestMode) {
    setGuestMode(mode);
    setValues((current) => ({
      ...current,
      email: "",
      firstName: "",
      guestAccountId: "",
      lastName: "",
      phone: "",
    }));
  }

  function selectRegisteredGuest(guestId: string) {
    const guest = guests.find((item) => item.id === guestId);
    if (!guest) return;

    const displayNameParts = guest.displayName.trim().split(/\s+/);
    setValues((current) => ({
      ...current,
      email: guest.email,
      firstName: guest.firstName || displayNameParts[0] || "",
      guestAccountId: guest.id,
      lastName:
        guest.lastName ||
        (displayNameParts.length > 1 ? displayNameParts.slice(1).join(" ") : ""),
      phone: guest.phone,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    onSave({
      adults: values.adults,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      children: values.children,
      deposit: values.deposit,
      guestAccountId: values.guestAccountId || undefined,
      guestEmail: values.email,
      guestName,
      guestPhone: values.phone,
      notes: values.notes,
      paymentMethod: values.paymentMethod,
      rate: String(rateAmount),
      status: "Checked in",
      totalAmount: String(resortTotal),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 max-w-xl!" side="right">
        <SheetHeader className="border-b border-zinc-200 px-6 py-5">
          <SheetTitle>New walk-in</SheetTitle>
          <SheetDescription>
            Create an exclusive whole-resort booking and check the guest in.
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-4">
              <WalkInSectionTitle icon={<UserRound className="size-4" />} title="Guest details">
                Select an Alrio guest account or enter a walk-in guest manually.
              </WalkInSectionTitle>

              <Tabs
                value={guestMode}
                onValueChange={(value) => changeGuestMode(value as WalkInGuestMode)}
              >
                <TabsList className="grid h-10 w-full grid-cols-2">
                  <TabsTrigger value="registered">Registered guest</TabsTrigger>
                  <TabsTrigger value="manual">Manual entry</TabsTrigger>
                </TabsList>
              </Tabs>

              {isRegisteredGuest ? (
                <WalkInField label="Guest account">
                  <Select value={values.guestAccountId} onValueChange={selectRegisteredGuest}>
                    <SelectTrigger className="h-10 w-full rounded-lg">
                      <SelectValue placeholder="Select a registered guest" />
                    </SelectTrigger>
                    <SelectContent>
                      {guestsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading registered guests...
                        </SelectItem>
                      ) : null}
                      {!guestsLoading && !guests.length ? (
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
                    Choosing an account links this booking to the registered guest.
                  </p>
                </WalkInField>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <WalkInField label="First name">
                  <Input
                    className="rounded-lg read-only:bg-zinc-50 read-only:text-zinc-600"
                    onChange={(event) => updateValue("firstName", event.target.value)}
                    placeholder="Mika"
                    readOnly={isRegisteredGuest}
                    value={values.firstName}
                  />
                </WalkInField>
                <WalkInField label="Last name">
                  <Input
                    className="rounded-lg read-only:bg-zinc-50 read-only:text-zinc-600"
                    onChange={(event) => updateValue("lastName", event.target.value)}
                    placeholder="Santos"
                    readOnly={isRegisteredGuest}
                    value={values.lastName}
                  />
                </WalkInField>
              </div>

              <WalkInField label="Email (optional)">
                <Input
                  className="rounded-lg read-only:bg-zinc-50 read-only:text-zinc-600"
                  onChange={(event) => updateValue("email", event.target.value)}
                  placeholder="guest@email.com"
                  readOnly={isRegisteredGuest}
                  type="email"
                  value={values.email}
                />
              </WalkInField>
              <WalkInField label="Phone number (optional)">
                <PhoneNumberInput
                  groupClassName="rounded-lg"
                  id="walkInGuestPhone"
                  onChange={(value) => updateValue("phone", value)}
                  value={values.phone}
                />
              </WalkInField>
            </section>

            <section className="space-y-4 border-t border-zinc-200 pt-6">
              <WalkInSectionTitle icon={<CalendarDays className="size-4" />} title="Stay details">
                Reserve Alrio exclusively for the selected dates and guest count.
              </WalkInSectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <WalkInField label="Check-in">
                  <Input
                    className="rounded-lg"
                    onChange={(event) => updateValue("checkIn", event.target.value)}
                    type="date"
                    value={values.checkIn}
                  />
                </WalkInField>
                <WalkInField label="Check-out">
                  <Input
                    className="rounded-lg"
                    onChange={(event) => updateValue("checkOut", event.target.value)}
                    type="date"
                    value={values.checkOut}
                  />
                </WalkInField>
                <WalkInField label="Adults">
                  <Input
                    className="rounded-lg"
                    min={1}
                    onChange={(event) => updateValue("adults", Number(event.target.value))}
                    type="number"
                    value={values.adults}
                  />
                </WalkInField>
                <WalkInField label="Children">
                  <Input
                    className="rounded-lg"
                    min={0}
                    onChange={(event) => updateValue("children", Number(event.target.value))}
                    type="number"
                    value={values.children}
                  />
                </WalkInField>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                This walk-in blocks the entire Alrio Private Resort. All guest rooms and
                resort facilities are included; no room is assigned separately.
              </div>
              <p className="text-xs font-medium text-zinc-500">
                Walk-ins are saved as <span className="font-semibold text-zinc-800">Checked in</span> immediately.
              </p>
            </section>

            <section className="space-y-4 border-t border-zinc-200 pt-6">
              <WalkInSectionTitle icon={<CreditCard className="size-4" />} title="Payment">
                Track deposit, balance, and collection method.
              </WalkInSectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <WalkInField label="Whole-resort rate per night">
                  <Input
                    className="rounded-lg"
                    inputMode="decimal"
                    onChange={(event) => updateValue("rate", event.target.value)}
                    placeholder="30000"
                    value={values.rate}
                  />
                </WalkInField>
                <WalkInField label="Payment method (optional)">
                  <Select
                    value={values.paymentMethod}
                    onValueChange={(value) => updateValue("paymentMethod", value)}
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                      <SelectItem value="E-wallet">E-wallet</SelectItem>
                      <SelectItem value="Credit card">Credit card</SelectItem>
                    </SelectContent>
                  </Select>
                </WalkInField>
                <WalkInField label="Deposit paid (optional)">
                  <Input
                    className="rounded-lg"
                    inputMode="decimal"
                    onChange={(event) => updateValue("deposit", event.target.value)}
                    placeholder="0"
                    value={values.deposit}
                  />
                </WalkInField>
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Resort total</p>
                    <p className="mt-1 text-sm font-bold text-zinc-950">{currency.format(resortTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Balance due</p>
                    <p className="mt-1 text-sm font-bold text-zinc-950">{currency.format(balance)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-2 border-t border-zinc-200 pt-6">
              <Label htmlFor="walkInNotes">Internal notes (optional)</Label>
              <Textarea
                className="min-h-24 rounded-lg"
                id="walkInNotes"
                onChange={(event) => updateValue("notes", event.target.value)}
                placeholder="ID check, arrival requests, payment notes, or handoff details..."
                value={values.notes}
              />
            </section>
          </div>

          <SheetFooter className="border-t border-zinc-200 bg-white p-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-zinc-500">Resort total</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-950">{currency.format(resortTotal)}</p>
                </div>
                <div className="pb-1 text-right text-sm text-zinc-500">
                  <p>{Math.max(nights, 0)} night{nights === 1 ? "" : "s"}</p>
                  <p className="font-medium text-zinc-700">Deposit: {currency.format(depositAmount)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={!canSubmit} type="submit">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save and check in"
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function WalkInField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function WalkInSectionTitle({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700">
        {icon}
      </span>
      <div>
        <h3 className="font-semibold text-zinc-950">{title}</h3>
        <p className="mt-0.5 text-sm text-zinc-500">{children}</p>
      </div>
    </div>
  );
}

type BillingData = {
  balanceDue: string;
  charges: Array<{
    amount: string;
    code: string;
    description: string;
    id: string;
    invoiceCode: string;
    quantity: number;
    rate: string;
    status: string;
    type: string;
  }>;
  invoiceTotal: string;
  invoices: Array<{
    balanceDue: string;
    code: string;
    id: string;
    status: string;
    totalAmount: string;
  }>;
  paymentLogs: Array<{
    amount: string;
    code: string;
    invoiceCode: string;
    paidAt: Date | string;
    paymentMethod: string;
    proofNote: string;
    proofUrl: string;
    status: string;
  }>;
  paymentTotal: string;
  reservation: {
    checkIn: Date | string;
    checkOut: Date | string;
    guestName: string;
    id: string;
    roomLabel: string;
  };
  subFolioTotal: string;
  unbilledTotal: string;
};

function BillingSheet({
  addingCharge,
  billing,
  generatingInvoice,
  isLoading,
  onAddCharge,
  onGenerateInvoice,
  onOpenChange,
  onRecordPayment,
  open,
  recordingPayment,
  reservationId,
}: {
  addingCharge: boolean;
  billing?: BillingData;
  generatingInvoice: boolean;
  isLoading: boolean;
  onAddCharge: (input: {
    amount: string;
    description: string;
    quantity: number;
    rate: string;
    reservationId: string;
    status: "Un-billed";
    type: "Additional" | "Fee" | "Adjustment";
  }) => void;
  onGenerateInvoice: () => void;
  onOpenChange: (open: boolean) => void;
  onRecordPayment: (input: {
    amount: string;
    invoiceIds: string[];
    paymentMethod: string;
    proofNote?: string;
    proofUrl?: string;
    reservationId: string;
  }) => void;
  open: boolean;
  recordingPayment: boolean;
  reservationId: string;
}) {
  const [charge, setCharge] = useState({
    amount: "",
    description: "",
    quantity: 1,
    rate: "",
    type: "Additional" as "Additional" | "Fee" | "Adjustment",
  });
  const [payment, setPayment] = useState({
    amount: "",
    method: "Cash",
    proofNote: "",
    proofUrl: "",
  });
  const unpaidInvoices = (billing?.invoices ?? []).filter(
    (invoice) => !["Paid", "Void"].includes(invoice.status),
  );
  const unbilledTotal = parseMoney(billing?.unbilledTotal ?? "0");
  const balanceDue = parseMoney(billing?.balanceDue ?? "0");

  function submitCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rate = charge.rate || charge.amount;
    const amount = charge.amount || String(parseMoney(rate) * charge.quantity);

    if (!charge.description.trim() || parseMoney(amount) <= 0) {
      toast.error("Charge description and amount are required.");
      return;
    }

    onAddCharge({
      amount,
      description: charge.description.trim(),
      quantity: charge.quantity,
      rate,
      reservationId,
      status: "Un-billed",
      type: charge.type,
    });
    setCharge({
      amount: "",
      description: "",
      quantity: 1,
      rate: "",
      type: "Additional",
    });
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!payment.method || parseMoney(payment.amount) <= 0) {
      toast.error("Payment method and amount are required.");
      return;
    }

    onRecordPayment({
      amount: payment.amount,
      invoiceIds: unpaidInvoices.map((invoice) => invoice.id),
      paymentMethod: payment.method,
      proofNote: payment.proofNote || undefined,
      proofUrl: payment.proofUrl || undefined,
      reservationId,
    });
    setPayment({
      amount: "",
      method: "Cash",
      proofNote: "",
      proofUrl: "",
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 max-w-2xl!" side="right">
        <SheetHeader className="border-b border-zinc-200 px-6 py-5">
          <SheetTitle>Payment and finalized bills</SheetTitle>
          <SheetDescription>
            Folio charges must become invoices before final billing.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {isLoading || !billing ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-52 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                <Detail label="Booking ref" value={billing.reservation.id} />
                <Detail label="Guest" value={billing.reservation.guestName} />
                <Detail label="Room" value={billing.reservation.roomLabel} />
                <Detail label="Check-in date" value={formatDate(billing.reservation.checkIn)} />
                <Detail label="Sub-folio" value={currency.format(parseMoney(billing.subFolioTotal))} />
                <Detail label="Payment log" value={currency.format(parseMoney(billing.paymentTotal))} />
              </div>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-zinc-950">Sub-booking folio</h3>
                  <Button
                    disabled={generatingInvoice || unbilledTotal <= 0}
                    onClick={onGenerateInvoice}
                    size="xs"
                    type="button"
                  >
                    <FileText className="size-4" />
                    Generate invoice
                  </Button>
                </div>
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  {(billing.charges ?? []).map((item) => (
                    <div
                      className="grid gap-2 border-b border-zinc-100 p-3 text-sm last:border-b-0 md:grid-cols-[1fr_90px_100px]"
                      key={item.id}
                    >
                      <div>
                        <p className="font-bold text-zinc-950">{item.description}</p>
                        <p className="text-xs font-medium text-zinc-500">
                          {item.code} - {item.type} {item.invoiceCode ? `- ${item.invoiceCode}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit rounded-md">
                        {item.status}
                      </Badge>
                      <p className="font-bold text-zinc-950 md:text-right">
                        {currency.format(parseMoney(item.amount))}
                      </p>
                    </div>
                  ))}
                  {!billing.charges.length ? (
                    <p className="p-4 text-sm font-medium text-zinc-500">
                      No folio charges yet.
                    </p>
                  ) : null}
                </div>
              </section>

              <form className="grid gap-3 rounded-xl border border-zinc-200 p-4" onSubmit={submitCharge}>
                <h3 className="text-sm font-bold text-zinc-950">Add charge or fee</h3>
                <div className="grid gap-3 md:grid-cols-[1fr_120px_110px_130px]">
                  <Input
                    className="rounded-lg"
                    placeholder="Description"
                    value={charge.description}
                    onChange={(event) =>
                      setCharge((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                  <Input
                    className="rounded-lg"
                    min={1}
                    type="number"
                    value={charge.quantity}
                    onChange={(event) =>
                      setCharge((current) => ({
                        ...current,
                        quantity: Number(event.target.value),
                      }))
                    }
                  />
                  <Input
                    className="rounded-lg"
                    placeholder="Rate"
                    value={charge.rate}
                    onChange={(event) =>
                      setCharge((current) => ({ ...current, rate: event.target.value }))
                    }
                  />
                  <Input
                    className="rounded-lg"
                    placeholder="Amount"
                    value={charge.amount}
                    onChange={(event) =>
                      setCharge((current) => ({ ...current, amount: event.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Select
                    value={charge.type}
                    onValueChange={(value) =>
                      setCharge((current) => ({
                        ...current,
                        type: value as "Additional" | "Fee" | "Adjustment",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 w-40 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Additional">Additional</SelectItem>
                      <SelectItem value="Fee">Fee</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button disabled={addingCharge} size="xs" type="submit">
                    <Plus className="size-4" />
                    Add un-billed charge
                  </Button>
                </div>
              </form>

              <form className="grid gap-3 rounded-xl border border-zinc-200 p-4" onSubmit={submitPayment}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-zinc-950">Payment form</h3>
                  <Badge variant="outline" className="rounded-md">
                    Balance {currency.format(balanceDue)}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    className="rounded-lg"
                    placeholder="Amount"
                    value={payment.amount}
                    onChange={(event) =>
                      setPayment((current) => ({ ...current, amount: event.target.value }))
                    }
                  />
                  <Select
                    value={payment.method}
                    onValueChange={(value) =>
                      setPayment((current) => ({ ...current, method: value }))
                    }
                  >
                    <SelectTrigger className="h-10 w-full rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                      <SelectItem value="E-wallet">E-wallet</SelectItem>
                      <SelectItem value="Credit card">Credit card</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="rounded-lg"
                    placeholder="Proof of payment URL"
                    value={payment.proofUrl}
                    onChange={(event) =>
                      setPayment((current) => ({ ...current, proofUrl: event.target.value }))
                    }
                  />
                  <Input
                    className="rounded-lg"
                    placeholder="Proof note / SS reference"
                    value={payment.proofNote}
                    onChange={(event) =>
                      setPayment((current) => ({ ...current, proofNote: event.target.value }))
                    }
                  />
                </div>
                <Button
                  disabled={recordingPayment || unpaidInvoices.length === 0 || unbilledTotal > 0}
                  size="xs"
                  type="submit"
                >
                  <ReceiptText className="size-4" />
                  Record payment
                </Button>
                {unbilledTotal > 0 ? (
                  <p className="text-xs font-semibold text-red-600">
                    Generate invoice for un-billed charges before recording final payment.
                  </p>
                ) : null}
              </form>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-950">Payment log</h3>
                {billing.paymentLogs.map((item) => (
                  <div className="rounded-xl border border-zinc-200 p-3 text-sm" key={item.code}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-zinc-950">
                          {item.code} - {item.invoiceCode || "Invoice"}
                        </p>
                        <p className="text-xs font-medium text-zinc-500">
                          {item.paymentMethod} - {formatDate(item.paidAt)} - {item.status}
                        </p>
                      </div>
                      <p className="font-bold text-zinc-950">
                        {currency.format(parseMoney(item.amount))}
                      </p>
                    </div>
                    {item.proofUrl || item.proofNote ? (
                      <p className="mt-2 text-xs font-medium text-zinc-500">
                        {item.proofNote || item.proofUrl}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!billing.paymentLogs.length ? (
                  <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
                    No payment logs yet.
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RequestHandoffCard({
  departments,
  guests,
  isPending,
  onCreate,
  onResolve,
  requests,
  resolvingId,
}: {
  departments: ReceptionDepartment[];
  guests: ReceptionGuest[];
  isPending: boolean;
  onCreate: (input: {
    department: string;
    note: string;
    priority: "Normal" | "Urgent";
    reservationId?: string;
    roomOrArea: string;
  }) => Promise<unknown>;
  onResolve: (id: string) => void;
  requests: ReceptionRequest[];
  resolvingId: string;
}) {
  const activeDepartments = departments.filter(
    (department) => department.status === "Active",
  );
  const departmentOptions = Array.from(
    new Set([
      ...activeDepartments.map((department) => department.name),
      "Front desk",
      "Housekeeping",
      "Maintenance",
    ]),
  );
  const [department, setDepartment] = useState("Front desk");
  const selectedDepartment = department || departmentOptions[0] || "";
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [reservationId, setReservationId] = useState("");
  const [roomOrArea, setRoomOrArea] = useState("");
  const [note, setNote] = useState("");
  const linkedGuest = guests.find((guest) => guest.id === reservationId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetRoomOrArea = roomOrArea || linkedGuest?.room || "";

    if (!targetRoomOrArea.trim()) {
      toast.error("Room or area is required.");
      return;
    }

    if (!note.trim()) {
      toast.error("Request note is required.");
      return;
    }

    if (!selectedDepartment) {
      toast.error("Department is required.");
      return;
    }

    try {
      await onCreate({
        department: selectedDepartment,
        note,
        priority,
        reservationId: reservationId || undefined,
        roomOrArea: targetRoomOrArea,
      });
      setNote("");
      setRoomOrArea("");
      setReservationId("");
      setPriority("Normal");
    } catch {
      // Mutation onError already shows toast.
    }
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Send className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">Send request</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Route guest issue to operations team.
          </p>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Related guest (optional)</Label>
          <Select value={reservationId || "none"} onValueChange={(value) => {
            setReservationId(value === "none" ? "" : value);
            const selectedGuest = guests.find((guest) => guest.id === value);
            if (selectedGuest) {
              setRoomOrArea(selectedGuest.room);
            }
          }}>
            <SelectTrigger className="h-10 w-full min-w-0 overflow-hidden rounded-lg [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
              <SelectValue placeholder="No linked guest" />
            </SelectTrigger>
            <SelectContent className="max-w-[min(30rem,calc(100vw-3rem))]">
              <SelectItem value="none">No linked guest</SelectItem>
              {guests.map((guest) => (
                <SelectItem
                  key={guest.id}
                  value={guest.id}
                  className="max-w-full [&_[data-slot=select-item-text]]:min-w-0 [&_[data-slot=select-item-text]]:truncate"
                >
                  {guest.guest}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {linkedGuest ? (
            <p
              className="truncate text-xs text-zinc-500"
              title={`${linkedGuest.room} · Check-in ${formatDate(linkedGuest.checkIn)}`}
            >
              {linkedGuest.room} · Check-in {formatDate(linkedGuest.checkIn)}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={selectedDepartment} onValueChange={setDepartment}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.map((departmentName) => (
                <SelectItem key={departmentName} value={departmentName}>
                  {departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Room / area</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setRoomOrArea(event.target.value)}
            placeholder="RM-101 or lobby"
            value={roomOrArea}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as "Normal" | "Urgent")}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Request note</Label>
          <Textarea
            className="min-h-24 rounded-lg"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Guest issue, access instruction, preferred time..."
            value={note}
          />
        </div>

        <Button
          className="w-full"
          disabled={
            isPending ||
            !selectedDepartment ||
            !note.trim() ||
            !(roomOrArea.trim() || reservationId)
          }
          type="submit"
        >
          <Send className="size-4" />
          Send handoff
        </Button>
      </form>

      {requests.length ? (
        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Recent handoffs
          </p>
          {requests.slice(0, 3).map((request) => (
            <div
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3"
              key={request.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-950">
                  {request.roomOrArea}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {request.department} • {request.note}
                </p>
              </div>
              {request.status === "Resolved" ? (
                <Badge className="rounded-md border-zinc-200 bg-zinc-100 text-zinc-900" variant="outline">
                  Resolved
                </Badge>
              ) : (
                <Button
                  disabled={resolvingId === request.id}
                  onClick={() => onResolve(request.id)}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  Resolve
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function ShiftNotesCard({
  isPending,
  notes,
  onCreate,
}: {
  isPending: boolean;
  notes: ReceptionShiftNote[];
  onCreate: (input: { note: string; title: string }) => Promise<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Shift note title is required.");
      return;
    }

    if (!note.trim()) {
      toast.error("Shift note is required.");
      return;
    }

    try {
      await onCreate({
        note,
        title,
      });
      setNote("");
      setTitle("");
    } catch {
      // Mutation onError already shows toast.
    }
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Clock3 className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">Shift notes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Visible to next front desk shift.
          </p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Keep RM-101 key at counter"
            value={title}
          />
        </div>
        <div className="space-y-2">
          <Label>Note</Label>
          <Textarea
            className="min-h-20 rounded-lg"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Visible note for next shift..."
            value={note}
          />
        </div>
        <Button
          className="w-full"
          disabled={isPending || !title.trim() || !note.trim()}
          size="sm"
          type="submit"
        >
          <Plus className="size-4" />
          Save note
        </Button>
      </form>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm font-medium text-zinc-500">
            No shift notes yet.
          </div>
        ) : null}
        {notes.slice(0, 4).map((shiftNote, index) => (
          <div className="rounded-xl border border-zinc-200 p-3" key={shiftNote.id}>
            <div className="flex items-center gap-2">
              {index % 2 === 0 ? (
                <BedDouble className="size-4 text-zinc-500" />
              ) : (
                <MessageSquareText className="size-4 text-zinc-500" />
              )}
              <p className="text-sm font-bold text-zinc-950">
                {shiftNote.title}
              </p>
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {shiftNote.note}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
