"use client";

import { type FormEvent, useState } from "react";
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
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

type PackageStatus = "Active" | "Inactive" | "Archived";

type PackageFormProps = {
  packageId: string;
};

type PackageFormValues = {
  amenityIds: string[];
  category: string;
  code: string;
  compareAtPrice: string;
  description: string;
  featured: boolean;
  inclusionsNote: string;
  maxGuests: string;
  minNights: string;
  name: string;
  price: string;
  roomIds: string[];
  serviceIds: string[];
  showOnBookingPage: boolean;
  sortOrder: string;
  status: PackageStatus;
};

const PACKAGE_CATEGORIES = [
  "Stay package",
  "Family bundle",
  "Event package",
  "Day tour",
  "Add-on bundle",
] as const;

const EMPTY_VALUES: PackageFormValues = {
  amenityIds: [],
  category: "Stay package",
  code: "",
  compareAtPrice: "",
  description: "",
  featured: false,
  inclusionsNote: "",
  maxGuests: "",
  minNights: "1",
  name: "",
  price: "",
  roomIds: [],
  serviceIds: [],
  showOnBookingPage: true,
  sortOrder: "0",
  status: "Active",
};

export function PackageForm({ packageId }: PackageFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCreate = packageId === "create";
  const pack = useQuery({
    ...trpc.resort.packages.get.queryOptions({ id: packageId }),
    enabled: !isCreate,
    retry: false,
  });
  const rooms = useQuery({
    ...trpc.resort.rooms.list.queryOptions(),
    retry: false,
  });
  const services = useQuery({
    ...trpc.resort.services.list.queryOptions(),
    retry: false,
  });
  const amenities = useQuery({
    ...trpc.resort.amenities.list.queryOptions(),
    retry: false,
  });
  const savePackage = useMutation(
    trpc.resort.packages.save.mutationOptions({
      onSuccess: async (savedPackage) => {
        await queryClient.invalidateQueries(
          trpc.resort.packages.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.packages.get.queryFilter({ id: savedPackage.id }),
        );
        toast.success("Package saved.");
        router.push("/resort/services/packages");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!isCreate && pack.isPending) {
    return <PackageFormSkeleton />;
  }

  if (!isCreate && pack.isError) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Package not found.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/services/packages">Back to packages</Link>
        </Button>
      </div>
    );
  }

  const roomOptions: MultiSelectOption[] = (rooms.data ?? []).map((room) => ({
    label: `${room.code} - ${room.name}`,
    value: room.id,
  }));
  const serviceOptions: MultiSelectOption[] = (services.data ?? []).map((service) => ({
    label: `${service.code} - ${service.title}`,
    value: service.id,
  }));
  const amenityOptions: MultiSelectOption[] = (amenities.data ?? []).map((amenity) => ({
    label: `${amenity.icon} ${amenity.name}`,
    value: amenity.id,
  }));
  const initialValues: PackageFormValues = pack.data
    ? {
        amenityIds: pack.data.amenityIds,
        category: pack.data.category,
        code: pack.data.code,
        compareAtPrice: pack.data.compareAtPrice,
        description: pack.data.description,
        featured: pack.data.featured,
        inclusionsNote: pack.data.inclusionsNote,
        maxGuests: pack.data.maxGuests ? String(pack.data.maxGuests) : "",
        minNights: String(pack.data.minNights),
        name: pack.data.name,
        price: pack.data.price,
        roomIds: pack.data.roomIds,
        serviceIds: pack.data.serviceIds,
        showOnBookingPage: pack.data.showOnBookingPage,
        sortOrder: String(pack.data.sortOrder),
        status: pack.data.status as PackageStatus,
      }
    : EMPTY_VALUES;

  return (
    <PackageEditor
      key={pack.data?.id ?? "create"}
      amenityOptions={amenityOptions}
      initialValues={initialValues}
      isSaving={savePackage.isPending}
      mode={isCreate ? "create" : "update"}
      roomOptions={roomOptions}
      serviceOptions={serviceOptions}
      onSubmit={(values) =>
        savePackage.mutate({
          id: isCreate ? undefined : packageId,
          amenityIds: values.amenityIds,
          category: values.category,
          code: values.code,
          compareAtPrice: values.compareAtPrice,
          description: values.description,
          featured: values.featured,
          inclusionsNote: values.inclusionsNote,
          maxGuests: values.maxGuests ? Number(values.maxGuests) : undefined,
          minNights: Number(values.minNights || 1),
          name: values.name,
          price: values.price,
          roomIds: values.roomIds,
          serviceIds: values.serviceIds,
          showOnBookingPage: values.showOnBookingPage,
          sortOrder: Number(values.sortOrder || 0),
          status: values.status,
        })
      }
    />
  );
}

function PackageEditor({
  amenityOptions,
  initialValues,
  isSaving,
  mode,
  onSubmit,
  roomOptions,
  serviceOptions,
}: {
  amenityOptions: MultiSelectOption[];
  initialValues: PackageFormValues;
  isSaving: boolean;
  mode: "create" | "update";
  onSubmit: (values: PackageFormValues) => void;
  roomOptions: MultiSelectOption[];
  serviceOptions: MultiSelectOption[];
}) {
  const [values, setValues] = useState(initialValues);

  function updateValue<TKey extends keyof PackageFormValues>(
    key: TKey,
    value: PackageFormValues[TKey],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/services/packages">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : mode === "create"
                ? "Create package"
                : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Package details"
              description="Guest-facing bundle name, category, and price."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Package name">
                <Input
                  className="rounded-lg"
                  value={values.name}
                  placeholder="Family villa bundle"
                  required
                  onChange={(event) => updateValue("name", event.target.value)}
                />
              </Field>
              <Field label="Package code">
                <Input
                  className="rounded-lg"
                  value={values.code}
                  placeholder="PKG-1001"
                  required
                  onChange={(event) => updateValue("code", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Category">
              <CreatableSelect
                value={values.category}
                onChange={(value) => updateValue("category", value)}
                options={PACKAGE_CATEGORIES}
                placeholder="Select or create category"
              />
            </Field>
            <Field label="Description" optional>
              <Textarea
                className="min-h-24 rounded-lg"
                value={values.description}
                placeholder="Short booking-facing package description."
                onChange={(event) => updateValue("description", event.target.value)}
              />
            </Field>
          </Card>

          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Included items"
              description="Choose what this bundle contains."
            />
            <Field label="Rooms" optional>
              <MultiSelect
                value={values.roomIds}
                onValueChange={(value) => updateValue("roomIds", value)}
                options={roomOptions}
                placeholder="Select rooms"
                searchPlaceholder="Search rooms..."
              />
            </Field>
            <Field label="Services" optional>
              <MultiSelect
                value={values.serviceIds}
                onValueChange={(value) => updateValue("serviceIds", value)}
                options={serviceOptions}
                placeholder="Select services"
                searchPlaceholder="Search services..."
              />
            </Field>
            <Field label="Amenities" optional>
              <MultiSelect
                value={values.amenityIds}
                onValueChange={(value) => updateValue("amenityIds", value)}
                options={amenityOptions}
                placeholder="Select amenities"
                searchPlaceholder="Search amenities..."
              />
            </Field>
          </Card>

          <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Pricing and rules"
              description="Set package amount and stay limits."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Package price">
                <Input
                  className="rounded-lg"
                  type="number"
                  min="0"
                  value={values.price}
                  placeholder="15000"
                  required
                  onChange={(event) => updateValue("price", event.target.value)}
                />
              </Field>
              <Field label="Compare-at price" optional>
                <Input
                  className="rounded-lg"
                  type="number"
                  min="0"
                  value={values.compareAtPrice}
                  placeholder="18000"
                  onChange={(event) =>
                    updateValue("compareAtPrice", event.target.value)
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Minimum nights">
                <Input
                  className="rounded-lg"
                  type="number"
                  min={1}
                  value={values.minNights}
                  onChange={(event) => updateValue("minNights", event.target.value)}
                />
              </Field>
              <Field label="Maximum guests" optional>
                <Input
                  className="rounded-lg"
                  type="number"
                  min={0}
                  value={values.maxGuests}
                  placeholder="Optional"
                  onChange={(event) => updateValue("maxGuests", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Inclusions note" optional>
              <Textarea
                className="min-h-24 rounded-lg"
                value={values.inclusionsNote}
                placeholder="Terms, exclusions, or booking notes."
                onChange={(event) =>
                  updateValue("inclusionsNote", event.target.value)
                }
              />
            </Field>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <SectionTitle
              title="Display settings"
              description="Control listing status and guest visibility."
            />
            <Field label="Status">
              <Select
                value={values.status}
                onValueChange={(value) =>
                  updateValue("status", value as PackageStatus)
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <SwitchRow
              checked={values.showOnBookingPage}
              description="Guests can see this bundle while booking."
              label="Show on booking page"
              onCheckedChange={(checked) =>
                updateValue("showOnBookingPage", checked)
              }
            />
            <SwitchRow
              checked={values.featured}
              description="Highlight package in guest-facing lists."
              label="Featured package"
              onCheckedChange={(checked) => updateValue("featured", checked)}
            />
            <Field label="Sort order">
              <Input
                className="rounded-lg"
                type="number"
                min={0}
                value={values.sortOrder}
                onChange={(event) => updateValue("sortOrder", event.target.value)}
              />
            </Field>
          </Card>

          <PackageSummaryCard values={values} />
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
  optional = false,
}: {
  children: React.ReactNode;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-900">
        {label}
        {optional ? (
          <span className="font-normal text-zinc-500"> (optional)</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function SwitchRow({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-zinc-500">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function PackageSummaryCard({ values }: { values: PackageFormValues }) {
  const itemCount =
    values.roomIds.length + values.serviceIds.length + values.amenityIds.length;

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <SectionTitle
        title="Package summary"
        description="Quick preview of this bundle record."
      />
      <div className="space-y-2">
        <SummaryRow label="Package" value={values.name || "--"} />
        <SummaryRow label="Code" value={values.code || "--"} />
        <SummaryRow label="Category" value={values.category || "--"} />
        <SummaryRow label="Price" value={values.price ? `PHP ${values.price}` : "--"} />
        <SummaryRow label="Items" value={String(itemCount)} />
        <SummaryRow label="Status" value={values.status} />
      </div>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      <span className="truncate text-sm font-bold text-zinc-950">{value}</span>
    </div>
  );
}

function PackageFormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={index}
              className="gap-5 rounded-xl border-zinc-200 bg-white p-5"
            >
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
        <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
        </Card>
      </div>
    </div>
  );
}
