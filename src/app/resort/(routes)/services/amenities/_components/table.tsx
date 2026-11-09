"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Eye, EyeOff, MoreVertical, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { type Amenity } from "./data";
import { AmenityStatusBadge } from "./status-badge";

export function AmenityTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const amenities = useQuery({
    ...trpc.resort.amenities.list.queryOptions(),
    retry: false,
  });
  const updateAmenityStatus = useMutation(
    trpc.resort.amenities.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.amenities.list.queryFilter(),
        );
        toast.success("Amenity status updated.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const deleteAmenity = useMutation(
    trpc.resort.amenities.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.amenities.list.queryFilter(),
        );
        toast.success("Amenity deleted.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const data = useMemo<Amenity[]>(
    () => (amenities.data ?? []).map((amenity) => amenity as Amenity),
    [amenities.data],
  );
  const amenityColumns = useMemo<ColumnDef<Amenity>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Amenity",
        cell: ({ row }) => (
          <Link
            href={`/resort/services/amenities/${row.original.id}`}
            className="flex items-center gap-3"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xl">
              {row.original.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-zinc-950">
                {row.original.name}
              </span>
              <span className="block truncate text-xs font-medium text-zinc-500">
                {row.original.code}
              </span>
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
      },
      {
        accessorKey: "appliesTo",
        header: "Applies to",
      },
      {
        id: "fee",
        header: "Fee",
        cell: ({ row }) =>
          row.original.chargeable
            ? `${formatPesoFee(row.original.feeAmount)} ${row.original.feeUnit}`
            : "--",
      },
      {
        accessorKey: "showOnBookingPage",
        header: "Booking",
        cell: ({ row }) => (row.original.showOnBookingPage ? "Shown" : "--"),
      },
      {
        accessorKey: "sortOrder",
        header: "Sort",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <AmenityStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <AmenityRowActions
            isDeleting={deleteAmenity.isPending}
            isUpdatingStatus={updateAmenityStatus.isPending}
            row={row.original}
            onDelete={(id) => deleteAmenity.mutate({ id })}
            onUpdateStatus={(id, status) =>
              updateAmenityStatus.mutate({ id, status })
            }
          />
        ),
        enableHiding: false,
      },
    ],
    [deleteAmenity, updateAmenityStatus],
  );

  if (amenities.isPending) {
    return <AmenityTableSkeleton />;
  }

  return (
    <ReusableDataTable
      columnToggleIds={[
        "category",
        "appliesTo",
        "fee",
        "showOnBookingPage",
        "sortOrder",
        "status",
      ]}
      columns={amenityColumns}
      data={data}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ]}
      rowLabel="amenities"
      searchPlaceholder="Search amenity, category, or scope"
    />
  );
}

function AmenityRowActions({
  isDeleting,
  isUpdatingStatus,
  onDelete,
  onUpdateStatus,
  row,
}: {
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: "Active" | "Inactive") => void;
  row: Amenity;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const detailsHref = `/resort/services/amenities/${row.id}`;
  const isActive = row.status === "Active";
  const nextStatus = isActive ? "Inactive" : "Active";

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${row.name}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={detailsHref}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isUpdatingStatus}
            onSelect={(event) => {
              event.preventDefault();
              setStatusOpen(true);
            }}
          >
            {isActive ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {isActive ? "Deactivate amenity" : "Activate amenity"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isDeleting}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete amenity
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? "Deactivate amenity?" : "Activate amenity?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {row.name} will be marked as {nextStatus.toLowerCase()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => onUpdateStatus(row.id, nextStatus)}
            >
              {isUpdatingStatus ? "Saving..." : `${nextStatus} amenity`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete amenity?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {row.name} from amenity records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={isDeleting}
              onClick={() => onDelete(row.id)}
            >
              {isDeleting ? "Deleting..." : "Delete amenity"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatPesoFee(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value ? `₱${value}` : "--";
  }

  return `₱${amount.toLocaleString("en-PH")}`;
}

function AmenityTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-9" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-zinc-100 px-4 py-4"
          >
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
