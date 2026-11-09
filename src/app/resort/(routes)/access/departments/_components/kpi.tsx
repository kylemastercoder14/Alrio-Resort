"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CircleAlert, UserCheck, Users } from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export function DepartmentKpi() {
  const trpc = useTRPC();
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
    retry: false,
  });
  const items = useMemo<KpiGridItem[]>(() => {
    const records = departments.data ?? [];
    const activeDepartments = records.filter(
      (department) => department.status === "Active",
    ).length;
    const assignedStaff = records.reduce(
      (total, department) => total + department.members,
      0,
    );
    const missingHeads = records.filter(
      (department) => !department.headStaffProfileId,
    ).length;
    const value = (count: number) =>
      departments.isPending ? <Skeleton className="h-8 w-12" /> : count;

    return [
      {
        title: "Departments",
        value: value(records.length),
        note: `${activeDepartments} active teams`,
        icon: <Building2 className="size-4" />,
      },
      {
        title: "Staff assigned",
        value: value(assignedStaff),
        note: "Across all departments",
        icon: <Users className="size-4" />,
      },
      {
        title: "Open tasks",
        value: value(0),
        note: "Needs department action",
        icon: <CircleAlert className="size-4" />,
      },
      {
        title: "Missing heads",
        value: value(missingHeads),
        note: "No department head set",
        icon: <UserCheck className="size-4" />,
      },
    ];
  }, [departments.data, departments.isPending]);

  return <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={items} />;
}
