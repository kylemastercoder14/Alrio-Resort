"use client";

import { useQuery } from "@tanstack/react-query";

import { MoreActions as ReusableMoreActions } from "@/components/reusable/more-actions";
import { useTRPC } from "@/trpc/client";

export function MoreActions() {
  const trpc = useTRPC();
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
    retry: false,
  });
  const exportRows = (departments.data ?? []).map((department) => ({
    code: department.code,
    department: department.name,
    email: department.email,
    head: department.head,
    members: department.members,
    notes: department.notes,
    routing: department.routing,
    status: department.status,
    updated: new Date(department.updatedAt).toLocaleString(),
  }));

  return (
    <ReusableMoreActions
      columns={[
        { header: "Department", key: "department" },
        { header: "Code", key: "code" },
        { header: "Department Head", key: "head" },
        { header: "Members", key: "members" },
        { header: "Status", key: "status" },
        { header: "Email", key: "email" },
        { header: "Routing", key: "routing" },
        { header: "Notes", key: "notes" },
        { header: "Updated", key: "updated" },
      ]}
      data={exportRows}
      filename="departments"
      title="Departments"
    />
  );
}
