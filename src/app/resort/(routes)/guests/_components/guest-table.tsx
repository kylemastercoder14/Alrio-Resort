"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { ColumnDef } from "@tanstack/react-table";
import {
  IconEye,
  IconMail,
  IconMapPin,
  IconPhone,
  IconUserCheck,
  IconUserOff,
} from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type GuestRecord = RouterOutputs["resort"]["guests"]["list"][number] & {
  createdAtLabel: string;
  lastActiveLabel: string;
  lastVisitLabel: string;
  nextVisitLabel: string;
};

const COLUMN_MENU = [
  "email",
  "location",
  "bookingCount",
  "nextVisitLabel",
  "accountStatus",
  "profileStatus",
  "createdAtLabel",
] as const;

export function GuestTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const guests = useQuery({
    ...trpc.resort.guests.list.queryOptions(),
    retry: false,
  });
  const setAccountStatus = useMutation(
    trpc.resort.guests.setAccountStatus.mutationOptions({
      onMutate: ({ status }) => {
        toast.loading(
          status === "Disabled"
            ? "Disabling guest account…"
            : "Activating guest account…",
          { id: "guest-account-status" },
        );
      },
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.resort.guests.list.queryKey(),
        });
        toast.success(
          result.status === "Disabled"
            ? "Guest account disabled."
            : "Guest account activated.",
          { id: "guest-account-status" },
        );
      },
      onError: (error) =>
        toast.error(error.message, { id: "guest-account-status" }),
    }),
  );

  if (guests.isPending) {
    return <GuestTableSkeleton />;
  }

  const data: GuestRecord[] = (guests.data ?? []).map((guest) => ({
    ...guest,
    createdAtLabel: formatDate(guest.createdAt),
    lastActiveLabel: guest.lastActive ? formatDateTime(guest.lastActive) : "Never",
    lastVisitLabel: guest.lastVisit ? formatDate(guest.lastVisit) : "--",
    nextVisitLabel: guest.nextVisit ? formatDate(guest.nextVisit) : "--",
  }));
  const columns: ColumnDef<GuestRecord>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all guests"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(Boolean(value))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.displayName}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "displayName",
      header: "Guest",
      cell: ({ row }) => <GuestIdentity guest={row.original} />,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="block truncate">{row.original.email}</span>,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <span className="block truncate">{row.original.location}</span>
      ),
    },
    {
      accessorKey: "bookingCount",
      header: "Bookings",
    },
    {
      accessorKey: "nextVisitLabel",
      header: "Next stay",
    },
    {
      accessorKey: "accountStatus",
      header: "Status",
      cell: ({ row }) => (
        <AccountStatusBadge status={row.original.accountStatus} />
      ),
    },
    {
      accessorKey: "profileStatus",
      header: "Profile",
      cell: ({ row }) => <ProfileBadge status={row.original.profileStatus} />,
    },
    {
      accessorKey: "createdAtLabel",
      header: "Registered",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <GuestRowActions
          guest={row.original}
          isUpdating={
            setAccountStatus.isPending &&
            setAccountStatus.variables?.guestId === row.original.id
          }
          onStatusChange={(status) =>
            setAccountStatus.mutate({ guestId: row.original.id, status })
          }
        />
      ),
      enableHiding: false,
    },
  ];

  return (
    <ReusableDataTable
      columnToggleIds={[...COLUMN_MENU]}
      columns={columns}
      data={data}
      emptyState={{
        title: "No registered guests",
        description: "Guest accounts will appear here after registration.",
      }}
      filterColumnId="accountStatus"
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "Active" },
        { label: "Disabled", value: "Disabled" },
      ]}
      rowLabel="guests"
      searchPlaceholder="Search guests"
    />
  );
}

function GuestIdentity({ guest }: { guest: GuestRecord }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="lg">
        {guest.image ? <AvatarImage src={guest.image} alt="" /> : null}
        <AvatarFallback className="bg-zinc-700 text-xs font-semibold text-white">
          {getInitials(guest.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-semibold text-zinc-950">{guest.displayName}</p>
        <p className="truncate text-xs text-zinc-500">
          {guest.phone || "No phone number"}
        </p>
      </div>
    </div>
  );
}

function ProfileBadge({ status }: { status: GuestRecord["profileStatus"] }) {
  return (
    <Badge
      variant={status === "Complete" ? "default" : status === "Started" ? "secondary" : "outline"}
      className={cn(status === "Complete" && "bg-black text-white")}
    >
      {status}
    </Badge>
  );
}

function AccountStatusBadge({
  status,
}: {
  status: GuestRecord["accountStatus"];
}) {
  return (
    <Badge variant={status === "Disabled" ? "destructive" : "default"}>
      {status}
    </Badge>
  );
}

function GuestRowActions({
  guest,
  isUpdating,
  onStatusChange,
}: {
  guest: GuestRecord;
  isUpdating: boolean;
  onStatusChange: (status: "Active" | "Disabled") => void;
}) {
  const [open, setOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState<
    "activate" | "disable" | null
  >(null);
  const isDisabled = guest.accountStatus === "Disabled";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${guest.displayName}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <IconEye className="size-4" />
            View guest profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isDisabled ? (
            <DropdownMenuItem onSelect={() => setStatusDialog("activate")}>
              <IconUserCheck className="size-4" />
              Activate account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setStatusDialog("disable")}
            >
              <IconUserOff className="size-4" />
              Disable account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={statusDialog !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isUpdating) setStatusDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusDialog === "disable"
                ? `Disable ${guest.displayName}'s account?`
                : `Activate ${guest.displayName}'s account?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialog === "disable"
                ? "The guest will be signed out immediately and cannot sign in until the account is activated again. Their profile and reservation history will not be deleted."
                : "The guest will regain access and can sign in to their Alrio account again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdating}
              onClick={() => {
                onStatusChange(
                  statusDialog === "disable" ? "Disabled" : "Active",
                );
                setStatusDialog(null);
              }}
            >
              {isUpdating
                ? "Updating…"
                : statusDialog === "disable"
                  ? "Disable account"
                  : "Activate account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 p-0 max-w-xl!">
          <SheetHeader className="border-b border-zinc-200 p-5">
            <div className="flex items-center gap-3 pr-8">
              <Avatar size="lg">
                {guest.image ? <AvatarImage src={guest.image} alt="" /> : null}
                <AvatarFallback className="bg-zinc-700 font-semibold text-white">
                  {getInitials(guest.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <SheetTitle className="truncate text-lg font-bold">
                  {guest.displayName}
                </SheetTitle>
                <SheetDescription>Registered guest profile</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 p-5">
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-950">Contact details</h3>
                <DetailRow icon={<IconMail />} label="Email" value={guest.email} />
                <DetailRow
                  icon={<IconPhone />}
                  label="Phone"
                  value={guest.phone || "Not provided"}
                />
                <DetailRow icon={<IconMapPin />} label="Location" value={guest.location} />
              </section>

              <section className="border-t border-zinc-200 pt-5">
                <h3 className="text-sm font-bold text-zinc-950">Guest activity</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <Stat label="Bookings" value={String(guest.bookingCount)} />
                  <Stat label="Account" value={guest.accountStatus} />
                  <Stat label="Profile" value={guest.profileStatus} />
                  <Stat label="Last visit" value={guest.lastVisitLabel} />
                  <Stat label="Next stay" value={guest.nextVisitLabel} />
                  <Stat label="Registered" value={guest.createdAtLabel} />
                  <Stat label="Last active" value={guest.lastActiveLabel} />
                </dl>
              </section>

              <section className="border-t border-zinc-200 pt-5">
                <h3 className="text-sm font-bold text-zinc-950">About the guest</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {guest.about || "No introduction has been added yet."}
                </p>
                {guest.interests.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guest.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="border-t border-zinc-200 pt-5">
                <h3 className="text-sm font-bold text-zinc-950">Stay preferences</h3>
                <dl className="mt-3 space-y-3">
                  <Preference label="Ideal stay" value={guest.preferences.stayStyle} />
                  <Preference label="Visit occasion" value={guest.preferences.visitOccasion} />
                  <Preference label="Visiting with" value={guest.preferences.groupType} />
                  <Preference label="Favorite activity" value={guest.preferences.favoriteActivity} />
                  <Preference label="Preferred schedule" value={guest.preferences.preferredSchedule} />
                  <Preference label="Dining preference" value={guest.preferences.diningPreference} />
                  <Preference label="Special requests" value={guest.preferences.specialRequests} />
                </dl>
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
      <span className="mt-0.5 text-zinc-500 [&>svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-zinc-950">{value}</dd>
    </div>
  );
}

function Preference({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="max-w-[55%] text-right text-sm font-medium text-zinc-950">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function GuestTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-full max-w-sm" />
        <Skeleton className="ml-auto size-9 rounded-lg" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid h-16 grid-cols-[48px_1.4fr_1.5fr_1fr_0.6fr_0.8fr_0.8fr_0.8fr_60px] items-center border-b border-zinc-100 px-4"
          >
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto size-8 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "G"}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
