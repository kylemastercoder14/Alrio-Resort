"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

type RoleRecord = {
  description: string;
  id: string;
  name: string;
  permissionsCount: number;
  usersCount: number;
};

export function RoleTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const roles = useQuery({
    ...trpc.resort.accessRoles.list.queryOptions(),
    retry: false,
  });
  const deleteRole = useMutation(
    trpc.resort.accessRoles.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.accessRoles.list.queryFilter(),
        );
        toast.success("Role deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (roles.isPending) {
    return <RoleTableSkeleton />;
  }

  const data: RoleRecord[] = (roles.data ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissionsCount: role.permissions.length,
    usersCount: role.usersCount,
  }));
  const columns: ColumnDef<RoleRecord>[] = [
    {
      accessorKey: "name",
      header: "Role",
      cell: ({ row }) => (
        <Link
          href={`/resort/access/roles/${row.original.id}`}
          title={row.original.name}
          className="block max-w-64 truncate font-semibold text-zinc-950 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span
          title={row.original.description || undefined}
          className="block max-w-full truncate"
        >
          {row.original.description || "--"}
        </span>
      ),
    },
    {
      accessorKey: "permissionsCount",
      header: "Permissions",
      cell: ({ row }) => `${row.original.permissionsCount} selected`,
    },
    {
      accessorKey: "usersCount",
      header: "Users",
      cell: ({ row }) => row.original.usersCount,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RoleActions
          isDeleting={deleteRole.isPending}
          role={row.original}
          onDelete={(id) => deleteRole.mutate({ id })}
        />
      ),
      enableHiding: false,
    },
  ];

  return (
    <ReusableDataTable
      columnToggleIds={["description", "permissionsCount", "usersCount"]}
      columns={columns}
      data={data}
      emptyState={{
        title: "No roles found",
        description: "Create roles before assigning workspace users.",
      }}
      filterOptions={[
        { label: "All", value: "all" },
      ]}
      preventHorizontalScroll
      rowLabel="roles"
    />
  );
}

function RoleActions({
  isDeleting,
  onDelete,
  role,
}: {
  isDeleting: boolean;
  onDelete: (id: string) => void;
  role: RoleRecord;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Open actions for ${role.name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/resort/access/roles/${role.id}`}>
              <Edit className="size-4" />
              Edit role
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={isDeleting}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete role
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {role.name}. Roles assigned to users cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              onClick={() => onDelete(role.id)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoleTableSkeleton() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </section>
  );
}
