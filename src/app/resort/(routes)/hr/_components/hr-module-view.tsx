"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Edit,
  FileText,
  LogIn,
  LogOut,
  MoreVertical,
  Plus,
  Timer,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { CreatableSelect } from "@/components/reusable/creatable-select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type HrModule =
  | "leave-requests"
  | "ot-undertime"
  | "scheduling"
  | "staff-records"
  | "timekeeping";

type StaffRow = {
  allowance: number;
  basicSalary: number;
  bonus: number;
  commission: number;
  contact: string;
  department: string;
  email: string;
  employmentType: string;
  governmentDeductions: number;
  id: string;
  incentives: number;
  leaveDeduction: number;
  name: string;
  netPay: number;
  otherDeductions: number;
  recordId: string;
  role: string;
  startDate: string;
  status: string;
  totalDeductions: number;
  totalEarnings: number;
  updatedAt: string;
  username: string;
  workLocation: string;
};

type ShiftRow = {
  department: string;
  endAt: Date | string;
  id: string;
  name: string;
  notes: string;
  recordId: string;
  role: string;
  shift: string;
  staffProfileId: string;
  startAt: Date | string;
  status: string;
};

type ShiftFormState = {
  department: string;
  endAt: string;
  notes: string;
  role: string;
  shift: string;
  staffProfileId: string;
  startAt: string;
  status: "Assigned" | "Changed" | "Open";
};

type TimeLogRow = {
  clockIn: Date | string | null;
  clockOut: Date | string | null;
  date: Date | string;
  department: string;
  flag: string;
  hours: string;
  id: string;
  name: string;
  role: string;
};

type LeaveRow = {
  balance: string;
  balanceDays: number;
  endDate: Date | string;
  id: string;
  name: string;
  recordId: string;
  reason: string;
  staffProfileId: string;
  startDate: Date | string;
  status: string;
  type: string;
};

type LeaveFormState = {
  balanceDays: string;
  endDate: string;
  reason: string;
  staffProfileId: string;
  startDate: string;
  type: string;
};

type OtRow = {
  hours: string;
  id: string;
  name: string;
  payPeriod: string;
  recordId: string;
  reason: string;
  staffProfileId: string;
  status: string;
  type: string;
};

type OtFormState = {
  hours: string;
  payPeriod: string;
  reason: string;
  staffProfileId: string;
  type: "Overtime" | "Undertime";
};

const LEAVE_TYPE_OPTIONS = [
  "Vacation leave",
  "Sick leave",
  "Emergency leave",
  "Maternity leave",
  "Paternity leave",
  "Bereavement leave",
  "Unpaid leave",
] as const;

const moduleContent: Record<
  HrModule,
  {
    action: string;
    description: string;
    title: string;
  }
> = {
  "staff-records": {
    action: "Add staff",
    description:
      "Basic staff profile, role, department, contact, and start date.",
    title: "Staff Records",
  },
  scheduling: {
    action: "Assign shift",
    description: "Manual weekly shift assignment per staff member.",
    title: "Scheduling",
  },
  timekeeping: {
    action: "Clock in",
    description: "Manual and button-based clock-in/out with daily time logs.",
    title: "Timekeeping",
  },
  "leave-requests": {
    action: "New leave",
    description: "Submit, approve, reject, and track basic leave balances.",
    title: "Leave Requests",
  },
  "ot-undertime": {
    action: "Log hours",
    description: "Track overtime and undertime against shifts and pay periods.",
    title: "OT/Undertime",
  },
};

export function HrModuleView({ module }: { module: HrModule }) {
  const content = moduleContent[module];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        {module === "staff-records" ? (
          <Button asChild size="xs">
            <Link href="/resort/access/users-roles/create">
              <Plus className="size-4" />
              {content.action}
            </Link>
          </Button>
        ) : module === "timekeeping" ? (
          <TimekeepingHeaderAction />
        ) : module === "scheduling" ? (
          <AssignShiftDialog />
        ) : module === "leave-requests" ? (
          <NewLeaveDialog />
        ) : module === "ot-undertime" ? (
          <LogOtUndertimeDialog />
        ) : (
          <Button size="xs">
            <Plus className="size-4" />
            {content.action}
          </Button>
        )}
      </div>

      {module === "staff-records" ? (
        <StaffRecordsKpis />
      ) : module === "scheduling" ? (
        <SchedulingKpis />
      ) : module === "leave-requests" ? (
        <LeaveRequestsKpis />
      ) : module === "ot-undertime" ? (
        <OtUndertimeKpis />
      ) : module === "timekeeping" ? (
        <TimekeepingKpis />
      ) : (
        <KpiGrid
          columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
          items={getKpis(module)}
        />
      )}

      {module === "staff-records" ? (
        <StaffRecordsTable />
      ) : module === "leave-requests" ? (
        <LeaveRequestsTable />
      ) : module === "ot-undertime" ? (
        <OtUndertimeTable />
      ) : module === "timekeeping" ? (
        <TimekeepingView />
      ) : (
        <Card className="overflow-hidden rounded-xl border-zinc-200 bg-white p-0">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h1 className="text-base font-bold text-zinc-950">
              {content.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{content.description}</p>
          </div>
          <ModuleBody module={module} />
        </Card>
      )}
    </div>
  );
}

function ModuleBody({ module }: { module: HrModule }) {
  if (module === "staff-records") return <StaffRecordsTable />;
  if (module === "scheduling") return <SchedulingView />;
  if (module === "timekeeping") return <TimekeepingView />;
  if (module === "leave-requests") return <LeaveRequestsTable />;
  return <OtUndertimeTable />;
}

function AssignShiftDialog({
  mode = "create",
  shift,
  trigger,
}: {
  mode?: "create" | "edit";
  shift?: ShiftRow;
  trigger?: ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ShiftFormState>(() =>
    shift ? getShiftFormFromRow(shift) : getDefaultShiftForm(),
  );
  const staffRecords = useQuery({
    ...trpc.resort.staffRecords.list.queryOptions(),
    retry: false,
  });
  const saveShift = useMutation(
    trpc.resort.scheduling.save.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.scheduling.list.queryFilter(),
        );
        setForm(shift ? getShiftFormFromRow(shift) : getDefaultShiftForm());
        setOpen(false);
        toast.success(mode === "edit" ? "Shift updated." : "Shift assigned.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const activeStaff = (staffRecords.data ?? []).filter(
    (staff) => staff.status === "Active",
  );

  function updateForm(patch: Partial<ShiftFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleStaffChange(value: string) {
    if (value === "open") {
      updateForm({
        staffProfileId: "",
        status: "Open",
      });
      return;
    }

    const staff = activeStaff.find((item) => item.id === value);
    updateForm({
      department: staff?.departmentName ?? form.department,
      role: staff?.roleName ?? form.role,
      staffProfileId: value,
      status: "Assigned",
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveShift.mutate({
      department: form.department,
      endAt: new Date(form.endAt),
      id: mode === "edit" ? shift?.recordId : undefined,
      notes: form.notes,
      role: form.role,
      shift: form.shift,
      staffProfileId: form.staffProfileId,
      startAt: new Date(form.startAt),
      status: form.status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="xs">
            <Plus className="size-4" />
            Assign shift
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit shift" : "Assign shift"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update schedule assignment details."
                : "Create staff shift for weekly schedule and schedule table."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shift-name">Shift name</Label>
              <Input
                className="rounded-lg"
                id="shift-name"
                onChange={(event) => updateForm({ shift: event.target.value })}
                placeholder="Morning desk"
                required
                value={form.shift}
              />
            </div>
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select
                disabled={staffRecords.isPending}
                onValueChange={handleStaffChange}
                value={form.staffProfileId || "open"}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open shift</SelectItem>
                  {activeStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-role">Role</Label>
              <Input
                className="rounded-lg"
                id="shift-role"
                onChange={(event) => updateForm({ role: event.target.value })}
                placeholder="Receptionist"
                required
                value={form.role}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-department">Department</Label>
              <Input
                className="rounded-lg"
                id="shift-department"
                onChange={(event) =>
                  updateForm({ department: event.target.value })
                }
                placeholder="Front Office"
                value={form.department}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-start">Start</Label>
              <Input
                className="rounded-lg"
                id="shift-start"
                onChange={(event) =>
                  updateForm({ startAt: event.target.value })
                }
                required
                type="datetime-local"
                value={form.startAt}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">End</Label>
              <Input
                className="rounded-lg"
                id="shift-end"
                onChange={(event) => updateForm({ endAt: event.target.value })}
                required
                type="datetime-local"
                value={form.endAt}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                onValueChange={(value) =>
                  updateForm({ status: value as ShiftFormState["status"] })
                }
                value={form.status}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Changed">Changed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shift-notes">Notes (optional)</Label>
              <Textarea
                id="shift-notes"
                onChange={(event) => updateForm({ notes: event.target.value })}
                placeholder="Coverage notes, handoff details..."
                value={form.notes}
              />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={saveShift.isPending} type="submit">
              {saveShift.isPending ? "Saving..." : "Save shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewLeaveDialog({
  mode = "create",
  request,
  trigger,
}: {
  mode?: "create" | "edit";
  request?: LeaveRow;
  trigger?: ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeaveFormState>(() =>
    request ? getLeaveFormFromRow(request) : getDefaultLeaveForm(),
  );
  const staffRecords = useQuery({
    ...trpc.resort.staffRecords.list.queryOptions(),
    retry: false,
  });
  const saveLeave = useMutation(
    trpc.resort.leaveRequests.save.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.leaveRequests.list.queryFilter(),
        );
        setForm(request ? getLeaveFormFromRow(request) : getDefaultLeaveForm());
        setOpen(false);
        toast.success(mode === "edit" ? "Leave request updated." : "Leave request saved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const activeStaff = (staffRecords.data ?? []).filter(
    (staff) => staff.status === "Active",
  );

  function updateForm(patch: Partial<LeaveFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveLeave.mutate({
      balanceDays: Number(form.balanceDays || 0),
      endDate: new Date(form.endDate),
      id: mode === "edit" ? request?.recordId : undefined,
      reason: form.reason,
      staffProfileId: form.staffProfileId,
      startDate: new Date(form.startDate),
      type: form.type,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="xs">
            <Plus className="size-4" />
            New leave
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit leave request" : "New leave request"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update leave dates, reason, and current leave balance."
                : "Submit leave dates, reason, and current leave balance."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Staff</Label>
              <Select
                disabled={staffRecords.isPending}
                onValueChange={(value) => updateForm({ staffProfileId: value })}
                value={form.staffProfileId}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-type">Leave type</Label>
              <CreatableSelect
                createLabel={(value) => `Create leave type "${value}"`}
                onChange={(value) => updateForm({ type: value })}
                options={LEAVE_TYPE_OPTIONS}
                placeholder="Vacation leave"
                searchPlaceholder="Search or create leave type..."
                value={form.type}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-balance">Balance days</Label>
              <Input
                className="rounded-lg"
                id="leave-balance"
                min="0"
                onChange={(event) => updateForm({ balanceDays: event.target.value })}
                required
                type="number"
                value={form.balanceDays}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-start">Start date</Label>
              <Input
                className="rounded-lg"
                id="leave-start"
                onChange={(event) => updateForm({ startDate: event.target.value })}
                required
                type="date"
                value={form.startDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">End date</Label>
              <Input
                className="rounded-lg"
                id="leave-end"
                onChange={(event) => updateForm({ endDate: event.target.value })}
                required
                type="date"
                value={form.endDate}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea
                id="leave-reason"
                onChange={(event) => updateForm({ reason: event.target.value })}
                placeholder="Family event, medical appointment..."
                required
                value={form.reason}
              />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={saveLeave.isPending} type="submit">
              {saveLeave.isPending ? "Saving..." : "Save leave"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogOtUndertimeDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OtFormState>(() => getDefaultOtForm());
  const staffRecords = useQuery({
    ...trpc.resort.staffRecords.list.queryOptions(),
    retry: false,
  });
  const staffSession = useQuery({
    ...trpc.resort.timekeeping.me.queryOptions(),
    retry: false,
  });
  const saveEntry = useMutation(
    trpc.resort.otUndertime.save.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.otUndertime.list.queryFilter(),
        );
        setForm(getDefaultOtForm());
        setOpen(false);
        toast.success("OT/undertime logged.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const activeStaff = (staffRecords.data ?? []).filter(
    (staff) => staff.status === "Active",
  );
  const showStaffSelect = staffSession.data?.isStaff === false;

  function updateForm(patch: Partial<OtFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveEntry.mutate({
      hours: form.hours,
      payPeriod: form.payPeriod,
      reason: form.reason,
      staffProfileId: form.staffProfileId,
      type: form.type,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs">
          <Plus className="size-4" />
          Log hours
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log OT/undertime</DialogTitle>
            <DialogDescription>
              Track overtime or undertime hours against a pay period.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            {showStaffSelect ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Staff</Label>
                <Select
                  disabled={staffRecords.isPending}
                  onValueChange={(value) => updateForm({ staffProfileId: value })}
                  value={form.staffProfileId}
                >
                  <SelectTrigger className="w-full rounded-lg">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                onValueChange={(value) =>
                  updateForm({ type: value as OtFormState["type"] })
                }
                value={form.type}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Overtime">Overtime</SelectItem>
                  <SelectItem value="Undertime">Undertime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ot-hours">Hours</Label>
              <Input
                className="rounded-lg"
                id="ot-hours"
                min="0.1"
                onChange={(event) => updateForm({ hours: event.target.value })}
                required
                step="0.1"
                type="number"
                value={form.hours}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ot-pay-period">Pay period</Label>
              <Input
                className="rounded-lg"
                id="ot-pay-period"
                onChange={(event) => updateForm({ payPeriod: event.target.value })}
                placeholder="Jul 16 - Jul 31"
                required
                value={form.payPeriod}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ot-reason">Reason</Label>
              <Textarea
                id="ot-reason"
                onChange={(event) => updateForm({ reason: event.target.value })}
                placeholder="Late guest check-in, early checkout support..."
                required
                value={form.reason}
              />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={saveEntry.isPending} type="submit">
              {saveEntry.isPending ? "Saving..." : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TimekeepingHeaderAction() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const staffSession = useQuery({
    ...trpc.resort.timekeeping.me.queryOptions(),
    retry: false,
  });
  const clockIn = useMutation(
    trpc.resort.timekeeping.clockIn.mutationOptions({
      onSuccess: async () => {
        await invalidateTimekeeping(queryClient, trpc);
        toast.success("Clocked in.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const clockOut = useMutation(
    trpc.resort.timekeeping.clockOut.mutationOptions({
      onSuccess: async () => {
        await invalidateTimekeeping(queryClient, trpc);
        toast.success("Clocked out.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const todayLog = staffSession.data?.todayLog;
  const canClockIn = staffSession.data?.isStaff && !todayLog?.clockIn;
  const canClockOut =
    staffSession.data?.isStaff && !!todayLog?.clockIn && !todayLog?.clockOut;

  if (staffSession.isPending || !staffSession.data?.isStaff) {
    return null;
  }

  if (canClockOut) {
    return (
      <Button
        disabled={clockOut.isPending}
        onClick={() => clockOut.mutate()}
        size="xs"
        type="button"
      >
        <LogOut className="size-4" />
        Clock out
      </Button>
    );
  }

  return (
    <Button
      disabled={!canClockIn || clockIn.isPending}
      onClick={() => clockIn.mutate()}
      size="xs"
      type="button"
    >
      <LogIn className="size-4" />
      Clock in
    </Button>
  );
}

function StaffRecordsKpis() {
  const trpc = useTRPC();
  const staffRecords = useQuery({
    ...trpc.resort.staffRecords.list.queryOptions(),
    retry: false,
  });
  const rows = staffRecords.data ?? [];
  const activeCount = rows.filter((staff) => staff.status === "Active").length;
  const departmentsCount = new Set(
    rows.map((staff) => staff.departmentName).filter(Boolean),
  ).size;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newHiresCount = rows.filter(
    (staff) => new Date(staff.createdAt) >= monthStart,
  ).length;

  return (
    <KpiGrid
      columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
      items={[
        {
          title: "Active staff",
          value: String(activeCount),
          note: "Can be scheduled",
          icon: <Users className="size-4" />,
        },
        {
          title: "Invited",
          value: String(
            rows.filter((staff) => staff.status === "Invited").length,
          ),
          note: "Waiting for account setup",
          icon: <CalendarClock className="size-4" />,
        },
        {
          title: "Departments",
          value: String(departmentsCount),
          note: "With assigned staff",
          icon: <UserCheck className="size-4" />,
        },
        {
          title: "New hires",
          value: String(newHiresCount),
          note: "This month",
          icon: <Plus className="size-4" />,
        },
      ]}
    />
  );
}

function StaffRecordsTable() {
  const trpc = useTRPC();
  const staffRecords = useQuery({
    ...trpc.resort.staffRecords.list.queryOptions(),
    retry: false,
  });
  const tableData = useMemo<StaffRow[]>(() => {
    return (staffRecords.data ?? []).map((staff, index) => ({
      allowance: staff.allowance,
      basicSalary: staff.basicSalary,
      bonus: staff.bonus,
      commission: staff.commission,
      contact: staff.phoneNumber || staff.email || "--",
      department: staff.departmentName || "--",
      email: staff.email || "--",
      employmentType: staff.employmentType,
      governmentDeductions: staff.governmentDeductions,
      id: `STF-${String(index + 1).padStart(4, "0")}`,
      incentives: staff.incentives,
      leaveDeduction: staff.leaveDeduction,
      name: staff.displayName || staff.username || staff.email || "--",
      netPay: staff.netPay,
      otherDeductions: staff.otherDeductions,
      recordId: staff.id,
      role: staff.roleName || "--",
      startDate: formatDate(staff.startDate),
      status: staff.status,
      totalDeductions: staff.totalDeductions,
      totalEarnings: staff.totalEarnings,
      updatedAt: formatDate(staff.updatedAt),
      username: staff.username || "--",
      workLocation: staff.workLocation,
    }));
  }, [staffRecords.data]);
  const columns = useMemo<ColumnDef<StaffRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Staff",
        cell: ({ row }) => (
          <div className="min-w-56">
            <p className="font-bold text-zinc-950">{row.original.name}</p>
            <p className="text-xs text-zinc-500">{row.original.id}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {row.original.email}
            </p>
          </div>
        ),
      },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "department", header: "Department" },
      { accessorKey: "contact", header: "Contact" },
      { accessorKey: "startDate", header: "Start date" },
      { accessorKey: "updatedAt", header: "Updated" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <StaffRecordActions staff={row.original} />,
      },
    ],
    [],
  );

  if (staffRecords.isPending) {
    return <StaffRecordsTableSkeleton />;
  }

  return (
    <ReusableDataTable
      columnToggleIds={[
        "role",
        "department",
        "username",
        "contact",
        "employmentType",
        "workLocation",
        "basicSalary",
        "totalEarnings",
        "totalDeductions",
        "netPay",
        "startDate",
        "updatedAt",
        "status",
      ]}
      columns={columns}
      data={tableData}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Active", value: "Active" },
        { label: "Invited", value: "Invited" },
        { label: "Suspended", value: "Suspended" },
      ]}
      rowLabel="staff"
      searchPlaceholder="Search staff, username, role, department, or contact"
    />
  );
}

function StaffRecordActions({ staff }: { staff: StaffRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/resort/access/users-roles/${staff.recordId}`}>
            <Edit className="size-4" />
            Edit account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CalendarDays className="size-4" />
          View schedule
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Clock3 className="size-4" />
          Open time logs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StaffRecordsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex h-17 items-center gap-4 border-b border-zinc-200 px-5">
        <Skeleton className="h-5 w-18" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-8" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-8 gap-6 border-b border-zinc-100 px-5 py-4"
        >
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-10" />
        </div>
      ))}
    </div>
  );
}

function SchedulingView() {
  const trpc = useTRPC();
  const schedules = useQuery({
    ...trpc.resort.scheduling.list.queryOptions(),
    retry: false,
  });
  const tableData = useMemo<ShiftRow[]>(() => {
    return (schedules.data ?? []).map((shift, index) => ({
      department: shift.department || "--",
      endAt: shift.endAt,
      id: `SCH-${String(index + 1).padStart(4, "0")}`,
      name: shift.name,
      notes: shift.notes,
      recordId: shift.id,
      role: shift.role,
      shift: shift.shift,
      staffProfileId: shift.staffProfileId,
      startAt: shift.startAt,
      status: shift.status,
    }));
  }, [schedules.data]);
  const columns = useMemo<ColumnDef<ShiftRow>[]>(
    () => [
      {
        accessorKey: "shift",
        header: "Shift",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-bold text-zinc-950">{row.original.shift}</p>
            <p className="text-xs text-zinc-500">{row.original.id}</p>
          </div>
        ),
      },
      { accessorKey: "name", header: "Staff" },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "department", header: "Department" },
      {
        accessorKey: "startAt",
        header: "Start",
        cell: ({ row }) => formatDateTime(row.original.startAt),
      },
      {
        accessorKey: "endAt",
        header: "End",
        cell: ({ row }) => formatDateTime(row.original.endAt),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <SchedulingActions shift={row.original} />,
      },
    ],
    [],
  );

  if (schedules.isPending) {
    return <SchedulingTableSkeleton />;
  }

  return (
    <div className="space-y-4 px-4 pb-4">
      <WeeklySchedule shifts={tableData} />
      <ReusableDataTable
        columnToggleIds={[
          "name",
          "role",
          "department",
          "startAt",
          "endAt",
          "status",
        ]}
        columns={columns}
        data={tableData}
        filterOptions={[
          { label: "All", value: "all" },
          { label: "Assigned", value: "Assigned" },
          { label: "Open", value: "Open" },
          { label: "Changed", value: "Changed" },
        ]}
        rowLabel="shifts"
        searchPlaceholder="Search shift, staff, role, or department"
      />
    </div>
  );
}

function SchedulingKpis() {
  const trpc = useTRPC();
  const schedules = useQuery({
    ...trpc.resort.scheduling.list.queryOptions(),
    retry: false,
  });
  const rows = schedules.data ?? [];
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekRows = rows.filter((row) => {
    const startAt = new Date(row.startAt);
    return startAt >= weekStart && startAt < weekEnd;
  });
  const departmentsCount = new Set(
    weekRows.map((row) => row.department).filter(Boolean),
  ).size;

  return (
    <KpiGrid
      columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
      items={[
        {
          title: "Assigned shifts",
          value: String(
            weekRows.filter((row) => row.status === "Assigned").length,
          ),
          note: "This week",
          icon: <CalendarClock className="size-4" />,
        },
        {
          title: "Open shifts",
          value: String(weekRows.filter((row) => row.status === "Open").length),
          note: "Needs staff",
          icon: <Users className="size-4" />,
        },
        {
          title: "Changed",
          value: String(
            weekRows.filter((row) => row.status === "Changed").length,
          ),
          note: "Recent edits",
          icon: <FileText className="size-4" />,
        },
        {
          title: "Departments",
          value: String(departmentsCount),
          note: "With coverage",
          icon: <UserCheck className="size-4" />,
        },
      ]}
    />
  );
}

function SchedulingTableSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-44 rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
        <div className="flex h-17 items-center gap-4 border-b border-zinc-200 px-5">
          <Skeleton className="h-5 w-18" />
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-8" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-7 gap-6 border-b border-zinc-100 px-5 py-4"
          >
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimekeepingView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const staffSession = useQuery({
    ...trpc.resort.timekeeping.me.queryOptions(),
    retry: false,
  });
  const timeLogs = useQuery({
    ...trpc.resort.timekeeping.list.queryOptions(),
    retry: false,
  });
  const clockIn = useMutation(
    trpc.resort.timekeeping.clockIn.mutationOptions({
      onSuccess: async () => {
        await invalidateTimekeeping(queryClient, trpc);
        toast.success("Clocked in.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const clockOut = useMutation(
    trpc.resort.timekeeping.clockOut.mutationOptions({
      onSuccess: async () => {
        await invalidateTimekeeping(queryClient, trpc);
        toast.success("Clocked out.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const tableData = useMemo<TimeLogRow[]>(() => {
    return (timeLogs.data ?? []).map((timeLog, index) => ({
      clockIn: timeLog.clockIn,
      clockOut: timeLog.clockOut,
      date: timeLog.date,
      department: timeLog.department || "--",
      flag: timeLog.flag,
      hours: timeLog.hours,
      id: `TME-${String(index + 1).padStart(4, "0")}`,
      name: timeLog.name,
      role: timeLog.role,
    }));
  }, [timeLogs.data]);
  const todayLog = staffSession.data?.todayLog;
  const canClockIn = staffSession.data?.isStaff && !todayLog?.clockIn;
  const canClockOut =
    staffSession.data?.isStaff && !!todayLog?.clockIn && !todayLog?.clockOut;
  const columns = useMemo<ColumnDef<TimeLogRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Staff",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-bold text-zinc-950">{row.original.name}</p>
            <p className="text-xs text-zinc-500">{row.original.id}</p>
          </div>
        ),
      },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "department", header: "Department" },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "clockIn",
        header: "Clock in",
        cell: ({ row }) => formatTime(row.original.clockIn),
      },
      {
        accessorKey: "clockOut",
        header: "Clock out",
        cell: ({ row }) => formatTime(row.original.clockOut),
      },
      { accessorKey: "hours", header: "Hours" },
      {
        accessorKey: "flag",
        header: "Flag",
        cell: ({ row }) => <StatusBadge status={row.original.flag} />,
      },
      {
        id: "actions",
        header: "",
        cell: () => (
          <RowActions
            labels={["Edit time log", "Mark reviewed", "Flag absence"]}
          />
        ),
      },
    ],
    [],
  );

  if (timeLogs.isPending || staffSession.isPending) {
    return <TimekeepingTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {staffSession.data?.isStaff ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            className="h-auto justify-start gap-3 rounded-xl border-zinc-200 bg-white p-4 text-left text-zinc-950 shadow-xs hover:bg-zinc-50"
            disabled={!canClockIn || clockIn.isPending}
            onClick={() => clockIn.mutate()}
            type="button"
            variant="outline"
          >
            <LogIn className="size-4 text-zinc-500" />
            <span>
              <span className="block text-sm font-bold">Clock in</span>
              <span className="block text-xs text-zinc-500">
                {todayLog?.clockIn
                  ? `In at ${formatTime(todayLog.clockIn)}`
                  : "Start today's shift"}
              </span>
            </span>
          </Button>
          <Button
            className="h-auto justify-start gap-3 rounded-xl border-zinc-200 bg-white p-4 text-left text-zinc-950 shadow-xs hover:bg-zinc-50"
            disabled={!canClockOut || clockOut.isPending}
            onClick={() => clockOut.mutate()}
            type="button"
            variant="outline"
          >
            <LogOut className="size-4 text-zinc-500" />
            <span>
              <span className="block text-sm font-bold">Clock out</span>
              <span className="block text-xs text-zinc-500">
                {todayLog?.clockOut
                  ? `Out at ${formatTime(todayLog.clockOut)}`
                  : "End today's shift"}
              </span>
            </span>
          </Button>
        </div>
      ) : null}
      <ReusableDataTable
        columnToggleIds={[
          "role",
          "department",
          "date",
          "clockIn",
          "clockOut",
          "hours",
          "flag",
        ]}
        columns={columns}
        data={tableData}
        filterOptions={[
          { label: "All", value: "all" },
          { label: "On time", value: "On time" },
          { label: "Late", value: "Late" },
          { label: "Absent", value: "Absent" },
        ]}
        rowLabel="time logs"
        searchPlaceholder="Search staff, role, department, flag, or date"
      />
    </div>
  );
}

function TimekeepingKpis() {
  const trpc = useTRPC();
  const timeLogs = useQuery({
    ...trpc.resort.timekeeping.list.queryOptions(),
    retry: false,
  });
  const rows = timeLogs.data ?? [];
  const today = getDateKey(new Date());
  const todayRows = rows.filter((row) => getDateKey(row.date) === today);
  const clockedInCount = todayRows.filter(
    (row) => row.clockIn && !row.clockOut,
  ).length;
  const lateCount = todayRows.filter((row) => row.flag === "Late").length;
  const absentCount = todayRows.filter((row) => row.flag === "Absent").length;
  const hoursLogged = todayRows.reduce((total, row) => {
    const hours = Number.parseFloat(row.hours);
    return Number.isFinite(hours) ? total + hours : total;
  }, 0);

  return (
    <KpiGrid
      columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
      items={[
        {
          title: "Clocked in",
          value: String(clockedInCount),
          note: "Currently on shift",
          icon: <Clock3 className="size-4" />,
        },
        {
          title: "Late",
          value: String(lateCount),
          note: "Today",
          icon: <Timer className="size-4" />,
        },
        {
          title: "Absent",
          value: String(absentCount),
          note: "Today",
          icon: <FileText className="size-4" />,
        },
        {
          title: "Hours logged",
          value: hoursLogged.toFixed(1),
          note: "Today total",
          icon: <CheckCircle2 className="size-4" />,
        },
      ]}
    />
  );
}

function TimekeepingTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex h-17 items-center gap-4 border-b border-zinc-200 px-5">
        <Skeleton className="h-5 w-18" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-8" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-8 gap-6 border-b border-zinc-100 px-5 py-4"
        >
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-18" />
          <Skeleton className="h-5 w-18" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

function LeaveRequestsTable() {
  const trpc = useTRPC();
  const leaveRequests = useQuery({
    ...trpc.resort.leaveRequests.list.queryOptions(),
    retry: false,
  });
  const tableData = useMemo<LeaveRow[]>(() => {
    return (leaveRequests.data ?? []).map((request, index) => ({
      balance: request.balance,
      balanceDays: request.balanceDays,
      endDate: request.endDate,
      id: `LEV-${String(index + 1).padStart(4, "0")}`,
      name: request.name,
      recordId: request.id,
      reason: request.reason,
      staffProfileId: request.staffProfileId,
      startDate: request.startDate,
      status: request.status,
      type: request.type,
    }));
  }, [leaveRequests.data]);
  const columns = useMemo<ColumnDef<LeaveRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Staff",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-bold text-zinc-950">{row.original.name}</p>
            <p className="text-xs text-zinc-500">{row.original.id}</p>
          </div>
        ),
      },
      { accessorKey: "type", header: "Type" },
      {
        id: "dates",
        header: "Dates",
        cell: ({ row }) =>
          formatDateRange(row.original.startDate, row.original.endDate),
      },
      { accessorKey: "reason", header: "Reason" },
      { accessorKey: "balance", header: "Balance" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <LeaveRequestActions request={row.original} />,
      },
    ],
    [],
  );

  if (leaveRequests.isPending) {
    return <LeaveRequestsTableSkeleton />;
  }

  return (
    <ReusableDataTable
      columnToggleIds={["type", "dates", "reason", "balance", "status"]}
      columns={columns}
      data={tableData}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Pending", value: "Pending" },
        { label: "Approved", value: "Approved" },
        { label: "Rejected", value: "Rejected" },
      ]}
      rowLabel="leave requests"
      searchPlaceholder="Search staff, leave type, dates, or reason"
    />
  );
}

function LeaveRequestsKpis() {
  const trpc = useTRPC();
  const leaveRequests = useQuery({
    ...trpc.resort.leaveRequests.list.queryOptions(),
    retry: false,
  });
  const rows = leaveRequests.data ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRows = rows.filter((row) => new Date(row.createdAt) >= monthStart);
  const avgBalance =
    rows.length > 0
      ? Math.round(
          rows.reduce((total, row) => total + row.balanceDays, 0) / rows.length,
        )
      : 0;

  return (
    <KpiGrid
      columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
      items={[
        {
          title: "Pending",
          value: String(rows.filter((row) => row.status === "Pending").length),
          note: "Needs approval",
          icon: <FileText className="size-4" />,
        },
        {
          title: "Approved",
          value: String(
            monthRows.filter((row) => row.status === "Approved").length,
          ),
          note: "This month",
          icon: <CheckCircle2 className="size-4" />,
        },
        {
          title: "Rejected",
          value: String(
            monthRows.filter((row) => row.status === "Rejected").length,
          ),
          note: "This month",
          icon: <FileText className="size-4" />,
        },
        {
          title: "Avg balance",
          value: String(avgBalance),
          note: "Days available",
          icon: <CalendarClock className="size-4" />,
        },
      ]}
    />
  );
}

function LeaveRequestActions({ request }: { request: LeaveRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateStatus = useMutation(
    trpc.resort.leaveRequests.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.leaveRequests.list.queryFilter(),
        );
        toast.success("Leave request updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteRequest = useMutation(
    trpc.resort.leaveRequests.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.leaveRequests.list.queryFilter(),
        );
        setDeleteOpen(false);
        toast.success("Leave request deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <NewLeaveDialog
            mode="edit"
            request={request}
            trigger={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                <Edit className="size-4" />
                Edit details
              </DropdownMenuItem>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: request.recordId, status: "Approved" })
            }
          >
            <CheckCircle2 className="size-4" />
            Approve request
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: request.recordId, status: "Rejected" })
            }
          >
            <XCircle className="size-4" />
            Reject request
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete request
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {request.type} for {request.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteRequest.isPending}
              onClick={() => deleteRequest.mutate({ id: request.recordId })}
              variant="destructive"
            >
              {deleteRequest.isPending ? "Deleting..." : "Delete request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LeaveRequestsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex h-17 items-center gap-4 border-b border-zinc-200 px-5">
        <Skeleton className="h-5 w-18" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-8" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-7 gap-6 border-b border-zinc-100 px-5 py-4"
        >
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

function OtUndertimeTable() {
  const trpc = useTRPC();
  const entries = useQuery({
    ...trpc.resort.otUndertime.list.queryOptions(),
    retry: false,
  });
  const tableData = useMemo<OtRow[]>(() => {
    return (entries.data ?? []).map((entry, index) => ({
      hours: entry.hours,
      id: `OTU-${String(index + 1).padStart(4, "0")}`,
      name: entry.name,
      payPeriod: entry.payPeriod,
      recordId: entry.id,
      reason: entry.reason,
      staffProfileId: entry.staffProfileId,
      status: entry.status,
      type: entry.type,
    }));
  }, [entries.data]);
  const columns = useMemo<ColumnDef<OtRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Staff",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-bold text-zinc-950">{row.original.name}</p>
            <p className="text-xs text-zinc-500">{row.original.id}</p>
          </div>
        ),
      },
      { accessorKey: "type", header: "Type" },
      { accessorKey: "hours", header: "Hours" },
      { accessorKey: "payPeriod", header: "Pay period" },
      { accessorKey: "reason", header: "Reason" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <OtUndertimeActions entry={row.original} />,
      },
    ],
    [],
  );

  if (entries.isPending) {
    return <OtUndertimeTableSkeleton />;
  }

  return (
    <ReusableDataTable
      columnToggleIds={["type", "hours", "payPeriod", "reason", "status"]}
      columns={columns}
      data={tableData}
      filterOptions={[
        { label: "All", value: "all" },
        { label: "Pending", value: "Pending" },
        { label: "Approved", value: "Approved" },
        { label: "Rejected", value: "Rejected" },
      ]}
      rowLabel="OT/undertime rows"
      searchPlaceholder="Search staff, type, pay period, or reason"
    />
  );
}

function OtUndertimeKpis() {
  const trpc = useTRPC();
  const entries = useQuery({
    ...trpc.resort.otUndertime.list.queryOptions(),
    retry: false,
  });
  const rows = entries.data ?? [];
  const pendingCount = rows.filter((row) => row.status === "Pending").length;
  const overtimeHours = sumHours(rows.filter((row) => row.type === "Overtime"));
  const undertimeHours = sumHours(rows.filter((row) => row.type === "Undertime"));
  const approvedCount = rows.filter((row) => row.status === "Approved").length;

  return (
    <KpiGrid
      columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
      items={[
        { title: "Pending", value: String(pendingCount), note: "Needs approval", icon: <Timer className="size-4" /> },
        { title: "Overtime", value: overtimeHours.toFixed(1), note: "Hours this period", icon: <Clock3 className="size-4" /> },
        { title: "Undertime", value: undertimeHours.toFixed(1), note: "Hours this period", icon: <FileText className="size-4" /> },
        { title: "Approved", value: String(approvedCount), note: "This pay period", icon: <CheckCircle2 className="size-4" /> },
      ]}
    />
  );
}

function OtUndertimeActions({ entry }: { entry: OtRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updateStatus = useMutation(
    trpc.resort.otUndertime.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.otUndertime.list.queryFilter(),
        );
        toast.success("OT/undertime updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteEntry = useMutation(
    trpc.resort.otUndertime.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.otUndertime.list.queryFilter(),
        );
        setDeleteOpen(false);
        toast.success("OT/undertime deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: entry.recordId, status: "Approved" })
            }
          >
            <CheckCircle2 className="size-4" />
            Approve entry
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={updateStatus.isPending}
            onClick={() =>
              updateStatus.mutate({ id: entry.recordId, status: "Rejected" })
            }
          >
            <XCircle className="size-4" />
            Reject entry
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete entry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OT/undertime entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {entry.hours} hours of {entry.type.toLowerCase()} for {entry.name}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteEntry.isPending}
              onClick={() => deleteEntry.mutate({ id: entry.recordId })}
              variant="destructive"
            >
              {deleteEntry.isPending ? "Deleting..." : "Delete entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function OtUndertimeTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex h-17 items-center gap-4 border-b border-zinc-200 px-5">
        <Skeleton className="h-5 w-18" />
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-8" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-7 gap-6 border-b border-zinc-100 px-5 py-4"
        >
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

function WeeklySchedule({ shifts }: { shifts: ShiftRow[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekStart = getWeekStart(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-bold text-zinc-950">Weekly view</h2>
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
      <div className="grid min-w-190 grid-cols-7 divide-x divide-zinc-200">
        {days.map((day, index) => (
          <div key={day} className="min-h-36 p-3">
            <p className="text-xs font-bold text-zinc-500">{day}</p>
            <div className="mt-3 space-y-2">
              {shifts
                .filter((shift) => {
                  const shiftDate = new Date(shift.startAt);
                  const dayDate = new Date(weekStart);
                  dayDate.setDate(weekStart.getDate() + index);

                  return getDateKey(shiftDate) === getDateKey(dayDate);
                })
                .slice(0, 3)
                .map((shift) => (
                  <div
                    key={`${day}-${shift.id}`}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-2"
                  >
                    <p className="truncate text-xs font-bold text-zinc-950">
                      {shift.shift}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {formatTime(shift.startAt)} - {formatTime(shift.endAt)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function RowActions({ labels }: { labels: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {labels.map((label, index) => (
          <div key={label}>
            {index === labels.length - 1 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem>{label}</DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SchedulingActions({ shift }: { shift: ShiftRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const duplicateShift = useMutation(
    trpc.resort.scheduling.save.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.scheduling.list.queryFilter(),
        );
        toast.success("Shift duplicated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteShift = useMutation(
    trpc.resort.scheduling.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.scheduling.list.queryFilter(),
        );
        setDeleteOpen(false);
        toast.success("Shift removed.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleDuplicate() {
    duplicateShift.mutate({
      department: shift.department === "--" ? "" : shift.department,
      endAt: new Date(shift.endAt),
      notes: shift.notes,
      role: shift.role,
      shift: `${shift.shift} copy`,
      staffProfileId: shift.staffProfileId,
      startAt: new Date(shift.startAt),
      status: shift.status as ShiftFormState["status"],
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <AssignShiftDialog
            mode="edit"
            shift={shift}
            trigger={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                <Edit className="size-4" />
                Edit assignment
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem
            disabled={duplicateShift.isPending}
            onClick={handleDuplicate}
          >
            <Copy className="size-4" />
            Duplicate shift
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Remove shift
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {shift.shift} from the schedule. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteShift.isPending}
              onClick={() => deleteShift.mutate({ id: shift.recordId })}
            >
              {deleteShift.isPending ? "Removing..." : "Remove shift"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = getStatusTone(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md",
        tone === "dark" && "border-black bg-black text-white",
        tone === "light" && "border-zinc-200 bg-zinc-100 text-zinc-900",
        tone === "outline" && "border-zinc-300 bg-white text-zinc-700",
      )}
    >
      {status}
    </Badge>
  );
}

function getKpis(module: HrModule): KpiGridItem[] {
  if (module === "scheduling") {
    return [
      {
        title: "Assigned shifts",
        value: "12",
        note: "This week",
        icon: <CalendarClock className="size-4" />,
      },
      {
        title: "Open shifts",
        value: "1",
        note: "Needs staff",
        icon: <Users className="size-4" />,
      },
      {
        title: "Changed",
        value: "2",
        note: "Recent edits",
        icon: <FileText className="size-4" />,
      },
      {
        title: "Departments",
        value: "4",
        note: "With coverage",
        icon: <UserCheck className="size-4" />,
      },
    ];
  }

  if (module === "timekeeping") {
    return [
      {
        title: "Clocked in",
        value: "8",
        note: "Currently on shift",
        icon: <Clock3 className="size-4" />,
      },
      {
        title: "Late",
        value: "1",
        note: "Today",
        icon: <Timer className="size-4" />,
      },
      {
        title: "Absent",
        value: "1",
        note: "Today",
        icon: <FileText className="size-4" />,
      },
      {
        title: "Hours logged",
        value: "64",
        note: "Today total",
        icon: <CheckCircle2 className="size-4" />,
      },
    ];
  }

  if (module === "leave-requests") {
    return [
      {
        title: "Pending",
        value: "1",
        note: "Needs approval",
        icon: <FileText className="size-4" />,
      },
      {
        title: "Approved",
        value: "1",
        note: "This month",
        icon: <CheckCircle2 className="size-4" />,
      },
      {
        title: "Rejected",
        value: "0",
        note: "This month",
        icon: <FileText className="size-4" />,
      },
      {
        title: "Avg balance",
        value: "6",
        note: "Days available",
        icon: <CalendarClock className="size-4" />,
      },
    ];
  }

  if (module === "ot-undertime") {
    return [
      {
        title: "Pending",
        value: "1",
        note: "Needs approval",
        icon: <Timer className="size-4" />,
      },
      {
        title: "Overtime",
        value: "2.0",
        note: "Hours this period",
        icon: <Clock3 className="size-4" />,
      },
      {
        title: "Undertime",
        value: "1.5",
        note: "Hours this period",
        icon: <FileText className="size-4" />,
      },
      {
        title: "Approved",
        value: "1",
        note: "This pay period",
        icon: <CheckCircle2 className="size-4" />,
      },
    ];
  }

  return [
    {
      title: "Active staff",
      value: "12",
      note: "Can be scheduled",
      icon: <Users className="size-4" />,
    },
    {
      title: "On leave",
      value: "1",
      note: "Approved leave",
      icon: <CalendarClock className="size-4" />,
    },
    {
      title: "Departments",
      value: "6",
      note: "With assigned staff",
      icon: <UserCheck className="size-4" />,
    },
    {
      title: "New hires",
      value: "2",
      note: "This month",
      icon: <Plus className="size-4" />,
    },
  ];
}

function getStatusTone(status: string) {
  if (
    ["Active", "Approved", "Assigned", "Matched", "On time"].includes(status)
  ) {
    return "light";
  }

  if (["Pending", "Late", "Open", "Changed"].includes(status)) {
    return "dark";
  }

  return "outline";
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: Date | string | null) {
  if (!value) return "--";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: Date | string) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

function formatDateRange(startDate: Date | string, endDate: Date | string) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return start === end ? start : `${start} - ${end}`;
}

function getDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function getWeekStart(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDefaultShiftForm(): ShiftFormState {
  const startAt = new Date();
  startAt.setHours(8, 0, 0, 0);
  const endAt = new Date(startAt);
  endAt.setHours(16, 0, 0, 0);

  return {
    department: "",
    endAt: toDateTimeLocalValue(endAt),
    notes: "",
    role: "",
    shift: "",
    staffProfileId: "",
    startAt: toDateTimeLocalValue(startAt),
    status: "Open",
  };
}

function getDefaultLeaveForm(): LeaveFormState {
  const today = new Date();

  return {
    balanceDays: "0",
    endDate: toDateInputValue(today),
    reason: "",
    staffProfileId: "",
    startDate: toDateInputValue(today),
    type: "",
  };
}

function getLeaveFormFromRow(request: LeaveRow): LeaveFormState {
  return {
    balanceDays: String(request.balanceDays),
    endDate: toDateInputValue(new Date(request.endDate)),
    reason: request.reason,
    staffProfileId: request.staffProfileId,
    startDate: toDateInputValue(new Date(request.startDate)),
    type: request.type,
  };
}

function getDefaultOtForm(): OtFormState {
  return {
    hours: "1.0",
    payPeriod: getDefaultPayPeriod(),
    reason: "",
    staffProfileId: "",
    type: "Overtime",
  };
}

function getDefaultPayPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() <= 15 ? 1 : 16);
  const end = new Date(now.getFullYear(), now.getMonth() + (now.getDate() <= 15 ? 0 : 1), now.getDate() <= 15 ? 15 : 0);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function getShiftFormFromRow(shift: ShiftRow): ShiftFormState {
  return {
    department: shift.department === "--" ? "" : shift.department,
    endAt: toDateTimeLocalValue(new Date(shift.endAt)),
    notes: shift.notes,
    role: shift.role,
    shift: shift.shift,
    staffProfileId: shift.staffProfileId,
    startAt: toDateTimeLocalValue(new Date(shift.startAt)),
    status: shift.status as ShiftFormState["status"],
  };
}

function toDateTimeLocalValue(value: Date) {
  const offsetDate = new Date(
    value.getTime() - value.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
}

function toDateInputValue(value: Date) {
  const offsetDate = new Date(
    value.getTime() - value.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 10);
}

function sumHours(rows: Array<{ hours: string }>) {
  return rows.reduce((total, row) => {
    const hours = Number.parseFloat(row.hours);
    return Number.isFinite(hours) ? total + hours : total;
  }, 0);
}

async function invalidateTimekeeping(
  queryClient: QueryClient,
  trpc: ReturnType<typeof useTRPC>,
) {
  await Promise.all([
    queryClient.invalidateQueries(trpc.resort.timekeeping.list.queryFilter()),
    queryClient.invalidateQueries(trpc.resort.timekeeping.me.queryFilter()),
  ]);
}
