"use client";

import type { jsPDF as JsPDF } from "jspdf";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer, WalletCards } from "lucide-react";
import toast from "react-hot-toast";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

type PayrollHistoryItem = {
  frequency: string;
  generatedAt: Date | string | null;
  id: string;
  item: PayslipItem;
  notes: string;
  payDate: Date | string;
  payPeriod: string;
  payType: string;
  payrollRunId: string;
  runCode: string;
  runName: string;
  status: string;
};

type PayslipItem = {
  allowances: number;
  basicSalary: number;
  bonus: number;
  commission: number;
  daysWorked: number;
  employeeId: string;
  governmentDeductions: number;
  incentives: number;
  leaveDays: number;
  leaveDeduction: number;
  name: string;
  netPay: number;
  otherDeductions: number;
  overtimePay: number;
  position: string;
  totalDeductions: number;
  totalEarnings: number;
  undertimeDeduction: number;
};

export default function PayrollHistoryPage() {
  const trpc = useTRPC();
  const payrollHistory = useQuery({
    ...trpc.resort.payroll.myHistory.queryOptions(),
    retry: false,
  });
  const records = useMemo(
    () => (payrollHistory.data ?? []) as PayrollHistoryItem[],
    [payrollHistory.data],
  );
  const kpis = useMemo(() => getPayrollHistoryKpis(records), [records]);

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <ResortBreadcrumb />
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-3" items={kpis} />

      <Card className="rounded-xl border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-950">
              Payroll history
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Your own payroll records and printable payslips.
            </p>
          </div>
          <Button
            disabled={!records.length}
            onClick={() => void downloadAllPayslips(records)}
            size="xs"
          >
            <Download className="size-4" />
            Download all
          </Button>
        </div>

        {payrollHistory.isError ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {payrollHistory.error.message}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {payrollHistory.isPending ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                className="h-28 rounded-xl border border-zinc-200 bg-zinc-50"
                key={index}
              />
            ))
          ) : records.length ? (
            records.map((record) => (
              <PayrollHistoryCard key={record.id} record={record} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
              <p className="font-bold text-zinc-950">
                No payroll history found
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Completed payroll runs assigned to your staff profile will
                appear here.
              </p>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}

function PayrollHistoryCard({ record }: { record: PayrollHistoryItem }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-bold text-zinc-950">
              {record.runName}
            </h2>
            <Badge className="rounded-md border-zinc-200 bg-zinc-100 text-zinc-900">
              {record.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">{record.runCode}</p>
          <p className="mt-2 text-sm font-medium text-zinc-700">
            {record.payPeriod}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-zinc-500">Net pay</p>
          <p className="text-xl font-bold text-zinc-950">
            {formatCurrency(record.item.netPay)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Pay date {formatDate(record.payDate)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3">
        <PayrollMetric label="Earnings" value={record.item.totalEarnings} />
        <PayrollMetric label="Deductions" value={record.item.totalDeductions} />
        <PayrollMetric label="Days worked" value={record.item.daysWorked} />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={() => void printPayslip(record)}
        >
          <Printer className="size-4" />
          Print payslip
        </Button>
        <Button size="xs" onClick={() => void downloadPayslip(record)}>
          <Download className="size-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}

function PayrollMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 font-bold text-zinc-950">
        {label === "Days worked" ? value : formatCurrency(value)}
      </p>
    </div>
  );
}

function getPayrollHistoryKpis(records: PayrollHistoryItem[]): KpiGridItem[] {
  const latest = records[0];
  const yearTotal = records
    .filter((record) => new Date(record.payDate).getFullYear() === new Date().getFullYear())
    .reduce((total, record) => total + record.item.netPay, 0);

  return [
    {
      title: "Payslips",
      value: records.length,
      note: "Completed payroll records",
      icon: <FileText className="size-4" />,
    },
    {
      title: "Latest net pay",
      value: latest ? formatCurrency(latest.item.netPay) : formatCurrency(0),
      note: latest ? latest.payPeriod : "No payroll yet",
      icon: <WalletCards className="size-4" />,
    },
    {
      title: "This year",
      value: formatCurrency(yearTotal),
      note: "Net pay received",
      icon: <Download className="size-4" />,
    },
  ];
}

async function downloadAllPayslips(records: PayrollHistoryItem[]) {
  if (!records.length) return;

  try {
    const document = await buildPayslipDocument(records);
    document.save(`${sanitizeFileName("payroll-history")}.pdf`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Payslip download failed.");
  }
}

async function downloadPayslip(record: PayrollHistoryItem) {
  try {
    const document = await buildPayslipDocument([record]);
    document.save(`${sanitizeFileName(record.runCode)}-payslip.pdf`);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Payslip download failed.");
  }
}

async function printPayslip(record: PayrollHistoryItem) {
  try {
    const document = await buildPayslipDocument([record]);
    document.autoPrint();
    window.open(document.output("bloburl"), "_blank");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Payslip print failed.");
  }
}

async function buildPayslipDocument(records: PayrollHistoryItem[]) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });

  records.forEach((record, index) => {
    if (index > 0) document.addPage();
    drawPayslipPage(document, record);
  });

  return document;
}

function drawPayslipPage(document: JsPDF, record: PayrollHistoryItem) {
  const pageWidth = document.internal.pageSize.getWidth();
  const x = 36;
  const width = pageWidth - 72;
  let y = 36;
  const gray: [number, number, number] = [207, 207, 207];
  const blue: [number, number, number] = [157, 188, 235];
  const steel: [number, number, number] = [116, 137, 166];
  const black: [number, number, number] = [15, 15, 15];
  const item = record.item;

  document.setLineWidth(1.2);
  document.setDrawColor(...black);
  document.setTextColor(...black);
  document.setFont("helvetica", "normal");

  document.setFillColor(...steel);
  document.rect(x, y, width, 28, "FD");
  y += 28;

  y = drawInfoRow(document, x, y, width, "Name:", item.name);
  y = drawInfoRow(document, x, y, width, "Coverage:", record.payPeriod);
  y = drawInfoRow(document, x, y, width, "Pay date:", formatDate(record.payDate));

  y = drawSectionHeader(document, x, y, width, "Earnings", gray);
  y = drawThreeColumnHeader(document, x, y, width);
  y = drawPayslipRow(document, x, y, width, "Salary", item.daysWorked, item.basicSalary);
  y = drawPayslipRow(document, x, y, width, "Allowance", "", item.allowances);
  y = drawPayslipRow(document, x, y, width, "Incentives", "", item.incentives);
  y = drawPayslipRow(document, x, y, width, "Commission", "", item.commission);
  y = drawPayslipRow(document, x, y, width, "Bonus", "", item.bonus);
  y = drawPayslipRow(document, x, y, width, "Overtime", "", item.overtimePay);

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
  y = drawPayslipRow(document, x, y, width, "Undertime", "", item.undertimeDeduction);
  y = drawPayslipRow(
    document,
    x,
    y,
    width,
    "Government benefits",
    "",
    item.governmentDeductions,
  );
  y = drawPayslipRow(document, x, y, width, "Other deductions", "", item.otherDeductions);

  document.setFillColor(...blue);
  document.rect(x, y, width, 28, "FD");
  y += 28;

  const colWidth = width / 3;
  drawSummaryCell(document, x, y, colWidth, "Earnings", item.totalEarnings);
  drawSummaryCell(document, x + colWidth, y, colWidth, "Deduction", item.totalDeductions);
  drawSummaryCell(document, x + colWidth * 2, y, colWidth, "Net Pay", item.netPay, true);

  document.setFontSize(8);
  document.setTextColor(90, 90, 90);
  document.text(`${record.runCode} - ${item.employeeId} - ${item.position}`, x, y + 78);
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

function drawThreeColumnHeader(document: JsPDF, x: number, y: number, width: number) {
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
      .replace(/^-+|-+$/g, "") || "payslip"
  );
}
