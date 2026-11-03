"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  ImagePlus,
  Loader2,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { TenantBreadcrumb } from "@/components/tenant/tenant-breadcrumb";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { UploadDropzone } from "@/lib/uploadthing";
import { useTRPC } from "@/trpc/client";

type RoomStatus = "Clean" | "Dirty" | "Occupied" | "Vacant";

type HousekeepingRoom = {
  attendant: string;
  attendantStaffProfileId: string;
  id: string;
  lastPhoto: string;
  lastPhotoFile: UploadedFile | null;
  lastPhotoNote: string;
  name: string;
  nextGuest: string;
  roomLabel: string;
  status: RoomStatus;
};

type StaffOption = {
  id: string;
  name: string;
};

type RoomSelectOption = {
  id: string;
  roomLabel: string;
};

type DamageReport = {
  createdAt: Date | string;
  details: string;
  id: string;
  photo: UploadedFile | null;
  photoNote: string;
  roomLabel: string;
  status: "Open" | "Resolved";
  title: string;
};

type UploadedFile = {
  key: string;
  name: string;
  size?: number;
  url: string;
};

const STATUS_STYLES: Record<RoomStatus, string> = {
  Clean: "border-black bg-black text-white",
  Dirty: "border-zinc-300 bg-zinc-100 text-zinc-950",
  Occupied: "border-zinc-300 bg-white text-zinc-900",
  Vacant: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

const BOARD_COLUMNS: RoomStatus[] = ["Vacant", "Dirty", "Clean", "Occupied"];

export function HousekeepingView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const housekeeping = useQuery({
    ...trpc.tenant.housekeeping.list.queryOptions({
      date: selectedDate.toISOString(),
    }),
    retry: false,
  });
  const roomsQuery = useQuery({
    ...trpc.tenant.rooms.list.queryOptions(),
    retry: false,
  });
  const staffRecords = useQuery({
    ...trpc.tenant.staffRecords.list.queryOptions(),
    retry: false,
  });
  const updateRoomStatus = useMutation(
    trpc.tenant.housekeeping.updateRoomStatus.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.tenant.housekeeping.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.rooms.list.queryFilter()),
        ]);
        toast.success("Room status updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const markReady = useMutation(
    trpc.tenant.housekeeping.markReady.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.tenant.housekeeping.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.rooms.list.queryFilter()),
        ]);
        toast.success("Room marked ready.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const reportDamage = useMutation(
    trpc.tenant.housekeeping.reportDamage.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.tenant.housekeeping.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.maintenance.list.queryFilter()),
          queryClient.invalidateQueries(trpc.tenant.rooms.list.queryFilter()),
        ]);
        toast.success("Damage report sent to maintenance.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const resolveDamage = useMutation(
    trpc.tenant.housekeeping.resolveDamage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.tenant.housekeeping.list.queryFilter());
        toast.success("Damage report resolved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rooms = useMemo(
    () => (housekeeping.data?.rooms ?? []) as HousekeepingRoom[],
    [housekeeping.data?.rooms],
  );
  const roomOptions = useMemo(
    () =>
      (roomsQuery.data ?? []).map((room) => ({
        id: room.id,
        roomLabel: `${room.code} - ${room.name}`,
      })),
    [roomsQuery.data],
  );
  const staff = useMemo(
    () =>
      (staffRecords.data ?? [])
        .filter((staffRecord) => staffRecord.status === "Active")
        .map((staffRecord) => ({
          id: staffRecord.id,
          name: staffRecord.displayName,
        })),
    [staffRecords.data],
  );
  const damageReports = useMemo(
    () => (housekeeping.data?.damageReports ?? []) as DamageReport[],
    [housekeeping.data?.damageReports],
  );
  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Ready rooms",
        value: String(rooms.filter((room) => room.status === "Clean").length),
        note: "Photo verified clean",
        icon: <CheckCircle2 className="size-4" />,
      },
      {
        title: "Dirty rooms",
        value: String(rooms.filter((room) => room.status === "Dirty").length),
        note: "Needs turnover",
        icon: <Sparkles className="size-4" />,
      },
      {
        title: "Occupied",
        value: String(rooms.filter((room) => room.status === "Occupied").length),
        note: "Guest in-house",
        icon: <DoorOpen className="size-4" />,
      },
      {
        title: "Damage reports",
        value: String(
          damageReports.filter((report) => report.status === "Open").length,
        ),
        note: "Open review",
        icon: <TriangleAlert className="size-4" />,
      },
    ],
    [damageReports, rooms],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TenantBreadcrumb />
        <Button
          onClick={() =>
            toast.info("Use Ready for Occupancy to record final room photo proof.")
          }
          size="xs"
        >
          <Camera className="size-4" />
          Upload room photo
        </Button>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-0! overflow-hidden h-fit rounded-xl border-zinc-200 bg-white p-0!">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <h1 className="text-base font-bold text-zinc-950">
                Room status board
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Status changes sync with room availability.
              </p>
            </div>
            <DatePicker value={selectedDate} onChange={setSelectedDate} />
          </div>

          {housekeeping.isLoading ? (
            <HousekeepingBoardSkeleton />
          ) : (
            <div className="grid min-h-155 divide-y divide-zinc-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {BOARD_COLUMNS.map((status) => (
                <RoomColumn
                  key={status}
                  onStatusChange={(roomId, nextStatus) =>
                    updateRoomStatus.mutate({
                      roomId,
                      status: nextStatus,
                    })
                  }
                  rooms={rooms.filter((room) => room.status === status)}
                  status={status}
                  statusPending={updateRoomStatus.isPending}
                />
              ))}
            </div>
          )}
        </Card>

        <aside className="space-y-5">
          <ReadyForOccupancyCard
            isPending={markReady.isPending}
            onSubmit={(input) => markReady.mutate(input)}
            rooms={roomOptions}
            staff={staff}
          />
          <DamageReportCard
            isPending={reportDamage.isPending}
            onResolve={(id) => resolveDamage.mutate({ id })}
            onSubmit={(input) => reportDamage.mutate(input)}
            reports={damageReports}
            resolvePending={resolveDamage.isPending}
            rooms={roomOptions}
          />
        </aside>
      </div>
    </div>
  );
}

function DatePicker({
  onChange,
  value,
}: {
  onChange: (date: Date) => void;
  value: Date;
}) {
  const isToday = value.toDateString() === new Date().toDateString();
  const label = isToday
    ? "Today"
    : value.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="xs" variant="outline">
          <CalendarDays className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          onSelect={(date) => {
            if (date) {
              onChange(date);
            }
          }}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}

function HousekeepingBoardSkeleton() {
  return (
    <div className="grid min-h-155 divide-y divide-zinc-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
      {BOARD_COLUMNS.map((status) => (
        <section className="bg-zinc-50/50 p-3" key={status}>
          <div className="mb-3 flex items-center justify-between">
            <Badge className={cn("rounded-md", STATUS_STYLES[status])} variant="outline">
              {status}
            </Badge>
            <Skeleton className="h-4 w-6" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </section>
      ))}
    </div>
  );
}

function RoomColumn({
  onStatusChange,
  rooms,
  status,
  statusPending,
}: {
  onStatusChange: (roomId: string, status: RoomStatus) => void;
  rooms: HousekeepingRoom[];
  status: RoomStatus;
  statusPending: boolean;
}) {
  return (
    <section className="bg-zinc-50/50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn("rounded-md", STATUS_STYLES[status])} variant="outline">
            {status}
          </Badge>
          <span className="text-xs font-bold text-zinc-500">{rooms.length}</span>
        </div>
      </div>

      <div className="min-h-36 space-y-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            onStatusChange={onStatusChange}
            room={room}
            statusPending={statusPending}
          />
        ))}
      </div>
    </section>
  );
}

function RoomCard({
  onStatusChange,
  room,
  statusPending,
}: {
  onStatusChange: (roomId: string, status: RoomStatus) => void;
  room: HousekeepingRoom;
  statusPending: boolean;
}) {
  const photoMissing = room.lastPhoto === "Needs new photo";

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-xs transition hover:bg-zinc-50",
        statusPending && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-500">{room.roomLabel}</p>
          <h2 className="mt-1 font-bold text-zinc-950">{room.name}</h2>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            {room.nextGuest}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <DoorOpen className="size-4" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-bold uppercase text-zinc-500">Attendant</p>
          <p className="mt-1 font-semibold text-zinc-900">{room.attendant}</p>
        </div>
        <div>
          <p className="font-bold uppercase text-zinc-500">Photo</p>
          <p
            className={cn(
              "mt-1 font-semibold",
              photoMissing ? "text-zinc-950" : "text-zinc-600",
            )}
          >
            {room.lastPhoto}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 h-1 rounded-full",
          room.status === "Clean" ? "bg-black" : "bg-zinc-300",
        )}
      />

      <div className="mt-4 space-y-2">
        <Label className="text-xs font-bold uppercase text-zinc-500">
          Update status
        </Label>
        <Select
          disabled={statusPending}
          onValueChange={(nextStatus) =>
            onStatusChange(room.id, nextStatus as RoomStatus)
          }
          value={room.status}
        >
          <SelectTrigger className="h-9 w-full rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOARD_COLUMNS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ReadyForOccupancyCard({
  isPending,
  onSubmit,
  rooms,
  staff,
}: {
  isPending: boolean;
  onSubmit: (input: {
    attendantStaffProfileId?: string;
    photo?: UploadedFile;
    photoNote?: string;
    roomId: string;
  }) => void;
  rooms: RoomSelectOption[];
  staff: StaffOption[];
}) {
  const [attendantStaffProfileId, setAttendantStaffProfileId] = useState("none");
  const [photo, setPhoto] = useState<UploadedFile | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [roomId, setRoomId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roomId) {
      toast.error("Select a room first.");
      return;
    }

    onSubmit({
      attendantStaffProfileId,
      photo: photo ?? undefined,
      photoNote,
      roomId,
    });
    setPhoto(null);
    setPhotoNote("");
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <ClipboardCheck className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">
            Ready for Occupancy
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add a current room photo or verification note before status can change.
          </p>
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Room</Label>
          <Select onValueChange={setRoomId} value={roomId}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.roomLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Attendant</Label>
          <Select
            onValueChange={setAttendantStaffProfileId}
            value={attendantStaffProfileId}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {staff.map((staffOption) => (
                <SelectItem key={staffOption.id} value={staffOption.id}>
                  {staffOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <HousekeepingPhotoUpload
          description="Door, bed, bathroom, and floor visible"
          file={photo}
          label="Required final photo"
          onChange={setPhoto}
        />

        <div className="space-y-2">
          <Label>Photo note (optional)</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setPhotoNote(event.target.value)}
            placeholder="Final photo verified by front desk"
            value={photoNote}
          />
        </div>

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Mark ready for occupancy
        </Button>
      </form>
    </Card>
  );
}

function HousekeepingPhotoUpload({
  description,
  file,
  label,
  onChange,
}: {
  description: string;
  file: UploadedFile | null;
  label: string;
  onChange: (file: UploadedFile | null) => void;
}) {
  return (
    <div className="space-y-3">
      {file ? (
        <Attachment className="w-full">
          <AttachmentMedia variant="image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={file.name} src={file.url} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {file.size ? `${Math.round(file.size / 1024)} KB` : "Uploaded"}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction onClick={() => onChange(null)} type="button">
              <X className="size-4" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <Attachment className="w-full" state="idle">
          <AttachmentMedia>
            <ImagePlus className="size-4" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{label}</AttachmentTitle>
            <AttachmentDescription>{description}</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      )}

      <UploadDropzone
        className="ut-button:bg-gradient-to-b ut-button:from-zinc-700 ut-button:to-black ut-button:text-white ut-label:text-zinc-950 ut-allowed-content:text-zinc-500 rounded-xl border-zinc-200"
        endpoint="roomImageUploader"
        onClientUploadComplete={(files) => {
          const uploadedFile = files[0];

          if (!uploadedFile) {
            return;
          }

          onChange({
            key: uploadedFile.key,
            name: uploadedFile.name,
            size: uploadedFile.size,
            url: uploadedFile.ufsUrl,
          });
          toast.success("Photo uploaded.");
        }}
        onUploadBegin={() => {
          toast.loading("Uploading photo...");
        }}
        onUploadError={(error) => {
          toast.error(error.message);
        }}
      />
    </div>
  );
}

function DamageReportCard({
  isPending,
  onResolve,
  onSubmit,
  reports,
  resolvePending,
  rooms,
}: {
  isPending: boolean;
  onResolve: (id: string) => void;
  onSubmit: (input: {
    details: string;
    photo?: UploadedFile;
    photoNote?: string;
    roomId: string;
    title: string;
  }) => void;
  reports: DamageReport[];
  resolvePending: boolean;
  rooms: RoomSelectOption[];
}) {
  const [details, setDetails] = useState("");
  const [photo, setPhoto] = useState<UploadedFile | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const openReports = reports.filter((report) => report.status === "Open");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roomId) {
      toast.error("Select a room first.");
      return;
    }

    onSubmit({
      details,
      photo: photo ?? undefined,
      photoNote,
      roomId,
      title,
    });
    setDetails("");
    setPhoto(null);
    setPhotoNote("");
    setTitle("");
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-zinc-950">
          Basic damage report
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Save issue, mark room dirty, and review until resolved.
        </p>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Room</Label>
          <Select onValueChange={setRoomId} value={roomId}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.roomLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Damage title</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Cracked bathroom tile"
            value={title}
          />
        </div>
        <div className="space-y-2">
          <Label>Details</Label>
          <Textarea
            className="min-h-24 rounded-lg"
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Location, severity, guest impact..."
            value={details}
          />
        </div>

        <HousekeepingPhotoUpload
          description="JPG or PNG evidence"
          file={photo}
          label="Add damage photo"
          onChange={setPhoto}
        />

        <div className="space-y-2">
          <Label>Photo note (optional)</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setPhotoNote(event.target.value)}
            placeholder="Visible crack near shower drain"
            value={photoNote}
          />
        </div>

        <Button disabled={isPending} type="submit">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Submit damage report
        </Button>
      </form>

      {openReports.length > 0 && (
        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <p className="text-sm font-bold text-zinc-950">Open reports</p>
          {openReports.slice(0, 3).map((report) => (
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              key={report.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-zinc-950">{report.title}</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    {report.roomLabel}
                  </p>
                </div>
                <Button
                  disabled={resolvePending}
                  onClick={() => onResolve(report.id)}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  Resolve
                </Button>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                {report.details}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
