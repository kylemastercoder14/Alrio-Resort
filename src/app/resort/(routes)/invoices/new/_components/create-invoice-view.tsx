"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, CreditCard, FileText, Info, Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";

type CreateInvoiceViewProps = {
  invoiceId?: string;
};

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Void";
type ReminderCadence = "Standard" | "Light" | "Strict" | "Paused";
type LineItem = {
  amount: string;
  description: string;
  quantity: number;
  rate: string;
};
type InvoiceValues = {
  code: string;
  depositPaid: string;
  discount: string;
  dueDate: string;
  guestEmail: string;
  guestName: string;
  invoiceDate: string;
  lineItems: LineItem[];
  notes: string;
  paymentInstructions: string;
  paymentMethod: string;
  reminderCadence: ReminderCadence;
  reservationId: string;
  status: InvoiceStatus;
  tax: string;
};

const PAYMENT_METHODS = ["Cash", "Bank transfer", "E-wallet", "Credit card"] as const;

const today = new Date();
const dueDate = new Date(today);
dueDate.setDate(today.getDate() + 3);

const EMPTY_VALUES: InvoiceValues = {
  code: "",
  depositPaid: "0",
  discount: "0",
  dueDate: toDateInput(dueDate),
  guestEmail: "",
  guestName: "",
  invoiceDate: toDateInput(today),
  lineItems: [{ amount: "", description: "", quantity: 1, rate: "" }],
  notes: "",
  paymentInstructions: "",
  paymentMethod: "Cash",
  reminderCadence: "Standard",
  reservationId: "",
  status: "Draft",
  tax: "0",
};

export function CreateInvoiceView({ invoiceId }: CreateInvoiceViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const isEdit = Boolean(invoiceId);
  const reservations = useQuery({
    ...trpc.resort.reservations.list.queryOptions(),
    retry: false,
  });
  const nextCode = useQuery({
    ...trpc.resort.invoices.nextCode.queryOptions(),
    enabled: !isEdit,
    retry: false,
  });
  const invoice = useQuery({
    ...trpc.resort.invoices.get.queryOptions({ id: invoiceId ?? "" }),
    enabled: isEdit,
    retry: false,
  });
  const saveInvoice = useMutation(
    trpc.resort.invoices.save.mutationOptions({
      onMutate: () => ({ toastId: toast.loading(isEdit ? "Saving invoice changes..." : "Creating invoice...") }),
      onSuccess: async (_data, _variables, context) => {
        await queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter());
        await queryClient.invalidateQueries(trpc.resort.invoices.nextCode.queryFilter());
        toast.success(isEdit ? "Invoice changes saved." : "Invoice created as a draft.", {
          id: context?.toastId,
        });
        router.push("/resort/invoices");
      },
      onError: (error, _variables, context) =>
        toast.error(error.message, { id: context?.toastId }),
    }),
  );
  const [values, setValues] = useState<InvoiceValues>(EMPTY_VALUES);
  const totals = useMemo(() => getTotals(values), [values]);

  useEffect(() => {
    if (nextCode.data && !values.code) {
      queueMicrotask(() =>
        setValues((current) => ({ ...current, code: nextCode.data })),
      );
    }
  }, [nextCode.data, values.code]);

  useEffect(() => {
    if (!invoice.data) return;

    queueMicrotask(() =>
      setValues({
        code: invoice.data.code,
        depositPaid: invoice.data.depositPaid,
        discount: invoice.data.discount,
        dueDate: toDateInput(new Date(invoice.data.dueDate)),
        guestEmail: invoice.data.guestEmail,
        guestName: invoice.data.guestName,
        invoiceDate: toDateInput(new Date(invoice.data.invoiceDate)),
        lineItems: invoice.data.lineItems.length
          ? invoice.data.lineItems.map((item) => ({
              amount: item.amount,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
            }))
          : EMPTY_VALUES.lineItems,
        notes: invoice.data.notes,
        paymentInstructions: invoice.data.paymentInstructions,
        paymentMethod: invoice.data.paymentMethod,
        reminderCadence: invoice.data.reminderCadence as ReminderCadence,
        reservationId: invoice.data.reservationId,
        status: invoice.data.status as InvoiceStatus,
        tax: invoice.data.tax,
      }),
    );
  }, [invoice.data]);

  if (isEdit && invoice.isPending) {
    return <InvoiceFormSkeleton />;
  }

  function updateValue<Key extends keyof InvoiceValues>(
    key: Key,
    value: InvoiceValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function selectReservation(reservationId: string) {
    const reservation = reservations.data?.find((item) => item.id === reservationId);

    if (!reservation) {
      updateValue("reservationId", reservationId);
      return;
    }

    const description = `Exclusive use of Alrio Private Resort (${reservation.nights} night${reservation.nights === 1 ? "" : "s"})`;

    setValues((current) => ({
      ...current,
      depositPaid: reservation.deposit || "0",
      guestEmail: reservation.guestEmail,
      guestName: reservation.guestName,
      lineItems: [
        {
          amount: reservation.totalAmount,
          description,
          quantity: reservation.nights,
          rate: reservation.rate,
        },
      ],
      paymentMethod: reservation.paymentMethod || current.paymentMethod,
      reservationId,
    }));
  }

  function updateLineItem(index: number, key: keyof LineItem, value: string | number) {
    setValues((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextItem = { ...item, [key]: value };
        const amount = parseMoney(nextItem.rate) * Number(nextItem.quantity || 0);
        return {
          ...nextItem,
          amount: key === "amount" ? String(value) : String(amount),
        };
      }),
    }));
  }

  function addLineItem() {
    setValues((current) => ({
      ...current,
      lineItems: [
        ...current.lineItems,
        { amount: "", description: "", quantity: 1, rate: "" },
      ],
    }));
  }

  function removeLineItem(index: number) {
    setValues((current) => ({
      ...current,
      lineItems: current.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.code || !values.guestName || !values.lineItems.length) {
      toast.error("Invoice number, guest, and line item are required.");
      return;
    }

    saveInvoice.mutate({
      ...values,
      balanceDue: String(totals.balanceDue),
      id: invoiceId,
      subtotal: String(totals.subtotal),
      totalAmount: String(totals.totalAmount),
    });
  }

  return (
    <form className="mx-auto max-w-6xl space-y-5" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/invoices">Cancel</Link>
          </Button>
          <Button size="sm" disabled={saveInvoice.isPending} type="submit">
            {saveInvoice.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving
              </>
            ) : (
              "Save invoice"
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <CardTitle icon={<FileText className="size-4" />} title="Invoice details">
              Guest, booking reference, due date, and invoice identity.
            </CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Invoice number">
                <Input
                  value={values.code}
                  readOnly
                  className="rounded-lg bg-zinc-50"
                />
              </Field>
              <Field label="Booking reference (optional)">
                <Select value={values.reservationId || "none"} onValueChange={(value) => selectReservation(value === "none" ? "" : value)}>
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No booking</SelectItem>
                    {(reservations.data ?? []).map((reservation) => (
                      <SelectItem key={reservation.id} value={reservation.id}>
                        {reservation.guestName} - Whole Resort
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Guest name">
                <Input
                  value={values.guestName}
                  className="rounded-lg"
                  onChange={(event) => updateValue("guestName", event.target.value)}
                />
              </Field>
              <Field label="Guest email (optional)">
                <Input
                  value={values.guestEmail}
                  type="email"
                  className="rounded-lg"
                  onChange={(event) => updateValue("guestEmail", event.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Invoice date">
                <Input
                  type="date"
                  value={values.invoiceDate}
                  className="rounded-lg"
                  onChange={(event) => updateValue("invoiceDate", event.target.value)}
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={values.dueDate}
                  className="rounded-lg"
                  onChange={(event) => updateValue("dueDate", event.target.value)}
                />
              </Field>
              <Field label="Status">
                <Select value={values.status} onValueChange={(value) => updateValue("status", value as InvoiceStatus)}>
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Draft", "Sent", "Overdue", "Void", "Paid"].map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        disabled={
                          (status === "Sent" || status === "Paid") &&
                          values.status !== status
                        }
                      >
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <CardTitle icon={<Calculator className="size-4" />} title="Line items">
                Resort stay, services, fees, and adjustments.
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
            <div className="space-y-3">
              {values.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-zinc-200 p-3 md:grid-cols-[minmax(0,1fr)_80px_120px_120px_36px]"
                >
                  <Input
                    value={item.description}
                    placeholder="Description"
                    className="rounded-lg"
                    onChange={(event) => updateLineItem(index, "description", event.target.value)}
                  />
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    className="rounded-lg"
                    onChange={(event) => updateLineItem(index, "quantity", Number(event.target.value))}
                  />
                  <Input
                    value={item.rate}
                    placeholder="Rate"
                    className="rounded-lg"
                    onChange={(event) => updateLineItem(index, "rate", event.target.value)}
                  />
                  <Input
                    value={item.amount}
                    placeholder="Amount"
                    className="rounded-lg"
                    onChange={(event) => updateLineItem(index, "amount", event.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={values.lineItems.length === 1}
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <CardTitle icon={<CreditCard className="size-4" />} title="Payment terms">
              Deposit, balance terms, payment method, and reminders.
            </CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Payment method">
                <Select
                  value={values.paymentMethod}
                  onValueChange={(value) => updateValue("paymentMethod", value)}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Reminder cadence"
                hint={
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-5 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                        >
                          <Info className="size-3.5" />
                          <span className="sr-only">Reminder cadence guidelines</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent align="start" side="top" className="block max-w-72 space-y-1.5 text-xs leading-5">
                        <p><strong>Standard:</strong> reminder before due date, on due date, and when overdue.</p>
                        <p><strong>Light:</strong> fewer reminders for low-pressure collection.</p>
                        <p><strong>Strict:</strong> stronger follow-up after invoice becomes overdue.</p>
                        <p><strong>Paused:</strong> no reminder emails sent.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
              >
                <Select value={values.reminderCadence} onValueChange={(value) => updateValue("reminderCadence", value as ReminderCadence)}>
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Standard", "Light", "Strict", "Paused"].map((cadence) => (
                      <SelectItem key={cadence} value={cadence}>{cadence}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Textarea
              value={values.paymentInstructions}
              placeholder="Payment instructions shown to guest."
              className="min-h-24 rounded-lg"
              onChange={(event) => updateValue("paymentInstructions", event.target.value)}
            />
          </Card>
        </div>
        <aside className="space-y-5">
          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <p className="text-xs font-bold uppercase text-zinc-500">Summary</p>
            <h2 className="text-xl font-bold text-[#303030]">{values.code || "New invoice"}</h2>
            <SummaryRow label="Subtotal" value={formatPeso(totals.subtotal)} />
            <Field label="Discount">
              <Input
                value={values.discount}
                className="rounded-lg"
                onChange={(event) => updateValue("discount", event.target.value)}
              />
            </Field>
            <Field label="Tax">
              <Input
                value={values.tax}
                className="rounded-lg"
                onChange={(event) => updateValue("tax", event.target.value)}
              />
            </Field>
            <Field label="Deposit paid">
              <Input
                value={values.depositPaid}
                className="rounded-lg"
                onChange={(event) => updateValue("depositPaid", event.target.value)}
              />
            </Field>
            <SummaryRow label="Total" value={formatPeso(totals.totalAmount)} />
            <div className="border-t border-zinc-200 pt-4">
              <SummaryRow label="Balance due" value={formatPeso(totals.balanceDue)} strong />
            </div>
          </Card>
          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <h2 className="text-base font-bold text-[#303030]">Internal notes</h2>
            <Textarea
              value={values.notes}
              placeholder="Invoice notes, collection context, approval details..."
              className="min-h-28 rounded-lg"
              onChange={(event) => updateValue("notes", event.target.value)}
            />
          </Card>
        </aside>
      </div>
    </form>
  );
}

function CardTitle({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">{icon}</div>
      <div>
        <h2 className="text-base font-bold text-[#303030]">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{children}</p>
      </div>
    </div>
  );
}

function Field({ children, hint, label }: { children: React.ReactNode; hint?: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium text-[#303030]">{label}</Label>
        {hint}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-medium text-zinc-500">{label}</span>
      <span className={strong ? "font-bold text-zinc-950" : "font-semibold text-zinc-800"}>
        {value}
      </span>
    </div>
  );
}

function InvoiceFormSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

function getTotals(values: InvoiceValues) {
  const subtotal = values.lineItems.reduce((total, item) => total + parseMoney(item.amount), 0);
  const totalAmount = Math.max(subtotal - parseMoney(values.discount) + parseMoney(values.tax), 0);
  const balanceDue = Math.max(totalAmount - parseMoney(values.depositPaid), 0);
  return { balanceDue, subtotal, totalAmount };
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: number) {
  return `\u20b1${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
