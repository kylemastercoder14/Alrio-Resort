"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, CircleHelp, Search } from "lucide-react";
import toast from "react-hot-toast";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";
import { type DepartmentStatus } from "./data";

type DepartmentFormProps = {
  departmentId: string;
};

type DepartmentFormValues = {
  code: string;
  description: string;
  email: string;
  headStaffProfileId: string;
  name: string;
  notes: string;
  routing: string;
  staffProfileIds: string[];
  status: DepartmentStatus;
};

type StaffOption = {
  departmentName: string;
  email: string;
  id: string;
  name: string;
  roleName: string;
};

export function DepartmentForm({ departmentId }: DepartmentFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCreate = departmentId === "create";
  const department = useQuery({
    ...trpc.resort.departments.get.queryOptions({ id: departmentId }),
    enabled: !isCreate,
    retry: false,
  });
  const staffUsers = useQuery({
    ...trpc.resort.usersRoles.list.queryOptions(),
    retry: false,
  });
  const saveDepartment = useMutation(
    trpc.resort.departments.save.mutationOptions({
      onSuccess: async (savedDepartment) => {
        await queryClient.invalidateQueries(
          trpc.resort.departments.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.departments.get.queryFilter({ id: savedDepartment.id }),
        );
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
        toast.success("Department saved.");
        router.push("/resort/access/departments");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const staffOptions = useMemo<StaffOption[]>(
    () =>
      (staffUsers.data ?? [])
        .filter((staff) => staff.recordType === "staff")
        .map((staff) => ({
          departmentName: staff.departmentName,
          email: staff.email,
          id: staff.id,
          name: staff.displayName,
          roleName: staff.roleName,
        })),
    [staffUsers.data],
  );

  if (!isCreate && department.isPending) {
    return <DepartmentFormSkeleton />;
  }

  if (!isCreate && department.isError) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Department not found.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/access/departments">Back to departments</Link>
        </Button>
      </div>
    );
  }

  const initialValues: DepartmentFormValues = department.data
    ? {
        code: department.data.code,
        description: department.data.description,
        email: department.data.email,
        headStaffProfileId: department.data.headStaffProfileId,
        name: department.data.name,
        notes: department.data.notes,
        routing: department.data.routing,
        staffProfileIds: department.data.staffProfileIds,
        status: department.data.status as DepartmentStatus,
      }
    : {
        code: "",
        description: "",
        email: "",
        headStaffProfileId: "",
        name: "",
        notes: "",
        routing: "",
        staffProfileIds: [],
        status: "Active",
      };

  return (
    <DepartmentEditor
      key={department.data?.id ?? "create"}
      initialValues={initialValues}
      isSaving={saveDepartment.isPending}
      mode={isCreate ? "create" : "update"}
      staffOptions={staffOptions}
      onSubmit={(values) =>
        saveDepartment.mutate({
          id: isCreate ? undefined : departmentId,
          code: values.code,
          description: values.description,
          email: values.email,
          headStaffProfileId: values.headStaffProfileId,
          name: values.name,
          notes: values.notes,
          routing: values.routing,
          staffProfileIds: values.staffProfileIds,
          status: values.status,
        })
      }
    />
  );
}

function DepartmentEditor({
  initialValues,
  isSaving,
  mode,
  onSubmit,
  staffOptions,
}: {
  initialValues: DepartmentFormValues;
  isSaving: boolean;
  mode: "create" | "update";
  onSubmit: (values: DepartmentFormValues) => void;
  staffOptions: StaffOption[];
}) {
  const [name, setName] = useState(initialValues.name);
  const [code, setCode] = useState(initialValues.code);
  const [description, setDescription] = useState(initialValues.description);
  const [email, setEmail] = useState(initialValues.email);
  const [status, setStatus] = useState<DepartmentStatus>(initialValues.status);
  const [notes, setNotes] = useState(initialValues.notes);
  const [routing, setRouting] = useState(initialValues.routing);
  const [staffProfileIds, setStaffProfileIds] = useState(
    initialValues.staffProfileIds,
  );
  const [headStaffProfileId, setHeadStaffProfileId] = useState(
    initialValues.headStaffProfileId,
  );
  const selectedHead = staffOptions.find(
    (staff) => staff.id === headStaffProfileId,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      code,
      description,
      email,
      headStaffProfileId,
      name,
      notes,
      routing,
      staffProfileIds,
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/access/departments">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <DepartmentOverviewCard
            code={code}
            description={description}
            email={email}
            name={name}
            status={status}
            onCodeChange={setCode}
            onDescriptionChange={setDescription}
            onEmailChange={setEmail}
            onNameChange={setName}
            onStatusChange={setStatus}
          />
          <StaffGroupCard
            headName={selectedHead?.name ?? ""}
            mode={mode}
            selectedIds={staffProfileIds}
            staffOptions={staffOptions}
            headStaffProfileId={headStaffProfileId}
            onHeadChange={setHeadStaffProfileId}
            onSelectedIdsChange={setStaffProfileIds}
          />
        </div>
        <div className="space-y-5">
          <DepartmentNotesCard value={notes} onChange={setNotes} />
          <DepartmentRulesCard value={routing} onChange={setRouting} />
        </div>
      </div>
    </form>
  );
}

function DepartmentOverviewCard({
  code,
  description,
  email,
  name,
  onCodeChange,
  onDescriptionChange,
  onEmailChange,
  onNameChange,
  onStatusChange,
  status,
}: {
  code: string;
  description: string;
  email: string;
  name: string;
  onCodeChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onStatusChange: (value: DepartmentStatus) => void;
  status: DepartmentStatus;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">
          Department overview
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Configure department identity, status, and staff grouping.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Department name">
          <Input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Front Office"
            className="rounded-lg"
            required
          />
        </Field>
        <Field label="Department code">
          <Input
            value={code}
            onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
            placeholder="FO"
            className="rounded-lg uppercase"
            required
          />
        </Field>
      </div>

      <Field label="Description" optional>
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Short purpose and responsibility summary."
          className="min-h-24 rounded-lg"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Status">
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as DepartmentStatus)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Paused">Paused</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Department email" optional>
          <Input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="team@company.com"
            className="rounded-lg"
            type="email"
          />
        </Field>
      </div>

      <div className="-mx-5 -mb-5 border-t bg-zinc-50 px-5 py-4 text-xs font-medium text-zinc-500">
        Departments group resort staff. Roles still control access and permissions.
      </div>
    </Card>
  );
}

function StaffGroupCard({
  headName,
  headStaffProfileId,
  mode,
  onHeadChange,
  onSelectedIdsChange,
  selectedIds,
  staffOptions,
}: {
  headName: string;
  headStaffProfileId: string;
  mode: "create" | "update";
  onHeadChange: (value: string) => void;
  onSelectedIdsChange: (value: string[]) => void;
  selectedIds: string[];
  staffOptions: StaffOption[];
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">
          Default staff group
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Assign resort staff and choose one department head.
        </p>
      </div>

      <StaffGroupSheet
        headStaffProfileId={headStaffProfileId}
        onHeadChange={onHeadChange}
        onSelectedIdsChange={onSelectedIdsChange}
        selectedIds={selectedIds}
        staffOptions={staffOptions}
      >
        <button
          type="button"
          className="flex h-16 items-center justify-between rounded-lg border border-zinc-200 px-4 text-left hover:bg-zinc-50"
        >
          <span>
            <span className="block text-sm font-bold text-zinc-900">
              Staff group
            </span>
            <span className="text-xs text-zinc-500">
              {selectedIds.length
                ? `${selectedIds.length} staff assigned`
                : mode === "create"
                  ? "No staff assigned yet"
                  : "No staff assigned"}
              {headName ? `, head: ${headName}` : ""}
            </span>
          </span>
          <ChevronRight className="size-4 text-zinc-500" />
        </button>
      </StaffGroupSheet>
    </Card>
  );
}

function StaffGroupSheet({
  children,
  headStaffProfileId,
  onHeadChange,
  onSelectedIdsChange,
  selectedIds,
  staffOptions,
}: {
  children: React.ReactNode;
  headStaffProfileId: string;
  onHeadChange: (value: string) => void;
  onSelectedIdsChange: (value: string[]) => void;
  selectedIds: string[];
  staffOptions: StaffOption[];
}) {
  const [search, setSearch] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredStaff = staffOptions.filter((staff) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [staff.name, staff.email, staff.roleName, staff.departmentName]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  function toggleStaff(staffId: string, checked: boolean) {
    const nextIds = checked
      ? Array.from(new Set([...selectedIds, staffId]))
      : selectedIds.filter((id) => id !== staffId);

    onSelectedIdsChange(nextIds);

    if (!checked && headStaffProfileId === staffId) {
      onHeadChange("");
    }
  }

  function markHead(staffId: string) {
    if (!selectedSet.has(staffId)) {
      onSelectedIdsChange(Array.from(new Set([...selectedIds, staffId])));
    }

    onHeadChange(headStaffProfileId === staffId ? "" : staffId);
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 max-w-lg!">
        <SheetHeader className="border-b border-zinc-200 p-5">
          <SheetTitle className="text-lg font-bold">Default staff group</SheetTitle>
          <SheetDescription>
            Assign resort staff to this department and mark one as head.
          </SheetDescription>
        </SheetHeader>
        <div className="border-b border-zinc-200 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff..."
              className="rounded-lg pl-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-2">
            {filteredStaff.map((staff) => {
              const checked = selectedSet.has(staff.id);
              const isHead = headStaffProfileId === staff.id;

              return (
                <div
                  key={staff.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleStaff(staff.id, Boolean(value))
                    }
                    aria-label={`Assign ${staff.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {staff.name}
                      </p>
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      {staff.roleName}
                      {staff.email ? ` - ${staff.email}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant={isHead ? "default" : "outline"}
                    onClick={() => markHead(staff.id)}
                  >
                    {isHead ? "Head" : "Mark head"}
                  </Button>
                </div>
              );
            })}
            {!filteredStaff.length ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                No staff found.
              </div>
            ) : null}
          </div>
        </div>
        <SheetFooter className="border-t border-zinc-200 p-5">
          <p className="text-xs text-zinc-500">
            {selectedIds.length} selected
            {headStaffProfileId ? " with department head set" : ""}
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DepartmentNotesCard({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-[#303030]">Notes</h2>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Private operational notes for this department."
        className="min-h-24 rounded-lg"
      />
    </Card>
  );
}

function DepartmentRulesCard({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-center gap-1.5">
        <h2 className="text-base font-bold text-[#303030]">Routing</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="About department routing"
                className="inline-flex size-6 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <CircleHelp className="size-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-64 text-pretty">
              Identifies the default task queue or escalation tag used when work
              is routed to this department.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Default task queue or escalation tag"
        className="rounded-lg"
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
          <span className="ml-1 font-normal text-zinc-500">(optional)</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function DepartmentFormSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
