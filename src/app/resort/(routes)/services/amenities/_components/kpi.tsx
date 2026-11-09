"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Eye, Sparkles, Tags } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function AmenityKpi() {
  const trpc = useTRPC();
  const amenities = useQuery({
    ...trpc.resort.amenities.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const records = amenities.data ?? [];
    const value = (count: number) =>
      amenities.isPending ? <Skeleton className="h-8 w-12" /> : count;

    return [
      {
        title: "Total amenities",
        value: value(records.length),
        note: "Configured guest features",
        icon: <Tags className="size-4" />,
      },
      {
        title: "Active",
        value: value(records.filter((amenity) => amenity.status === "Active").length),
        note: "Available for assignment",
        icon: <BadgeCheck className="size-4" />,
      },
      {
        title: "Booking visible",
        value: value(records.filter((amenity) => amenity.showOnBookingPage).length),
        note: "Shown to guests",
        icon: <Eye className="size-4" />,
      },
      {
        title: "Featured",
        value: value(records.filter((amenity) => amenity.featured).length),
        note: "Highlighted selling points",
        icon: <Sparkles className="size-4" />,
      },
    ];
  }, [amenities.data, amenities.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
