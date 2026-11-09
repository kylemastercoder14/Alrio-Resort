"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Edit,
  FileText,
  MoreVertical,
  PauseCircle,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { MoreActions } from "@/components/reusable/more-actions";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
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

type FinanceType = "Expense" | "Revenue";
type FinanceSource = "Auto booking" | "Manual entry" | "Invoice payment";
type FinanceStatus = "Cleared" | "Pending";

type FinanceRow = {
  amount: string;
  category: string;
  code: string;
  department: string;
  description: string;
  entryDate: Date | string;
  id: string;
  origin: "financeEntry" | "invoice";
  recordId: string;
  receiptUrl: string;
  source: FinanceSource;
  status: FinanceStatus;
  type: FinanceType;
  updatedAt: Date | string;
};

const TYPE_STYLES: Record<FinanceType, string> = {
  Revenue: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Expense: "border-black bg-black text-white",
};

const STATUS_STYLES: Record<FinanceStatus, string> = {
  Cleared: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Pending: "border-black bg-black text-white",
};

const COLUMN_MENU = [
  "date",
  "category",
  "department",
  "type",
  "source",
  "amount",
  "status",
] as const;

export function RevenueExpensesView() {
  const trpc = useTRPC();
  const entries = useQuery({
    ...trpc.resort.financeEntries.list.queryOptions(),
    retry: false,
  });
  const invoices = useQuery({
    ...trpc.resort.invoices.list.queryOptions(),
    retry: false,
  });
  const isLoading = entries.isPending || invoices.isPending;
  const data = useMemo(
    () => {
      const financeRows = (entries.data ?? []).map((entry) => ({
        amount: entry.amount,
        category: entry.category,
        code: entry.code,
        department: entry.department,
        description: entry.description,
        entryDate: entry.entryDate,
        id: entry.id,
        date: formatDate(entry.entryDate),
        origin: "financeEntry" as const,
        receiptUrl: entry.receiptUrl,
        recordId: entry.id,
        source: entry.source as FinanceSource,
        status: entry.status as FinanceStatus,
        type: entry.type as FinanceType,
        updatedAt: entry.updatedAt,
      }));
      const invoiceRows = (invoices.data ?? [])
        // Paid invoice collections already create a cleared finance entry. Only
        // expose the remaining receivable here so the same payment is not counted
        // twice in revenue and cash-flow reports.
        .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
        .map((invoice) => ({
            amount: invoice.balanceDue,
            category: "Invoice collection",
            code: invoice.code,
            date: formatDate(invoice.dueDate),
            department: "--",
            description: `${invoice.code} outstanding balance`,
            entryDate: invoice.dueDate,
            id: `invoice-${invoice.id}`,
            origin: "invoice" as const,
            receiptUrl: "",
            recordId: invoice.id,
            source: "Invoice payment" as const,
            status: "Pending" as const,
            type: "Revenue" as const,
            updatedAt: invoice.updatedAt,
          }))
        .filter((invoice) => parseMoney(invoice.amount) > 0);

      return [...financeRows, ...invoiceRows].sort(
        (left, right) => toTime(left.entryDate) - toTime(right.entryDate),
      );
    },
    [entries.data, invoices.data],
  );
  const kpiItems = useMemo<KpiGridItem[]>(() => {
    const revenue = data
      .filter((row) => row.type === "Revenue" && row.status === "Cleared")
      .reduce((total, row) => total + parseMoney(row.amount), 0);
    const expenses = data
      .filter((row) => row.type === "Expense" && row.status === "Cleared")
      .reduce((total, row) => total + parseMoney(row.amount), 0);
    const pending = data.filter((row) => row.status === "Pending").length;
    const value = (content: React.ReactNode) =>
      isLoading ? <Skeleton className="h-8 w-24" /> : content;

    return [
      {
        title: "Revenue",
        value: value(formatPeso(String(revenue))),
        note: "Cleared income",
        icon: <ArrowUpRight className="size-4" />,
      },
      {
        title: "Expenses",
        value: value(formatPeso(String(expenses))),
        note: "Cleared costs",
        icon: <ArrowDownLeft className="size-4" />,
      },
      {
        title: "Net",
        value: value(formatPeso(String(revenue - expenses))),
        note: "Realized revenue minus costs",
        icon: <CircleDollarSign className="size-4" />,
      },
      {
        title: "Pending review",
        value: value(pending),
        note: "Uncleared entries",
        icon: <ReceiptText className="size-4" />,
      },
    ];
  }, [data, isLoading]);
  const columns = useMemo<ColumnDef<FinanceRow & { date: string }>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all finance rows"
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
          aria-label={`Select ${row.original.code}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="min-w-64">
          <p className="font-semibold text-zinc-950">{row.original.description}</p>
          <p className="text-xs text-zinc-500">{row.original.code}</p>
        </div>
      ),
      enableHiding: false,
    },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.original.department || "--",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(TYPE_STYLES[row.original.type])}>
          {row.original.type}
        </Badge>
      ),
    },
    { accessorKey: "source", header: "Source" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatPeso(row.original.amount),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(STATUS_STYLES[row.original.status])}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <FinanceRowActions row={row.original} />,
      enableHiding: false,
    },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <MoreActions
            columns={[
              { header: "Code", key: "code" },
              { header: "Description", key: "description" },
              { header: "Date", key: "date" },
              { header: "Category", key: "category" },
              { header: "Department", key: "department" },
              { header: "Type", key: "type" },
              { header: "Source", key: "source" },
              { header: "Amount", key: "amount" },
              { header: "Status", key: "status" },
              { header: "Receipt", key: "receiptUrl" },
            ]}
            data={data.map((row) => ({
              amount: formatPeso(row.amount),
              category: row.category,
              code: row.code,
              date: row.date,
              department: row.department || "--",
              description: row.description,
              receiptUrl: row.receiptUrl || "--",
              source: row.source,
              status: row.status,
              type: row.type,
            }))}
            filename="revenue-expenses"
            title="Revenue & Expenses"
          />
          <Button size="xs" asChild>
            <Link href="/resort/finance/revenue-expenses/create">
              <Plus className="size-4" />
              Add entry
            </Link>
          </Button>
        </div>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      {isLoading ? (
        <FinanceTableSkeleton />
      ) : (
        <ReusableDataTable
          columnToggleIds={[...COLUMN_MENU]}
          columns={columns}
          data={data}
          emptyState={{
            title: "No revenue or expenses found",
            description: "Add a manual entry to start tracking cash movement.",
          }}
          filterOptions={[
            { label: "All", value: "all" },
            { label: "Revenue", value: "Revenue" },
            { label: "Expense", value: "Expense" },
            { label: "Cleared", value: "Cleared" },
            { label: "Pending", value: "Pending" },
          ]}
          rowLabel="finance rows"
        />
      )}
    </div>
  );
}

function FinanceRowActions({ row }: { row: FinanceRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidate = async () => {
    await queryClient.invalidateQueries(trpc.resort.financeEntries.list.queryFilter());
  };
  const updateStatus = useMutation(
    trpc.resort.financeEntries.updateStatus.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Finance entry updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteEntry = useMutation(
    trpc.resort.financeEntries.delete.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        setConfirmDelete(false);
        toast.success("Finance entry deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (row.origin === "invoice") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/resort/invoices/new?id=${row.recordId}`}>
              <Edit className="size-4" />
              View invoice
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/resort/invoices/reminders">
              <FileText className="size-4" />
              Payment reminders
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild disabled={!row.receiptUrl}>
            <a
              href={row.receiptUrl || undefined}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="size-4" />
              View receipt
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/resort/finance/revenue-expenses/${row.id}`}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({
                id: row.id,
                status: row.status === "Cleared" ? "Pending" : "Cleared",
              })
            }
          >
            {row.status === "Cleared" ? (
              <PauseCircle className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Mark as {row.status === "Cleared" ? "pending" : "cleared"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete entry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete finance entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {row.code} will be removed from revenue and expense records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEntry.mutate({ id: row.id })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FinanceTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-4 border-b border-zinc-100 px-4 py-4">
          <Skeleton className="h-8 w-full" />
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

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-PH");
}

function toTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
