"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { type Room, type ViewMode } from "./data";
import { RoomKpi } from "./kpi";
import { MoreActions } from "./more-actions";
import { RoomGrid } from "./room-grid";
import { RoomTable } from "./table";
import { ViewModeToggle } from "./view-mode-toggle";

export function RoomsView() {
  const trpc = useTRPC();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const rooms = useQuery({
    ...trpc.resort.rooms.list.queryOptions(),
    retry: false,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <MoreActions />
          <Button size="xs" asChild>
            <Link href="/resort/services/rooms/create">
              <Plus className="size-4" />
              Add room
            </Link>
          </Button>
        </div>
      </div>

      <RoomKpi />

      {viewMode === "table" ? (
        <RoomTable viewMode={viewMode} onViewModeChange={setViewMode} />
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
          {rooms.isPending ? (
            <RoomGridSkeleton />
          ) : (
            <RoomGrid rooms={(rooms.data ?? []).map((room) => room as Room)} />
          )}
        </div>
      )}
    </div>
  );
}

function RoomGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-zinc-200 bg-white p-5"
        >
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-3 h-7 w-36" />
          <Skeleton className="mt-2 h-4 w-28" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((__, detailIndex) => (
              <Skeleton key={detailIndex} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
