"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconBan,
  IconCalendarCheck,
  IconUserCheck,
  IconUsersGroup,
} from "@tabler/icons-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function GuestKpi() {
  const trpc = useTRPC();
  const guests = useQuery({
    ...trpc.resort.guests.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const records = guests.data ?? [];
    const activeAccounts = records.filter(
      (guest) => guest.accountStatus === "Active",
    ).length;
    const disabledAccounts = records.filter(
      (guest) => guest.accountStatus === "Disabled",
    ).length;
    const withBookings = records.filter(
      (guest) => guest.bookingCount > 0,
    ).length;
    const value = (count: number) =>
      guests.isPending ? <Skeleton className="h-8 w-12" /> : count;

    return [
      {
        title: "Registered guests",
        value: value(records.length),
        note: "Guest accounts in Alrio",
        icon: <IconUsersGroup className="size-4" />,
      },
      {
        title: "Active accounts",
        value: value(activeAccounts),
        note: "Guests who can sign in",
        icon: <IconUserCheck className="size-4" />,
      },
      {
        title: "Disabled accounts",
        value: value(disabledAccounts),
        note: "Guest access currently blocked",
        icon: <IconBan className="size-4" />,
      },
      {
        title: "Guests with bookings",
        value: value(withBookings),
        note: "Matched reservation history",
        icon: <IconCalendarCheck className="size-4" />,
      },
    ];
  }, [guests.data, guests.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
