"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { CreatableSelect } from "@/components/reusable/creatable-select";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "@/lib/uploadthing";
import { useTRPC } from "@/trpc/client";

type RevenueExpenseFormProps = {
  revenueExpenseId: string;
};

type EntryType = "Revenue" | "Expense";
type EntrySource = "Manual entry" | "Auto booking" | "Invoice payment";
type EntryStatus = "Cleared" | "Pending";

type ReceiptFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

type FormValues = {
  amount: string;
  category: string;
  code: string;
  department: string;
  description: string;
  entryDate: string;
  notes: string;
  receipt: ReceiptFile | null;
  source: EntrySource;
  status: EntryStatus;
  type: EntryType;
};

const today = new Date().toISOString().slice(0, 10);
const NO_DEPARTMENT_VALUE = "__none";
const CATEGORY_OPTIONS = [
  "Room revenue",
  "Service revenue",
  "Housekeeping supplies",
  "Dining supplies",
  "Maintenance",
  "Utilities",
  "Payroll",
  "Marketing",
  "Refunds",
] as const;
const EMPTY_VALUES: FormValues = {
  amount: "",
  category: "Maintenance",
  code: "",
  department: "Maintenance",
  description: "",
  entryDate: today,
  notes: "",
  receipt: null,
  source: "Manual entry",
  status: "Pending",
  type: "Expense",
};

export function RevenueExpenseForm({
  revenueExpenseId,
}: RevenueExpenseFormProps) {
  const mode = revenueExpenseId === "create" ? "create" : "update";
  const isEdit = mode === "update";
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
    retry: false,
  });
  const departmentOptions = useMemo(
    () => (departments.data ?? []).map((department) => department.name),
    [departments.data],
  );
  const entry = useQuery({
    ...trpc.resort.financeEntries.get.queryOptions({ id: revenueExpenseId }),
    enabled: isEdit,
    retry: false,
  });
  const saveEntry = useMutation(
    trpc.resort.financeEntries.save.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.financeEntries.list.queryFilter());
        toast.success(isEdit ? "Finance entry updated." : "Finance entry saved.");
        router.push("/resort/finance/revenue-expenses");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const summaryAmount = useMemo(() => formatPeso(values.amount), [values.amount]);

  useEffect(() => {
    if (!entry.data) return;

    // Form state must become editable after async entry load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues({
      amount: entry.data.amount,
      category: entry.data.category,
      code: entry.data.code,
      department: entry.data.department,
      description: entry.data.description,
      entryDate: toDateInput(entry.data.entryDate),
      notes: entry.data.notes,
      receipt: entry.data.receiptUrl
        ? {
            key: entry.data.receiptKey,
            name: entry.data.receiptName || "Receipt",
            size: entry.data.receiptSize,
            type: entry.data.receiptType || "file",
            url: entry.data.receiptUrl,
          }
        : null,
      source: entry.data.source as EntrySource,
      status: entry.data.status as EntryStatus,
      type: entry.data.type as EntryType,
    });
  }, [entry.data]);

  function updateValue<TKey extends keyof FormValues>(key: TKey, value: FormValues[TKey]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveEntry.mutate({
      id: isEdit ? revenueExpenseId : undefined,
      amount: values.amount,
      category: values.category,
      code: values.code || undefined,
      department: values.department || undefined,
      description: values.description,
      entryDate: values.entryDate,
      notes: values.notes || undefined,
      receiptKey: values.receipt?.key || undefined,
      receiptName: values.receipt?.name || undefined,
      receiptSize: values.receipt?.size || undefined,
      receiptType: values.receipt?.type || undefined,
      receiptUrl: values.receipt?.url || undefined,
      source: values.source,
      status: values.status,
      type: values.type,
    });
  }

  if (isEdit && entry.isPending) {
    return <FinanceEntryFormSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/finance/revenue-expenses">Cancel</Link>
          </Button>
          <Button size="sm" disabled={saveEntry.isPending}>
            {saveEntry.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "create" ? "Save entry" : "Update entry"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <ManualEntryCard
            departmentOptions={departmentOptions}
            values={values}
            onChange={updateValue}
          />
          <ReceiptCard receipt={values.receipt} onChange={(receipt) => updateValue("receipt", receipt)} />
        </div>
        <aside className="space-y-5">
          <ExpenseSummaryCard amount={summaryAmount} mode={mode} values={values} />
        </aside>
      </div>
    </form>
  );
}

function ManualEntryCard({
  departmentOptions,
  onChange,
  values,
}: {
  departmentOptions: string[];
  onChange: <TKey extends keyof FormValues>(key: TKey, value: FormValues[TKey]) => void;
  values: FormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          {values.type === "Revenue" ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
        </div>
        <div>
          <h2 className="text-base font-bold text-[#303030]">Finance entry</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Log revenue or expenses with optional receipt proof.
          </p>
        </div>
      </div>

      <Field label="Description">
        <Input
          value={values.description}
          placeholder="Pool pump repair"
          className="rounded-lg"
          onChange={(event) => onChange("description", event.target.value)}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Type">
          <Select value={values.type} onValueChange={(value) => onChange("type", value as EntryType)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Expense">Expense</SelectItem>
              <SelectItem value="Revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source">
          <Select value={values.source} onValueChange={(value) => onChange("source", value as EntrySource)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manual entry">Manual entry</SelectItem>
              <SelectItem value="Auto booking">Auto booking</SelectItem>
              <SelectItem value="Invoice payment">Invoice payment</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Category">
          <CreatableSelect
            value={values.category}
            placeholder="Select or create category"
            searchPlaceholder="Search or create category..."
            options={CATEGORY_OPTIONS}
            onChange={(value) => onChange("category", value)}
          />
        </Field>
        <Field label="Department (optional)">
          <Select
            value={values.department || NO_DEPARTMENT_VALUE}
            onValueChange={(value) =>
              onChange("department", value === NO_DEPARTMENT_VALUE ? "" : value)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DEPARTMENT_VALUE}>No department</SelectItem>
              {departmentOptions.length ? (
                departmentOptions.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty" disabled>
                  No departments yet
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Amount">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            placeholder="0.00"
            className="rounded-lg"
            onChange={(event) => onChange("amount", event.target.value)}
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={values.entryDate}
            className="rounded-lg"
            onChange={(event) => onChange("entryDate", event.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select value={values.status} onValueChange={(value) => onChange("status", value as EntryStatus)}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Cleared">Cleared</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Notes (optional)">
        <Textarea
          value={values.notes}
          placeholder="Receipt reference, supplier, approval note..."
          className="min-h-24 rounded-lg"
          onChange={(event) => onChange("notes", event.target.value)}
        />
      </Field>
    </Card>
  );
}

function ReceiptCard({
  onChange,
  receipt,
}: {
  onChange: (receipt: ReceiptFile | null) => void;
  receipt: ReceiptFile | null;
}) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadToastId = "finance-receipt-upload";

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Receipt</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Attach proof for accounting review.
        </p>
      </div>

      {receipt ? (
        <Attachment className="w-full">
          <AttachmentMedia>
            <FileText className="size-5" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{receipt.name}</AttachmentTitle>
            <AttachmentDescription>
              {receipt.size ? `${Math.round(receipt.size / 1024)} KB` : "Receipt"}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction type="button" onClick={() => onChange(null)}>
              <X className="size-3.5" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <Attachment
          state="idle"
          className="min-h-24 w-full items-center justify-center border-dashed bg-zinc-50"
        >
          <AttachmentMedia>
            <Paperclip className="size-5" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>No receipt attached</AttachmentTitle>
            <AttachmentDescription>Upload PNG, JPG, or PDF.</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      )}

      <UploadDropzone
        endpoint="receiptUploader"
        className="w-full"
        appearance={{
          allowedContent: "text-xs font-medium text-zinc-500",
          button:
            "mt-2 h-8! w-full rounded-lg border border-zinc-900 bg-[linear-gradient(180deg,#3a3a3a_0%,#111_100%)] px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 data-[state=readying]:cursor-wait data-[state=uploading]:cursor-wait data-[state=uploading]:after:bg-white/20",
          container:
            "mt-1 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition hover:bg-zinc-100 data-[state=uploading]:opacity-80",
          label: "text-sm font-semibold text-zinc-700",
          uploadIcon: "mx-auto size-8 text-zinc-500",
        }}
        content={{
          allowedContent: "Images up to 4MB or PDF up to 8MB",
          button:
            uploadProgress === null
              ? "Upload receipt"
              : `Uploading ${uploadProgress}%`,
          label: "Drag and drop receipt, or click to browse",
        }}
        onUploadBegin={(fileName) => {
          setUploadProgress(0);
          toast.loading(`Uploading ${fileName}...`, { id: uploadToastId });
        }}
        onUploadProgress={(progress) => {
          setUploadProgress(progress);
          toast.loading(`Uploading receipt... ${progress}%`, { id: uploadToastId });
        }}
        onClientUploadComplete={(files) => {
          const file = files[0];
          setUploadProgress(null);
          if (!file) return;

          onChange({
            key: file.key,
            name: file.name,
            size: file.size,
            type: file.type ?? "file",
            url: file.ufsUrl,
          });
          toast.success("Receipt uploaded.", { id: uploadToastId });
        }}
        onUploadError={(error) => {
          setUploadProgress(null);
          toast.error(error.message || "Receipt upload failed.", { id: uploadToastId });
        }}
      />
    </Card>
  );
}

function ExpenseSummaryCard({
  amount,
  mode,
  values,
}: {
  amount: string;
  mode: "create" | "update";
  values: FormValues;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase text-zinc-500">Summary</p>
        <h2 className="mt-1 text-xl font-bold text-[#303030]">
          {mode === "create" ? "New entry" : values.code}
        </h2>
      </div>
      <SummaryRow label="Type" value={values.type} />
      <SummaryRow label="Category" value={values.category || "--"} />
      <SummaryRow label="Department" value={values.department || "--"} />
      <SummaryRow label="Status" value={values.status} />
      <SummaryRow label="Receipt" value={values.receipt ? "Attached" : "--"} />
      <div className="border-t border-zinc-200 pt-4">
        <SummaryRow label="Amount" value={amount} strong />
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
      <Label className="text-sm font-medium text-[#303030]">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-medium text-zinc-500">{label}</span>
      <span className={strong ? "font-bold text-zinc-950" : "font-semibold text-zinc-800"}>
        {value}
      </span>
    </div>
  );
}

function FinanceEntryFormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

function formatPeso(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `\u20b1${safeAmount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function toDateInput(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return today;

  return date.toISOString().slice(0, 10);
}
