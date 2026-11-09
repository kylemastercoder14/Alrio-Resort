"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Edit,
  MoreVertical,
  PackageCheck,
  PackageMinus,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";

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
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import toast from "react-hot-toast";

type StockType = "IN" | "OUT";

type InventoryCategory =
  | "Housekeeping supplies"
  | "Kitchen/Dining stock"
  | "Maintenance parts"
  | "Office/Admin supplies";

type InventoryItem = {
  category: InventoryCategory;
  code: string;
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  unit: string;
};

type StockMovement = {
  id: string;
  itemName: string;
  quantity: number;
  reason: string;
  type: StockType;
};

const CATEGORIES: InventoryCategory[] = [
  "Housekeeping supplies",
  "Maintenance parts",
  "Kitchen/Dining stock",
  "Office/Admin supplies",
];

export function InventoryView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const inventory = useQuery({
    ...trpc.resort.inventory.list.queryOptions(),
    retry: false,
  });
  const createMovement = useMutation(
    trpc.resort.inventory.createMovement.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.inventory.list.queryFilter(),
        );
        toast.success("Stock movement applied.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteItem = useMutation(
    trpc.resort.inventory.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.inventory.list.queryFilter(),
        );
        toast.success("Inventory item deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const [movementType, setMovementType] = useState<StockType>("IN");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [movementQuantity, setMovementQuantity] = useState("1");
  const [movementReason, setMovementReason] = useState("");
  const items = useMemo(
    () => (inventory.data?.items ?? []) as InventoryItem[],
    [inventory.data?.items],
  );
  const movements = useMemo(
    () => (inventory.data?.movements ?? []) as StockMovement[],
    [inventory.data?.movements],
  );

  const lowStockItems = items.filter((item) => item.quantity <= item.threshold);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  function prepareMovement(item: InventoryItem, type: StockType) {
    setSelectedItemId(item.id);
    setMovementType(type);
    setMovementQuantity("1");
    setMovementReason(
      type === "IN"
        ? `Stock in for ${item.name}`
        : `Stock out for ${item.name}`,
    );
  }

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Tracked items",
        value: String(items.length),
        note: "Essentials only",
        icon: <Boxes className="size-4" />,
      },
      {
        title: "On hand",
        value: String(totalQuantity),
        note: "Current running count",
        icon: <Warehouse className="size-4" />,
      },
      {
        title: "Low stock",
        value: String(lowStockItems.length),
        note: "Shows on dashboard",
        icon: <AlertCircle className="size-4" />,
      },
      {
        title: "Manual moves",
        value: String(movements.length),
        note: "Stock in / stock out",
        icon: <ClipboardList className="size-4" />,
      },
    ],
    [items.length, lowStockItems.length, movements.length, totalQuantity],
  );

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Item",
      cell: ({ row }) => (
        <div className="min-w-30">
          <p className="font-bold text-zinc-950">{row.original.name}</p>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {row.original.code}
          </p>
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="font-medium text-zinc-700">
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-700">{row.original.unit}</span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "On hand",
      cell: ({ row }) => {
        const item = row.original;
        const lowStock = item.quantity <= item.threshold;

        return (
          <div className="min-w-32">
            <p className="font-bold text-zinc-950">{item.quantity}</p>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-200">
              <div
                className={cn(
                  "h-full rounded-full",
                  lowStock ? "bg-black" : "bg-zinc-500",
                )}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((item.quantity / item.threshold) * 70),
                  )}%`,
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "threshold",
      header: "Threshold",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-700">
          {row.original.threshold} {row.original.unit}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const lowStock = row.original.quantity <= row.original.threshold;

        return (
          <Badge
            className={cn(
              "rounded-md",
              lowStock
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-zinc-100 text-zinc-900",
            )}
            variant="outline"
          >
            {lowStock ? "Low" : "OK"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <InventoryRowActions
          isDeleting={deleteItem.isPending}
          item={row.original}
          onDelete={(id) => deleteItem.mutate({ id })}
          onPrepareMovement={prepareMovement}
        />
      ),
      enableHiding: false,
    },
  ];

  function applyMovement() {
    const quantity = Number(movementQuantity);

    if (!selectedItemId || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    createMovement.mutate({
      itemId: selectedItemId,
      quantity,
      reason: movementReason || "Manual adjustment",
      type: movementType,
    });
    setMovementQuantity("1");
    setMovementReason("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button asChild size="xs">
          <Link href="/resort/operations/inventory/create">
            <Plus className="size-4" />
            Add item
          </Link>
        </Button>
      </div>

      <KpiGrid
        columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
        items={kpiItems}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="h-fit">
          <ReusableDataTable
            columnToggleIds={[
              "category",
              "unit",
              "quantity",
              "threshold",
              "status",
            ]}
            columns={columns}
            data={items}
            emptyState={{
              title: inventory.isLoading
                ? "Loading inventory items"
                : "No inventory items found",
              description: inventory.isLoading
                ? "Please wait while inventory loads."
                : "Add items to start tracking resort essentials.",
            }}
            filterOptions={[
              { label: "All", value: "all" },
              ...CATEGORIES.map((category) => ({
                label: category,
                value: category.toLowerCase().replaceAll(" ", "-"),
              })),
            ]}
            rowLabel="inventory items"
            searchPlaceholder="Search item, category, or item ID..."
          />
        </div>
        <aside className="space-y-5">
          <StockMovementCard
            items={items}
            movementQuantity={movementQuantity}
            movementReason={movementReason}
            movementType={movementType}
            onApplyMovement={applyMovement}
            onMovementQuantityChange={setMovementQuantity}
            onMovementReasonChange={setMovementReason}
            onMovementTypeChange={setMovementType}
            onSelectedItemChange={setSelectedItemId}
            selectedItemId={selectedItemId}
          />
          <LowStockAlertCard items={lowStockItems} />
          <RecentMovementsCard movements={movements} />
        </aside>
      </div>
    </div>
  );
}

function InventoryRowActions({
  isDeleting,
  item,
  onDelete,
  onPrepareMovement,
}: {
  isDeleting: boolean;
  item: InventoryItem;
  onDelete: (id: string) => void;
  onPrepareMovement: (item: InventoryItem, type: StockType) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${item.name}`}
            size="icon-xs"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/resort/operations/inventory/${item.id}`}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPrepareMovement(item, "IN")}>
            <ArrowDownLeft className="size-4" />
            Stock in
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPrepareMovement(item, "OUT")}>
            <ArrowUpRight className="size-4" />
            Stock out
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isDeleting}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
            variant="destructive"
          >
            <Trash2 className="size-4" />
            Delete item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {item.name} and its stock movement history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => onDelete(item.id)}
              size="sm"
            >
              {isDeleting ? "Deleting..." : "Delete item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StockMovementCard({
  items,
  movementQuantity,
  movementReason,
  movementType,
  onApplyMovement,
  onMovementQuantityChange,
  onMovementReasonChange,
  onMovementTypeChange,
  onSelectedItemChange,
  selectedItemId,
}: {
  items: InventoryItem[];
  movementQuantity: string;
  movementReason: string;
  movementType: StockType;
  onApplyMovement: () => void;
  onMovementQuantityChange: (value: string) => void;
  onMovementReasonChange: (value: string) => void;
  onMovementTypeChange: (value: StockType) => void;
  onSelectedItemChange: (value: string) => void;
  selectedItemId: string;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          {movementType === "IN" ? (
            <ArrowDownLeft className="size-4" />
          ) : (
            <ArrowUpRight className="size-4" />
          )}
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">
            Manual stock movement
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add stock-in or stock-out entry.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <Field label="Type">
          <Select
            value={movementType}
            onValueChange={(value) => onMovementTypeChange(value as StockType)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN">Stock in</SelectItem>
              <SelectItem value="OUT">Stock out</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Item">
          <Select value={selectedItemId} onValueChange={onSelectedItemChange}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Quantity">
          <Input
            className="rounded-lg"
            min={1}
            onChange={(event) => onMovementQuantityChange(event.target.value)}
            type="number"
            value={movementQuantity}
          />
        </Field>
        <Field label="Reason">
          <Textarea
            className="min-h-20 rounded-lg"
            onChange={(event) => onMovementReasonChange(event.target.value)}
            placeholder="Restock delivery, room replenishment, maintenance use..."
            value={movementReason}
          />
        </Field>
      </div>

      <Button className="w-full" onClick={onApplyMovement} type="button">
        {movementType === "IN" ? (
          <PackageCheck className="size-4" />
        ) : (
          <PackageMinus className="size-4" />
        )}
        Apply movement
      </Button>
    </Card>
  );
}

function LowStockAlertCard({ items }: { items: InventoryItem[] }) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <AlertCircle className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">
            Dashboard low-stock alert
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            These items should surface on operations dashboard.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
            key={item.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-zinc-950">{item.name}</p>
              <Badge
                className="border-black bg-black text-white"
                variant="outline"
              >
                Low
              </Badge>
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {item.quantity} {item.unit} on hand. Threshold {item.threshold}.
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentMovementsCard({ movements }: { movements: StockMovement[] }) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-zinc-950">Recent movements</h2>
      <div className="space-y-3">
        {movements.slice(0, 4).map((movement) => (
          <div
            className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3"
            key={movement.id}
          >
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
              {movement.type === "IN" ? (
                <ArrowDownLeft className="size-4" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-950">
                {movement.itemName}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {movement.type === "IN" ? "Stock in" : "Stock out"} ·{" "}
                {movement.quantity} · {movement.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-950">{label}</Label>
      {children}
    </div>
  );
}
