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
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter());
        toast.success("Invoice deleted.");
        setConfirmDelete(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const sendInvoice = useMutation(
    trpc.resort.invoices.send.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter());
        toast.success("Invoice email sent to the guest.");
      },
      onError: (error) => toast.error(error.message),
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
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
          <DropdownMenuItem onClick={() => void printInvoice(invoice)}>
            <Printer className="size-4" />
            Print invoice
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
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
  return `PHP ${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

async function printInvoice(invoice: InvoiceRow) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ format: "a4", orientation: "portrait", unit: "pt" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const rows = invoice.lineItems.length
    ? invoice.lineItems
    : [{ id: "empty", description: invoice.roomLabel || "Room charge", quantity: 1, rate: invoice.totalAmount, amount: invoice.totalAmount }];
  const fillerRows = Math.max(0, 6 - rows.length);
  const cream: [number, number, number] = [243, 238, 226];
  const dark: [number, number, number] = [41, 38, 34];
  const gold: [number, number, number] = [180, 135, 44];
  const text: [number, number, number] = [111, 106, 98];
  const muted: [number, number, number] = [154, 148, 137];

  document.setFillColor(...cream);
  document.rect(0, 0, pageWidth, pageHeight, "F");
  document.setFillColor(...dark);
  document.rect(0, 0, pageWidth * 0.52, 126, "F");
  document.setFillColor(...gold);
  document.rect(pageWidth * 0.52, 0, pageWidth * 0.48, 126, "F");
  document.triangle(pageWidth * 0.47, 126, pageWidth * 0.52, 0, pageWidth * 0.52, 126, "F");
  document.setFillColor(...dark);
  document.rect(0, pageHeight - 34, pageWidth * 0.52, 34, "F");
  document.setFillColor(...gold);
  document.rect(pageWidth * 0.52, pageHeight - 34, pageWidth * 0.48, 34, "F");
  document.triangle(pageWidth * 0.47, pageHeight, pageWidth * 0.52, pageHeight - 34, pageWidth * 0.52, pageHeight, "F");

  document.setTextColor(199, 154, 49);
  document.setFont("helvetica", "normal");
  document.setFontSize(32);
  document.text("Alrio Private Resort", 44, 62);
  document.setFontSize(11);
  document.text("R E S O R T", 77, 83);

  document.setTextColor(64, 57, 47);
  document.setFontSize(8);
  document.text(safe(invoice.paymentMethod || "Payment method to be confirmed"), 332, 32);
  document.text(safe(invoice.guestEmail || "guest email not provided"), 332, 54);
  drawWrapped(document, safe(invoice.roomLabel || "Booking location"), 332, 76, 170, 9);

  drawLabel(document, "BILL TO:", 44, 168, muted);
  document.setFontSize(12);
  document.setTextColor(139, 131, 119);
  const billToLines = document.splitTextToSize(
    safe(invoice.guestName).toUpperCase(),
    170,
  );
  document.text(billToLines, 44, 190);
  const billToContactY = 190 + billToLines.length * 14 + 8;
  document.setFontSize(8.5);
  document.setTextColor(...muted);
  document.text("CONTACT:", 44, billToContactY);
  document.text(`EMAIL: ${safe(invoice.guestEmail)}`, 44, billToContactY + 12);
  drawWrapped(document, `LOCATION: ${safe(invoice.roomLabel)}`, 44, billToContactY + 24, 170, 9, 8.5);

  drawLabel(document, "BOOKED BY:", 252, 168, muted);
  document.setFontSize(14);
  document.setTextColor(139, 131, 119);
  const bookedByLines = document.splitTextToSize(
    safe(invoice.guestName).toUpperCase(),
    200,
  );
  document.text(bookedByLines, 252, 190);
  const bookedByContactY = 190 + bookedByLines.length * 16 + 8;
  document.setFontSize(8.5);
  document.text("CONTACT: --", 252, bookedByContactY);
  document.text(`EMAIL: ${safe(invoice.guestEmail)}`, 252, bookedByContactY + 12);
  drawWrapped(
    document,
    `BOOKING: ${safe(invoice.bookingReference || invoice.reservationId)}`,
    252,
    bookedByContactY + 24,
    180,
    9,
    8.5,
  );

  drawLabel(document, "INVOICE NO.", 448, 150, muted);
  document.setFontSize(9);
  document.setTextColor(...text);
  document.text(invoice.code, 448, 166);
  drawLabel(document, "DATE:", 448, 190, muted);
  document.setTextColor(...text);
  document.text(formatDate(invoice.invoiceDate), 448, 206);

  let y = 310;
  const x = 56;
  const widths = [205, 86, 128, 78];
  drawInvoiceTableHeader(document, x, y, widths, gold);
  y += 30;
  [...rows, ...Array.from({ length: fillerRows }, (_, index) => ({
    amount: "",
    description: "",
    id: `filler-${index}`,
    quantity: 0,
    rate: "",
  }))].forEach((item) => {
    drawInvoiceRow(document, x, y, widths, item);
    y += 30;
  });

  y += 8;
  const totalsX = x + widths[0] + widths[1];
  drawTotalRow(document, totalsX, y, widths[2], widths[3], "Subtotal", formatPeso(invoice.subtotal));
  drawTotalRow(document, totalsX, y + 30, widths[2], widths[3], "Discount", formatPeso(invoice.discount));
  drawTotalRow(document, totalsX, y + 60, widths[2], widths[3], "Tax Sale", formatPeso(invoice.tax));
  drawTotalRow(document, totalsX, y + 90, widths[2], widths[3], "TOTAL", formatPeso(invoice.totalAmount));

  document.setTextColor(...muted);
  document.setFontSize(14);
  document.text("Terms & Condition", 44, 710);
  drawWrapped(
    document,
    invoice.notes || "Payment is due by the invoice due date. Please keep this invoice for your records.",
    60,
    732,
    230,
    10,
    9,
  );

  document.setFontSize(14);
  document.text("Payment Info", 358, 682);
  document.setFontSize(9);
  document.text(`Payment Method: ${safe(invoice.paymentMethod)}`, 358, 704);
  drawWrapped(document, `Instructions: ${safe(invoice.paymentInstructions)}`, 358, 722, 180, 10, 9);
  document.setFontSize(9);
  document.text("Signature:", 358, 784);
  document.line(422, 784, 542, 784);

  document.save(`${sanitizeFileName(invoice.code)}.pdf`);
}

function drawInvoiceTableHeader(document: JsPDF, x: number, y: number, widths: number[], gold: [number, number, number]) {
  document.setFillColor(...gold);
  document.rect(x, y, widths.reduce((total, width) => total + width, 0), 30, "F");
  document.setTextColor(71, 59, 35);
  document.setFontSize(11);
  document.text("Service Description", x + 68, y + 19);
  document.text("Quantity", x + widths[0] + 25, y + 19);
  document.text("Unit Price", x + widths[0] + widths[1] + 43, y + 19);
  document.text("Total", x + widths[0] + widths[1] + widths[2] + 26, y + 19);
}

function drawInvoiceRow(
  document: JsPDF,
  x: number,
  y: number,
  widths: number[],
  item: { amount: string; description: string; quantity: number; rate: string },
) {
  document.setDrawColor(159, 153, 141);
  document.setTextColor(111, 106, 98);
  document.setFontSize(9);
  let currentX = x;
  widths.forEach((width) => {
    document.rect(currentX, y, width, 30);
    currentX += width;
  });
  if (!item.description) return;
  document.text(item.description, x + 8, y + 18, { maxWidth: widths[0] - 12 });
  document.text(String(item.quantity), x + widths[0] + widths[1] / 2, y + 18, { align: "center" });
  document.text(formatPeso(item.rate), x + widths[0] + widths[1] + widths[2] - 8, y + 18, { align: "right" });
  document.text(formatPeso(item.amount), x + widths[0] + widths[1] + widths[2] + widths[3] - 8, y + 18, { align: "right" });
}

function drawTotalRow(document: JsPDF, x: number, y: number, labelWidth: number, valueWidth: number, label: string, value: string) {
  document.setDrawColor(159, 153, 141);
  document.rect(x, y, labelWidth, 30);
  document.rect(x + labelWidth, y, valueWidth, 30);
  document.setTextColor(154, 148, 137);
  document.setFontSize(11);
  document.text(label, x + labelWidth / 2, y + 18, { align: "center" });
  document.setTextColor(111, 106, 98);
  document.text(value, x + labelWidth + valueWidth - 8, y + 18, { align: "right" });
}

function drawLabel(document: JsPDF, value: string, x: number, y: number, color: [number, number, number]) {
  document.setFontSize(10);
  document.setTextColor(...color);
  document.text(value, x, y);
}

function drawWrapped(
  document: JsPDF,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize = 10,
) {
  document.setTextColor(154, 148, 137);
  document.setFontSize(fontSize);
  document.splitTextToSize(value, maxWidth).forEach((line: string, index: number) => {
    document.text(line, x, y + index * lineHeight);
  });
}

function safe(value: string) {
  return value.trim() || "--";
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "invoice";
}
