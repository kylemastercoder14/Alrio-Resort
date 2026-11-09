"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { type Room, type ViewMode } from "./data";
import { RoomRowActions } from "./row-actions";
import { RoomStatusBadge } from "./status-badge";
import { ViewModeToggle } from "./view-mode-toggle";

export function RoomTable({
  onViewModeChange,
  viewMode,
}: {
  onViewModeChange: (value: ViewMode) => void;
  viewMode: ViewMode;
}) {
  const trpc = useTRPC();
  const rooms = useQuery({
    ...trpc.resort.rooms.list.queryOptions(),
    retry: false,
  });
  const data = useMemo<Room[]>(
    () => (rooms.data ?? []).map((room) => room as Room),
    [rooms.data],
  );
  const roomColumns = useMemo<ColumnDef<Room>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Room",
        cell: ({ row }) => (
          <Link href={`/resort/services/rooms/${row.original.id}`} className="block">
            <p className="font-bold text-zinc-950">{row.original.name}</p>
            <p className="text-xs font-medium text-zinc-500">
              {row.original.code}
            </p>
          </Link>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
      },
      {
        accessorKey: "code",
        header: "Code",
      },
      {
        accessorKey: "building",
        header: "Building",
      },
      {
        accessorKey: "floor",
        header: "Floor",
      },
      {
        accessorKey: "baseRate",
        header: "Base rate",
        cell: ({ row }) => formatPesoRate(row.original.baseRate),
      },
      {
        accessorKey: "maxAdults",
        header: "Occupancy",
        cell: ({ row }) =>
          `${row.original.maxAdults} adults, ${row.original.childrenOccupancy} children`,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <RoomStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <RoomRowActions room={row.original} />,
        enableHiding: false,
      },
    ],
    [],
  );

  if (rooms.isPending) {
    return <RoomTableSkeleton viewMode={viewMode} onViewModeChange={onViewModeChange} />;
  }

  return (
    <ReusableDataTable
      columnToggleIds={[
        "type",
        "code",
        "building",
        "floor",
        "baseRate",
        "maxAdults",
        "status",
      ]}
      columns={roomColumns}
      data={data}
      emptyState={{
        title: "No rooms found",
        description: "Create rooms to build your inventory.",
      }}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Available", value: "Available" },
        { label: "Occupied", value: "Occupied" },
        { label: "Maintenance", value: "Maintenance" },
        { label: "Out of Service", value: "Out of Service" },
      ]}
      rowLabel="rooms"
      searchPlaceholder="Search room, type, or location"
      toolbarActions={
        <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
      }
    />
  );
}

function formatPesoRate(value: string) {
  const trimmed = value.trim();
  const peso = "\u20b1";
  const amount = Number(trimmed.replaceAll(peso, "").replace(/[,\s]/g, ""));

  if (!trimmed) return "--";
  if (!Number.isFinite(amount)) {
    return trimmed.startsWith(peso) ? trimmed : `${peso}${trimmed}`;
  }

  return `${peso}${amount.toLocaleString("en-PH")}`;
}

function RoomTableSkeleton({
  onViewModeChange,
  viewMode,
}: {
  onViewModeChange: (value: ViewMode) => void;
  viewMode: ViewMode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 flex-1" />
        <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
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
