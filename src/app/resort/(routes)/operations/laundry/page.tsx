"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarIcon,
  CheckCircle2,
  Clock3,
  Loader2,
  MoreVertical,
  PackageCheck,
  Plus,
  Shirt,
  Sparkles,
  TimerReset,
  WashingMachine,
} from "lucide-react";

import { CreatableSelect } from "@/components/reusable/creatable-select";
import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import toast from "react-hot-toast";

type LaundryStatus = "Received" | "Washing" | "Drying" | "Ready" | "Returned";
type LaundryPriority = "Normal" | "Urgent";
type LaundryCategory = string;

type LaundryJob = {
  category: LaundryCategory;
  code: string;
  dueTime: string;
  guestOrRoom: string;
  id: string;
  notes: string;
  pieces: number;
  priority: LaundryPriority;
  receivedAt: Date | string;
  status: LaundryStatus;
};

const STATUS_STYLES: Record<LaundryStatus, string> = {
  Received: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Washing: "border-black bg-black text-white",
  Drying: "border-zinc-300 bg-white text-zinc-900",
  Ready: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Returned: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

const PRIORITY_STYLES: Record<LaundryPriority, string> = {
  Normal: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Urgent: "border-black bg-black text-white",
};

const CATEGORIES = [
  "Room linen",
  "Towels",
  "Staff uniforms",
  "Guest laundry",
] as const;

export default function LaundryPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const laundry = useQuery({
    ...trpc.resort.laundry.list.queryOptions(),
    retry: false,
  });
  const [category, setCategory] = useState<LaundryCategory>("Room linen");
  const [dueClock, setDueClock] = useState("15:00");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [guestOrRoom, setGuestOrRoom] = useState("");
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pieces, setPieces] = useState("1");
  const [priority, setPriority] = useState<LaundryPriority>("Normal");
  const createLaundryJob = useMutation(
    trpc.resort.laundry.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.laundry.list.queryFilter());
        setDueClock("15:00");
        setDueDate(new Date());
        setGuestOrRoom("");
        setNotes("");
        setPieces("1");
        setPriority("Normal");
        setIsIntakeOpen(false);
        toast.success("Laundry job saved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const updateLaundryStatus = useMutation(
    trpc.resort.laundry.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.laundry.list.queryFilter());
        toast.success("Laundry status updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const jobs = useMemo(
    () => (laundry.data ?? []) as LaundryJob[],
    [laundry.data],
  );
  const activeJobs = jobs.filter((job) => job.status !== "Returned");
  const readyJobs = jobs.filter((job) => job.status === "Ready");
  const urgentJobs = activeJobs.filter((job) => job.priority === "Urgent");
  const totalPieces = activeJobs.reduce((sum, job) => sum + job.pieces, 0);

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Active loads",
        value: String(activeJobs.length),
        note: "In laundry cycle",
        icon: <WashingMachine className="size-4" />,
      },
      {
        title: "Pieces",
        value: String(totalPieces),
        note: "Current workload",
        icon: <Shirt className="size-4" />,
      },
      {
        title: "Ready",
        value: String(readyJobs.length),
        note: "Awaiting return",
        icon: <PackageCheck className="size-4" />,
      },
      {
        title: "Urgent",
        value: String(urgentJobs.length),
        note: "Prioritize first",
        icon: <TimerReset className="size-4" />,
      },
    ],
    [activeJobs.length, readyJobs.length, totalPieces, urgentJobs.length],
  );

  function setStatus(id: string, status: LaundryStatus) {
    updateLaundryStatus.mutate({ id, status });
  }

  function handleCreateJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const quantity = Number(pieces);

    if (!guestOrRoom.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    createLaundryJob.mutate({
      category,
      dueTime: formatLaundryDue(dueDate, dueClock),
      guestOrRoom,
      notes,
      pieces: quantity,
      priority,
    });
  }

  const columns: ColumnDef<LaundryJob>[] = [
    {
      accessorKey: "guestOrRoom",
      header: "Laundry",
      cell: ({ row }) => (
        <div className="min-w-60">
          <p className="font-bold text-zinc-950">{row.original.guestOrRoom}</p>
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
      accessorKey: "pieces",
      header: "Pieces",
      cell: ({ row }) => (
        <span className="font-bold text-zinc-950">{row.original.pieces}</span>
      ),
    },
    {
      accessorKey: "dueTime",
      header: "Due",
      cell: ({ row }) => (
        <span className="font-medium text-zinc-700">{row.original.dueTime}</span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge
          className={cn("rounded-md", PRIORITY_STYLES[row.original.priority])}
          variant="outline"
        >
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={cn("rounded-md", STATUS_STYLES[row.original.status])}
          variant="outline"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setStatus(row.original.id, "Washing")}>
              <WashingMachine className="size-4" />
              Start washing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(row.original.id, "Drying")}>
              <Clock3 className="size-4" />
              Move to drying
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus(row.original.id, "Ready")}>
              <CheckCircle2 className="size-4" />
              Mark ready
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatus(row.original.id, "Returned")}>
              <PackageCheck className="size-4" />
              Mark returned
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableHiding: false,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button onClick={() => setIsIntakeOpen(true)} size="xs">
          <Plus className="size-4" />
          New laundry
        </Button>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <ReusableDataTable
        columnToggleIds={["category", "pieces", "dueTime", "priority", "status"]}
        columns={columns}
        data={jobs}
        emptyState={{
          title: "No laundry jobs found",
          description: "Create a laundry job to track linen, towels, and guest laundry.",
        }}
        filterOptions={[
          { label: "All", value: "all" },
          { label: "Received", value: "Received" },
          { label: "Washing", value: "Washing" },
          { label: "Drying", value: "Drying" },
          { label: "Ready", value: "Ready" },
          { label: "Returned", value: "Returned" },
        ]}
        rowLabel="laundry jobs"
        searchPlaceholder="Search room, guest, category, or job ID..."
      />

      <Sheet open={isIntakeOpen} onOpenChange={setIsIntakeOpen}>
        <SheetContent className="w-full p-0 max-w-xl!">
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-lg font-bold text-zinc-950">
              Laundry intake
            </SheetTitle>
            <SheetDescription>
              Log linen, towels, uniforms, or guest laundry.
            </SheetDescription>
          </SheetHeader>
          <LaundryIntakeForm
            category={category}
            dueClock={dueClock}
            dueDate={dueDate}
            guestOrRoom={guestOrRoom}
            notes={notes}
            onCategoryChange={setCategory}
            onDueClockChange={setDueClock}
            onDueDateChange={setDueDate}
            onGuestOrRoomChange={setGuestOrRoom}
            onNotesChange={setNotes}
            onPiecesChange={setPieces}
            onPriorityChange={setPriority}
            onSubmit={handleCreateJob}
            pieces={pieces}
            priority={priority}
            saving={createLaundryJob.isPending}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LaundryIntakeForm({
  category,
  dueClock,
  dueDate,
  guestOrRoom,
  notes,
  onCategoryChange,
  onDueClockChange,
  onDueDateChange,
  onGuestOrRoomChange,
  onNotesChange,
  onPiecesChange,
  onPriorityChange,
  onSubmit,
  pieces,
  priority,
  saving,
}: {
  category: LaundryCategory;
  dueClock: string;
  dueDate: Date;
  guestOrRoom: string;
  notes: string;
  onCategoryChange: (value: LaundryCategory) => void;
  onDueClockChange: (value: string) => void;
  onDueDateChange: (value: Date) => void;
  onGuestOrRoomChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onPiecesChange: (value: string) => void;
  onPriorityChange: (value: LaundryPriority) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pieces: string;
  priority: LaundryPriority;
  saving: boolean;
}) {
  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
            <WashingMachine className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-950">Laundry intake</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Log linen, towels, uniforms, or guest laundry.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <Field label="Room / guest / source">
            <Input
              className="rounded-lg"
              onChange={(event) => onGuestOrRoomChange(event.target.value)}
              placeholder="RM-101, pool area, or guest name"
              value={guestOrRoom}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              <CreatableSelect
                buttonClassName="h-10"
                createLabel={(value) => `Create "${value}"`}
                onChange={onCategoryChange}
                options={CATEGORIES}
                placeholder="Select category"
                searchPlaceholder="Search or create category..."
                value={category}
              />
            </Field>
            <Field label="Pieces">
              <Input
                className="rounded-lg"
                min={1}
                onChange={(event) => onPiecesChange(event.target.value)}
                type="number"
                value={pieces}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority">
              <Select
                onValueChange={(value) =>
                  onPriorityChange(value as LaundryPriority)
                }
                value={priority}
              >
                <SelectTrigger className="h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date">
              <DueDatePicker date={dueDate} onChange={onDueDateChange} />
            </Field>
          </div>
          <Field label="Due time">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-zinc-500">
                <Clock3 className="size-4" />
              </div>
              <Input
                className="peer rounded-lg pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                onChange={(event) => onDueClockChange(event.target.value)}
                step="60"
                type="time"
                value={dueClock}
              />
            </div>
          </Field>
          <Field label="Notes">
            <Textarea
              className="min-h-20 rounded-lg"
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Handling notes, stain note, return instruction..."
              value={notes}
            />
          </Field>
        </div>
      </div>
      <div className="border-t border-zinc-200 bg-white p-5">
        <Button className="w-full" disabled={saving} type="submit">
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Save laundry job
        </Button>
      </div>
    </form>
  );
}

function DueDatePicker({
  date,
  onChange,
}: {
  date: Date;
  onChange: (date: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="h-10 w-full justify-start rounded-lg bg-white px-3 font-normal"
          type="button"
          variant="outline"
        >
          <CalendarIcon className="size-4 text-zinc-500" />
          {formatLaundryDate(date)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(nextDate) => {
            if (nextDate) {
              onChange(nextDate);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function formatLaundryDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLaundryDue(date: Date, time: string) {
  const [hourValue = "0", minuteValue = "0"] = time.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return formatLaundryDate(date);
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${formatLaundryDate(date)}, ${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-950">{label}</Label>
      {children}
    </div>
  );
}
