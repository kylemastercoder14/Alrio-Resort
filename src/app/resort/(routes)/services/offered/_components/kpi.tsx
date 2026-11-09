"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Eye, ReceiptText, Wrench } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function ServiceKpi() {
  const trpc = useTRPC();
  const services = useQuery({
    ...trpc.resort.services.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const records = services.data ?? [];
    const value = (count: number) =>
      services.isPending ? <Skeleton className="h-8 w-12" /> : count;

    return [
      {
        title: "Total services",
        value: value(records.length),
        note: "Configured service packages",
        icon: <Wrench className="size-4" />,
      },
      {
        title: "Active",
        value: value(records.filter((service) => service.status === "Active").length),
        note: "Available for booking",
        icon: <BadgeCheck className="size-4" />,
      },
      {
        title: "Booking visible",
        value: value(records.filter((service) => service.showOnBookingPage).length),
        note: "Shown to guests",
        icon: <Eye className="size-4" />,
      },
      {
        title: "Categories",
        value: value(new Set(records.map((service) => service.category)).size),
        note: "Service groups",
        icon: <ReceiptText className="size-4" />,
      },
    ];
  }, [services.data, services.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
