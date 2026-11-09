"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";

import { CreatableSelect } from "@/components/reusable/creatable-select";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AMENITY_CATEGORIES,
  AMENITY_FEE_UNITS,
  AMENITY_SCOPES,
  type AmenityFeeUnit,
  type AmenityScope,
  type AmenityStatus,
} from "./data";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

type AmenityFormProps = {
  amenityId: string;
};

type AmenityFormValues = {
  appliesTo: AmenityScope;
  category: string;
  chargeable: boolean;
  code: string;
  description: string;
  featured: boolean;
  feeAmount: string;
  feeUnit: AmenityFeeUnit;
  icon: string;
  internalNotes: string;
  name: string;
  showOnBookingPage: boolean;
  sortOrder: string;
  status: AmenityStatus;
};

export function AmenityForm({ amenityId }: AmenityFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCreate = amenityId === "create";
  const amenity = useQuery({
    ...trpc.resort.amenities.get.queryOptions({ id: amenityId }),
    enabled: !isCreate,
    retry: false,
  });
  const saveAmenity = useMutation(
    trpc.resort.amenities.save.mutationOptions({
      onSuccess: async (savedAmenity) => {
        await queryClient.invalidateQueries(
          trpc.resort.amenities.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.amenities.get.queryFilter({ id: savedAmenity.id }),
        );
        toast.success("Amenity saved.");
        router.push("/resort/services/amenities");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (!isCreate && amenity.isPending) {
    return <AmenityFormSkeleton />;
  }

  if (!isCreate && amenity.isError) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">
          Amenity not found.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/services/amenities">Back to amenities</Link>
        </Button>
      </div>
    );
  }

  const initialValues: AmenityFormValues = amenity.data
    ? {
        appliesTo: amenity.data.appliesTo as AmenityScope,
        category: amenity.data.category,
        chargeable: amenity.data.chargeable,
        code: amenity.data.code,
        description: amenity.data.description,
        featured: amenity.data.featured,
        feeAmount: amenity.data.feeAmount,
        feeUnit: amenity.data.feeUnit as AmenityFeeUnit,
        icon: amenity.data.icon,
        internalNotes: amenity.data.internalNotes,
        name: amenity.data.name,
        showOnBookingPage: amenity.data.showOnBookingPage,
        sortOrder: String(amenity.data.sortOrder),
        status: amenity.data.status as AmenityStatus,
      }
    : {
        appliesTo: "Room-level",
        category: "In-Room",
        chargeable: false,
        code: "",
        description: "",
        featured: false,
        feeAmount: "",
        feeUnit: "per stay",
        icon: "✨",
        internalNotes: "",
        name: "",
        showOnBookingPage: true,
        sortOrder: "1",
        status: "Active",
      };

  return (
    <AmenityEditor
      key={amenity.data?.id ?? "create"}
      initialValues={initialValues}
      isSaving={saveAmenity.isPending}
      mode={isCreate ? "create" : "update"}
      onSubmit={(values) =>
        saveAmenity.mutate({
          id: isCreate ? undefined : amenityId,
          appliesTo: values.appliesTo,
          category: values.category,
          chargeable: values.chargeable,
          code: values.code,
          description: values.description,
          featured: values.featured,
          feeAmount: values.feeAmount,
          feeUnit: values.feeUnit,
          icon: values.icon,
          internalNotes: values.internalNotes,
          name: values.name,
          showOnBookingPage: values.showOnBookingPage,
          sortOrder: Number(values.sortOrder || 0),
          status: values.status,
        })
      }
    />
  );
}

function AmenityEditor({
  initialValues,
  isSaving,
  mode,
  onSubmit,
}: {
  initialValues: AmenityFormValues;
  isSaving: boolean;
  mode: "create" | "update";
  onSubmit: (values: AmenityFormValues) => void;
}) {
  const [values, setValues] = useState(initialValues);

  function updateValue<TKey extends keyof AmenityFormValues>(
    key: TKey,
    value: AmenityFormValues[TKey],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
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
            <Link href="/resort/services/amenities">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : mode === "create"
                ? "Create amenity"
                : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <AmenityDetailsCard values={values} onChange={updateValue} />
          <AvailabilityCard values={values} onChange={updateValue} />
          <DisplaySettingsCard values={values} onChange={updateValue} />
        </div>
        <div className="space-y-5">
          <AmenitySummaryCard values={values} />
          <NotesCard
            value={values.internalNotes}
            onChange={(value) => updateValue("internalNotes", value)}
          />
        </div>
      </div>
    </form>
  );
}

function AmenityDetailsCard({
  onChange,
  values,
}: {
  onChange: <TKey extends keyof AmenityFormValues>(
    key: TKey,
    value: AmenityFormValues[TKey],
  ) => void;
  values: AmenityFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Amenity details</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Guest-facing amenity identity, grouping, icon, and short copy.
        </p>
      </div>

      <IconPicker
        value={values.icon}
        onChange={(value) => onChange("icon", value)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Amenity name">
          <Input
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Free WiFi"
            className="rounded-lg"
            required
          />
        </Field>
          <Field label="Amenity code">
            <Input
              value={values.code}
              onChange={(event) => onChange("code", event.target.value)}
              placeholder="AM-WIFI"
              className="rounded-lg"
              required
          />
        </Field>
      </div>

      <Field label="Category/Type">
        <CreatableSelect
          value={values.category}
          onChange={(value) => onChange("category", value)}
          options={AMENITY_CATEGORIES}
          placeholder="Select category"
        />
      </Field>

      <Field label="Description" optional>
        <Textarea
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Complimentary high-speed WiFi available throughout the property."
          className="min-h-24 rounded-lg"
        />
      </Field>
    </Card>
  );
}

function AvailabilityCard({
  onChange,
  values,
}: {
  onChange: <TKey extends keyof AmenityFormValues>(
    key: TKey,
    value: AmenityFormValues[TKey],
  ) => void;
  values: AmenityFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">
          Availability & scope
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Control where amenity applies and whether guest pays extra.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Applies to">
          <Select
            value={values.appliesTo}
            onValueChange={(value) =>
              onChange("appliesTo", value as AmenityScope)
            }
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMENITY_SCOPES.map((scope) => (
                <SelectItem key={scope} value={scope}>
                  {scope}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select
            value={values.status}
            onValueChange={(value) =>
              onChange("status", value as AmenityStatus)
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
      </div>

      <SwitchRow
        checked={values.chargeable}
        description="Turn on when amenity has extra guest fee."
        label="Chargeable?"
        onCheckedChange={(checked) => onChange("chargeable", checked)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Additional fee" optional>
          <Input
            value={values.feeAmount}
            onChange={(event) => onChange("feeAmount", event.target.value)}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="900"
            className="rounded-lg"
            disabled={!values.chargeable}
          />
        </Field>
        <Field label="Fee unit" optional>
          <Select
            value={values.feeUnit}
            onValueChange={(value) =>
              onChange("feeUnit", value as AmenityFeeUnit)
            }
            disabled={!values.chargeable}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMENITY_FEE_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Card>
  );
}

function DisplaySettingsCard({
  onChange,
  values,
}: {
  onChange: <TKey extends keyof AmenityFormValues>(
    key: TKey,
    value: AmenityFormValues[TKey],
  ) => void;
  values: AmenityFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">
          Display/booking settings
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure guest visibility and booking list order.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SwitchRow
          checked={values.showOnBookingPage}
          description="Visible to guests during booking."
          label="Show on booking page"
          onCheckedChange={(checked) => onChange("showOnBookingPage", checked)}
        />
        <SwitchRow
          checked={values.featured}
          description="Highlight in guest-facing amenity lists."
          label="Featured/Highlight"
          onCheckedChange={(checked) => onChange("featured", checked)}
        />
      </div>

      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
        Sort order is managed by drag and drop on the amenities list.
      </div>
    </Card>
  );
}

function IconPicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { theme } = useTheme();

  function handleEmojiClick(emojiData: EmojiClickData) {
    onChange(emojiData.emoji);
    setShowEmojiPicker(false);
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#303030]">Icon</Label>
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-20 w-20 rounded-xl text-4xl hover:bg-muted/50"
            type="button"
          >
            {value}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full border-none p-0" align="start">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width={350}
            height={400}
            theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function AmenityFormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-60" />
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
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
        <div className="space-y-5">
          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function AmenitySummaryCard({ values }: { values: AmenityFormValues }) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Amenity summary</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Quick preview of this amenity.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-3xl">
          {values.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-950">
            {values.name || "--"}
          </p>
          <p className="truncate text-xs font-medium text-zinc-500">
            {values.category}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <SummaryRow label="Code" value={values.code || "--"} />
        <SummaryRow label="Applies to" value={values.appliesTo} />
        <SummaryRow
          label="Fee"
          value={
            values.chargeable
              ? `${formatPesoFee(values.feeAmount)} ${values.feeUnit}`
              : "--"
          }
        />
        <SummaryRow
          label="Booking"
          value={values.showOnBookingPage ? "Shown" : "--"}
        />
        <SummaryRow label="Status" value={values.status} />
      </div>
    </Card>
  );
}

function NotesCard({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-[#303030]">Internal notes</h2>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Staff-only notes for operations."
        className="min-h-28 rounded-lg"
      />
    </Card>
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
      <Label className="text-sm font-medium text-[#303030]">
        {label}
        {optional ? (
          <span className="font-normal text-zinc-500">(optional)</span>
        ) : null}
      </Label>
      {children}
    </div>
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

function formatPesoFee(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value ? `₱${value}` : "--";
  }

  return `₱${amount.toLocaleString("en-PH")}`;
}
