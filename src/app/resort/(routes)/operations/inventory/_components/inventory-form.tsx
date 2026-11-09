"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Boxes, Loader2, Pencil } from "lucide-react";
import toast from "react-hot-toast";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useTRPC } from "@/trpc/client";

type InventoryFormProps = {
  inventoryId: string;
};

type InventoryFormState = {
  category: string;
  code: string;
  dashboardAlert: boolean;
  description: string;
  id?: string;
  lastMovement: string;
  name: string;
  notes: string;
  quantity: string;
  threshold: string;
  unit: string;
};

const EMPTY_ITEM: InventoryFormState = {
  category: "Housekeeping supplies",
  code: "",
  dashboardAlert: true,
  description: "",
  lastMovement: "No movement yet",
  name: "",
  notes: "",
  quantity: "0",
  threshold: "0",
  unit: "pcs",
};

export function InventoryForm({ inventoryId }: InventoryFormProps) {
  const mode = inventoryId === "create" ? "create" : "update";
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [item, setItem] = useState<InventoryFormState>(EMPTY_ITEM);
  const itemQuery = useQuery({
    ...trpc.resort.inventory.byId.queryOptions({
      id: inventoryId,
    }),
    enabled: mode === "update",
    retry: false,
  });
  const saveItem = useMutation(
    trpc.resort.inventory.upsert.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.inventory.list.queryFilter());
        toast.success(mode === "create" ? "Inventory item saved." : "Inventory item updated.");
        router.push("/resort/operations/inventory");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  useEffect(() => {
    if (!itemQuery.data) return;

    // Sync async DB record into editable form state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItem({
      category: itemQuery.data.category,
      code: itemQuery.data.code,
      dashboardAlert: itemQuery.data.dashboardAlert,
      description: itemQuery.data.description,
      id: itemQuery.data.id,
      lastMovement: itemQuery.data.lastMovement,
      name: itemQuery.data.name,
      notes: itemQuery.data.notes,
      quantity: String(itemQuery.data.quantity),
      threshold: String(itemQuery.data.threshold),
      unit: itemQuery.data.unit,
    });
  }, [itemQuery.data]);

  function updateItem(nextItem: Partial<InventoryFormState>) {
    setItem((currentItem) => ({
      ...currentItem,
      ...nextItem,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveItem.mutate({
      category: item.category,
      code: item.code,
      dashboardAlert: item.dashboardAlert,
      description: item.description,
      id: mode === "update" ? item.id : undefined,
      name: item.name,
      notes: item.notes,
      quantity: Number(item.quantity),
      threshold: Number(item.threshold),
      unit: item.unit,
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/resort/operations/inventory">Cancel</Link>
          </Button>
          <Button disabled={saveItem.isPending} form="inventory-form" size="sm" type="submit">
            {saveItem.isPending && <Loader2 className="size-4 animate-spin" />}
            {mode === "create" ? "Save item" : "Update item"}
          </Button>
        </div>
      </div>

      <form
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]"
        id="inventory-form"
        onSubmit={handleSubmit}
      >
        <div className="space-y-5">
          <InventoryOverviewCard item={item} onChange={updateItem} />
          <StockRulesCard item={item} onChange={updateItem} />
        </div>
        <aside className="space-y-5">
          <InventorySummaryCard item={item} mode={mode} />
          <RecentMovementCard item={item} mode={mode} />
          <InventoryNotesCard item={item} onChange={updateItem} />
        </aside>
      </form>
    </div>
  );
}

function InventoryOverviewCard({
  item,
  onChange,
}: {
  item: InventoryFormState;
  onChange: (nextItem: Partial<InventoryFormState>) => void;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Item overview</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure inventory identity, category, and unit of measure.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Item name">
          <Input
            className="rounded-lg"
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Bath towels"
            value={item.name}
          />
        </Field>
        <Field label="Item code">
          <Input
            className="rounded-lg uppercase"
            onChange={(event) => onChange({ code: event.target.value.toUpperCase() })}
            placeholder="INV-1007"
            value={item.code}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Category">
          <Select value={item.category} onValueChange={(category) => onChange({ category })}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Housekeeping supplies">Housekeeping supplies</SelectItem>
              <SelectItem value="Maintenance parts">Maintenance parts</SelectItem>
              <SelectItem value="Kitchen/Dining stock">Kitchen/Dining stock</SelectItem>
              <SelectItem value="Office/Admin supplies">Office/Admin supplies</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={item.unit} onValueChange={(unit) => onChange({ unit })}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcs">pcs</SelectItem>
              <SelectItem value="packs">packs</SelectItem>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="rolls">rolls</SelectItem>
              <SelectItem value="reams">reams</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Description">
        <Textarea
          className="min-h-24 rounded-lg"
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Short item note, storage instruction, or usage context."
          value={item.description}
        />
      </Field>

      <div className="-mx-5 -mb-5 border-t bg-zinc-50 px-5 py-4 text-xs font-medium text-zinc-500">
        Keep essentials count simple. Automated deductions and supplier flows can come later.
      </div>
    </Card>
  );
}

function StockRulesCard({
  item,
  onChange,
}: {
  item: InventoryFormState;
  onChange: (nextItem: Partial<InventoryFormState>) => void;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Stock rules</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Set current count and dashboard alert threshold.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Quantity on hand">
          <Input
            className="rounded-lg"
            min={0}
            onChange={(event) => onChange({ quantity: event.target.value })}
            placeholder="0"
            type="number"
            value={item.quantity}
          />
        </Field>
        <Field label="Low-stock threshold">
          <Input
            className="rounded-lg"
            min={0}
            onChange={(event) => onChange({ threshold: event.target.value })}
            placeholder="0"
            type="number"
            value={item.threshold}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Default movement">
          <Select defaultValue="stock-in">
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock-in">Stock in</SelectItem>
              <SelectItem value="stock-out">Stock out</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Dashboard alert">
          <Select
            value={item.dashboardAlert ? "enabled" : "disabled"}
            onValueChange={(value) => onChange({ dashboardAlert: value === "enabled" })}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Card>
  );
}

function InventorySummaryCard({
  item,
  mode,
}: {
  item: InventoryFormState;
  mode: "create" | "update";
}) {
  const quantity = Number(item.quantity) || 0;
  const threshold = Number(item.threshold) || 0;
  const lowStock = mode === "update" && quantity <= threshold;

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase text-zinc-500">Summary</p>
        <h2 className="mt-1 text-xl font-bold text-[#303030]">
          {mode === "create" ? "New inventory item" : item.name}
        </h2>
      </div>
      <SummaryRow label="Category" value={mode === "create" ? "Not set" : item.category} />
      <SummaryRow label="Unit" value={mode === "create" ? "Not set" : item.unit} />
      <SummaryRow
        label="Quantity"
        value={mode === "create" ? "0" : `${quantity} ${item.unit}`}
      />
      <SummaryRow
        label="Threshold"
        value={mode === "create" ? "0" : `${threshold} ${item.unit}`}
      />
      <div className="border-t border-zinc-200 pt-4">
        <Badge
          className={
            lowStock
              ? "border-black bg-black text-white"
              : "border-zinc-200 bg-zinc-100 text-zinc-900"
          }
          variant="outline"
        >
          {lowStock ? "Low stock" : "OK"}
        </Badge>
      </div>
    </Card>
  );
}

function RecentMovementCard({
  item,
  mode,
}: {
  item: InventoryFormState;
  mode: "create" | "update";
}) {
  const isStockIn = item.lastMovement.startsWith("Stock in");

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#303030]">Recent movement</h2>
        <Boxes className="size-4 text-zinc-500" />
      </div>
      {mode === "create" ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm font-medium text-zinc-600">
          No movement yet.
        </p>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
            {isStockIn ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </div>
          <p className="text-sm font-medium text-zinc-700">{item.lastMovement}</p>
        </div>
      )}
    </Card>
  );
}

function InventoryNotesCard({
  item,
  onChange,
}: {
  item: InventoryFormState;
  onChange: (nextItem: Partial<InventoryFormState>) => void;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#303030]">Notes</h2>
        <Pencil className="size-4 text-zinc-500" />
      </div>
      <Textarea
        className="min-h-24 rounded-lg"
        onChange={(event) => onChange({ notes: event.target.value })}
        placeholder="Storage location, reorder note, or handling reminder."
        value={item.notes}
      />
    </Card>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#303030]">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-medium text-zinc-500">{label}</span>
      <span className="text-right font-semibold text-zinc-800">{value}</span>
    </div>
  );
}
