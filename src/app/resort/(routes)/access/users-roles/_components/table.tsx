"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Edit,
  ImageIcon,
  KeyRound,
  LogIn,
  LogOut,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserX,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { type UserRoleRecord, type UserRoleStatus } from "./data";

const STATUS_STYLES: Record<UserRoleStatus, string> = {
  Active: "border-black bg-black text-white",
  Invited: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Suspended: "",
};

const COLUMN_MENU = [
  "email",
  "role",
  "status",
  "lastActive",
  "phone",
] as const;

export function UserRoleTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const staffUsers = useQuery({
    ...trpc.resort.usersRoles.list.queryOptions(),
    retry: false,
  });
  const suspendStaff = useMutation(
    trpc.resort.usersRoles.suspend.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
      },
    }),
  );
  const activateStaff = useMutation(
    trpc.resort.usersRoles.activate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
      },
    }),
  );
  const deleteStaff = useMutation(
    trpc.resort.usersRoles.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const resendInvitation = useMutation(
    trpc.resort.usersRoles.resendInvitation.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
      },
    }),
  );
  const tableData = useMemo(() => {
    if (!staffUsers.data) {
      return [];
    }

    return staffUsers.data.map((staffUser): UserRoleRecord => {
      const initials = [staffUser.firstName, staffUser.lastName]
        .filter(Boolean)
        .map((name) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return {
        id: staffUser.id,
        name: staffUser.displayName,
        email: staffUser.email,
        image: staffUser.image,
        role: staffUser.roleName,
        status: staffUser.status as UserRoleStatus,
        lastActive: formatLastActive(staffUser.lastActiveAt),
        phone: staffUser.phoneNumber,
        recordType: staffUser.recordType,
        initials: initials || "RC",
      };
    });
  }, [staffUsers.data]);

  if (staffUsers.isPending) {
    return <UserRoleTableSkeleton />;
  }

  const columns: ColumnDef<UserRoleRecord>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all users"
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
      header: "User",
      cell: ({ row }) => (
        <Link
          href={`/resort/access/users/${row.original.id}`}
          className="flex min-w-45 items-center gap-3"
        >
          <Avatar className="size-9">
            {row.original.image ? (
              <AvatarImage
                src={row.original.image}
                alt=""
                className="object-cover"
              />
            ) : null}
            <AvatarFallback>{row.original.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-950">
              {formatCellValue(row.original.name)}
            </p>
          </div>
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => formatCellValue(row.original.email),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => formatCellValue(row.original.role),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === "Suspended" ? "destructive" : "outline"
          }
          className={cn(STATUS_STYLES[row.original.status])}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone Number",
      cell: ({ row }) => formatCellValue(row.original.phone),
    },
    {
      accessorKey: "lastActive",
      header: "Last active",
      cell: ({ row }) => formatCellValue(row.original.lastActive),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <UserRoleRowActions
          isActivating={activateStaff.isPending}
          isDeleting={deleteStaff.isPending}
          isResending={resendInvitation.isPending}
          isSuspending={suspendStaff.isPending}
          row={row.original}
          onActivate={(id) => {
            const toastId = toast.loading("Activating staff...");

            activateStaff.mutate(
              { id },
              {
                onSuccess: () => {
                  toast.success("Staff activated.", { id: toastId });
                },
                onError: (error) => {
                  toast.error(error.message, { id: toastId });
                },
              },
            );
          }}
          onDelete={(deletedRow) =>
            deleteStaff.mutate(
              { id: deletedRow.id },
              {
                onSuccess: () => {
                  toast.success(
                    deletedRow.recordType === "invitation"
                      ? "Invitation revoked."
                      : "Staff deleted.",
                  );
                },
              },
            )
          }
          onResend={(id) => {
            const toastId = toast.loading("Resending invitation...");

            resendInvitation.mutate(
              { id },
              {
                onSuccess: () => {
                  toast.success("Invitation resent.", { id: toastId });
                },
                onError: (error) => {
                  toast.error(error.message, { id: toastId });
                },
              },
            );
          }}
          onSuspend={(id) => {
            const toastId = toast.loading("Suspending staff...");

            suspendStaff.mutate(
              { id },
              {
                onSuccess: () => {
                  toast.success("Staff suspended.", { id: toastId });
                },
                onError: (error) => {
                  toast.error(error.message, { id: toastId });
                },
              },
            );
          }}
        />
      ),
      enableHiding: false,
    },
  ];

  return (
    <ReusableDataTable
      columnToggleIds={[...COLUMN_MENU]}
      columns={columns}
      data={tableData}
      emptyState={{
        title: "No users found",
        description: "Try changing the filters or search term.",
      }}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "active" },
        { label: "Invited", value: "invited" },
        { label: "Suspended", value: "suspended" },
      ]}
      rowLabel="users"
    />
  );
}

function UserRoleRowActions({
  isActivating,
  isDeleting,
  isResending,
  isSuspending,
  onActivate,
  onDelete,
  onResend,
  onSuspend,
  row,
}: {
  isActivating: boolean;
  isDeleting: boolean;
  isResending: boolean;
  isSuspending: boolean;
  onActivate: (id: string) => void;
  onDelete: (row: UserRoleRecord) => void;
  onResend: (id: string) => void;
  onSuspend: (id: string) => void;
  row: UserRoleRecord;
}) {
  const trpc = useTRPC();
  const detailsHref = `/resort/access/users/${row.id}`;
  const displayName = formatCellValue(row.name);
  const isInvitation = row.recordType === "invitation";
  const [activityOpen, setActivityOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const activity = useQuery({
    ...trpc.resort.usersRoles.activity.queryOptions({
      staffProfileId: row.id,
    }),
    enabled: activityOpen && !isInvitation,
    retry: false,
  });

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${displayName}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!isInvitation ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={detailsHref}>
                  <Edit className="size-4" />
                  Edit details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${detailsHref}?focus=password`}>
                  <KeyRound className="size-4" />
                  Change password
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActivityOpen(true)}>
                <Activity className="size-4" />
                View activity logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === "Suspended" ? (
                <DropdownMenuItem
                  disabled={isActivating}
                  onSelect={() => setActivateOpen(true)}
                >
                  <UserCheck className="size-4" />
                  Activate staff
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={isSuspending}
                  onSelect={() => setSuspendOpen(true)}
                >
                  <UserX className="size-4" />
                  Suspend staff
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <DropdownMenuItem
              disabled={isResending}
              onSelect={() => onResend(row.id)}
            >
              <Send className="size-4" />
              {isResending ? "Resending invitation..." : "Resend invitation"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            disabled={isDeleting}
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {isInvitation ? "Revoke invitation" : "Delete staff"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={activityOpen} onOpenChange={setActivityOpen}>
        <SheetContent className="w-full gap-0 p-0 max-w-lg!">
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-lg font-bold">Activity logs</SheetTitle>
            <SheetDescription>
              Recent staff activity for {displayName}.
            </SheetDescription>
          </SheetHeader>
          {activity.isPending ? (
            <div className="space-y-6 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-4">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.isError ? (
            <ActivityEmptyState
              title="Unable to load activity"
              description={activity.error.message}
            />
          ) : activity.data.length === 0 ? (
            <ActivityEmptyState
              title="No activity recorded"
              description="Activity will appear here after this staff member signs in or performs a tracked workspace action."
            />
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <Timeline value={activity.data.length} className="p-6 pl-8">
                {activity.data.map((entry, index) => {
                  const EventIcon = getActivityIcon(entry.action);

                  return (
                    <TimelineItem key={entry.id} step={index + 1}>
                      <TimelineSeparator className="bg-zinc-300!" />
                      <TimelineIndicator className="flex size-9 items-center justify-center border-zinc-800 bg-white text-zinc-700 shadow-xs">
                        <EventIcon className="size-4" />
                      </TimelineIndicator>
                      <TimelineDate dateTime={entry.createdAt.toISOString()}>
                        {formatActivityDate(entry.createdAt)}
                      </TimelineDate>
                      <TimelineTitle className="font-semibold text-zinc-950">
                        {entry.title}
                      </TimelineTitle>
                      <TimelineContent className="leading-5 text-zinc-600">
                        {entry.detail}
                        {entry.ipAddress ? (
                          <span className="mt-1 block text-xs text-zinc-400">
                            IP {entry.ipAddress}
                          </span>
                        ) : null}
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </Timeline>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend staff?</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} will lose active staff status until you update this
              account again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onSuspend(row.id)}
              disabled={isSuspending}
              variant="default"
              size="sm"
            >
              {isSuspending ? "Suspending..." : "Suspend staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={activateOpen} onOpenChange={setActivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate staff?</AlertDialogTitle>
            <AlertDialogDescription>
              {displayName} will regain access to the resort workspace using
              their assigned role and permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onActivate(row.id)}
              disabled={isActivating}
              variant="default"
              size="sm"
            >
              {isActivating ? "Activating..." : "Activate staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isInvitation ? "Revoke invitation?" : "Delete staff?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isInvitation
                ? `This revokes the pending invitation for ${displayName}.`
                : `This permanently removes ${displayName} from this workspace and deletes their login access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              onClick={() => onDelete(row)}
              disabled={isDeleting}
            >
              {isDeleting
                ? isInvitation
                  ? "Revoking..."
                  : "Deleting..."
                : isInvitation
                  ? "Revoke invitation"
                  : "Delete staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActivityEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-12 text-center">
      <div className="max-w-xs">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
          <Activity className="size-5" />
        </div>
        <p className="mt-4 text-sm font-semibold text-zinc-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function getActivityIcon(action: string) {
  if (action === "SIGNED_IN") return LogIn;
  if (action === "SIGNED_OUT") return LogOut;
  if (action === "AVATAR_UPDATED") return ImageIcon;
  if (action === "ROLE_UPDATED" || action === "STATUS_UPDATED") {
    return ShieldCheck;
  }
  if (action === "PROFILE_UPDATED" || action === "PASSWORD_CHANGED") {
    return UserCog;
  }

  return Activity;
}

function formatActivityDate(value: Date) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCellValue(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : "--";
}

function formatLastActive(value: Date | null | undefined) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Never";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const activityDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDifference = Math.round(
    (today.getTime() - activityDay.getTime()) / 86_400_000,
  );
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  if (dayDifference === 0) return `Today, ${time}`;
  if (dayDifference === 1) return `Yesterday, ${time}`;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function UserRoleTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-6 w-16" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-6 w-full max-w-sm" />
        </div>
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-250">
          <div className="grid h-10 grid-cols-[48px_1.6fr_1.6fr_1fr_1fr_1fr_1fr_80px] items-center bg-zinc-50 px-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20 max-w-[80%]" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid h-15 grid-cols-[48px_1.6fr_1.6fr_1fr_1fr_1fr_1fr_80px] items-center border-t border-zinc-100 px-4"
            >
              <Skeleton className="size-4 rounded-sm" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto size-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </section>
  );
}
