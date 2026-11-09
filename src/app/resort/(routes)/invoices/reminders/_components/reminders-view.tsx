"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BellRing,
  Clock3,
  Edit,
  MailCheck,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Plus,
  ReceiptText,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type ReminderStatus = "Due soon" | "Sent" | "Overdue" | "Paused";
type ReminderCadence = "Standard" | "Light" | "Strict" | "Paused";

type ReminderRecord = {
  amount: string;
  cadence: ReminderCadence;
  channel: string;
  dueDate: string;
  guest: string;
  id: string;
  invoice: string;
  lastSent: string;
  nextReminder: string;
  status: ReminderStatus;
};

const STATUS_STYLES: Record<ReminderStatus, string> = {
  "Due soon": "border-zinc-200 bg-zinc-100 text-zinc-900",
  Sent: "border-black bg-black text-white",
  Overdue: "border-red-200 bg-red-50 text-red-700",
  Paused: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export function RemindersView() {
  const trpc = useTRPC();
  const invoices = useQuery({
    ...trpc.resort.invoices.list.queryOptions(),
    retry: false,
  });
  const data = useMemo<ReminderRecord[]>(
    () =>
      (invoices.data ?? [])
        .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
        .map((invoice) => ({
          amount: formatPeso(invoice.balanceDue),
          cadence: invoice.reminderCadence as ReminderCadence,
          channel: invoice.guestEmail ? "Email" : "--",
          dueDate: formatDate(invoice.dueDate),
          guest: invoice.guestName,
          id: invoice.id,
          invoice: invoice.code,
          lastSent: formatDateTime(invoice.lastReminderSentAt),
          nextReminder:
            invoice.reminderCadence === "Paused"
              ? "Paused"
              : formatDateTime(invoice.nextReminderAt) || getNextReminderLabel(invoice.dueDate),
          status: getReminderStatus(
            invoice.dueDate,
            invoice.reminderCadence as ReminderCadence,
            invoice.lastReminderSentAt,
            invoice.nextReminderAt,
          ),
        })),
    [invoices.data],
  );
  const kpiItems = useMemo<KpiGridItem[]>(() => {
    const openBalance = data.reduce(
      (total, row) => total + parseMoney(row.amount),
      0,
    );
    const value = (content: React.ReactNode) =>
      invoices.isPending ? <Skeleton className="h-8 w-20" /> : content;

    return [
      {
        title: "Open balance",
        value: value(formatPeso(String(openBalance))),
        note: `Across ${data.length} tracked invoices`,
        icon: <ReceiptText className="size-4" />,
      },
      {
        title: "Due soon",
        value: value(data.filter((row) => row.status === "Due soon").length),
        note: "Within next 72 hours",
        icon: <Clock3 className="size-4" />,
      },
      {
        title: "Overdue",
        value: value(data.filter((row) => row.status === "Overdue").length),
        note: "Needs collection follow-up",
        icon: <BellRing className="size-4" />,
      },
      {
        title: "Ready to send",
        value: value(data.filter((row) => row.channel !== "--").length),
        note: "Email-capable invoices",
        icon: <MailCheck className="size-4" />,
      },
    ];
  }, [data, invoices.isPending]);
  const columns = useMemo<ColumnDef<ReminderRecord>[]>(() => [
    {
      accessorKey: "invoice",
      header: "Invoice",
      cell: ({ row }) => (
        <div className="min-w-48">
          <p className="font-semibold text-zinc-950">{row.original.invoice}</p>
          <p className="text-xs text-zinc-500">{row.original.id}</p>
        </div>
      ),
      enableHiding: false,
    },
    { accessorKey: "guest", header: "Guest" },
    { accessorKey: "amount", header: "Amount" },
    { accessorKey: "dueDate", header: "Due date" },
    { accessorKey: "nextReminder", header: "Next reminder" },
    { accessorKey: "lastSent", header: "Last sent" },
    { accessorKey: "channel", header: "Channel" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(STATUS_STYLES[row.original.status])}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <ReminderRowActions reminder={row.original} />,
      enableHiding: false,
    },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Button variant="outline" size="xs" asChild>
            <Link href="/resort/invoices">Invoices</Link>
          </Button>
          <Button size="xs" asChild>
            <Link href="/resort/invoices/new">
              <Plus className="size-4" />
              Create invoice
            </Link>
          </Button>
        </div>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      {invoices.isPending ? (
        <ReminderSkeleton />
      ) : (
        <ReusableDataTable
          columnToggleIds={[
            "guest",
            "amount",
            "dueDate",
            "nextReminder",
            "lastSent",
            "channel",
            "status",
          ]}
          columns={columns}
          data={data}
          emptyState={{
            title: "No payment reminders found",
            description: "Open invoices with unpaid balance will appear here.",
          }}
          filterOptions={[
            { label: "All", value: "all" },
            { label: "Due soon", value: "Due soon" },
            { label: "Overdue", value: "Overdue" },
            { label: "Sent", value: "Sent" },
            { label: "Paused", value: "Paused" },
          ]}
          rowLabel="reminders"
        />
      )}
    </div>
  );
}

function ReminderRowActions({ reminder }: { reminder: ReminderRecord }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateInvoices = async () => {
    await queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter());
  };
  const sendReminder = useMutation(
    trpc.resort.invoices.sendReminder.mutationOptions({
      onSuccess: async () => {
        await invalidateInvoices();
        toast.success("Reminder email sent.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateCadence = useMutation(
    trpc.resort.invoices.updateReminderCadence.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateInvoices();
        toast.success(
          variables.reminderCadence === "Paused"
            ? "Reminders paused."
            : "Reminders resumed.",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const isPaused = reminder.cadence === "Paused";
  const hasEmail = reminder.channel !== "--";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={!hasEmail || sendReminder.isPending}
          onClick={() => sendReminder.mutate({ id: reminder.id })}
        >
          <Send className="size-4" />
          Send manual email
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/resort/invoices/new?id=${reminder.id}`}>
            <Edit className="size-4" />
            Edit invoice
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isPaused ? (
          <DropdownMenuItem
            disabled={updateCadence.isPending}
            onClick={() => updateCadence.mutate({ id: reminder.id, reminderCadence: "Standard" })}
          >
            <PlayCircle className="size-4" />
            Resume reminders
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={updateCadence.isPending}
            onClick={() => updateCadence.mutate({ id: reminder.id, reminderCadence: "Paused" })}
          >
            <PauseCircle className="size-4" />
            Pause reminders
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReminderSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-5 gap-4 border-b border-zinc-100 px-4 py-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </section>
  );
}

function getReminderStatus(
  dueDate: Date | string,
  cadence: ReminderCadence,
  lastReminderSentAt?: Date | string | null,
  nextReminderAt?: Date | string | null,
): ReminderStatus {
  if (cadence === "Paused") return "Paused";

  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const next = nextReminderAt ? new Date(nextReminderAt) : null;

  if (lastReminderSentAt && next && next > now) return "Sent";
  if (diff < 0) return "Overdue";
  if (diff <= 72 * 60 * 60 * 1000) return "Due soon";
  return "Sent";
}

function getNextReminderLabel(dueDate: Date | string) {
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "--";
  return due.toLocaleDateString("en-PH");
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-PH");
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
