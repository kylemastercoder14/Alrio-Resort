"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function Kpi() {
  const trpc = useTRPC();
  const staffUsers = useQuery({
    ...trpc.resort.usersRoles.list.queryOptions(),
    retry: false,
  });
  const accessRoles = useQuery({
    ...trpc.resort.accessRoles.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const users = staffUsers.data ?? [];
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.status === "Active").length;
    const invitedUsers = users.filter((user) => user.status === "Invited").length;
    const roleCount = accessRoles.data?.length ?? 0;
    const isPending = staffUsers.isPending || accessRoles.isPending;

    return [
      {
        title: "Total users",
        value: isPending ? <Skeleton className="h-8 w-12" /> : totalUsers,
        note: `Across ${roleCount} active roles`,
        icon: <Users className="size-4" />,
      },
      {
        title: "Active users",
        value: isPending ? <Skeleton className="h-8 w-12" /> : activeUsers,
        note: "Ready to access workspace",
        icon: <UserCheck className="size-4" />,
      },
      {
        title: "Invites pending",
        value: isPending ? <Skeleton className="h-8 w-12" /> : invitedUsers,
        note: "Waiting for acceptance",
        icon: <UserPlus className="size-4" />,
      },
      {
        title: "Workspace roles",
        value: isPending ? <Skeleton className="h-8 w-12" /> : roleCount,
        note: "Reusable permission sets",
        icon: <ShieldCheck className="size-4" />,
      },
    ];
  }, [accessRoles.data, accessRoles.isPending, staffUsers.data, staffUsers.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
