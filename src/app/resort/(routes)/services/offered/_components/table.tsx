"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, EyeOff, MoreVertical, Trash2 } from "lucide-react";
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
import { type OfferedService, type OfferedServiceStatus } from "./data";
import { ServiceStatusBadge } from "./status-badge";

export function ServiceTable() {
  const trpc = useTRPC();
  const services = useQuery({
    ...trpc.resort.services.list.queryOptions(),
    retry: false,
  });
  const data = useMemo(
    () =>
      (services.data ?? []).map((service) => ({
        ...(service as OfferedService),
        updatedAtLabel: new Date(service.updatedAt).toLocaleDateString(),
      })),
    [services.data],
  );
  const columns = useMemo<ColumnDef<OfferedService & { updatedAtLabel: string }>[]>(() => [
    {
      accessorKey: "title",
      header: "Service",
      cell: ({ row }) => (
        <Link
          href={`/resort/services/offered/${row.original.id}`}
          className="block min-w-0 max-w-full"
          title={row.original.title}
        >
          <p className="truncate font-bold text-zinc-950">
            {row.original.title}
          </p>
          <p className="text-xs font-medium text-zinc-500">
            {row.original.code}
          </p>
        </Link>
      ),
      enableHiding: false,
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
      accessorKey: "provider",
      header: "Provider",
      cell: ({ row }) => (
        <p className="truncate" title={row.original.provider || undefined}>
          {row.original.provider || "--"}
        </p>
      ),
    },
    {
      accessorKey: "baseCharge",
      header: "Base charge",
      cell: ({ row }) => (
        <div className="min-w-0 max-w-full">
          <p className="font-bold text-zinc-950">
            {formatPeso(row.original.baseCharge)}
          </p>
          <p
            className="truncate text-xs text-zinc-500"
            title={row.original.feeNote || undefined}
          >
            {row.original.feeNote || "--"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "billingType",
      header: "Billing",
    },
    {
      accessorKey: "duration",
      header: "Duration",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <ServiceStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "updatedAtLabel",
      header: "Updated",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ServiceRowActions service={row.original} />,
      enableHiding: false,
    },
  ], []);

  if (services.isPending) {
    return <ServiceTableSkeleton />;
  }

  return (
    <ReusableDataTable
      columnToggleIds={[
        "category",
        "provider",
        "baseCharge",
        "billingType",
        "duration",
        "status",
        "updatedAtLabel",
      ]}
      columns={columns}
      data={data}
      preventHorizontalScroll
      emptyState={{
        title: "No services found",
        description: "Create services guests can request or book.",
      }}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "Active" },
        { label: "Inactive", value: "Inactive" },
      ]}
      rowLabel="services"
      searchPlaceholder="Search service, provider, or category"
    />
  );
}

function ServiceRowActions({ service }: { service: OfferedService }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "delete" | null>(
    null,
  );
  const updateServiceStatus = useMutation(
    trpc.resort.services.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.services.list.queryFilter(),
        );
        toast.success("Service status updated.");
        setConfirmAction(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const deleteService = useMutation(
    trpc.resort.services.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.services.list.queryFilter(),
        );
        toast.success("Service deleted.");
        setConfirmAction(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  function handleConfirm() {
    if (confirmAction === "delete") {
      deleteService.mutate({ id: service.id });
      return;
    }

    updateServiceStatus.mutate({
      id: service.id,
      status: "Inactive" satisfies OfferedServiceStatus,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/resort/services/offered/${service.id}`}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmAction("deactivate")}>
            <EyeOff className="size-4" />
            Deactivate service
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setConfirmAction("delete")}
          >
            <Trash2 className="size-4" />
            Delete service
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "delete" ? "Delete service?" : "Deactivate service?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "delete"
                ? `${service.title} will be removed from service list.`
                : `${service.title} will no longer be available for booking.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ServiceTableSkeleton() {
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

  if (!Number.isFinite(amount)) return value || "--";

  return `\u20b1${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}
