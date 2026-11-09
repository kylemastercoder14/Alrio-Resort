"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Edit, MoreHorizontal, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { type DepartmentRecord, type DepartmentStatus } from "./data";

const STATUS_STYLES: Record<DepartmentStatus, string> = {
  Active: "border-black bg-black text-white",
  Paused: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Archived: "border-zinc-300 bg-white text-zinc-700",
};

const COLUMN_MENU = [
  "code",
  "head",
  "members",
  "openTasks",
  "status",
  "updatedAtLabel",
] as const;

export function DepartmentTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
    retry: false,
  });
  const updateDepartmentStatus = useMutation(
    trpc.resort.departments.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.departments.list.queryFilter(),
        );
        toast.success("Department status updated.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const deleteDepartment = useMutation(
    trpc.resort.departments.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.departments.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
        toast.success("Department deleted.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const data = useMemo(
    () =>
      (departments.data ?? []).map(
        (
          department,
        ): DepartmentRecord & {
          updatedAtLabel: string;
        } => ({
          ...department,
          status: department.status as DepartmentStatus,
          updatedAtLabel: new Date(department.updatedAt).toLocaleDateString(),
        }),
      ),
    [departments.data],
  );

  if (departments.isPending) {
    return <DepartmentTableSkeleton />;
  }

  const columns: ColumnDef<DepartmentRecord & { updatedAtLabel: string }>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all departments"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(Boolean(value))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Department",
      cell: ({ row }) => (
        <Link
          href={`/resort/access/departments/${row.original.id}`}
          className="block min-w-0"
        >
          <p className="truncate font-semibold text-zinc-950">
            {formatCellValue(row.original.name)}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {formatCellValue(row.original.description)}
          </p>
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => formatCellValue(row.original.code),
    },
    {
      accessorKey: "head",
      header: "Department head",
      cell: ({ row }) => formatCellValue(row.original.head),
    },
    {
      accessorKey: "members",
      header: "Members",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "Archived" ? "destructive" : "outline"}
          className={cn(
            row.original.status !== "Archived" &&
              STATUS_STYLES[row.original.status],
          )}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAtLabel",
      header: "Updated",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DepartmentRowActions
          isDeleting={deleteDepartment.isPending}
          isUpdatingStatus={updateDepartmentStatus.isPending}
          row={row.original}
          onArchive={(id) =>
            updateDepartmentStatus.mutate({ id, status: "Archived" })
          }
          onRestore={(id) =>
            updateDepartmentStatus.mutate({ id, status: "Active" })
          }
          onDelete={(id) => deleteDepartment.mutate({ id })}
        />
      ),
      enableHiding: false,
    },
  ];

  return (
    <ReusableDataTable
      columnToggleIds={[...COLUMN_MENU]}
      columns={columns}
      data={data}
      emptyState={{
        title: "No departments found",
        description: "Create departments to group staff by team.",
      }}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "Active" },
        { label: "Paused", value: "Paused" },
        { label: "Archived", value: "Archived" },
      ]}
      preventHorizontalScroll
      rowLabel="departments"
    />
  );
}

function DepartmentRowActions({
  isDeleting,
  isUpdatingStatus,
  onArchive,
  onDelete,
  onRestore,
  row,
}: {
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  row: DepartmentRecord & { updatedAtLabel: string };
}) {
  const detailsHref = `/resort/access/departments/${row.id}`;
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isArchived = row.status === "Archived";

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${row.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={detailsHref}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isUpdatingStatus}
            onSelect={(event) => {
              event.preventDefault();
              if (isArchived) {
                setRestoreOpen(true);
                return;
              }
              setArchiveOpen(true);
            }}
          >
            <Archive className="size-4" />
            {isArchived ? "Restore department" : "Archive department"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isDeleting}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete department
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive department?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.name} will stay in records but no longer appear as active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => onArchive(row.id)}
            >
              {isUpdatingStatus ? "Archiving..." : "Archive department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore department?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.name} will return to active departments. Its existing staff
              assignments and department details will remain available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={isUpdatingStatus}
              onClick={() => onRestore(row.id)}
            >
              {isUpdatingStatus ? "Restoring..." : "Restore department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {row.name} and clears department assignment from its
              staff members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => onDelete(row.id)}
            >
              {isDeleting ? "Deleting..." : "Delete department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCellValue(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : "--";
}

function DepartmentTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-full max-w-sm" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid h-15 grid-cols-[48px_1.7fr_0.7fr_1fr_0.7fr_0.8fr_0.8fr_60px] items-center border-b border-zinc-100 px-4"
          >
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto size-8 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}
