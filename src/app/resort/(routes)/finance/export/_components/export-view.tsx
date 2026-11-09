"use client";

import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Grid2X2,
  List,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ExportFormat = "CSV" | "PDF" | "TXT" | "XLSX";
type ExportStatus = "Failed" | "Ready" | "Scheduled";
type ExportSort = "newest" | "oldest" | "name" | "size-large" | "size-small";
type ExportTab = "All exports" | ExportStatus;
type ExportViewMode = "list" | "grid";
type ExportPeriod = "This month" | "Last 30 days" | "This year" | "All time";
type ExportName =
  | "Cash flow"
  | "Invoices summary"
  | "Money status"
  | "Receipts"
  | "Revenue & expenses";

type ExportRow = {
  createdAt: Date | string;
  format: ExportFormat;
  id: string;
  name: string;
  period: string;
  recordId: string;
  size: string;
  status: ExportStatus;
};

type QuickExport = {
  description: string;
  format: ExportFormat;
  icon: ReactNode;
  name: ExportName;
  title: string;
};

const FORMAT_META: Record<ExportFormat, { icon: ReactNode; label: string }> = {
  XLSX: {
    label: "X",
    icon: <FileSpreadsheet className="size-4" />,
  },
  PDF: {
    label: "PDF",
    icon: <FileText className="size-4" />,
  },
  CSV: {
    label: "CSV",
    icon: <FileArchive className="size-4" />,
  },
  TXT: {
    label: "TXT",
    icon: <FileText className="size-4" />,
  },
};

const STATUS_STYLE: Record<ExportStatus, string> = {
  Ready: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Scheduled: "border-zinc-200 bg-white text-zinc-700",
  Failed: "border-black bg-black text-white",
};

const QUICK_EXPORTS: QuickExport[] = [
  {
    title: "Revenue & expenses",
    description: "Export income and expense data",
    format: "XLSX",
    icon: <FileSpreadsheet className="size-4" />,
    name: "Revenue & expenses",
  },
  {
    title: "Cash flow",
    description: "Export cash inflow and outflow",
    format: "CSV",
    icon: <Download className="size-4" />,
    name: "Cash flow",
  },
  {
    title: "Receipts",
    description: "Export all receipts and payments",
    format: "PDF",
    icon: <FileText className="size-4" />,
    name: "Receipts",
  },
  {
    title: "Money status",
    description: "Export account and balance status",
    format: "XLSX",
    icon: <Clock3 className="size-4" />,
    name: "Money status",
  },
];

const TABS: ExportTab[] = ["All exports", "Ready", "Scheduled", "Failed"];
const EXPORT_FORMATS: ExportFormat[] = ["CSV", "PDF", "TXT", "XLSX"];
const EXPORT_PERIODS: ExportPeriod[] = ["This month", "Last 30 days", "This year", "All time"];

function FormatIcon({ format }: { format: ExportFormat }) {
  const meta = FORMAT_META[format];

  return (
    <div className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-950">
      <div className="relative">
        {meta.icon}
        <span className="absolute -bottom-2 -right-2 rounded bg-black px-1 py-0.5 text-[7px] font-medium leading-none text-white">
          {meta.label}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ExportStatus }) {
  return (
    <Badge
      className={cn("gap-1 rounded-md", STATUS_STYLE[status])}
      variant="outline"
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

function NewExportMenu({
  className,
  disabled,
  onCreate,
  size,
  variant,
}: {
  className?: string;
  disabled?: boolean;
  onCreate: (format: ExportFormat) => void;
  size: ComponentProps<typeof Button>["size"];
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={className}
          disabled={disabled}
          size={size}
          variant={variant}
        >
          <Plus className="size-4" />
          New export
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Choose format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXPORT_FORMATS.map((format) => (
          <DropdownMenuItem className="text-xs" key={format} onClick={() => onCreate(format)}>
            {FORMAT_META[format].icon}
            {format}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ExportView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const exportsQuery = useQuery({
    ...trpc.resort.transactionExports.list.queryOptions(),
    retry: false,
  });
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ExportTab>("All exports");
  const [formatFilter, setFormatFilter] = useState<ExportFormat | "all">("all");
  const [sortBy, setSortBy] = useState<ExportSort>("newest");
  const [viewMode, setViewMode] = useState<ExportViewMode>("list");
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("This month");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const isLoading = exportsQuery.isPending;
  const exportRows = useMemo<ExportRow[]>(() => {
    const query = search.trim().toLowerCase();

    return (exportsQuery.data ?? [])
      .map((exportJob) => ({
        createdAt: exportJob.createdAt,
        format: exportJob.format as ExportFormat,
        id: exportJob.code,
        name: exportJob.name,
        period: exportJob.period,
        recordId: exportJob.id,
        size: exportJob.size,
        status: exportJob.status as ExportStatus,
      }))
      .filter((exportJob) => {
        const matchesTab =
          activeTab === "All exports" || exportJob.status === activeTab;
        const matchesFormat =
          formatFilter === "all" || exportJob.format === formatFilter;
        const matchesSearch = query
          ? [
              exportJob.id,
              exportJob.name,
              exportJob.format,
              exportJob.period,
              exportJob.status,
            ].some((value) => value.toLowerCase().includes(query))
          : true;

        return matchesTab && matchesFormat && matchesSearch;
      })
      .sort((left, right) => {
        if (sortBy === "oldest") return toTime(left.createdAt) - toTime(right.createdAt);
        if (sortBy === "name") return left.name.localeCompare(right.name);
        if (sortBy === "size-large") return parseSize(right.size) - parseSize(left.size);
        if (sortBy === "size-small") return parseSize(left.size) - parseSize(right.size);
        return toTime(right.createdAt) - toTime(left.createdAt);
      });
  }, [activeTab, exportsQuery.data, formatFilter, search, sortBy]);
  const totalPages = Math.max(1, Math.ceil(exportRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedExports = useMemo(
    () => exportRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, exportRows, pageSize],
  );

  const createExport = useMutation(
    trpc.resort.transactionExports.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.transactionExports.list.queryFilter());
        toast.success("Export created.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const retryExport = useMutation(
    trpc.resort.transactionExports.retry.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.transactionExports.list.queryFilter());
        toast.success("Export regenerated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const downloadExport = useMutation(
    trpc.resort.transactionExports.download.mutationOptions({
      onSuccess: async (exportJob) => {
        await downloadExportFile({
          code: exportJob.code,
          format: exportJob.format as ExportFormat,
          name: exportJob.name,
          payload: exportJob.payload,
          period: exportJob.period,
        });
        toast.success("Export downloaded.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const kpiItems = useMemo<KpiGridItem[]>(() => {
    const ready = exportRows.filter((exportJob) => exportJob.status === "Ready").length;
    const formats = new Set(exportRows.map((exportJob) => exportJob.format)).size || 3;
    const value = (content: React.ReactNode) =>
      isLoading ? <Skeleton className="h-8 w-16" /> : content;

    return [
      {
        title: "Ready exports",
        value: value(ready),
        note: "Available for download",
        icon: <Download className="size-4" />,
      },
      {
        title: "Export jobs",
        value: value(exportRows.length),
        note: "Saved export history",
        icon: <FileArchive className="size-4" />,
      },
      {
        title: "Formats",
        value: value(formats),
        note: "CSV, XLSX, PDF",
        icon: <FileSpreadsheet className="size-4" />,
      },
      {
        title: "Templates",
        value: value(QUICK_EXPORTS.length + 1),
        note: "Saved export presets",
        icon: <Settings2 className="size-4" />,
      },
    ];
  }, [exportRows, isLoading]);
  const handleCreateExport = (
    name: ExportName = "Revenue & expenses",
    format: ExportFormat = "XLSX",
  ) => createExport.mutate({ format, name, period: exportPeriod });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Select value={exportPeriod} onValueChange={(value) => setExportPeriod(value as ExportPeriod)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{EXPORT_PERIODS.map((period) => <SelectItem key={period} value={period}>{period}</SelectItem>)}</SelectContent>
          </Select>
          <NewExportMenu
            disabled={createExport.isPending}
            onCreate={(format) => handleCreateExport("Revenue & expenses", format)}
            size="xs"
          />
        </div>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="gap-0! h-fit overflow-hidden rounded-xl border-zinc-200 bg-white p-0!">
          <div className="flex border-b border-zinc-200 px-5">
            {TABS.map((tab) => (
              <button
                className={cn(
                  "relative px-3 py-3 text-xs font-semibold tracking-tight text-zinc-500 transition hover:text-zinc-950",
                  activeTab === tab && "text-zinc-950",
                )}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
                {activeTab === tab ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-5 py-3">
            <div className="relative min-w-0 basis-48 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="h-8 rounded-lg pl-9 text-xs!"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by export name, format, or job ID..."
                value={search}
              />
            </div>
            <ExportFilters
              formatFilter={formatFilter}
              onFormatChange={setFormatFilter}
            />
            <ExportSortMenu sortBy={sortBy} onSortChange={setSortBy} />
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ExportViewMode)}>
              <ToggleGroupItem value="list" aria-label="List view" size="sm"><List className="size-4" /></ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view" size="sm"><Grid2X2 className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className={cn(viewMode === "list" && "divide-y divide-zinc-200")}>
            {isLoading ? (
              <ExportSkeleton />
            ) : exportRows.length ? (
              viewMode === "list" ? (
                paginatedExports.map((exportJob) => (
                  <ExportListRow
                    key={exportJob.id}
                    downloadPending={downloadExport.isPending}
                    exportJob={exportJob}
                    onDownload={(id) => downloadExport.mutate({ id })}
                    onRetry={(id) => retryExport.mutate({ id })}
                    retryPending={retryExport.isPending}
                  />
                ))
              ) : (
                <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
                  {paginatedExports.map((exportJob) => (
                    <ExportGridCard
                      key={exportJob.id}
                      downloadPending={downloadExport.isPending}
                      exportJob={exportJob}
                      onDownload={(id) => downloadExport.mutate({ id })}
                      onRetry={(id) => retryExport.mutate({ id })}
                      retryPending={retryExport.isPending}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="px-5 py-14 text-center">
                <Download className="mx-auto size-10 text-zinc-400" />
                <h2 className="mt-3 text-sm font-bold text-zinc-950">No exports found</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Create an export to save a transaction export job.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 p-4 text-sm text-zinc-600">
            <p>
              Showing {exportRows.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, exportRows.length)} of {exportRows.length} exports
            </p>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>{[10, 20, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="icon-sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button className="size-8">{currentPage}</Button>
              <Button size="icon-sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="overflow-hidden rounded-xl border-zinc-900 bg-black p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Create a new export</h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Export financial data in a few clicks.
                </p>
                <NewExportMenu
                  className="mt-5 bg-white text-black hover:bg-zinc-100"
                  disabled={createExport.isPending}
                  onCreate={(format) => handleCreateExport("Revenue & expenses", format)}
                  size="sm"
                  variant="outline"
                />
              </div>
              <div className="flex size-20 rotate-[-10deg] items-center justify-center rounded-2xl border border-white/15 bg-white/20">
                <Download className="size-9" />
              </div>
            </div>
          </Card>

          <Card className="rounded-xl gap-2! border-zinc-200 bg-white p-5">
            <h2 className="text-base font-bold text-zinc-950">Quick export</h2>
            <div className="divide-y divide-zinc-200">
              {QUICK_EXPORTS.map((item) => (
                <button
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-zinc-50"
                  key={item.title}
                  disabled={createExport.isPending}
                  onClick={() => handleCreateExport(item.name, item.format)}
                  type="button"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-zinc-950">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-zinc-500" />
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ExportFilters({
  formatFilter,
  onFormatChange,
}: {
  formatFilter: ExportFormat | "all";
  onFormatChange: (value: ExportFormat | "all") => void;
}) {
  const activeFilterCount = formatFilter === "all" ? 0 : 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs!">
          <SlidersHorizontal className="size-4" />
          Filters
          {activeFilterCount ? (
            <Badge className="ml-1 h-5 rounded-md px-1.5">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-xl p-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-zinc-950">Format</p>
            <Select
              value={formatFilter}
              onValueChange={(value) => onFormatChange(value as ExportFormat | "all")}
            >
              <SelectTrigger className="mt-2 h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All formats</SelectItem>
                {EXPORT_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onFormatChange("all")}
          >
            Clear filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExportSortMenu({
  onSortChange,
  sortBy,
}: {
  onSortChange: (value: ExportSort) => void;
  sortBy: ExportSort;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="ml-auto min-w-25 text-xs!"
          size="sm"
          variant="outline"
        >
          {getSortLabel(sortBy)}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => onSortChange(value as ExportSort)}
        >
          <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">Name A-Z</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size-large">Largest size</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size-small">Smallest size</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExportListRow({
  downloadPending,
  exportJob,
  onDownload,
  onRetry,
  retryPending,
}: {
  downloadPending: boolean;
  exportJob: ExportRow;
  onDownload: (id: string) => void;
  onRetry: (id: string) => void;
  retryPending: boolean;
}) {
  return (
    <div
      className="grid items-center gap-2 p-4 transition hover:bg-zinc-50 2xl:grid-cols-[64px_minmax(50px,1.2fr)_130px_130px_150px_80px_72px]"
    >
      <FormatIcon format={exportJob.format} />

      <div>
        <h3 className="font-bold text-zinc-950">{exportJob.name}</h3>
        <p className="mt-1 text-xs font-medium text-zinc-500">{exportJob.id}</p>
      </div>

      <Detail label="Period" value={exportJob.period} />
      <Detail label="File Size" value={exportJob.size} />
      <Detail label="Created" value={formatDateTime(exportJob.createdAt)} />
      <StatusBadge status={exportJob.status} />
      <ExportRowAction
        downloadPending={downloadPending}
        exportJob={exportJob}
        onDownload={onDownload}
        onRetry={onRetry}
        retryPending={retryPending}
      />
    </div>
  );
}

function ExportGridCard({
  downloadPending,
  exportJob,
  onDownload,
  onRetry,
  retryPending,
}: {
  downloadPending: boolean;
  exportJob: ExportRow;
  onDownload: (id: string) => void;
  onRetry: (id: string) => void;
  retryPending: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:bg-zinc-50">
      <div className="flex items-start justify-between gap-3">
        <FormatIcon format={exportJob.format} />
        <ExportRowAction
          downloadPending={downloadPending}
          exportJob={exportJob}
          onDownload={onDownload}
          onRetry={onRetry}
          retryPending={retryPending}
        />
      </div>
      <h3 className="mt-4 font-bold text-zinc-950">{exportJob.name}</h3>
      <p className="mt-1 text-xs font-medium text-zinc-500">{exportJob.id}</p>
      <div className="mt-4 grid gap-3 text-xs">
        <Detail label="Period" value={exportJob.period} />
        <Detail label="File Size" value={exportJob.size} />
        <Detail label="Created" value={formatDateTime(exportJob.createdAt)} />
      </div>
      <div className="mt-4">
        <StatusBadge status={exportJob.status} />
      </div>
    </div>
  );
}

function ExportRowAction({
  downloadPending,
  exportJob,
  onDownload,
  onRetry,
  retryPending,
}: {
  downloadPending: boolean;
  exportJob: ExportRow;
  onDownload: (id: string) => void;
  onRetry: (id: string) => void;
  retryPending: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {exportJob.status === "Ready" ? (
        <Button
          size="icon-sm"
          disabled={downloadPending}
          onClick={() => onDownload(exportJob.recordId)}
        >
          <Download className="size-4" />
        </Button>
      ) : (
        <Button
          size="icon-sm"
          variant="outline"
          disabled={retryPending}
          onClick={() => onRetry(exportJob.recordId)}
        >
          <RefreshCcw className="size-4" />
        </Button>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-1 text-xs font-medium text-zinc-950">{value}</p>
    </div>
  );
}

function ExportSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="grid items-center gap-2 p-4 2xl:grid-cols-[64px_minmax(50px,1.2fr)_130px_130px_150px_80px_72px]"
          key={index}
        >
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="size-8" />
        </div>
      ))}
    </>
  );
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function parseSize(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  if (value.toLowerCase().includes("mb")) return amount * 1024;
  return amount;
}

function getSortLabel(sortBy: ExportSort) {
  if (sortBy === "oldest") return "Oldest first";
  if (sortBy === "name") return "Name A-Z";
  if (sortBy === "size-large") return "Largest size";
  if (sortBy === "size-small") return "Smallest size";
  return "Newest first";
}

async function downloadExportFile(input: {
  code: string;
  format: ExportFormat;
  name: string;
  payload: unknown;
  period: string;
}) {
  const rows = normalizePayloadRows(input.payload);
  const filename = sanitizeFileName(`${input.code}-${input.name}`);

  if (input.format === "PDF") {
    await downloadPdf(filename, input.name, input.period, rows);
    return;
  }

  if (input.format === "XLSX") {
    await downloadXlsx(filename, rows);
    return;
  }

  if (input.format === "TXT") {
    downloadBlob(
      `${filename}.txt`,
      "text/plain;charset=utf-8",
      buildText(input.name, input.period, rows),
    );
    return;
  }

  downloadBlob(
    `${filename}.csv`,
    "text/csv;charset=utf-8",
    buildCsv(rows),
  );
}

function normalizePayloadRows(payload: unknown) {
  if (!Array.isArray(payload)) return [];

  return payload.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, formatCellValue(value)]),
      );
    }

    return {
      value: formatCellValue(row),
    };
  });
}

function getHeaders(rows: Array<Record<string, string>>) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

function buildCsv(rows: Array<Record<string, string>>) {
  const headers = getHeaders(rows);
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(","));

  return [headers.map(escapeCsv).join(","), ...body].join("\n");
}

function buildText(
  name: string,
  period: string,
  rows: Array<Record<string, string>>,
) {
  const headers = getHeaders(rows);
  const lines = [
    name,
    `Period: ${period}`,
    "",
    ...rows.map((row, index) => [
      `#${index + 1}`,
      ...headers.map((header) => `${header}: ${row[header] ?? ""}`),
    ].join("\n")),
  ];

  return lines.join("\n\n");
}

function downloadBlob(filename: string, type: string, content: string | BlobPart[]) {
  const blob = new Blob(Array.isArray(content) ? content : [content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadPdf(
  filename: string,
  name: string,
  period: string,
  rows: Array<Record<string, string>>,
) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ format: "a4", orientation: "landscape", unit: "pt" });
  const headers = getHeaders(rows);
  const pageWidth = document.internal.pageSize.getWidth();
  const margin = 32;
  const usableWidth = pageWidth - margin * 2;
  const columnWidth = headers.length ? usableWidth / headers.length : usableWidth;
  let y = 36;

  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  document.text(name, margin, y);
  y += 18;
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.text(`Period: ${period}`, margin, y);
  y += 24;

  document.setFont("helvetica", "bold");
  headers.forEach((header, index) => {
    document.text(header, margin + index * columnWidth, y, {
      maxWidth: columnWidth - 8,
    });
  });
  y += 16;
  document.setFont("helvetica", "normal");

  rows.forEach((row) => {
    if (y > document.internal.pageSize.getHeight() - 36) {
      document.addPage();
      y = 36;
    }

    headers.forEach((header, index) => {
      document.text(row[header] ?? "", margin + index * columnWidth, y, {
        maxWidth: columnWidth - 8,
      });
    });
    y += 16;
  });

  document.save(`${filename}.pdf`);
}

async function downloadXlsx(
  filename: string,
  rows: Array<Record<string, string>>,
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function sanitizeFileName(value: string) {
  return value
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
