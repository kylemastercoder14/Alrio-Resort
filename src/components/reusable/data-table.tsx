/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type Table as TanstackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  Columns3,
  Eye,
  EyeOff,
  GripVertical,
  Search,
} from "lucide-react";

import { EmptyState, type EmptyStateProps } from "@/components/reusable/empty-state";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableFilterOption = {
  label: string;
  value: string;
};

export type ReusableDataTableProps<TData> = {
  columnToggleIds?: string[];
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyState?: EmptyStateProps;
  filterColumnId?: string;
  filterOptions?: DataTableFilterOption[];
  initialColumnVisibility?: VisibilityState;
  preventHorizontalScroll?: boolean;
  rowLabel?: string;
  searchPlaceholder?: string;
  toolbarActions?: React.ReactNode;
};

export function ReusableDataTable<TData>({
  columnToggleIds = [],
  columns,
  data,
  emptyState,
  filterColumnId = "status",
  filterOptions = [{ label: "All", value: "all" }],
  initialColumnVisibility = {},
  preventHorizontalScroll = false,
  rowLabel = "records",
  searchPlaceholder = "Search and filter",
  toolbarActions,
}: ReusableDataTableProps<TData>) {
  "use no memo";

  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedFilter, setSelectedFilter] = useState(
    filterOptions[0]?.value ?? "all",
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
      rowSelection,
    },
  });
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  function handleFilterChange(value: string) {
    setSelectedFilter(value);
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }));
    setColumnFilters((current) => {
      const nextFilters = current.filter(
        (filter) => filter.id !== filterColumnId,
      );

      if (value === "all") {
        return nextFilters;
      }

      return [
        ...nextFilters,
        {
          id: filterColumnId,
          value,
        },
      ];
    });
  }

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex min-h-14 flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-3 py-2 sm:px-4">
        <Select value={selectedFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="h-9 w-auto min-w-16 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-0 flex-[1_1_10rem]">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <div className="ml-auto flex max-w-full flex-wrap items-center gap-1">
          {toolbarActions}
          <ColumnsMenu columnIds={columnToggleIds} table={table} />
        </div>
      </div>

      <div className={preventHorizontalScroll ? "overflow-x-auto lg:overflow-x-hidden" : "overflow-x-auto"}>
        <Table className={preventHorizontalScroll ? "min-w-[40rem] lg:min-w-0 lg:w-full lg:table-fixed" : undefined}>
          <TableHeader className="bg-zinc-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-zinc-50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-10 px-4 font-semibold text-zinc-600",
                      preventHorizontalScroll ? "min-w-0 whitespace-normal" : "whitespace-nowrap",
                      header.id === "select" && "w-12",
                      header.id === "actions" && "w-20 text-right",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} className="h-15 hover:bg-zinc-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-4 text-sm text-zinc-700",
                        preventHorizontalScroll ? "min-w-0 whitespace-normal" : "whitespace-nowrap",
                        cell.column.id === "actions" && "text-right",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="p-0">
                  <EmptyState
                    actionLabel="Clear search and filters"
                    description="Try changing the filters or search term."
                    title={`No ${rowLabel} found`}
                    {...emptyState}
                    onAction={() => {
                      setGlobalFilter("");
                      setSelectedFilter(filterOptions[0]?.value ?? "all");
                      setColumnFilters((current) =>
                        current.filter((filter) => filter.id !== filterColumnId),
                      );
                      setPagination((current) => ({
                        ...current,
                        pageIndex: 0,
                      }));
                      emptyState?.onAction?.();
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-xs text-zinc-600 md:flex-row md:items-center md:justify-between">
        <span>
          {getPaginationLabel(table.getState().pagination, table.getFilteredRowModel().rows.length, rowLabel)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {[5, 10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <Button size="icon-sm" className="text-xs">
            {table.getState().pagination.pageIndex + 1}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

function ColumnsMenu<TData>({
  columnIds,
  table,
}: {
  columnIds: string[];
  table: TanstackTable<TData>;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg text-zinc-600 hover:bg-zinc-100"
        >
          <Columns3 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-lg p-3 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-zinc-700">
              <ArrowUpDown className="size-3.5" />
              Sort by
            </span>
            <span className="flex items-center gap-1 font-medium text-zinc-700">
              Updated
              <ChevronDown className="size-3.5" />
            </span>
          </div>
          <div className="h-px bg-zinc-200" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500">Columns</p>
            {columnIds.map((columnId) => {
              const column = table.getColumn(columnId);
              if (!column) return null;

              return (
                <button
                  key={columnId}
                  type="button"
                  className="flex h-7 w-full items-center gap-2 rounded-md px-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
                  onClick={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <GripVertical className="size-3.5 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate text-left">
                    {formatColumnName(columnId)}
                  </span>
                  {column.getIsVisible() ? (
                    <Eye className="size-3.5 text-zinc-600" />
                  ) : (
                    <EyeOff className="size-3.5 text-zinc-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatColumnName(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getPaginationLabel(
  pagination: PaginationState,
  rowCount: number,
  rowLabel: string,
) {
  if (!rowCount) {
    return `Showing 0 ${rowLabel}`;
  }

  const start = pagination.pageIndex * pagination.pageSize + 1;
  const end = Math.min(start + pagination.pageSize - 1, rowCount);

  return `Showing ${start}-${end} of ${rowCount} ${rowLabel}`;
}
