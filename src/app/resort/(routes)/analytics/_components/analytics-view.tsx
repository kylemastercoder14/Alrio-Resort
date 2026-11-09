"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  BarChart3,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Hotel,
  MoreVertical,
  PieChart as PieChartIcon,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";

type AnalyticsPeriod = "week" | "month" | "quarter";
type AnalyticsReportTitle =
  | "Occupancy report"
  | "Revenue report"
  | "Department task completion";

const REPORT_ICONS: Record<AnalyticsReportTitle, LucideIcon> = {
  "Department task completion": CheckCircle2,
  "Occupancy report": BedDouble,
  "Revenue report": ReceiptText,
};

// Monochrome palette only — black carries the primary series, zinc tones
// carry everything secondary. No color is used to encode meaning.
const occupancyChartConfig = {
  available: { label: "Available", color: "#e4e4e7" },
  occupied: { label: "Occupied", color: "#09090b" },
} satisfies ChartConfig;

const revenueChartConfig = {
  expenses: { label: "Expenses", color: "#a1a1aa" },
  revenue: { label: "Revenue", color: "#09090b" },
} satisfies ChartConfig;

const taskChartConfig = {
  completed: { label: "Completed", color: "#09090b" },
} satisfies ChartConfig;

export function AnalyticsView() {
  const trpc = useTRPC();
  const [period, setPeriod] = useState<AnalyticsPeriod>("month");
  const analytics = useQuery({
    ...trpc.resort.analytics.summary.queryOptions({ period }),
  });
  const data = analytics.data;
  const isLoading = analytics.isLoading;
  const reportRows = data?.reportRows ?? {
    occupancy: [],
    revenue: [],
    tasks: [],
  };

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        icon: <Hotel className="size-4" />,
        note: data?.kpi[0]?.note ?? "Selected period",
        title: "Occupancy",
        value: data?.kpi[0]?.value ?? "--",
      },
      {
        icon: <ReceiptText className="size-4" />,
        note: data?.kpi[1]?.note ?? "Selected period",
        title: "Revenue",
        value: data?.kpi[1]?.value ?? "--",
      },
      {
        icon: <CheckCircle2 className="size-4" />,
        note: data?.kpi[2]?.note ?? "Across departments",
        title: "Task completion",
        value: data?.kpi[2]?.value ?? "--",
      },
      {
        icon: <FileSpreadsheet className="size-4" />,
        note: data?.kpi[3]?.note ?? "Occupancy, revenue, tasks",
        title: "Exportable reports",
        value: data?.kpi[3]?.value ?? "--",
      },
    ],
    [data?.kpi],
  );

  const getReportRows = (title: AnalyticsReportTitle) => {
    if (title === "Occupancy report") {
      return [["Metric", "Value"], ...reportRows.occupancy];
    }

    if (title === "Revenue report") {
      return [["Metric", "Value"], ...reportRows.revenue];
    }

    return [["Department", "Completion"], ...reportRows.tasks];
  };

  const downloadReport = async (title: AnalyticsReportTitle) => {
    const rows = getReportRows(title);
    const report = data?.reports.find((item) => item.title === title);
    const baseName = title.toLowerCase().replaceAll(" ", "-");

    if (report?.format === "XLSX") {
      await downloadXlsxFile(`${baseName}.xlsx`, title, rows);
      return;
    }

    if (report?.format === "PDF") {
      await downloadPdfFile(`${baseName}.pdf`, title, rows);
      return;
    }

    downloadCsvFile(`${baseName}.csv`, rows);
  };

  const downloadPack = async () => {
    await downloadXlsxWorkbook("analytics-report-pack.xlsx", {
      Occupancy: getReportRows("Occupancy report"),
      Revenue: getReportRows("Revenue report"),
      Tasks: getReportRows("Department task completion"),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}
          >
            <SelectTrigger className="h-8! w-30 rounded-lg bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="quarter">This quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={!data} onClick={downloadPack} size="xs">
            <Download className="size-4" />
            Export pack
          </Button>
        </div>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList
          variant="line"
          className="border-b border-zinc-200 text-zinc-400"
        >
          <TabsTrigger
            className="font-semibold data-[state=active]:text-zinc-950"
            value="overview"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            className="font-semibold data-[state=active]:text-zinc-950"
            value="occupancy"
          >
            Occupancy
          </TabsTrigger>
          <TabsTrigger
            className="font-semibold data-[state=active]:text-zinc-950"
            value="revenue"
          >
            Revenue
          </TabsTrigger>
          <TabsTrigger
            className="font-semibold data-[state=active]:text-zinc-950"
            value="tasks"
          >
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="overview">
          {analytics.error ? (
            <Card className="rounded-2xl border-zinc-950 bg-zinc-950 p-5 text-sm font-medium text-white">
              {analytics.error.message}
            </Card>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-5">
              <ChartCard>
                <ChartHeader
                  description="Daily occupied-room percentage against available capacity."
                  icon={<BarChart3 className="size-4" />}
                  onAction={() => downloadReport("Occupancy report")}
                  title="Occupancy and room utilization"
                />
                <ChartContainer
                  className="mt-5 h-[320px] w-full"
                  config={occupancyChartConfig}
                >
                  <BarChart data={data?.occupancyData ?? []} barGap={4}>
                    <CartesianGrid
                      stroke="#f4f4f5"
                      strokeDasharray="0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    />
                    <ChartTooltip
                      cursor={{ fill: "#fafafa" }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="occupied"
                      fill="var(--color-occupied)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="available"
                      fill="var(--color-available)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
                {!isLoading && !data?.occupancyData?.length ? (
                  <EmptyChartState label="No occupancy data for this period" />
                ) : null}
              </ChartCard>

              <ChartCard>
                <ChartHeader
                  description="Revenue and expenses trend for operating months."
                  icon={<ReceiptText className="size-4" />}
                  onAction={() => downloadReport("Revenue report")}
                  title="Revenue trend"
                />
                <ChartContainer
                  className="mt-5 h-[300px] w-full"
                  config={revenueChartConfig}
                >
                  <ComposedChart data={data?.revenueData ?? []}>
                    <defs>
                      <linearGradient
                        id="revenueFillOverview"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#09090b"
                          stopOpacity={0.16}
                        />
                        <stop
                          offset="100%"
                          stopColor="#09090b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#f4f4f5"
                      strokeDasharray="0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="revenue"
                      stroke="none"
                      fill="url(#revenueFillOverview)"
                      type="monotone"
                    />
                    <Line
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      type="monotone"
                    />
                    <Line
                      dataKey="expenses"
                      stroke="var(--color-expenses)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4 }}
                      type="monotone"
                    />
                  </ComposedChart>
                </ChartContainer>
                {!isLoading && !data?.revenueData?.length ? (
                  <EmptyChartState label="No revenue data for this period" />
                ) : null}
              </ChartCard>
            </div>

            <aside className="space-y-5">
              <ChartCard>
                <ChartHeader
                  description="Completion state across departments."
                  icon={<PieChartIcon className="size-4" />}
                  onAction={() => downloadReport("Department task completion")}
                  title="Task mix"
                />
                <div className="relative mx-auto mt-5 h-[240px] w-full">
                  <ChartContainer className="h-full w-full" config={taskChartConfig}>
                    <PieChart>
                      <Pie
                        data={data?.taskPieData ?? []}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {(data?.taskPieData ?? []).map((entry) => (
                          <Cell fill={entry.fill} key={entry.name} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <DonutCenterLabel data={data?.taskPieData} />
                </div>
                <div className="mt-4 space-y-1">
                  {(data?.taskPieData ?? []).map((item) => (
                    <div
                      className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1.5 py-2 text-sm"
                      key={item.name}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="font-medium text-zinc-600">
                        {item.name}
                      </span>
                      <span className="font-bold tabular-nums text-zinc-950">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ExportableReportsCard
                onExport={downloadReport}
                onExportAll={downloadPack}
                reports={data?.reports ?? []}
              />
            </aside>
          </div>
        </TabsContent>

        <TabsContent className="space-y-5" value="occupancy">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ChartCard>
              <ChartHeader
                description="Selected-period occupied and available capacity by day."
                icon={<BedDouble className="size-4" />}
                onAction={() => downloadReport("Occupancy report")}
                title="Occupancy analytics"
              />
              <ChartContainer
                className="mt-5 h-[360px] w-full"
                config={occupancyChartConfig}
              >
                <BarChart data={data?.occupancyData ?? []} barGap={4}>
                  <CartesianGrid
                    stroke="#f4f4f5"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "#fafafa" }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="occupied"
                    fill="var(--color-occupied)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="available"
                    fill="var(--color-available)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
            </ChartCard>

            <ReportPanel
              description="Daily occupancy, arrivals, departures, nights sold, and available room count."
              icon={<BedDouble className="size-4" />}
              onExport={() => downloadReport("Occupancy report")}
              rows={reportRows.occupancy}
              title="Occupancy summary"
            />
          </div>
        </TabsContent>

        <TabsContent className="space-y-5" value="revenue">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ChartCard>
              <ChartHeader
                description="Six-month revenue and expenses trend from cleared finance entries."
                icon={<ReceiptText className="size-4" />}
                onAction={() => downloadReport("Revenue report")}
                title="Revenue analytics"
              />
              <ChartContainer
                className="mt-5 h-[360px] w-full"
                config={revenueChartConfig}
              >
                <ComposedChart data={data?.revenueData ?? []}>
                  <defs>
                    <linearGradient
                      id="revenueFillTab"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#09090b" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#09090b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#f4f4f5"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="revenue"
                    stroke="none"
                    fill="url(#revenueFillTab)"
                    type="monotone"
                  />
                  <Line
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    type="monotone"
                  />
                  <Line
                    dataKey="expenses"
                    stroke="var(--color-expenses)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                    type="monotone"
                  />
                </ComposedChart>
              </ChartContainer>
            </ChartCard>

            <ReportPanel
              description="Revenue, invoices, collections, expenses, and net operating result."
              icon={<ReceiptText className="size-4" />}
              onExport={() => downloadReport("Revenue report")}
              rows={reportRows.revenue}
              title="Revenue summary"
            />
          </div>
        </TabsContent>

        <TabsContent className="space-y-5" value="tasks">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ChartCard>
              <ChartHeader
                description="Completion rate by operating department."
                icon={<Building2 className="size-4" />}
                onAction={() => downloadReport("Department task completion")}
                title="Task completion analytics"
              />
              <ChartContainer
                className="mt-5 h-[360px] w-full"
                config={taskChartConfig}
              >
                <BarChart data={data?.taskData ?? []}>
                  <CartesianGrid
                    stroke="#f4f4f5"
                    strokeDasharray="0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="department"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: "#fafafa" }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="completed"
                    fill="var(--color-completed)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ChartContainer>
            </ChartCard>

            <ChartCard>
              <ChartHeader
                description="Completed, open, and blocked workload mix."
                icon={<PieChartIcon className="size-4" />}
                onAction={() => downloadReport("Department task completion")}
                title="Task status mix"
              />
              <div className="relative mx-auto mt-5 h-[220px] w-full">
                <ChartContainer className="h-full w-full" config={taskChartConfig}>
                  <PieChart>
                    <Pie
                      data={data?.taskPieData ?? []}
                      dataKey="value"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {(data?.taskPieData ?? []).map((entry) => (
                        <Cell fill={entry.fill} key={entry.name} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <DonutCenterLabel data={data?.taskPieData} />
              </div>
              <div className="mt-4 space-y-1">
                {(data?.taskPieData ?? []).map((item) => (
                  <div
                    className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1.5 py-2 text-sm"
                    key={item.name}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="font-medium text-zinc-600">
                      {item.name}
                    </span>
                    <span className="font-bold tabular-nums text-zinc-950">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <ReportPanel
            description="Completion rate by housekeeping, maintenance, reception, laundry, and inventory."
            icon={<Building2 className="size-4" />}
            onExport={() => downloadReport("Department task completion")}
            rows={reportRows.tasks}
            title="Department task completion"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartCard({ children }: { children: ReactNode }) {
  return (
    <Card className="rounded-2xl border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {children}
    </Card>
  );
}

function DonutCenterLabel({
  data,
}: {
  data?: Array<{ name: string; value: number }>;
}) {
  if (!data?.length) {
    return null;
  }

  const top = data.reduce((max, item) => (item.value > max.value ? item : max));

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold tracking-tight text-zinc-950">
        {top.value}%
      </span>
      <span className="mt-0.5 text-xs font-medium text-zinc-500">
        {top.name}
      </span>
    </div>
  );
}

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-zinc-200 py-6 text-xs font-medium text-zinc-400">
      {label}
    </div>
  );
}

function ChartHeader({
  description,
  icon,
  onAction,
  title,
}: {
  description: string;
  icon: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-900">
            {icon}
          </div>
          <h2 className="text-base font-bold tracking-tight text-zinc-950">
            {title}
          </h2>
        </div>
        <p className="mt-2 text-sm leading-5 text-zinc-500">{description}</p>
      </div>
      <Button
        className="shrink-0 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
        disabled={!onAction}
        onClick={onAction}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </Button>
    </div>
  );
}

function ExportableReportsCard({
  onExport,
  onExportAll,
  reports,
}: {
  onExport: (title: AnalyticsReportTitle) => void;
  onExportAll: () => void;
  reports: Array<{
    format: string;
    scope: string;
    title: string;
    updated: string;
  }>;
}) {
  return (
    <Card className="gap-4 rounded-2xl border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-zinc-950">
            Exportable reports
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Occupancy, revenue, and department task completion.
          </p>
        </div>
        <Button
          className="shrink-0 rounded-full border-zinc-200"
          disabled={!reports.length}
          onClick={onExportAll}
          size="xs"
          variant="outline"
        >
          <ArrowDownToLine className="size-3.5" />
          Export all
        </Button>
      </div>

      <div className="space-y-2.5">
        {reports.map((report) => {
          const title = report.title as AnalyticsReportTitle;
          const Icon = REPORT_ICONS[title] ?? FileSpreadsheet;

          return (
            <div
              className="group rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50/60"
              key={report.title}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-900 transition-colors group-hover:bg-white">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-zinc-950">
                        {report.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-zinc-500">
                        {report.scope}
                      </p>
                    </div>
                    <Badge
                      className="shrink-0 rounded-full border-zinc-950 bg-zinc-950 text-white"
                      variant="outline"
                    >
                      {report.format}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-zinc-400">
                      {report.updated}
                    </span>
                    <Button
                      className="rounded-full border-zinc-200"
                      onClick={() => onExport(title)}
                      size="xs"
                      variant="outline"
                    >
                      <Download className="size-3.5" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!reports.length ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-xs font-medium text-zinc-400">
            Reports appear here once data loads
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ReportPanel({
  description,
  icon,
  onExport,
  rows,
  title,
}: {
  description: string;
  icon: ReactNode;
  onExport: () => void;
  rows: string[][];
  title: string;
}) {
  return (
    <Card className="rounded-2xl border-zinc-200 bg-white p-4 shadow-sm">
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-900">
                {icon}
              </div>
              <h2 className="truncate text-sm font-bold tracking-tight text-zinc-950">
                {title}
              </h2>
            </div>
            <p className="mt-2 max-w-[32rem] text-xs font-medium leading-5 text-zinc-500">
              {description}
            </p>
          </div>
        </div>
        <Button
          className="mt-3 rounded-full bg-zinc-950 hover:bg-zinc-800"
          disabled={!rows.length}
          onClick={onExport}
          size="xs"
        >
          <Download className="size-3.5" />
          Export report
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div
            className="min-h-24 rounded-xl border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-zinc-300"
            key={label}
          >
            <p className="w-fit max-w-full border-b border-dotted border-zinc-300 text-xs font-bold uppercase tracking-wide leading-4 text-zinc-500 [overflow-wrap:anywhere]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 [overflow-wrap:anywhere]">
              {value}
            </p>
          </div>
        ))}
        {!rows.length ? (
          <div className="col-span-2 rounded-xl border border-dashed border-zinc-200 py-8 text-center text-xs font-medium text-zinc-400">
            No data for this period yet
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
        <CalendarDays className="size-4 shrink-0 text-zinc-500" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-950">
            Report schedule available
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-zinc-500">
            Export now or use transaction export for recurring report packs.
          </p>
        </div>
      </div>
    </Card>
  );
}

function downloadCsvFile(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadXlsxFile(
  filename: string,
  sheetName: string,
  rows: string[][],
) {
  await downloadXlsxWorkbook(filename, { [sheetName.slice(0, 31)]: rows });
}

async function downloadXlsxWorkbook(
  filename: string,
  sheets: Record<string, string[][]>,
) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, rows]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  });

  XLSX.writeFile(workbook, filename);
}

async function downloadPdfFile(
  filename: string,
  title: string,
  rows: string[][],
) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF();

  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text(title, 14, 18);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.text(`Generated ${new Date().toLocaleString("en-US")}`, 14, 26);

  let y = 40;
  rows.slice(1).forEach(([label, value]) => {
    if (y > 270) {
      document.addPage();
      y = 20;
    }

    document.setFont("helvetica", "bold");
    document.text(label, 14, y);
    document.setFont("helvetica", "normal");
    document.text(value, 120, y);
    y += 10;
  });

  document.save(filename);
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}