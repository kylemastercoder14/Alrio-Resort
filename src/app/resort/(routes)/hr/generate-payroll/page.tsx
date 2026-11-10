"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { jsPDF as JsPDF } from "jspdf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  CircleDollarSign,
  Ban,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";

type PayrollRun = {
  employees: number;
  generatedAt: string;
  generatedBy: string;
  generatorRole: string;
  id: string;
  items: PayrollRunItem[];
  name: string;
  payDate: string;
  payPeriod: string;
  payType: string;
  recordId: string;
  status: "Completed" | "Draft" | "Voided" | "Processing";
  paymentStatus: "Paid" | "Unpaid";
  totalNetPay: number;
};

type PayrollRunItem = {
  allowances: number;
  basicSalary: number;
  bonus: number;
  commission: number;
  daysWorked: number;
  employeeId: string;
  governmentDeductions: number;
  included: boolean;
  incentives: number;
  leaveDays: number;
  leaveDeduction: number;
  name: string;
  netPay: number;
  otherDeductions: number;
  position: string;
  totalDeductions: number;
  totalEarnings: number;
  undertimeDeduction: number;
};

const columns: ColumnDef<PayrollRun>[] = [
  {
    accessorKey: "name",
    header: "Payroll Name",
    cell: ({ row }) => (
      <div className="min-w-56">
        <p className="font-semibold text-zinc-950">{row.original.name}</p>
        <p className="text-xs font-medium text-zinc-500">{row.original.id}</p>
      </div>
    ),
  },
  {
    accessorKey: "payPeriod",
    header: "Pay Period",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.payPeriod}</span>
    ),
  },
  {
    accessorKey: "payDate",
    header: "Pay Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.payDate}</span>
    ),
  },
  {
    accessorKey: "employees",
    header: "Employees",
  },
  {
    accessorKey: "totalNetPay",
    header: "Total Net Pay",
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(row.original.totalNetPay)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="min-w-36">
        <Badge variant={row.original.status === "Voided" ? "destructive" : "default"}>
          {row.original.status}
        </Badge>
        <p className="mt-1 text-xs font-medium text-zinc-500">
          {row.original.generatedAt}
        </p>
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <PayrollActions payroll={row.original} />,
  },
];

export default function GeneratePayrollPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const payrollRuns = useQuery({
    ...trpc.resort.payroll.list.queryOptions(),
    retry: false,
  });
  const runs = (payrollRuns.data ?? []).map(toPayrollRunRow);
  const kpis = getPayrollKpis(runs);

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button size="xs" onClick={() => router.push("/resort/hr/generate-payroll/create")}>
          <Plus className="size-4" />
          Generate payroll
        </Button>
      </div>

      <KpiGrid items={kpis} />

      <ReusableDataTable
        columnToggleIds={[
          "payPeriod",
          "payDate",
          "payType",
          "employees",
          "totalNetPay",
          "status",
          "generatedBy",
        ]}
        columns={columns}
        data={runs}
        emptyState={{
          title: payrollRuns.isPending ? "Loading payroll runs" : "No payroll runs found",
          description: payrollRuns.isPending
            ? "Payroll runs are loading from staff payroll records."
            : "Generate payroll to create first saved payroll run.",
        }}
        filterOptions={[
          { label: "All", value: "all" },
          { label: "Completed", value: "Completed" },
          { label: "Draft", value: "Draft" },
          { label: "Processing", value: "Processing" },
        ]}
        rowLabel="payroll runs"
        searchPlaceholder="Search payroll name, period, pay date, or generator"
      />
    </main>
  );
}

function PayrollActions({ payroll }: { payroll: PayrollRun }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const deletePayroll = useMutation(
    trpc.resort.payroll.delete.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.payroll.list.queryFilter(),
        );
        setDeleteOpen(false);
        toast.success("Payroll deleted.");
      },
    }),
  );
  const recordPayment = useMutation(
    trpc.resort.payroll.recordPayment.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.payroll.list.queryFilter());
        setPaymentOpen(false);
        toast.success("Payroll payout recorded and finance entry cleared.");
      },
    }),
  );
  const voidPayroll = useMutation(
    trpc.resort.payroll.void.mutationOptions({
      onError: (error) => toast.error(error.message),
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.payroll.list.queryFilter());
        setVoidOpen(false);
        toast.success("Payroll voided. The audit record was retained.");
      },
    }),
  );

  function handleDeletePayroll() {
    deletePayroll.mutate({ id: payroll.recordId });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${payroll.name}`}
            className="size-8 rounded-full"
            size="icon"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl bg-white">
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() =>
              router.push(
                `/resort/hr/generate-payroll/${payroll.recordId}?mode=view`,
              )
            }
          >
            <Eye className="size-4" />
            View payroll
          </DropdownMenuItem>
          {payroll.status === "Draft" ? (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() =>
                router.push(`/resort/hr/generate-payroll/${payroll.recordId}`)
              }
            >
              <Pencil className="size-4" />
              Edit payroll
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => void downloadPayslips(payroll)}
          >
            <Download className="size-4" />
            Download payslips
          </DropdownMenuItem>
          {payroll.status === "Completed" && payroll.paymentStatus === "Unpaid" ? (
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={recordPayment.isPending}
              onSelect={(event) => {
                event.preventDefault();
                setPaymentOpen(true);
              }}
            >
              <CircleDollarSign className="size-4" />
              Record payout
            </DropdownMenuItem>
          ) : null}
          {payroll.status === "Completed" && payroll.paymentStatus === "Unpaid" ? (
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              disabled={voidPayroll.isPending}
              onSelect={(event) => {
                event.preventDefault();
                setVoidOpen(true);
              }}
            >
              <Ban className="size-4" />
              Void payroll
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            disabled={deletePayroll.isPending || payroll.status !== "Draft"}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            {deletePayroll.isPending ? "Deleting..." : "Delete payroll"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => router.push("/resort/hr/generate-payroll/create")}
          >
            <RefreshCw className="size-4" />
            Create another payroll
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payroll?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {payroll.name} and all payslips in this payroll run.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePayroll.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePayroll.isPending}
              onClick={handleDeletePayroll}
            >
              {deletePayroll.isPending ? "Deleting..." : "Delete payroll"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record payroll payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This records the full {formatCurrency(payroll.totalNetPay)} payout as a bank transfer and clears its linked payroll expense in Finance. This does not send money through PayMongo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={recordPayment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={recordPayment.isPending}
              onClick={() => recordPayment.mutate({ id: payroll.recordId, paymentMethod: "Bank transfer" })}
            >
              {recordPayment.isPending ? "Recording..." : "Record payout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this payroll run?</AlertDialogTitle>
            <AlertDialogDescription>
              The payroll and its audit trail stay on record, but it can no longer be paid. Create a corrected payroll run afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voidPayroll.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={voidPayroll.isPending}
              onClick={() => voidPayroll.mutate({ id: payroll.recordId, reason: "Voided from payroll registry." })}
            >
              {voidPayroll.isPending ? "Voiding..." : "Void payroll"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function toPayrollRunRow(run: {
  code: string;
  generatedAt: Date | string | null;
  generatedBy: string;
  id: string;
  name: string;
  payDate: Date | string;
  payPeriod: string;
  payType: string;
  status: string;
  paymentStatus?: string;
  items?: PayrollRunItem[];
  totals: {
    includedEmployees: number;
    totalNetPay: number;
  };
}): PayrollRun {
  return {
    employees: run.totals.includedEmployees,
    generatedAt: run.generatedAt ? formatDateTime(run.generatedAt) : "--",
    generatedBy: run.generatedBy || "Admin",
    generatorRole: "System Administrator",
    id: run.code,
    items: run.items ?? [],
    name: run.name,
    payDate: formatDate(run.payDate),
    payPeriod: run.payPeriod,
    payType: run.payType,
    recordId: run.id,
    status:
      run.status === "Completed" || run.status === "Draft" || run.status === "Voided"
        ? run.status
        : "Processing",
    paymentStatus: run.paymentStatus === "Paid" ? "Paid" : "Unpaid",
    totalNetPay: run.totals.totalNetPay,
  };
}

async function downloadPayslips(payroll: PayrollRun) {
  const items = payroll.items.filter((item) => item.included);

  if (!items.length) {
    toast.error("No included employees for payslip download.");
    return;
  }

  try {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF({
      format: "a4",
      orientation: "portrait",
      unit: "pt",
    });

    items.forEach((item, index) => {
      if (index > 0) document.addPage();
      drawPayslipPage(document, payroll, item);
    });

    document.save(`${sanitizeFileName(payroll.id)}-payslips.pdf`);
    toast.success(`Payslips downloaded for ${payroll.id}.`);
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Payslip PDF download failed.",
    );
  }
}

function drawPayslipPage(
  document: JsPDF,
  payroll: PayrollRun,
  item: PayrollRunItem,
) {
  const pageWidth = document.internal.pageSize.getWidth();
  const x = 36;
  const width = pageWidth - 72;
  let y = 36;
  const blue: [number, number, number] = [157, 188, 235];
  const steel: [number, number, number] = [116, 137, 166];
  const gray: [number, number, number] = [207, 207, 207];
  const black: [number, number, number] = [15, 15, 15];

  document.setLineWidth(1.2);
  document.setDrawColor(...black);
  document.setTextColor(...black);
  document.setFont("helvetica", "normal");

  document.setFillColor(...steel);
  document.rect(x, y, width, 28, "FD");
  y += 28;

  y = drawInfoRow(document, x, y, width, "Name:", item.name);
  y = drawInfoRow(document, x, y, width, "Coverage:", payroll.payPeriod);

  y = drawSectionHeader(document, x, y, width, "Earnings", gray);
  y = drawThreeColumnHeader(document, x, y, width);
  y = drawPayslipRow(document, x, y, width, "Salary", item.daysWorked, item.basicSalary);
  y = drawPayslipRow(document, x, y, width, "Allowance", "", item.allowances);
  y = drawPayslipRow(document, x, y, width, "Incentives", "", item.incentives);
  y = drawPayslipRow(document, x, y, width, "Commission", "", item.commission);
  y = drawPayslipRow(document, x, y, width, "Bonus", "", item.bonus);
  y = drawPayslipRow(document, x, y, width, "", "", "");

  y = drawSectionHeader(document, x, y, width, "Deductions", gray);
  y = drawThreeColumnHeader(document, x, y, width);
  y = drawPayslipRow(
    document,
    x,
    y,
    width,
    "Leave deduction",
    item.leaveDays || "",
    item.leaveDeduction,
  );
  y = drawPayslipRow(
    document,
    x,
    y,
    width,
    "Undertime",
    "",
    item.undertimeDeduction,
  );
  y = drawPayslipRow(
    document,
    x,
    y,
    width,
    "Government benefits",
    "",
    item.governmentDeductions,
  );
  y = drawPayslipRow(
    document,
    x,
    y,
    width,
    "Other deductions",
    "",
    item.otherDeductions,
  );

  document.setFillColor(...blue);
  document.rect(x, y, width, 28, "FD");
  y += 28;

  const colWidth = width / 3;
  drawSummaryCell(document, x, y, colWidth, "Earnings", item.totalEarnings);
  drawSummaryCell(
    document,
    x + colWidth,
    y,
    colWidth,
    "Deduction",
    item.totalDeductions,
  );
  drawSummaryCell(
    document,
    x + colWidth * 2,
    y,
    colWidth,
    "Net Pay",
    item.netPay,
    true,
  );

  document.setFontSize(8);
  document.setTextColor(90, 90, 90);
  document.text(`${payroll.id} - ${item.employeeId} - ${item.position}`, x, y + 78);
}

function drawInfoRow(
  document: JsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  const labelWidth = 132;
  document.rect(x, y, labelWidth, 28);
  document.rect(x + labelWidth, y, width - labelWidth, 28);
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text(label, x + 6, y + 20);
  document.setFont("helvetica", "normal");
  document.text(value, x + labelWidth + 6, y + 20, {
    maxWidth: width - labelWidth - 12,
  });
  return y + 28;
}

function drawSectionHeader(
  document: JsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  fill: [number, number, number],
) {
  document.setFillColor(...fill);
  document.rect(x, y, width, 28, "FD");
  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text(title, x + width / 2, y + 20, { align: "center" });
  return y + 28;
}

function drawThreeColumnHeader(
  document: JsPDF,
  x: number,
  y: number,
  width: number,
) {
  const columns = [width * 0.38, width * 0.22, width * 0.4];
  const labels = ["Description", "Days", "Amount"];

  labels.forEach((label, index) => {
    const cellX = x + columns.slice(0, index).reduce((total, item) => total + item, 0);
    document.rect(cellX, y, columns[index] ?? 0, 28);
    document.setFont("helvetica", "bold");
    document.setFontSize(16);
    document.text(label, cellX + (columns[index] ?? 0) / 2, y + 20, {
      align: "center",
    });
  });

  return y + 28;
}

function drawPayslipRow(
  document: JsPDF,
  x: number,
  y: number,
  width: number,
  description: string,
  days: number | string,
  amount: number | string,
) {
  const columns = [width * 0.38, width * 0.22, width * 0.4];
  document.setFont("helvetica", "normal");
  document.setFontSize(14);
  document.rect(x, y, columns[0] ?? 0, 28);
  document.rect(x + (columns[0] ?? 0), y, columns[1] ?? 0, 28);
  document.rect(x + (columns[0] ?? 0) + (columns[1] ?? 0), y, columns[2] ?? 0, 28);
  document.text(description, x + 6, y + 19);
  document.text(String(days), x + (columns[0] ?? 0) + (columns[1] ?? 0) - 8, y + 19, {
    align: "right",
  });
  document.text(
    typeof amount === "number" ? formatMoney(amount) : amount,
    x + width - 8,
    y + 19,
    { align: "right" },
  );
  return y + 28;
}

function drawSummaryCell(
  document: JsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  amount: number,
  strong = false,
) {
  document.rect(x, y, width, 28);
  document.rect(x, y + 28, width, 28);
  document.setFont("helvetica", strong ? "bold" : "normal");
  document.setFontSize(16);
  document.text(label, x + width / 2, y + 20, { align: "center" });
  document.text(formatMoney(amount), x + width - 8, y + 48, { align: "right" });
}

function getPayrollKpis(runs: PayrollRun[]): KpiGridItem[] {
  const latestRun = runs[0];

  return [
    {
      title: "Payroll runs",
      value: runs.length,
      note: "Generated batches",
      icon: <FileText className="size-4" />,
    },
    {
      title: "Last net pay",
      value: latestRun ? formatCurrency(latestRun.totalNetPay) : formatCurrency(0),
      note: "Most recent completed run",
      icon: <WalletCards className="size-4" />,
    },
    {
      title: "Employees paid",
      value: latestRun?.employees ?? 0,
      note: "Latest payroll batch",
      icon: <Users className="size-4" />,
    },
    {
      title: "Completed",
      value: runs.filter((run) => run.status === "Completed").length,
      note: "Ready for payslip export",
      icon: <CheckCircle2 className="size-4" />,
    },
  ];
}

function formatDate(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatMoney(value: number) {
  return value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function sanitizeFileName(value: string) {
  return (
    value
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "payslips"
  );
}
