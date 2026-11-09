"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, CheckCircle2, Users, Wrench } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function RoomKpi() {
  const trpc = useTRPC();
  const rooms = useQuery({
    ...trpc.resort.rooms.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const records = rooms.data ?? [];
    const value = (count: number) =>
      rooms.isPending ? <Skeleton className="h-8 w-12" /> : count;

    return [
      {
        title: "Total rooms",
        value: value(records.length),
        note: "Configured inventory",
        icon: <BedDouble className="size-4" />,
      },
      {
        title: "Available",
        value: value(records.filter((room) => room.status === "Available").length),
        note: "Ready to sell",
        icon: <CheckCircle2 className="size-4" />,
      },
      {
        title: "Occupied",
        value: value(records.filter((room) => room.status === "Occupied").length),
        note: "Current stays",
        icon: <Users className="size-4" />,
      },
      {
        title: "Needs action",
        value: value(
          records.filter((room) =>
            ["Maintenance", "Out of Service"].includes(room.status),
          ).length,
        ),
        note: "Maintenance or blocked",
        icon: <Wrench className="size-4" />,
      },
    ];
  }, [rooms.data, rooms.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
