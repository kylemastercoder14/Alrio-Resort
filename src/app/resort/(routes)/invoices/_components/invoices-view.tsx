"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { jsPDF as JsPDF } from "jspdf";
import type { ColumnDef } from "@tanstack/react-table";
import { BellRing, Clock3, CreditCard, Edit, FileText, Loader2, MoreVertical, Plus, Printer, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
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

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Void";
type InvoiceRow = {
  balanceDue: string;
  bookingReference: string;
  code: string;
  depositPaid: string;
  discount: string;
  dueDate: Date | string;
  guestEmail: string;
  guestName: string;
  id: string;
  invoiceDate: Date | string;
  lineItems: Array<{
    amount: string;
    description: string;
    id: string;
    quantity: number;
    rate: string;
  }>;
  notes: string;
  paymentInstructions: string;
  paymentMethod: string;
  reservationId: string;
  roomLabel: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  totalAmount: string;
  updatedAt: Date | string;
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft: "border-zinc-300 bg-white text-zinc-900",
  Sent: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Paid: "border-black bg-black text-white",
  Overdue: "border-red-200 bg-red-50 text-red-700",
  Void: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

export function InvoicesView() {
  const trpc = useTRPC();
  const invoices = useQuery({
    ...trpc.resort.invoices.list.queryOptions(),
    retry: false,
  });
  const data = useMemo(
    () =>
      (invoices.data ?? []).map((invoice) => ({
        ...(invoice as InvoiceRow),
        dueDateLabel: formatDate(invoice.dueDate),
        updatedAtLabel: formatDate(invoice.updatedAt),
      })),
    [invoices.data],
  );
  const kpiItems = useMemo<KpiGridItem[]>(() => {
    const records = invoices.data ?? [];
    const openBalance = records
      .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
      .reduce((total, invoice) => total + parseMoney(invoice.balanceDue), 0);
    const dueSoon = records.filter((invoice) => isDueSoon(invoice.dueDate)).length;
    const overdue = records.filter((invoice) => invoice.status === "Overdue").length;
    const value = (content: React.ReactNode) =>
      invoices.isPending ? <Skeleton className="h-8 w-20" /> : content;

    return [
      {
        title: "Open balance",
        value: value(formatPeso(String(openBalance))),
        note: "Unpaid invoice balance",
        icon: <FileText className="size-4" />,
      },
      {
        title: "Due soon",
        value: value(dueSoon),
        note: "Within next 72 hours",
        icon: <Clock3 className="size-4" />,
      },
      {
        title: "Overdue",
        value: value(overdue),
        note: "Needs collection follow-up",
        icon: <BellRing className="size-4" />,
      },
      {
        title: "Total invoices",
        value: value(records.length),
        note: "All saved invoices",
        icon: <FileText className="size-4" />,
      },
    ];
  }, [invoices.data, invoices.isPending]);
  const columns = useMemo<ColumnDef<InvoiceRow & { dueDateLabel: string; updatedAtLabel: string }>[]>(() => [
    {
      accessorKey: "code",
      header: "Invoice",
      cell: ({ row }) => (
        <div className="min-w-48">
          <p className="font-bold text-zinc-950">{row.original.code}</p>
          <p className="text-xs text-zinc-500">{row.original.reservationId || "--"}</p>
        </div>
      ),
      enableHiding: false,
    },
    { accessorKey: "guestName", header: "Guest" },
    {
      accessorKey: "roomLabel",
      header: "Booking",
      cell: ({ row }) => row.original.roomLabel || "--",
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => formatPeso(row.original.totalAmount),
    },
    {
      accessorKey: "balanceDue",
      header: "Balance",
      cell: ({ row }) => formatPeso(row.original.balanceDue),
    },
    { accessorKey: "dueDateLabel", header: "Due date" },
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
      cell: ({ row }) => <InvoiceRowActions invoice={row.original} />,
      enableHiding: false,
    },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Button variant="outline" size="xs" asChild>
            <Link href="/resort/invoices/reminders">Reminders</Link>
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
        <InvoiceTableSkeleton />
      ) : (
        <ReusableDataTable
          columnToggleIds={["guestName", "roomLabel", "totalAmount", "balanceDue", "dueDateLabel", "status"]}
          columns={columns}
          data={data}
          emptyState={{
            title: "No invoices found",
            description: "Create invoices from reservations or manual charges.",
          }}
          filterOptions={[
            { label: "All", value: "all" },
            { label: "Draft", value: "Draft" },
            { label: "Sent", value: "Sent" },
            { label: "Paid", value: "Paid" },
            { label: "Overdue", value: "Overdue" },
          ]}
          rowLabel="invoices"
          searchPlaceholder="Search invoice, guest, or booking"
        />
      )}
    </div>
  );
}

function InvoiceRowActions({ invoice }: { invoice: InvoiceRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const deleteInvoice = useMutation(
    trpc.resort.invoices.delete.mutationOptions({
      onMutate: () => ({ toastId: toast.loading("Deleting invoice...") }),
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter());
        toast.success("Invoice deleted.", { id: context?.toastId });
        setConfirmDelete(false);
      },
      onError: (error, _variables, context) =>
        toast.error(error.message, { id: context?.toastId }),
    }),
  );
  const sendInvoice = useMutation(
    trpc.resort.invoices.send.mutationOptions({
      onMutate: () => ({ toastId: toast.loading("Sending invoice email...") }),
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter());
        toast.success("Invoice email sent to the guest.", { id: context?.toastId });
      },
      onError: (error, _variables, context) =>
        toast.error(error.message, { id: context?.toastId }),
    }),
  );

  async function startPayMongoPayment() {
    setIsStartingPayment(true);
    const toastId = toast.loading("Creating secure PayMongo checkout...");

    try {
      const response = await fetch("/api/paymongo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: invoice.reservationId,
          invoiceId: invoice.id,
          amount: parseMoney(invoice.balanceDue),
        }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error ?? "Unable to create PayMongo checkout.");
      }

      await navigator.clipboard?.writeText(result.checkoutUrl).catch(() => undefined);
      window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      toast.success("PayMongo checkout opened and payment link copied.", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create PayMongo checkout.", {
        id: toastId,
      });
    } finally {
      setIsStartingPayment(false);
    }
  }

  async function handlePrint() {
    const toastId = toast.loading("Preparing invoice PDF...");

    try {
      await printInvoice(invoice);
      toast.success("Invoice PDF downloaded.", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to prepare invoice PDF.", {
        id: toastId,
      });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-50">
          <DropdownMenuItem
            disabled={!invoice.guestEmail || sendInvoice.isPending || invoice.status === "Void"}
            onClick={() => sendInvoice.mutate({ id: invoice.id })}
          >
            {sendInvoice.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {invoice.reservationId &&
          parseMoney(invoice.balanceDue) > 0 &&
          !["Paid", "Void"].includes(invoice.status) ? (
            <>
              <DropdownMenuItem
                disabled={isStartingPayment}
                onClick={() => void startPayMongoPayment()}
              >
                {isStartingPayment ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Pay with PayMongo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={`/resort/invoices/new?id=${invoice.id}`}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handlePrint()}>
            <Printer className="size-4" />
            Print invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Delete invoice
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {invoice.code} will be removed from invoice records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteInvoice.mutate({ id: invoice.id })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InvoiceTableSkeleton() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 items-center gap-3 border-b border-zinc-200 px-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-9" />
      </div>
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

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-PH");
}

function isDueSoon(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const ms = date.getTime() - now.getTime();
  return ms >= 0 && ms <= 72 * 60 * 60 * 1000;
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function printInvoice(invoice: InvoiceRow) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ format: "a4", orientation: "portrait", unit: "pt" });
  const pageWidth = document.internal.pageSize.getWidth();
  const rows = invoice.lineItems.length
    ? invoice.lineItems
    : [
        {
          id: "empty",
          description: invoice.roomLabel || "Exclusive resort stay",
          quantity: 1,
          rate: invoice.totalAmount,
          amount: invoice.totalAmount,
        },
      ];
  const margin = 56;
  const columns = {
    description: margin,
    quantity: 314,
    unitPrice: 406,
    total: 514,
  };
  const black: [number, number, number] = [27, 27, 26];
  const gray: [number, number, number] = [82, 82, 91];

  document.setFillColor(255, 255, 255);
  document.rect(0, 0, pageWidth, document.internal.pageSize.getHeight(), "F");

  const logo = await loadLogoDataUrl();
  if (logo) {
    document.addImage(logo, "PNG", margin, 52, 42, 42);
  } else {
    document.setFillColor(...black);
    document.roundedRect(margin, 52, 42, 42, 8, 8, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.text("A", margin + 21, 78, { align: "center" });
  }

  document.setTextColor(...black);
  document.setFont("times", "normal");
  document.setFontSize(38);
  document.text("Invoice", pageWidth - margin, 85, { align: "right" });

  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("Billed to:", margin, 168);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.text(safe(invoice.guestName), margin, 185);
  document.text(safe(invoice.guestEmail), margin, 199);
  document.text(`Booking: ${safe(invoice.bookingReference || invoice.reservationId)}`, margin, 213);
  drawWrapped(document, safe(invoice.roomLabel || "Alrio Private Resort"), margin, 227, 210, 12, 9, gray);

  const detailX = pageWidth - margin;
  document.setTextColor(...black);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text(`Invoice No. ${invoice.code}`, detailX, 168, { align: "right" });
  document.setFont("helvetica", "normal");
  document.text(formatDate(invoice.invoiceDate), detailX, 182, { align: "right" });
  document.text(`Due ${formatDate(invoice.dueDate)}`, detailX, 196, { align: "right" });

  let y = 282;
  document.setDrawColor(...black);
  document.setLineWidth(0.8);
  document.line(margin, y, pageWidth - margin, y);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text("Item", columns.description, y - 12);
  document.text("Quantity", columns.quantity, y - 12);
  document.text("Unit Price", columns.unitPrice, y - 12);
  document.text("Total", columns.total, y - 12);

  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  rows.forEach((item) => {
    y += 39;
    document.setTextColor(...black);
    document.text(safe(item.description), columns.description, y - 15, { maxWidth: 235 });
    document.text(String(item.quantity), columns.quantity, y - 15);
    document.text(formatPeso(item.rate), columns.unitPrice, y - 15);
    document.text(formatPeso(item.amount), columns.total, y - 15);
    document.setDrawColor(161, 161, 170);
    document.setLineWidth(0.35);
    document.line(margin, y, pageWidth - margin, y);
  });

  const totalsX = 392;
  y += 28;
  drawMinimalTotal(document, totalsX, y, "Subtotal", formatPeso(invoice.subtotal), false);
  y += 24;
  if (parseMoney(invoice.discount) > 0) {
    drawMinimalTotal(document, totalsX, y, "Discount", `- ${formatPeso(invoice.discount)}`, false);
    y += 24;
  }
  if (parseMoney(invoice.tax) > 0) {
    drawMinimalTotal(document, totalsX, y, "Tax", formatPeso(invoice.tax), false);
    y += 24;
  }
  document.setFillColor(...black);
  document.rect(totalsX - 12, y - 18, pageWidth - margin - totalsX + 12, 37, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  document.text("Total", totalsX, y + 6);
  document.text(formatPeso(invoice.totalAmount), pageWidth - margin - 12, y + 6, { align: "right" });

  const lowerY = Math.max(y + 105, 590);
  document.setTextColor(...black);
  document.setFont("times", "italic");
  document.setFontSize(30);
  document.text("Thank you!", margin, lowerY);

  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("Payment information", margin, lowerY + 55);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(...gray);
  document.text(`Method: ${safe(invoice.paymentMethod || "To be confirmed")}`, margin, lowerY + 72);
  document.text(`Deposit received: ${formatPeso(invoice.depositPaid)}`, margin, lowerY + 86);
  document.text(`Balance due: ${formatPeso(invoice.balanceDue)}`, margin, lowerY + 100);
  drawWrapped(
    document,
    safe(invoice.paymentInstructions || invoice.notes || "Please contact Alrio Private Resort for payment assistance."),
    margin,
    lowerY + 118,
    250,
    11,
    8.5,
    gray,
  );

  document.setTextColor(...black);
  document.setFont("times", "italic");
  document.setFontSize(16);
  document.text("Alrio Private Resort", pageWidth - margin, lowerY + 92, { align: "right" });
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(...gray);
  document.text("A private place for meaningful gatherings.", pageWidth - margin, lowerY + 108, { align: "right" });
  document.text("Philippine Pesos (PHP)", pageWidth - margin, lowerY + 122, { align: "right" });

  document.save(`${sanitizeFileName(invoice.code)}.pdf`);
}

function drawMinimalTotal(
  document: JsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  emphasize: boolean,
) {
  document.setFont("helvetica", emphasize ? "bold" : "normal");
  document.setTextColor(39, 39, 42);
  document.setFontSize(9);
  document.text(label, x, y);
  document.text(value, 539, y, { align: "right" });
}

function drawWrapped(
  document: JsPDF,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize = 10,
  color: [number, number, number] = [113, 113, 122],
) {
  document.setTextColor(...color);
  document.setFontSize(fontSize);
  document.splitTextToSize(value, maxWidth).forEach((line: string, index: number) => {
    document.text(line, x, y + index * lineHeight);
  });
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch("/favicon.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function safe(value: string) {
  return value.trim() || "--";
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "invoice";
}
