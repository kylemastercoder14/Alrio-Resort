"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Wallet,
} from "lucide-react";

import { MoreActions } from "@/components/reusable/more-actions";
import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type CashFlowType = "Inflow" | "Outflow";
type CashFlowStatus = "Expected" | "Cleared" | "Scheduled";
type CashFlowRow = {
  amount: string;
  category: string;
  date: Date | string;
  dateLabel: string;
  id: string;
  source: string;
  sourceId: string;
  sourceRecordId: string;
  sourceType: "financeEntry" | "invoice";
  status: CashFlowStatus;
  type: CashFlowType;
};

const TYPE_STYLES: Record<CashFlowType, string> = {
  Inflow: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Outflow: "border-black bg-black text-white",
};

const STATUS_STYLES: Record<CashFlowStatus, string> = {
  Cleared: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Expected: "border-zinc-300 bg-white text-zinc-700",
  Scheduled: "border-black bg-black text-white",
};

export function CashFlowView() {
  const trpc = useTRPC();
  const financeEntries = useQuery({
    ...trpc.resort.financeEntries.list.queryOptions(),
    retry: false,
  });
  const invoices = useQuery({
    ...trpc.resort.invoices.list.queryOptions(),
    retry: false,
  });
  const isLoading = financeEntries.isPending || invoices.isPending;
  const rows = useMemo<CashFlowRow[]>(() => {
    const financeRows = (financeEntries.data ?? []).map((entry) => {
      const type: CashFlowType = entry.type === "Revenue" ? "Inflow" : "Outflow";
      const status: CashFlowStatus =
        entry.status === "Cleared"
          ? "Cleared"
          : type === "Inflow"
            ? "Expected"
            : "Scheduled";

      return {
        amount: entry.amount,
        category: entry.category,
        date: entry.entryDate,
        dateLabel: formatDate(entry.entryDate),
        id: entry.id,
        source: entry.description,
        sourceId: entry.code,
        sourceRecordId: entry.id,
        sourceType: "financeEntry" as const,
        status,
        type,
      };
    });
    const invoiceRows = (invoices.data ?? [])
      // Cleared payments are represented by ResortFinanceEntry records. Open
      // invoice balances are projections only.
      .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
      .map((invoice) => ({
          amount: invoice.balanceDue,
          category: "Invoice collection",
          date: invoice.dueDate,
          dateLabel: formatDate(invoice.dueDate),
          id: `invoice-${invoice.id}`,
          source: `${invoice.code} outstanding balance`,
          sourceId: invoice.roomLabel || invoice.guestName,
          sourceRecordId: invoice.id,
          sourceType: "invoice" as const,
          status: "Expected" as const,
          type: "Inflow" as const,
        }))
      .filter((invoice) => parseMoney(invoice.amount) > 0);

    return [...financeRows, ...invoiceRows].sort(
      (left, right) => toTime(left.date) - toTime(right.date),
    );
  }, [financeEntries.data, invoices.data]);
  const kpiItems = useMemo<KpiGridItem[]>(() => {
    const openingCash = rows
      .filter((row) => row.status === "Cleared")
      .reduce((total, row) => {
        const amount = parseMoney(row.amount);
        return row.type === "Inflow" ? total + amount : total - amount;
      }, 0);
    const expectedInflow = rows
      .filter((row) => row.type === "Inflow" && row.status === "Expected" && isWithinDays(row.date, 14))
      .reduce((total, row) => total + parseMoney(row.amount), 0);
    const scheduledOutflow = rows
      .filter((row) => row.type === "Outflow" && row.status === "Scheduled" && isWithinDays(row.date, 14))
      .reduce((total, row) => total + parseMoney(row.amount), 0);
    const projectedCash = openingCash + expectedInflow - scheduledOutflow;
    const value = (content: React.ReactNode) =>
      isLoading ? <Skeleton className="h-8 w-24" /> : content;

    return [
      {
        title: "Opening cash",
        value: value(formatPeso(String(openingCash))),
        note: "Cleared inflow minus outflow",
        icon: <Wallet className="size-4" />,
      },
      {
        title: "Expected inflow",
        value: value(formatPeso(String(expectedInflow))),
        note: "Next 14 days",
        icon: <ArrowUpRight className="size-4" />,
      },
      {
        title: "Scheduled outflow",
        value: value(formatPeso(String(scheduledOutflow))),
        note: "Next 14 days",
        icon: <ArrowDownLeft className="size-4" />,
      },
      {
        title: "Projected cash",
        value: value(formatPeso(String(projectedCash))),
        note: "After expected movements",
        icon: <CalendarClock className="size-4" />,
      },
    ];
  }, [isLoading, rows]);
  const columns = useMemo<ColumnDef<CashFlowRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.source}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableHiding: false,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <div className="min-w-56">
          <p className="font-semibold text-zinc-950">{row.original.source}</p>
          <p className="text-xs text-zinc-500">{row.original.sourceId}</p>
        </div>
      ),
      enableHiding: false,
    },
    { accessorKey: "dateLabel", header: "Date" },
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn(TYPE_STYLES[row.original.type])}>
          {row.original.type}
        </Badge>
      ),
    },
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
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <MoreActions
          columns={[
            { header: "Source", key: "source" },
            { header: "Reference", key: "sourceId" },
            { header: "Date", key: "dateLabel" },
            { header: "Category", key: "category" },
            { header: "Type", key: "type" },
            { header: "Amount", key: "amount" },
            { header: "Status", key: "status" },
          ]}
          data={rows.map((row) => ({
            amount: formatPeso(row.amount),
            category: row.category,
            dateLabel: row.dateLabel,
            source: row.source,
            sourceId: row.sourceId,
            status: row.status,
            type: row.type,
          }))}
          filename="cash-flow"
          title="Cash Flow"
        />
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      {isLoading ? (
        <CashFlowSkeleton />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            <div className="grid gap-px bg-zinc-200 md:grid-cols-5">
              {rows.slice(0, 5).map((row) => (
                <div key={row.id} className="bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className={cn(TYPE_STYLES[row.type])}>
                      {row.type}
                    </Badge>
                    <span className="text-xs font-bold text-zinc-500">{row.dateLabel}</span>
                  </div>
                  <p className="mt-3 truncate text-xs font-medium text-zinc-950">
                    {row.source}
                  </p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-zinc-950">
                    {formatPeso(row.amount)}
                  </p>
                  <div
                    className={cn(
                      "mt-3 h-1 rounded-full",
                      row.type === "Inflow" ? "bg-zinc-400" : "bg-black",
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
          <ReusableDataTable
            columns={columns}
            data={rows}
            columnToggleIds={["dateLabel", "category", "type", "amount", "status"]}
            rowLabel="cash flow rows"
            filterOptions={[
              { label: "All", value: "all" },
              { label: "Inflow", value: "Inflow" },
              { label: "Outflow", value: "Outflow" },
              { label: "Expected", value: "Expected" },
              { label: "Scheduled", value: "Scheduled" },
              { label: "Cleared", value: "Cleared" },
            ]}
            emptyState={{
              title: "No cash flow rows found",
              description: "Revenue, expenses, and unpaid invoice balances will appear here.",
            }}
          />
          <div className="grid gap-3 md:grid-cols-3">
            {getActionItems(rows).map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className="rounded-xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


function CashFlowSkeleton() {
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

function getActionItems(rows: CashFlowRow[]) {
  const expectedInvoice = rows.find((row) => row.category === "Invoice collection");
  const scheduledOutflow = rows.find((row) => row.type === "Outflow" && row.status === "Scheduled");

  return [
    expectedInvoice
      ? { href: "/resort/invoices/reminders", label: `Follow up ${expectedInvoice.source}` }
      : { href: "/resort/invoices", label: "Review invoice collections" },
    scheduledOutflow
      ? { href: "/resort/finance/revenue-expenses", label: `Confirm ${scheduledOutflow.source}` }
      : { href: "/resort/finance/revenue-expenses/create", label: "Add scheduled outflow" },
    { href: "/resort/finance/revenue-expenses/create", label: "Log cash movement" },
  ];
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-PH");
}

function toTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isWithinDays(value: Date | string, days: number) {
  const time = toTime(value);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(future.getDate() + days);

  return time >= now.getTime() && time <= future.getTime();
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
