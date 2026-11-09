"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  Boxes,
  Edit,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
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
import { Badge } from "@/components/ui/badge";
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

type PackageStatus = "Active" | "Inactive" | "Archived";

type PackageRow = {
  id: string;
  amenities: Array<{ id: string; code: string; icon: string; name: string }>;
  category: string;
  code: string;
  featured: boolean;
  maxGuests?: number;
  minNights: number;
  name: string;
  price: string;
  rooms: Array<{ id: string; code: string; name: string; type: string }>;
  services: Array<{ id: string; code: string; title: string }>;
  showOnBookingPage: boolean;
  status: PackageStatus;
  updatedAt: Date | string;
};

export default function ServicePackagesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const packages = useQuery({
    ...trpc.resort.packages.list.queryOptions(),
    retry: false,
  });
  const packageRows = useMemo<PackageRow[]>(
    () => (packages.data ?? []).map((pack) => pack as PackageRow),
    [packages.data],
  );
  const invalidatePackages = () =>
    queryClient.invalidateQueries(trpc.resort.packages.list.queryFilter());
  const updateStatus = useMutation(
    trpc.resort.packages.updateStatus.mutationOptions({
      onSuccess: async () => {
        await invalidatePackages();
        toast.success("Package status updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deletePackage = useMutation(
    trpc.resort.packages.delete.mutationOptions({
      onSuccess: async () => {
        await invalidatePackages();
        toast.success("Package deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const columns = useMemo<ColumnDef<PackageRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Package",
        enableHiding: false,
        cell: ({ row }) => (
          <Link
            href={`/resort/services/packages/${row.original.id}`}
            className="block min-w-0 max-w-full"
            title={row.original.name}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-bold text-zinc-950">
                {row.original.name}
              </span>
              {row.original.featured ? (
                <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                  Featured
                </Badge>
              ) : null}
            </span>
            <span className="block truncate text-xs font-medium text-zinc-500">
              {row.original.code}
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <p className="truncate" title={row.original.category}>
            {row.original.category}
          </p>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => (
          <span className="font-bold text-zinc-950">
            {formatPeso(row.original.price)}
          </span>
        ),
      },
      {
        id: "inclusions",
        header: "Inclusions",
        cell: ({ row }) => {
          const label = [
            `${row.original.rooms.length} room${row.original.rooms.length === 1 ? "" : "s"}`,
            `${row.original.services.length} service${row.original.services.length === 1 ? "" : "s"}`,
            `${row.original.amenities.length} amenit${row.original.amenities.length === 1 ? "y" : "ies"}`,
          ].join(" · ");

          return (
            <p className="truncate" title={label}>
              {label}
            </p>
          );
        },
      },
      {
        id: "stayRules",
        header: "Stay rules",
        cell: ({ row }) => (
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium text-zinc-700">
              {row.original.minNights} night minimum
            </p>
            <p className="truncate text-zinc-500">
              {row.original.maxGuests
                ? `${row.original.maxGuests} guests max`
                : "No guest cap"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "showOnBookingPage",
        header: "Booking",
        cell: ({ row }) =>
          row.original.showOnBookingPage ? "Shown" : "Hidden",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <PackageStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <PackageRowActions
            isDeleting={deletePackage.isPending}
            isUpdating={updateStatus.isPending}
            pack={row.original}
            onDelete={(id) => deletePackage.mutate({ id })}
            onUpdateStatus={(id, status) => updateStatus.mutate({ id, status })}
          />
        ),
      },
    ],
    [deletePackage, updateStatus],
  );
  const kpis = useMemo<KpiGridItem[]>(() => {
    const activeCount = packageRows.filter((pack) => pack.status === "Active").length;
    const bookingVisible = packageRows.filter((pack) => pack.showOnBookingPage).length;
    const includedItems = packageRows.reduce(
      (total, pack) =>
        total + pack.rooms.length + pack.services.length + pack.amenities.length,
      0,
    );

    return [
      {
        icon: <Boxes className="size-4" />,
        note: "Total bundles",
        title: "Packages",
        value: packageRows.length,
      },
      {
        icon: <Eye className="size-4" />,
        note: "Shown to guests",
        title: "Booking visible",
        value: bookingVisible,
      },
      {
        icon: <Sparkles className="size-4" />,
        note: "Active packages",
        title: "Active",
        value: activeCount,
      },
      {
        icon: <Archive className="size-4" />,
        note: "Rooms, services, amenities",
        title: "Included items",
        value: includedItems,
      },
    ];
  }, [packageRows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button size="xs" asChild>
          <Link href="/resort/services/packages/create">
            <Plus className="size-4" />
            Add package
          </Link>
        </Button>
      </div>

      <KpiGrid items={kpis} />

      {packages.isPending ? (
        <PackageTableSkeleton />
      ) : (
        <ReusableDataTable
          columnToggleIds={[
            "category",
            "price",
            "inclusions",
            "stayRules",
            "showOnBookingPage",
            "status",
            "updatedAt",
          ]}
          columns={columns}
          data={packageRows}
          emptyState={{
            title: "No packages found",
            description: "Build a package from rooms, services, and amenities.",
          }}
          filterOptions={[
            { label: "All", value: "all" },
            { label: "Active", value: "Active" },
            { label: "Inactive", value: "Inactive" },
            { label: "Archived", value: "Archived" },
          ]}
          preventHorizontalScroll
          rowLabel="packages"
          searchPlaceholder="Search package, category, or code"
        />
      )}
    </div>
  );
}

function PackageRowActions({
  isDeleting,
  isUpdating,
  onDelete,
  onUpdateStatus,
  pack,
}: {
  isDeleting: boolean;
  isUpdating: boolean;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: "Active" | "Inactive") => void;
  pack: PackageRow;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const isActive = pack.status === "Active";
  const nextStatus = isActive ? "Inactive" : "Active";

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Open actions for ${pack.name}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/resort/services/packages/${pack.id}`}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isUpdating}
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
            {isActive ? "Deactivate package" : "Activate package"}
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
            Delete package
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive ? "Deactivate package?" : "Activate package?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pack.name} will be marked as {nextStatus.toLowerCase()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={isUpdating}
              onClick={() => onUpdateStatus(pack.id, nextStatus)}
            >
              {isUpdating ? "Saving..." : `${nextStatus} package`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {pack.name} from the package catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={isDeleting}
              onClick={() => onDelete(pack.id)}
            >
              {isDeleting ? "Deleting..." : "Delete package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PackageStatusBadge({ status }: { status: PackageStatus }) {
  return (
    <Badge
      variant={status === "Archived" ? "destructive" : "outline"}
      className={
        status === "Active"
          ? "rounded-full border-black bg-black px-3 py-0.5 text-xs text-white"
          : "rounded-full px-3 py-0.5 text-xs"
      }
    >
      {status}
    </Badge>
  );
}

function PackageTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-9" />
      </div>
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
    </section>
  );
}

function formatPeso(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) return value || "No price";

  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}
