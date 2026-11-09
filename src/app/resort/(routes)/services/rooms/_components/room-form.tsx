"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, X } from "lucide-react";
import toast from "react-hot-toast";

import { CreatableSelect } from "@/components/reusable/creatable-select";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { UploadDropzone } from "@/lib/uploadthing";
import { useTRPC } from "@/trpc/client";
import { type RoomStatus } from "./data";

type RoomFormProps = {
  roomId: string;
};

type RoomFormValues = {
  amenityIds: string[];
  baseRate: string;
  bedConfiguration: string;
  building: string;
  childrenOccupancy: string;
  checkIn: string;
  checkOut: string;
  extraPersonCharge: string;
  floor: string;
  guestNote: string;
  maxAdults: string;
  minNights: string;
  name: string;
  notes: string;
  peakRate: string;
  photos: UploadedRoomPhoto[];
  roomCode: string;
  roomSize: string;
  smokingPolicy: "Non-smoking" | "Smoking";
  status: RoomStatus;
  type: string;
  viewType: string;
};

const ROOM_TYPES = [
  "Deluxe Queen",
  "Family Suite",
  "Pool Villa",
  "Dormitory",
] as const;

const BED_CONFIGURATIONS = [
  "1 King",
  "1 Queen",
  "2 Queen",
  "Twin",
  "1 King, 2 Queen",
] as const;

const VIEW_TYPES = [
  "Ocean view",
  "Garden view",
  "Pool view",
  "City view",
] as const;

type UploadedRoomPhoto = {
  key: string;
  name: string;
  size?: number;
  url: string;
};

export function RoomForm({ roomId }: RoomFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCreate = roomId === "create";
  const room = useQuery({
    ...trpc.resort.rooms.get.queryOptions({ id: roomId }),
    enabled: !isCreate,
    retry: false,
  });
  const amenities = useQuery({
    ...trpc.resort.amenities.list.queryOptions(),
    retry: false,
  });
  const saveRoom = useMutation(
    trpc.resort.rooms.save.mutationOptions({
      onSuccess: async (savedRoom) => {
        await queryClient.invalidateQueries(
          trpc.resort.rooms.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.rooms.get.queryFilter({ id: savedRoom.id }),
        );
        toast.success("Room saved.");
        router.push("/resort/services/rooms");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (!isCreate && room.isPending) {
    return <RoomFormSkeleton />;
  }

  if (!isCreate && room.isError) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Room not found.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/services/rooms">Back to rooms</Link>
        </Button>
      </div>
    );
  }

  const amenityOptions: MultiSelectOption[] = (amenities.data ?? [])
    .filter((amenity) => amenity.status === "Active")
    .map((amenity) => ({
      label: amenity.name,
      value: amenity.id,
    }));
  const initialValues: RoomFormValues = room.data
    ? {
        amenityIds: room.data.amenityIds,
        baseRate: room.data.baseRate,
        bedConfiguration: room.data.bedConfiguration,
        building: room.data.building,
        childrenOccupancy: String(room.data.childrenOccupancy),
        checkIn: room.data.checkIn,
        checkOut: room.data.checkOut,
        extraPersonCharge: room.data.extraPersonCharge,
        floor: room.data.floor,
        guestNote: room.data.guestNote,
        maxAdults: String(room.data.maxAdults),
        minNights: String(room.data.minNights),
        name: room.data.name,
        notes: room.data.notes,
        peakRate: room.data.peakRate,
        photos: room.data.photos,
        roomCode: room.data.code,
        roomSize: room.data.roomSize,
        smokingPolicy: room.data
          .smokingPolicy as RoomFormValues["smokingPolicy"],
        status: room.data.status as RoomStatus,
        type: room.data.type,
        viewType: room.data.viewType,
      }
    : {
        amenityIds: [],
        baseRate: "",
        bedConfiguration: "1 Queen",
        building: "",
        childrenOccupancy: "0",
        checkIn: "14:00:00",
        checkOut: "12:00:00",
        extraPersonCharge: "",
        floor: "",
        guestNote: "",
        maxAdults: "2",
        minNights: "1",
        name: "",
        notes: "",
        peakRate: "",
        photos: [],
        roomCode: "",
        roomSize: "",
        smokingPolicy: "Non-smoking",
        status: "Available",
        type: "Deluxe Queen",
        viewType: "Garden view",
      };

  return (
    <RoomEditor
      key={room.data?.id ?? "create"}
      amenityOptions={amenityOptions}
      initialValues={initialValues}
      isSaving={saveRoom.isPending}
      mode={isCreate ? "create" : "update"}
      onSubmit={(values) =>
        saveRoom.mutate({
          id: isCreate ? undefined : roomId,
          amenityIds: values.amenityIds,
          baseRate: values.baseRate,
          bedConfiguration: values.bedConfiguration,
          building: values.building,
          checkIn: values.checkIn,
          checkOut: values.checkOut,
          childrenOccupancy: Number(values.childrenOccupancy || 0),
          code: values.roomCode,
          extraPersonCharge: values.extraPersonCharge,
          floor: values.floor,
          guestNote: values.guestNote,
          maxAdults: Number(values.maxAdults || 0),
          minNights: Number(values.minNights || 1),
          name: values.name,
          notes: values.notes,
          peakRate: values.peakRate,
          photos: values.photos,
          roomSize: values.roomSize,
          smokingPolicy: values.smokingPolicy,
          status: values.status,
          type: values.type,
          viewType: values.viewType,
        })
      }
    />
  );
}

function RoomEditor({
  amenityOptions,
  initialValues,
  isSaving,
  mode,
  onSubmit,
}: {
  amenityOptions: MultiSelectOption[];
  initialValues: RoomFormValues;
  isSaving: boolean;
  mode: "create" | "update";
  onSubmit: (values: RoomFormValues) => void;
}) {
  const [values, setValues] = useState(initialValues);

  function updateValue<TKey extends keyof RoomFormValues>(
    key: TKey,
    value: RoomFormValues[TKey],
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
            <Link href="/resort/services/rooms">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : mode === "create"
                ? "Create room"
                : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <RoomOverviewCard values={values} onChange={updateValue} />
          <PricingCard values={values} onChange={updateValue} />
          <BookingRulesCard values={values} onChange={updateValue} />
          <FeaturesCard
            amenityOptions={amenityOptions}
            values={values}
            onChange={updateValue}
          />
        </div>
        <div className="space-y-5">
          <RoomSummaryCard values={values} />
          <MediaCard
            photos={values.photos}
            onChange={(photos) => updateValue("photos", photos)}
          />
          <NotesCard
            value={values.notes}
            onChange={(value) => updateValue("notes", value)}
          />
        </div>
      </div>
    </form>
  );
}

function RoomOverviewCard({
  onChange,
  values,
}: {
  onChange: <TKey extends keyof RoomFormValues>(
    key: TKey,
    value: RoomFormValues[TKey],
  ) => void;
  values: RoomFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Room overview</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure room identity, capacity, layout, and operating status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Room name">
          <Input
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="101"
            className="rounded-lg"
            required
          />
        </Field>
        <Field label="Room number/code">
          <Input
            value={values.roomCode}
            onChange={(event) => onChange("roomCode", event.target.value)}
            placeholder="RM-101"
            className="rounded-lg"
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Room type">
          <CreatableSelect
            value={values.type}
            onChange={(value) => onChange("type", value)}
            options={ROOM_TYPES}
            placeholder="Select room type"
          />
        </Field>
        <Field label="Status">
          <Select
            value={values.status}
            onValueChange={(value) => onChange("status", value as RoomStatus)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Occupied">Occupied</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
              <SelectItem value="Out of Service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Building/Wing">
          <Input
            value={values.building}
            onChange={(event) => onChange("building", event.target.value)}
            placeholder="Main Building"
            className="rounded-lg"
            required
          />
        </Field>
        <Field label="Floor">
          <Input
            value={values.floor}
            onChange={(event) => onChange("floor", event.target.value)}
            placeholder="Ground floor"
            className="rounded-lg"
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Adults">
          <Input
            value={values.maxAdults}
            onChange={(event) => onChange("maxAdults", event.target.value)}
            type="number"
            min={0}
            className="rounded-lg"
            required
          />
        </Field>
        <Field label="Children">
          <Input
            value={values.childrenOccupancy}
            onChange={(event) =>
              onChange("childrenOccupancy", event.target.value)
            }
            type="number"
            min={0}
            className="rounded-lg"
            required
          />
        </Field>
        <Field label="Room size">
          <Input
            value={values.roomSize}
            onChange={(event) => onChange("roomSize", event.target.value)}
            placeholder="32 sqm"
            className="rounded-lg"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Bed configuration">
          <CreatableSelect
            value={values.bedConfiguration}
            onChange={(value) => onChange("bedConfiguration", value)}
            options={BED_CONFIGURATIONS}
            placeholder="Select bed configuration"
          />
        </Field>
        <Field label="View type">
          <CreatableSelect
            value={values.viewType}
            onChange={(value) => onChange("viewType", value)}
            options={VIEW_TYPES}
            placeholder="Select view type"
          />
        </Field>
      </div>
    </Card>
  );
}

function RoomFormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
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
            <Skeleton className="h-40 w-full" />
          </Card>
          <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-28 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  onChange,
  values,
}: {
  onChange: <TKey extends keyof RoomFormValues>(
    key: TKey,
    value: RoomFormValues[TKey],
  ) => void;
  values: RoomFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Rate & pricing</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure Philippine peso rates and optional peak pricing.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Base rate">
          <Input
            value={values.baseRate}
            type="number"
            onChange={(event) => onChange("baseRate", event.target.value)}
            placeholder="5000"
            className="rounded-lg"
            required
          />
        </Field>
        <Field label="Weekend/peak rate" optional>
          <Input
            value={values.peakRate}
            type="number"
            onChange={(event) => onChange("peakRate", event.target.value)}
            placeholder="5500"
            className="rounded-lg"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Extra person/bed charge" optional>
          <Input
            type="number"
            value={values.extraPersonCharge}
            onChange={(event) =>
              onChange("extraPersonCharge", event.target.value)
            }
            placeholder="800"
            className="rounded-lg"
          />
        </Field>
      </div>
    </Card>
  );
}

function BookingRulesCard({
  onChange,
  values,
}: {
  onChange: <TKey extends keyof RoomFormValues>(
    key: TKey,
    value: RoomFormValues[TKey],
  ) => void;
  values: RoomFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Booking rules</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Default room rules used during booking checkout.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Check-in">
          <TimePicker
            id="room-check-in"
            value={values.checkIn}
            onValueChange={(value) => onChange("checkIn", value)}
            className="rounded-lg"
          />
        </Field>
        <Field label="Check-out">
          <TimePicker
            id="room-check-out"
            value={values.checkOut}
            onValueChange={(value) => onChange("checkOut", value)}
            className="rounded-lg"
          />
        </Field>
        <Field label="Minimum nights">
          <Input
            value={values.minNights}
            onChange={(event) => onChange("minNights", event.target.value)}
            type="number"
            min={1}
            className="rounded-lg"
          />
        </Field>
      </div>
      <Field label="Guest note" optional>
        <Textarea
          value={values.guestNote}
          onChange={(event) => onChange("guestNote", event.target.value)}
          className="min-h-24 rounded-lg"
          placeholder="Visible booking note for this room."
        />
      </Field>
    </Card>
  );
}

function FeaturesCard({
  amenityOptions,
  onChange,
  values,
}: {
  amenityOptions: MultiSelectOption[];
  onChange: <TKey extends keyof RoomFormValues>(
    key: TKey,
    value: RoomFormValues[TKey],
  ) => void;
  values: RoomFormValues;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">
          Amenities / features
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Assign active amenities from the amenities module for filtering and
          booking display.
        </p>
      </div>
      <Field label="Amenities list" optional>
        <MultiSelect
          value={values.amenityIds}
          onValueChange={(value) => onChange("amenityIds", value)}
          options={amenityOptions}
          placeholder="Select amenities"
          searchPlaceholder="Search amenities..."
        />
      </Field>
      <Field label="Smoking policy">
        <Select
          value={values.smokingPolicy}
          onValueChange={(value) =>
            onChange("smokingPolicy", value as RoomFormValues["smokingPolicy"])
          }
        >
          <SelectTrigger className="h-10 w-full rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Non-smoking">Non-smoking</SelectItem>
            <SelectItem value="Smoking">Smoking</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </Card>
  );
}

function MediaCard({
  onChange,
  photos,
}: {
  onChange: (photos: UploadedRoomPhoto[]) => void;
  photos: UploadedRoomPhoto[];
}) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadToastId = "room-photo-upload";

  function removePhoto(key: string) {
    onChange(photos.filter((photo) => photo.key !== key));
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Room photos</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Gallery used by booking engine and OTA sync.
        </p>
      </div>
      {photos.length ? (
        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="relative"
        >
          <CarouselContent className="-ml-3">
            {photos.map((photo) => (
              <CarouselItem key={photo.key} className="basis-33 pl-3">
                <Attachment orientation="vertical" className="w-36">
                  <AttachmentMedia variant="image" className="h-28">
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      width={144}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{photo.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {photo.size
                        ? `${Math.round(photo.size / 1024)} KB`
                        : "Image"}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      type="button"
                      aria-label={`Remove ${photo.name}`}
                      onClick={() => removePhoto(photo.key)}
                    >
                      <X className="size-3.5" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-linear-to-l from-white via-white/90 to-transparent" />
          {photos.length > 2 ? (
            <>
              <CarouselPrevious type="button" className="left-1 size-8 bg-white/90 shadow-sm" />
              <CarouselNext type="button" className="right-1 size-8 bg-white/90 shadow-sm" />
            </>
          ) : null}
        </Carousel>
      ) : (
        <Attachment
          state="idle"
          className="min-h-28 w-full items-center justify-center border-dashed bg-zinc-50"
        >
          <AttachmentMedia>
            <ImageIcon className="size-5" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>No room photos yet</AttachmentTitle>
            <AttachmentDescription>
              Upload images for booking gallery.
            </AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      )}
      <UploadDropzone
        endpoint="roomImageUploader"
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
          allowedContent: "Images up to 4MB, max 8",
          button:
            uploadProgress === null
              ? "Upload room photos"
              : `Uploading ${uploadProgress}%`,
          label: "Drag and drop room photos, or click to browse",
        }}
        onUploadBegin={(fileName) => {
          setUploadProgress(0);
          toast.loading(`Uploading ${fileName}...`, {
            id: uploadToastId,
          });
        }}
        onUploadProgress={(progress) => {
          setUploadProgress(progress);
          toast.loading(`Uploading room photos... ${progress}%`, {
            id: uploadToastId,
          });
        }}
        onClientUploadComplete={(files) => {
          setUploadProgress(null);
          onChange([
            ...photos,
            ...files.map((file) => ({
              key: file.key,
              name: file.name,
              size: file.size,
              url: file.ufsUrl,
            })),
          ]);
          toast.success(
            `${files.length} room photo${files.length === 1 ? "" : "s"} uploaded.`,
            {
              id: uploadToastId,
            },
          );
        }}
        onUploadError={(error: Error) => {
          setUploadProgress(null);
          toast.error(error.message || "Upload failed.", {
            id: uploadToastId,
          });
        }}
      />
    </Card>
  );
}

function RoomSummaryCard({ values }: { values: RoomFormValues }) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Room summary</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Quick preview of this room record.
        </p>
      </div>
      <div className="space-y-2">
        <SummaryRow label="Room" value={values.name || "--"} />
        <SummaryRow label="Code" value={values.roomCode || "--"} />
        <SummaryRow label="Type" value={values.type || "--"} />
        <SummaryRow label="Building" value={values.building || "--"} />
        <SummaryRow label="Floor" value={values.floor || "--"} />
        <SummaryRow
          label="Occupancy"
          value={`${values.maxAdults} adults, ${values.childrenOccupancy} children`}
        />
        <SummaryRow label="Base rate" value={values.baseRate || "--"} />
        <SummaryRow label="Status" value={values.status || "--"} />
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
        placeholder="Internal notes for front desk, booking, or maintenance context."
        className="min-h-28 rounded-lg"
      />
    </Card>
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
