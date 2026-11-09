"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { CreatableSelect } from "@/components/reusable/creatable-select";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import {
  SERVICE_BILLING_TYPES,
  SERVICE_CATEGORIES,
  type OfferedServiceBillingType,
  type OfferedServiceStatus,
} from "./data";

type ServiceFormProps = {
  serviceId: string;
};

type ServiceFormValues = {
  baseCharge: string;
  billingType: OfferedServiceBillingType;
  bookingLeadTime: string;
  category: string;
  code: string;
  description: string;
  duration: string;
  feeNote: string;
  internalNotes: string;
  provider: string;
  showOnBookingPage: boolean;
  status: OfferedServiceStatus;
  title: string;
};

const EMPTY_VALUES: ServiceFormValues = {
  baseCharge: "",
  billingType: "Fixed price",
  bookingLeadTime: "",
  category: "Maintenance",
  code: "",
  description: "",
  duration: "",
  feeNote: "",
  internalNotes: "",
  provider: "",
  showOnBookingPage: true,
  status: "Active",
  title: "",
};

export function ServiceForm({ serviceId }: ServiceFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCreate = serviceId === "create";
  const service = useQuery({
    ...trpc.resort.services.get.queryOptions({ id: serviceId }),
    enabled: !isCreate,
    retry: false,
  });
  const saveService = useMutation(
    trpc.resort.services.save.mutationOptions({
      onSuccess: async (savedService) => {
        await queryClient.invalidateQueries(
          trpc.resort.services.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.services.get.queryFilter({ id: savedService.id }),
        );
        toast.success("Service saved.");
        router.push("/resort/services/offered");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const [values, setValues] = useState<ServiceFormValues>(EMPTY_VALUES);

  useEffect(() => {
    if (!service.data) return;

    const nextValues = {
      baseCharge: service.data.baseCharge,
      billingType: service.data.billingType as OfferedServiceBillingType,
      bookingLeadTime: service.data.bookingLeadTime,
      category: service.data.category,
      code: service.data.code,
      description: service.data.description,
      duration: service.data.duration,
      feeNote: service.data.feeNote,
      internalNotes: service.data.internalNotes,
      provider: service.data.provider,
      showOnBookingPage: service.data.showOnBookingPage,
      status: service.data.status as OfferedServiceStatus,
      title: service.data.title,
    };

    queueMicrotask(() => setValues(nextValues));
  }, [service.data]);

  if (!isCreate && service.isPending) {
    return <ServiceFormSkeleton />;
  }

  if (!isCreate && service.isError) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Service not found.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/services/offered">Back to services</Link>
        </Button>
      </div>
    );
  }

  function updateValue<Key extends keyof ServiceFormValues>(
    key: Key,
    value: ServiceFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.title.trim() || !values.code.trim() || !values.category.trim()) {
      toast.error("Service name, code, and category are required.");
      return;
    }

    saveService.mutate({
      ...values,
      id: isCreate ? undefined : serviceId,
    });
  }

  return (
    <form className="mx-auto max-w-5xl space-y-5" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/services/offered">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={saveService.isPending}>
            {isCreate ? "Create service" : "Save service"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Service details"
              description="Guest-facing service name, category, and provider."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Service name">
                <Input
                  className="rounded-lg"
                  value={values.title}
                  placeholder="Private van transfer"
                  onChange={(event) => updateValue("title", event.target.value)}
                />
              </Field>
              <Field label="Service code">
                <Input
                  className="rounded-lg"
                  value={values.code}
                  placeholder="SVC-1006"
                  onChange={(event) => updateValue("code", event.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category">
                <CreatableSelect
                  options={SERVICE_CATEGORIES}
                  placeholder="Select or create category"
                  value={values.category}
                  onChange={(value) => updateValue("category", value)}
                />
              </Field>
              <Field label="Provider">
                <Input
                  className="rounded-lg"
                  value={values.provider}
                  placeholder="Provider or internal team"
                  onChange={(event) => updateValue("provider", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Description (optional)">
              <Textarea
                value={values.description}
                placeholder="Short booking-facing service description."
                className="min-h-28 rounded-lg"
                onChange={(event) => updateValue("description", event.target.value)}
              />
            </Field>
          </Card>

          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Pricing and booking"
              description="Configure base charge, timing, and booking rules."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Base charge">
                <Input
                  className="rounded-lg"
                  type="number"
                  min="0"
                  value={values.baseCharge}
                  placeholder="1850"
                  onChange={(event) => updateValue("baseCharge", event.target.value)}
                />
              </Field>
              <Field label="Billing type">
                <Select
                  value={values.billingType}
                  onValueChange={(value) =>
                    updateValue("billingType", value as OfferedServiceBillingType)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_BILLING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Duration (optional)">
                <Input
                  className="rounded-lg"
                  value={values.duration}
                  placeholder="2 hours"
                  onChange={(event) => updateValue("duration", event.target.value)}
                />
              </Field>
              <Field label="Booking lead time (optional)">
                <Input
                  className="rounded-lg"
                  value={values.bookingLeadTime}
                  placeholder="24 hours"
                  onChange={(event) =>
                    updateValue("bookingLeadTime", event.target.value)
                  }
                />
              </Field>
            </div>
            <Field label="Fee note (optional)">
              <Input
                className="rounded-lg"
                value={values.feeNote}
                placeholder="Includes platform fee"
                onChange={(event) => updateValue("feeNote", event.target.value)}
              />
            </Field>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Display settings"
              description="Control status and guest booking visibility."
            />
            <Field label="Status">
              <Select
                value={values.status}
                onValueChange={(value) =>
                  updateValue("status", value as OfferedServiceStatus)
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
              <div>
                <Label className="font-semibold">Show on booking page</Label>
                <p className="mt-1 text-xs text-zinc-500">
                  Guests can see and request this service.
                </p>
              </div>
              <Switch
                checked={values.showOnBookingPage}
                onCheckedChange={(checked) =>
                  updateValue("showOnBookingPage", checked)
                }
              />
            </div>
          </Card>

          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Internal notes"
              description="Staff-only service handling details."
            />
            <Textarea
              value={values.internalNotes}
              placeholder="Provider instructions, surcharge notes, exclusions..."
              className="min-h-40 rounded-lg"
              onChange={(event) => updateValue("internalNotes", event.target.value)}
            />
          </Card>
        </aside>
      </div>
    </form>
  );
}

function SectionTitle({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-zinc-950">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
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
      <Label className="text-sm font-medium text-zinc-900">{label}</Label>
      {children}
    </div>
  );
}

function ServiceFormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-28 w-full" />
            </Card>
          ))}
        </div>
        <div className="space-y-5">
          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </Card>
          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-40 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
