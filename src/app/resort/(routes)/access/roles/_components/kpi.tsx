"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, UserRoundCheck, UsersRound } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function RoleKpi() {
  const trpc = useTRPC();
  const roles = useQuery({
    ...trpc.resort.accessRoles.list.queryOptions(),
    retry: false,
  });

  const items = useMemo<KpiGridItem[]>(() => {
    const records = roles.data ?? [];
    const totalRoles = records.length;
    const rolesInUse = records.filter((role) => role.usersCount > 0).length;
    const unassignedRoles = totalRoles - rolesInUse;
    const staffAssignments = records.reduce(
      (total, role) => total + role.usersCount,
      0,
    );
    const value = (count: number) =>
      roles.isPending ? <Skeleton className="h-8 w-12" /> : count;

    return [
      {
        title: "Workspace roles",
        value: value(totalRoles),
        note: "Reusable permission sets",
        icon: <ShieldCheck className="size-4" />,
      },
      {
        title: "Roles in use",
        value: value(rolesInUse),
        note: "Assigned to resort staff",
        icon: <UserRoundCheck className="size-4" />,
      },
      {
        title: "Unassigned roles",
        value: value(unassignedRoles),
        note: "Available for future staff",
        icon: <ShieldOff className="size-4" />,
      },
      {
        title: "Staff assignments",
        value: value(staffAssignments),
        note: "Users assigned across roles",
        icon: <UsersRound className="size-4" />,
      },
    ];
  }, [roles.data, roles.isPending]);

  return (
    <KpiGrid
      columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
      items={items}
    />
  );
}
