"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  Folder,
  Grid2X2,
  List,
  LockKeyhole,
  MoreVertical,
  ReceiptText,
  Search,
  SearchCheck,
  SlidersHorizontal,
  WalletCards,
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

type ReceiptStatus = "Matched" | "Needs review" | "Uploaded";
type ReceiptTab = "All receipts" | "Needs review" | "Uploaded today";
type ReceiptFileKind = "all" | "image" | "pdf" | "file";
type ReceiptSort = "newest" | "oldest" | "amount-high" | "amount-low" | "vendor";
type ReceiptTypeFilter = "all" | "Expense" | "Revenue";
type ReceiptViewMode = "list" | "grid";

type ReceiptRow = {
  amount: string;
  category: string;
  date: Date | string;
  dateLabel: string;
  entryId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  id: string;
  image: string;
  meta: string;
  owner: string;
  receiptUrl: string;
  source: string;
  status: ReceiptStatus;
  type: "Expense" | "Revenue";
  uploadedAt: Date | string;
  vendor: string;
};

const STATUS_STYLE: Record<ReceiptStatus, string> = {
  Matched: "border-zinc-200 bg-zinc-100 text-zinc-900",
  "Needs review": "border-black bg-black text-white",
  Uploaded: "border-zinc-200 bg-white text-zinc-700",
};

const STATUS_ICON: Record<ReceiptStatus, ReactNode> = {
  Matched: <CheckCircle2 className="size-3.5" />,
  "Needs review": <CalendarDays className="size-3.5" />,
  Uploaded: <CloudUpload className="size-3.5" />,
};

const TABS: ReceiptTab[] = ["All receipts", "Needs review", "Uploaded today"];

export function ReceiptsView() {
  const trpc = useTRPC();
  const entries = useQuery({
    ...trpc.resort.financeEntries.list.queryOptions(),
    retry: false,
  });
  const [activeTab, setActiveTab] = useState<ReceiptTab>("All receipts");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [fileKindFilter, setFileKindFilter] = useState<ReceiptFileKind>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<ReceiptSort>("newest");
  const [typeFilter, setTypeFilter] = useState<ReceiptTypeFilter>("all");
  const [viewMode, setViewMode] = useState<ReceiptViewMode>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const isLoading = entries.isPending;
  const receipts = useMemo<ReceiptRow[]>(() => {
    return (entries.data ?? [])
      .filter((entry) => Boolean(entry.receiptUrl))
      .map((entry) => {
        const isMatched = entry.status === "Cleared";
        const isUploadedToday = isToday(entry.updatedAt);
        const status: ReceiptStatus = isMatched
          ? "Matched"
          : isUploadedToday
            ? "Uploaded"
            : "Needs review";

        return {
          amount: entry.amount,
          category: entry.category,
          date: entry.entryDate,
          dateLabel: formatDate(entry.entryDate),
          entryId: entry.id,
          fileName: entry.receiptName || "Receipt",
          fileSize: entry.receiptSize,
          fileType: entry.receiptType || "file",
          id: entry.code,
          image: entry.receiptUrl,
          meta: isMatched ? `Matched to ${entry.code}` : "Linked finance entry needs review",
          owner: entry.department || "--",
          receiptUrl: entry.receiptUrl,
          source: `${entry.type} ${entry.code}`,
          status,
          type: entry.type as "Expense" | "Revenue",
          uploadedAt: entry.updatedAt,
          vendor: entry.description,
        };
      })
  }, [entries.data]);
  const departmentOptions = useMemo(() => {
    return Array.from(new Set(receipts.map((receipt) => receipt.owner)))
      .filter((department) => department && department !== "--")
      .sort((left, right) => left.localeCompare(right));
  }, [receipts]);
  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const nextReceipts = receipts.filter((receipt) => {
        const matchesTab =
          activeTab === "All receipts" ||
          (activeTab === "Needs review" && receipt.status === "Needs review") ||
          (activeTab === "Uploaded today" && isToday(receipt.uploadedAt));
        const matchesSearch = query
          ? [
              receipt.vendor,
              receipt.owner,
              receipt.id,
              receipt.source,
              receipt.category,
              receipt.fileName,
            ].some((value) => value.toLowerCase().includes(query))
          : true;
        const matchesType =
          typeFilter === "all" || receipt.type === typeFilter;
        const matchesDepartment =
          departmentFilter === "all" || receipt.owner === departmentFilter;
        const matchesFileKind =
          fileKindFilter === "all" ||
          getFileKind(receipt.fileType) === fileKindFilter;

        return (
          matchesTab &&
          matchesSearch &&
          matchesType &&
          matchesDepartment &&
          matchesFileKind
        );
      });

    return nextReceipts.sort((left, right) => {
      if (sortBy === "oldest") return toTime(left.date) - toTime(right.date);
      if (sortBy === "amount-high") return parseMoney(right.amount) - parseMoney(left.amount);
      if (sortBy === "amount-low") return parseMoney(left.amount) - parseMoney(right.amount);
      if (sortBy === "vendor") return left.vendor.localeCompare(right.vendor);
      return toTime(right.date) - toTime(left.date);
    });
  }, [
    activeTab,
    departmentFilter,
    fileKindFilter,
    receipts,
    search,
    sortBy,
    typeFilter,
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedReceipts = useMemo(
    () => filteredReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredReceipts, pageSize],
  );
  const pageStart = filteredReceipts.length ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, filteredReceipts.length);

  const kpiItems = useMemo<KpiGridItem[]>(() => {
    const matched = receipts.filter((receipt) => receipt.status === "Matched").length;
    const review = receipts.filter((receipt) => receipt.status === "Needs review").length;
    const uploadedToday = receipts.filter((receipt) => isToday(receipt.uploadedAt)).length;
    const value = (content: React.ReactNode) =>
      isLoading ? <Skeleton className="h-8 w-20" /> : content;

    return [
      {
        title: "Total receipts",
        value: value(receipts.length),
        note: "Captured receipts",
        icon: <ReceiptText className="size-4" />,
      },
      {
        title: "Matched",
        value: value(matched),
        note: "Linked to cleared entries",
        icon: <FileCheck2 className="size-4" />,
      },
      {
        title: "Needs review",
        value: value(review),
        note: "Pending finance entries",
        icon: <SearchCheck className="size-4" />,
      },
      {
        title: "Uploaded today",
        value: value(uploadedToday),
        note: "New receipt uploads",
        icon: <FileUp className="size-4" />,
      },
    ];
  }, [isLoading, receipts]);

  return (
    <div className="space-y-5">
      <ResortBreadcrumb />
      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden h-fit gap-0! rounded-xl border-zinc-200 bg-white p-0!">
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
                className="rounded-lg h-8 text-xs! pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by vendor, owner, or receipt ID..."
                value={search}
              />
            </div>
            <ReceiptFilters
              departmentFilter={departmentFilter}
              departmentOptions={departmentOptions}
              fileKindFilter={fileKindFilter}
              onDepartmentChange={setDepartmentFilter}
              onFileKindChange={setFileKindFilter}
              onTypeChange={setTypeFilter}
              typeFilter={typeFilter}
            />
            <ReceiptSortMenu sortBy={sortBy} onSortChange={setSortBy} />
            <ToggleGroup
              variant="outline"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as ReceiptViewMode);
              }}
              spacing={1}
              type="single"
            >
              <ToggleGroupItem
                aria-label="List view"
                className="size-8 border border-transparent p-0 data-[state=on]:border-black data-[state=on]:bg-white"
                size="sm"
                value="list"
                variant="outline"
              >
                <List className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Grid view"
                className="size-8 border border-transparent p-0 data-[state=on]:border-black data-[state=on]:bg-white"
                size="sm"
                value="grid"
                variant="outline"
              >
                <Grid2X2 className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isLoading ? (
            <ReceiptsSkeleton />
          ) : filteredReceipts.length ? (
            viewMode === "list" ? (
              <div className="divide-y divide-zinc-200">
                {paginatedReceipts.map((receipt) => (
                  <ReceiptCard key={receipt.id} receipt={receipt} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 p-4 sm:grid-cols-2 2xl:grid-cols-3">
                {paginatedReceipts.map((receipt) => (
                  <ReceiptGridCard key={receipt.id} receipt={receipt} />
                ))}
              </div>
            )
          ) : (
            <div className="px-5 py-14 text-center">
              <ReceiptText className="mx-auto size-10 text-zinc-400" />
              <h2 className="mt-3 text-sm font-bold text-zinc-950">No receipts found</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Upload receipt proof from a revenue or expense entry.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 p-4 text-sm text-zinc-600">
            <p>
              Showing {pageStart}-{pageEnd} of {filteredReceipts.length} receipts
            </p>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                </SelectContent>
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
          <Card className="rounded-xl border-zinc-200 bg-white p-5">
            <h2 className="text-base font-bold text-zinc-950">Upload receipt</h2>
            <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center">
              <CloudUpload className="mx-auto size-9 text-zinc-950" />
              <p className="mt-3 text-sm font-bold text-zinc-950">Drag & drop files here</p>
              <p className="text-xs text-zinc-500">PNG, JPG, PDF through finance entry</p>
              <Button className="mt-4 w-full" asChild>
                <Link href="/resort/finance/revenue-expenses/create">
                  Choose files
                </Link>
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1 text-xs text-zinc-500">
                <LockKeyhole className="size-3" />
                Receipts are stored with finance entries
              </p>
            </div>
          </Card>

          <Card className="rounded-xl gap-3! border-zinc-200 bg-zinc-50 p-5">
            <h2 className="text-sm font-bold text-zinc-950">Tips for best results</h2>
            <div className="space-y-3 text-xs text-zinc-700">
              {[
                "Capture the entire receipt",
                "Ensure text is clear and readable",
                "Include date, amount, and vendor",
                "PDF, PNG, JPG up to 10MB",
              ].map((tip) => (
                <p className="flex items-center gap-2" key={tip}>
                  <CheckCircle2 className="size-3.5 text-zinc-950" />
                  {tip}
                </p>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ReceiptFilters({
  departmentFilter,
  departmentOptions,
  fileKindFilter,
  onDepartmentChange,
  onFileKindChange,
  onTypeChange,
  typeFilter,
}: {
  departmentFilter: string;
  departmentOptions: string[];
  fileKindFilter: ReceiptFileKind;
  onDepartmentChange: (value: string) => void;
  onFileKindChange: (value: ReceiptFileKind) => void;
  onTypeChange: (value: ReceiptTypeFilter) => void;
  typeFilter: ReceiptTypeFilter;
}) {
  const activeFilterCount = [
    typeFilter !== "all",
    departmentFilter !== "all",
    fileKindFilter !== "all",
  ].filter(Boolean).length;

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
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-zinc-950">Entry type</p>
            <Select
              value={typeFilter}
              onValueChange={(value) => onTypeChange(value as ReceiptTypeFilter)}
            >
              <SelectTrigger className="mt-2 w-full rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
                <SelectItem value="Revenue">Revenue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs font-bold text-zinc-950">Department</p>
            <Select value={departmentFilter} onValueChange={onDepartmentChange}>
              <SelectTrigger className="mt-2 w-full rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs font-bold text-zinc-950">File type</p>
            <Select
              value={fileKindFilter}
              onValueChange={(value) => onFileKindChange(value as ReceiptFileKind)}
            >
              <SelectTrigger className="mt-2 w-full rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All files</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="file">Other files</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              onDepartmentChange("all");
              onFileKindChange("all");
              onTypeChange("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReceiptSortMenu({
  onSortChange,
  sortBy,
}: {
  onSortChange: (value: ReceiptSort) => void;
  sortBy: ReceiptSort;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="ml-auto min-w-25 text-xs!" variant="outline">
          {getSortLabel(sortBy)}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(value) => onSortChange(value as ReceiptSort)}
        >
          <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="amount-high">Amount high</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="amount-low">Amount low</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="vendor">Vendor A-Z</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReceiptCard({ receipt }: { receipt: ReceiptRow }) {
  return (
    <div className="grid gap-4 p-4 transition hover:bg-zinc-50 2xl:grid-cols-[120px_minmax(170px,1fr)_160px_180px_32px]">
      <div className="relative h-28 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        {isImageFile(receipt.fileType) ? (
          <Image
            alt={`${receipt.vendor} receipt`}
            className="object-cover"
            fill
            sizes="120px"
            src={receipt.image}
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <FileText className="size-8" />
            <span className="text-xs font-bold">{formatFileType(receipt.fileType)}</span>
          </div>
        )}
        <Badge className="absolute bottom-2 right-2 gap-1 border-black bg-black text-white">
          <FileText className="size-3" />
          {formatFileType(receipt.fileType)}
        </Badge>
      </div>

      <div className="space-y-2">
        <div>
          <h2 className="font-bold text-zinc-950">{receipt.vendor}</h2>
          <p className="text-xs font-medium text-zinc-500">{receipt.id}</p>
        </div>
        <div className="space-y-1 text-sm text-zinc-600">
          <p className="flex items-center gap-2">
            <WalletCards className="size-4" />
            {receipt.owner}
          </p>
          <p className="flex items-center gap-2">
            <Folder className="size-4" />
            {receipt.source}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-zinc-950">
            <CalendarDays className="size-4 text-zinc-500" />
            {receipt.dateLabel}
          </p>
          <p className="pl-6 text-xs text-zinc-500">Date</p>
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-zinc-950">
            <WalletCards className="size-4 text-zinc-500" />
            {formatPeso(receipt.amount)}
          </p>
          <p className="pl-6 text-xs text-zinc-500">Amount</p>
        </div>
      </div>

      <div className="space-y-3">
        <Badge className={cn("gap-1 rounded-md", STATUS_STYLE[receipt.status])} variant="outline">
          {STATUS_ICON[receipt.status]}
          {receipt.status}
        </Badge>
        <div>
          <p className="text-xs text-zinc-500">
            {receipt.status === "Needs review"
              ? "Review required"
              : receipt.status === "Uploaded"
                ? "Awaiting matching"
                : "Matched to"}
          </p>
          <p className="text-xs font-bold text-zinc-950">{receipt.meta}</p>
          <p className="mt-1 text-xs text-zinc-500">{formatFileSize(receipt.fileSize)}</p>
        </div>
      </div>

      <ReceiptActions receipt={receipt} />
    </div>
  );
}

function ReceiptGridCard({ receipt }: { receipt: ReceiptRow }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs transition hover:bg-zinc-50">
      <div className="relative aspect-4/3 bg-zinc-50">
        {isImageFile(receipt.fileType) ? (
          <Image
            alt={`${receipt.vendor} receipt`}
            className="object-cover"
            fill
            sizes="360px"
            src={receipt.image}
            unoptimized
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
            <FileText className="size-10" />
            <span className="text-xs font-bold">{formatFileType(receipt.fileType)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/60 to-transparent" />
        <Badge className="absolute bottom-3 right-3 gap-1 border-black bg-black text-white">
          <FileText className="size-3" />
          {formatFileType(receipt.fileType)}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-bold text-zinc-950">{receipt.vendor}</h2>
            <p className="text-xs font-medium text-zinc-500">{receipt.id}</p>
          </div>
          <ReceiptActions receipt={receipt} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Date</p>
            <p className="font-bold text-zinc-950">{receipt.dateLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500">Amount</p>
            <p className="font-bold text-zinc-950">{formatPeso(receipt.amount)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Badge className={cn("gap-1 rounded-md", STATUS_STYLE[receipt.status])} variant="outline">
            {STATUS_ICON[receipt.status]}
            {receipt.status}
          </Badge>
          <span className="text-xs font-medium text-zinc-500">
            {formatFileSize(receipt.fileSize)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReceiptActions({ receipt }: { receipt: ReceiptRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateStatus = useMutation(
    trpc.resort.financeEntries.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.financeEntries.list.queryFilter());
        toast.success("Receipt status updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <a href={receipt.receiptUrl} target="_blank" rel="noreferrer">
            <Eye className="size-4" />
            View receipt
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/resort/finance/revenue-expenses/${receipt.entryId}`}>
            <FileText className="size-4" />
            Edit entry
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {receipt.status === "Matched" ? (
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: receipt.entryId, status: "Pending" })}
          >
            <SearchCheck className="size-4" />
            Mark needs review
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: receipt.entryId, status: "Cleared" })}
          >
            <CheckCircle2 className="size-4" />
            Mark matched
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReceiptsSkeleton() {
  return (
    <div className="divide-y divide-zinc-200">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="grid gap-4 p-4 2xl:grid-cols-[120px_minmax(170px,1fr)_160px_180px_32px]"
          key={index}
        >
          <Skeleton className="h-28 rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="size-8" />
        </div>
      ))}
    </div>
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

function isToday(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function formatFileSize(size: number) {
  if (!size) return "--";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatFileType(type: string) {
  if (!type) return "FILE";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("image")) return "IMG";
  return type.split("/").pop()?.toUpperCase() ?? "FILE";
}

function getFileKind(type: string): ReceiptFileKind {
  if (type.includes("image")) return "image";
  if (type.includes("pdf")) return "pdf";
  return "file";
}

function getSortLabel(sortBy: ReceiptSort) {
  if (sortBy === "oldest") return "Oldest first";
  if (sortBy === "amount-high") return "Amount high";
  if (sortBy === "amount-low") return "Amount low";
  if (sortBy === "vendor") return "Vendor A-Z";
  return "Newest first";
}

function isImageFile(type: string) {
  return type.includes("image");
}
