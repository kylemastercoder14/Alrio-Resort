"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import {
  PhoneNumberInput,
  normalizePhilippinePhone,
} from "@/components/reusable/phone-number-input";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import {
  PERMISSION_MODULES,
  type PermissionGroup,
  type PermissionModule,
  type UserRoleStatus,
} from "./data";

type UserRoleFormProps = {
  userRoleId: string;
};

type UserRoleFormValues = {
  accessRoleId: string;
  allowance: string;
  basicSalary: string;
  bonus: string;
  commission: string;
  email: string;
  departmentId: string;
  employmentType: string;
  firstName: string;
  incentives: string;
  lastName: string;
  leaveDeduction: string;
  notes: string;
  otherDeductions: string;
  password: string;
  pagIbigContribution: string;
  philHealthContribution: string;
  phone: string;
  roleName: string;
  sssContribution: string;
  status: UserRoleStatus;
  tags: string;
  username: string;
  withholdingTax: string;
  workLocation: string;
};

const PASSWORD_LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_NUMBERS = "23456789";
const PASSWORD_SYMBOLS = "!@#$%&*?";

export function UserRoleForm({ userRoleId }: UserRoleFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const mode = userRoleId === "create" ? "create" : "update";
  const isCreate = mode === "create";
  const staffUser = useQuery({
    ...trpc.resort.usersRoles.get.queryOptions({ id: userRoleId }),
    enabled: !isCreate,
    retry: false,
  });
  const accessRoles = useQuery({
    ...trpc.resort.accessRoles.list.queryOptions(),
    retry: false,
  });
  const saveStaffUser = useMutation(
    trpc.resort.usersRoles.save.mutationOptions({
      onSuccess: async (savedUser) => {
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.list.queryFilter(),
        );
        await queryClient.invalidateQueries(
          trpc.resort.usersRoles.get.queryFilter({ id: savedUser.id }),
        );
        toast.success("Staff user saved.");
        router.push("/resort/access/users/");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  if (!isCreate && staffUser.isPending) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
        Loading staff user...
      </div>
    );
  }

  if (!isCreate && staffUser.isError) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Staff user not found.</p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/resort/access/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  const initialValues: UserRoleFormValues = staffUser.data
    ? {
        allowance: String(staffUser.data.allowance ?? 0),
        accessRoleId: staffUser.data.accessRoleId,
        basicSalary: String(staffUser.data.basicSalary ?? 0),
        bonus: String(staffUser.data.bonus ?? 0),
        commission: String(staffUser.data.commission ?? 0),
        email: staffUser.data.email,
        departmentId: staffUser.data.departmentId,
        employmentType: staffUser.data.employmentType ?? "Regular",
        firstName: staffUser.data.firstName,
        incentives: String(staffUser.data.incentives ?? 0),
        lastName: staffUser.data.lastName,
        leaveDeduction: String(staffUser.data.leaveDeduction ?? 0),
        notes: staffUser.data.notes,
        otherDeductions: String(staffUser.data.otherDeductions ?? 0),
        password: "",
        pagIbigContribution: String(staffUser.data.pagIbigContribution ?? 0),
        philHealthContribution: String(staffUser.data.philHealthContribution ?? 0),
        phone: normalizePhilippinePhone(staffUser.data.phoneNumber),
        roleName: staffUser.data.roleName,
        sssContribution: String(staffUser.data.sssContribution ?? 0),
        status: staffUser.data.status as UserRoleStatus,
        tags: staffUser.data.tags.join(", "),
        username: staffUser.data.username,
        withholdingTax: String(staffUser.data.withholdingTax ?? 0),
        workLocation: staffUser.data.workLocation ?? "Resort Office",
      }
    : {
        allowance: "0",
        accessRoleId: "",
        basicSalary: "0",
        bonus: "0",
        commission: "0",
        email: "",
        departmentId: "",
        employmentType: "Regular",
        firstName: "",
        incentives: "0",
        lastName: "",
        leaveDeduction: "0",
        notes: "",
        otherDeductions: "0",
        password: "",
        pagIbigContribution: "0",
        philHealthContribution: "0",
        phone: "",
        roleName: "",
        sssContribution: "0",
        status: "Invited",
        tags: "",
        username: "",
        withholdingTax: "0",
        workLocation: "Resort Office",
      };

  return (
    <UserRoleEditor
      key={staffUser.data?.id ?? "create"}
      initialValues={initialValues}
      isSaving={saveStaffUser.isPending}
      mode={mode}
      roleOptions={accessRoles.data ?? []}
      onSubmit={(values) =>
        saveStaffUser.mutate({
          id: isCreate ? undefined : userRoleId,
          accessRoleId: values.accessRoleId,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          departmentId: values.departmentId,
          username: values.username,
          password: values.password,
          phoneNumber: values.phone,
          roleName: values.roleName,
          status: values.status,
          employmentType: values.employmentType,
          workLocation: values.workLocation,
          basicSalary: moneyValue(values.basicSalary),
          allowance: moneyValue(values.allowance),
          incentives: moneyValue(values.incentives),
          commission: moneyValue(values.commission),
          bonus: moneyValue(values.bonus),
          leaveDeduction: moneyValue(values.leaveDeduction),
          sssContribution: moneyValue(values.sssContribution),
          philHealthContribution: moneyValue(values.philHealthContribution),
          pagIbigContribution: moneyValue(values.pagIbigContribution),
          withholdingTax: moneyValue(values.withholdingTax),
          otherDeductions: moneyValue(values.otherDeductions),
          notes: values.notes,
          tags: values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        })
      }
    />
  );
}

function UserRoleEditor({
  initialValues,
  isSaving,
  mode,
  onSubmit,
  roleOptions,
}: {
  initialValues: UserRoleFormValues;
  isSaving: boolean;
  mode: "create" | "update";
  onSubmit: (values: UserRoleFormValues) => void;
  roleOptions: Array<{
    id: string;
    name: string;
    permissions: string[];
  }>;
}) {
  const trpc = useTRPC();
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
    retry: false,
  });
  const departmentOptions = departments.data ?? [];
  const [departmentId, setDepartmentId] = useState(initialValues.departmentId);
  const [accessRoleId, setAccessRoleId] = useState(initialValues.accessRoleId);
  const [firstName, setFirstName] = useState(initialValues.firstName);
  const [lastName, setLastName] = useState(initialValues.lastName);
  const [email, setEmail] = useState(initialValues.email);
  const [username, setUsername] = useState(initialValues.username);
  const [password, setPassword] = useState(initialValues.password);
  const [phone, setPhone] = useState(initialValues.phone);
  const [roleName, setRoleName] = useState(initialValues.roleName);
  const [status, setStatus] = useState<UserRoleStatus>(initialValues.status);
  const [notes, setNotes] = useState(initialValues.notes);
  const [tags, setTags] = useState(initialValues.tags);
  const [employmentType, setEmploymentType] = useState(
    initialValues.employmentType,
  );
  const [workLocation, setWorkLocation] = useState(initialValues.workLocation);
  const [basicSalary, setBasicSalary] = useState(initialValues.basicSalary);
  const [allowance, setAllowance] = useState(initialValues.allowance);
  const [incentives, setIncentives] = useState(initialValues.incentives);
  const [commission, setCommission] = useState(initialValues.commission);
  const [bonus, setBonus] = useState(initialValues.bonus);
  const [leaveDeduction, setLeaveDeduction] = useState(
    initialValues.leaveDeduction,
  );
  const [sssContribution, setSssContribution] = useState(
    initialValues.sssContribution,
  );
  const [philHealthContribution, setPhilHealthContribution] = useState(
    initialValues.philHealthContribution,
  );
  const [pagIbigContribution, setPagIbigContribution] = useState(
    initialValues.pagIbigContribution,
  );
  const [withholdingTax, setWithholdingTax] = useState(
    initialValues.withholdingTax,
  );
  const [otherDeductions, setOtherDeductions] = useState(
    initialValues.otherDeductions,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      accessRoleId,
      email,
      departmentId,
      allowance,
      basicSalary,
      bonus,
      commission,
      firstName,
      employmentType,
      incentives,
      lastName,
      leaveDeduction,
      notes,
      otherDeductions,
      password,
      pagIbigContribution,
      philHealthContribution,
      phone,
      roleName,
      sssContribution,
      status,
      tags,
      username,
      withholdingTax,
      workLocation,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/resort/access/users">Cancel</Link>
          </Button>
          <Button size="sm" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <UserOverviewCard
            email={email}
            accessRoleId={accessRoleId}
            departmentId={departmentId}
            departmentOptions={departmentOptions}
            firstName={firstName}
            lastName={lastName}
            mode={mode}
            password={password}
            phone={phone}
            roleName={roleName}
            roleOptions={roleOptions}
            status={status}
            username={username}
            onEmailChange={setEmail}
            onAccessRoleChange={(roleId) => {
              const selectedRole = roleOptions.find((role) => role.id === roleId);

              setAccessRoleId(roleId);
              setRoleName(selectedRole?.name ?? "");
            }}
            onDepartmentChange={setDepartmentId}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onPasswordChange={setPassword}
            onPhoneChange={setPhone}
            onStatusChange={setStatus}
            onUsernameChange={setUsername}
          />
          <PayrollSetupCard
            allowance={allowance}
            basicSalary={basicSalary}
            bonus={bonus}
            commission={commission}
            employmentType={employmentType}
            incentives={incentives}
            leaveDeduction={leaveDeduction}
            otherDeductions={otherDeductions}
            pagIbigContribution={pagIbigContribution}
            philHealthContribution={philHealthContribution}
            sssContribution={sssContribution}
            withholdingTax={withholdingTax}
            workLocation={workLocation}
            onAllowanceChange={setAllowance}
            onBasicSalaryChange={setBasicSalary}
            onBonusChange={setBonus}
            onCommissionChange={setCommission}
            onEmploymentTypeChange={setEmploymentType}
            onIncentivesChange={setIncentives}
            onLeaveDeductionChange={setLeaveDeduction}
            onOtherDeductionsChange={setOtherDeductions}
            onPagIbigContributionChange={setPagIbigContribution}
            onPhilHealthContributionChange={setPhilHealthContribution}
            onSssContributionChange={setSssContribution}
            onWithholdingTaxChange={setWithholdingTax}
            onWorkLocationChange={setWorkLocation}
          />
        </div>
        <div className="space-y-5">
          <NotesCard value={notes} onChange={setNotes} />
          <TagsCard value={tags} onChange={setTags} />
        </div>
      </div>
    </form>
  );
}

function UserOverviewCard({
  accessRoleId,
  email,
  departmentId,
  departmentOptions,
  firstName,
  lastName,
  mode,
  onEmailChange,
  onAccessRoleChange,
  onDepartmentChange,
  onFirstNameChange,
  onLastNameChange,
  onPasswordChange,
  onPhoneChange,
  onStatusChange,
  onUsernameChange,
  password,
  phone,
  roleName,
  roleOptions,
  status,
  username,
}: {
  accessRoleId: string;
  email: string;
  departmentId: string;
  departmentOptions: Array<{
    id: string;
    name: string;
  }>;
  firstName: string;
  lastName: string;
  mode: "create" | "update";
  onEmailChange: (value: string) => void;
  onAccessRoleChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onStatusChange: (value: UserRoleStatus) => void;
  onUsernameChange: (value: string) => void;
  password: string;
  phone: string;
  roleName: string;
  roleOptions: Array<{
    id: string;
    name: string;
    permissions: string[];
  }>;
  status: UserRoleStatus;
  username: string;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">User overview</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Create workspace users and assign dynamic roles.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="First name" optional>
          <Input
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
            className="rounded-lg"
          />
        </Field>
        <Field label="Last name" optional>
          <Input
            value={lastName}
            onChange={(event) => onLastNameChange(event.target.value)}
            className="rounded-lg"
          />
        </Field>
      </div>

      <Field label="Email" optional>
        <Input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="name@company.com"
          type="email"
          className="rounded-lg"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Username" optional>
          <Input
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            autoComplete="username"
            className="rounded-lg"
          />
        </Field>
        <Field label="Password">
          <InputGroup className="rounded-lg">
            <InputGroupInput
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Set temporary password"
              autoComplete="new-password"
              required={mode === "create"}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                variant="ghost"
                size="xs"
                className="rounded-md text-xs!"
                onClick={() => onPasswordChange(generatePassword())}
              >
                Generate
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>

      <Field label="Phone number" optional>
        <PhoneNumberInput
          id="userPhoneNumber"
          value={phone}
          onChange={onPhoneChange}
          groupClassName="rounded-lg"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Role">
          <Select
            value={accessRoleId}
            onValueChange={onAccessRoleChange}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select workspace role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" value={roleName} readOnly />
        </Field>
        <Field label="Status">
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as UserRoleStatus)}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Invited">Invited</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Department" optional>
        <Select
          value={departmentId || "none"}
          onValueChange={(value) =>
            onDepartmentChange(value === "none" ? "" : value)
          }
        >
          <SelectTrigger className="h-10 w-full rounded-lg">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No department</SelectItem>
            {departmentOptions.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="-mx-5 -mb-5 bg-zinc-50 border-t px-5 py-4 text-xs font-medium text-zinc-500">
        Ask staff to confirm account access before enabling sensitive billing
        and finance permissions.
      </div>
    </Card>
  );
}

function PayrollSetupCard({
  allowance,
  basicSalary,
  bonus,
  commission,
  employmentType,
  incentives,
  leaveDeduction,
  onAllowanceChange,
  onBasicSalaryChange,
  onBonusChange,
  onCommissionChange,
  onEmploymentTypeChange,
  onIncentivesChange,
  onLeaveDeductionChange,
  onOtherDeductionsChange,
  onPagIbigContributionChange,
  onPhilHealthContributionChange,
  onSssContributionChange,
  onWithholdingTaxChange,
  onWorkLocationChange,
  otherDeductions,
  pagIbigContribution,
  philHealthContribution,
  sssContribution,
  withholdingTax,
  workLocation,
}: {
  allowance: string;
  basicSalary: string;
  bonus: string;
  commission: string;
  employmentType: string;
  incentives: string;
  leaveDeduction: string;
  onAllowanceChange: (value: string) => void;
  onBasicSalaryChange: (value: string) => void;
  onBonusChange: (value: string) => void;
  onCommissionChange: (value: string) => void;
  onEmploymentTypeChange: (value: string) => void;
  onIncentivesChange: (value: string) => void;
  onLeaveDeductionChange: (value: string) => void;
  onOtherDeductionsChange: (value: string) => void;
  onPagIbigContributionChange: (value: string) => void;
  onPhilHealthContributionChange: (value: string) => void;
  onSssContributionChange: (value: string) => void;
  onWithholdingTaxChange: (value: string) => void;
  onWorkLocationChange: (value: string) => void;
  otherDeductions: string;
  pagIbigContribution: string;
  philHealthContribution: string;
  sssContribution: string;
  withholdingTax: string;
  workLocation: string;
}) {
  return (
    <Card className="gap-5 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-[#303030]">Payroll setup</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Staff compensation and deductions used by payroll review.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employment type">
          <Select value={employmentType} onValueChange={onEmploymentTypeChange}>
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Probationary">Probationary</SelectItem>
              <SelectItem value="Contractual">Contractual</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Seasonal">Seasonal</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Work location" optional>
          <Input
            value={workLocation}
            onChange={(event) => onWorkLocationChange(event.target.value)}
            placeholder="Front Desk, Resort Office..."
            className="rounded-lg"
          />
        </Field>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900">Earnings</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <MoneyField label="Basic salary" value={basicSalary} onChange={onBasicSalaryChange} />
          <MoneyField label="Allowance" value={allowance} onChange={onAllowanceChange} />
          <MoneyField label="Incentives" value={incentives} onChange={onIncentivesChange} />
          <MoneyField label="Commission" value={commission} onChange={onCommissionChange} />
          <MoneyField label="Bonus" value={bonus} onChange={onBonusChange} />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900">Deductions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <MoneyField label="Leave deduction" value={leaveDeduction} onChange={onLeaveDeductionChange} />
          <MoneyField label="SSS" value={sssContribution} onChange={onSssContributionChange} />
          <MoneyField label="PhilHealth" value={philHealthContribution} onChange={onPhilHealthContributionChange} />
          <MoneyField label="Pag-IBIG" value={pagIbigContribution} onChange={onPagIbigContributionChange} />
          <MoneyField label="Withholding tax" value={withholdingTax} onChange={onWithholdingTaxChange} />
          <MoneyField label="Other deductions" value={otherDeductions} onChange={onOtherDeductionsChange} />
        </div>
      </div>
    </Card>
  );
}

function MoneyField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field label={label} optional>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min="0"
        step="0.01"
        type="number"
        className="rounded-lg"
      />
    </Field>
  );
}

export function PermissionSheet({
  selectedIds,
  setSelectedIds,
}: {
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [open, setOpen] = useState(false);
  const allPermissionIds = useMemo(
    () =>
      PERMISSION_MODULES.flatMap((module) =>
        module.groups.flatMap((group) => group.events.map((event) => event.id)),
      ),
    [],
  );
  const [search, setSearch] = useState("");

  const selectedCount = selectedIds.length;
  const filteredModules = useMemo(
    () => filterPermissionModules(PERMISSION_MODULES, search),
    [search],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <ShieldCheck className="size-4" />
          Permissions
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 p-0 max-w-lg!">
        <SheetHeader className="border-b border-zinc-200 p-5">
          <SheetTitle className="text-xl font-bold">
            Role permissions
          </SheetTitle>
          <SheetDescription>
            Select permission events users with this role can use inside this workspace.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5">
          <div>
            <p className="text-sm font-bold text-zinc-900">Events</p>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedCount} of {allPermissionIds.length} selected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(allPermissionIds)}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="border-b border-zinc-200 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search permission, module, or group..."
              className="rounded-lg pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-6">
            {filteredModules.map((module) => (
              <div key={module.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isEveryModulePermissionSelected(
                        module.groups,
                        selectedIds,
                      )}
                      onCheckedChange={(checked) =>
                        setSelectedIds((current) =>
                          toggleIds(
                            current,
                            getGroupIds(module.groups),
                            Boolean(checked),
                          ),
                        )
                      }
                    />
                    <h3 className="text-base font-semibold tracking-tight text-zinc-950">
                      {module.label}
                    </h3>
                  </div>
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-600">
                    {countSelected(getGroupIds(module.groups), selectedIds)}/
                    {getGroupIds(module.groups).length}
                  </span>
                </div>
                <div className="space-y-5 pl-9">
                  {module.groups.map((group) => (
                    <PermissionGroupRow
                      group={group}
                      key={group.id}
                      selectedIds={selectedIds}
                      setSelectedIds={setSelectedIds}
                    />
                  ))}
                </div>
              </div>
            ))}
            {!filteredModules.length ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-sm font-semibold text-zinc-900">
                  No permissions found
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Try another module, event, or group name.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <SheetFooter className="border-t border-zinc-200 p-4">
          <SheetClose asChild>
            <Button type="button">Save permissions</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PermissionGroupRow({
  group,
  selectedIds,
  setSelectedIds,
}: {
  group: PermissionGroup;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const eventIds = group.events.map((event) => event.id);
  const allSelected = eventIds.every((id) => selectedIds.includes(id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) =>
            setSelectedIds((current) =>
              toggleIds(current, eventIds, Boolean(checked)),
            )
          }
        />
        <p className="text-sm font-semibold text-zinc-950">{group.label}</p>
      </div>
      <div className="space-y-3 pl-9">
        {group.events.map((event) => (
          <label
            className="flex items-center gap-3 font-mono text-xs text-zinc-800"
            key={event.id}
          >
            <Checkbox
              checked={selectedIds.includes(event.id)}
              onCheckedChange={(checked) =>
                setSelectedIds((current) =>
                  toggleIds(current, [event.id], Boolean(checked)),
                )
              }
            />
            {event.label}
          </label>
        ))}
      </div>
    </div>
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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#303030]">
          Notes
          <span className="ml-1 font-normal text-zinc-500">
            (optional)
          </span>
        </h2>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Notes are private and won't be shared with staff."
        className="min-h-24 rounded-lg"
      />
    </Card>
  );
}

function TagsCard({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#303030]">
          Tags
          <span className="ml-1 font-normal text-zinc-500">
            (optional)
          </span>
        </h2>
      </div>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Owner, finance, front desk..."
        className="rounded-lg"
      />
    </Card>
  );
}

function Field({
  children,
  label,
  optional,
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
          <span className="font-normal text-zinc-500">
            (optional)
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function getGroupIds(groups: PermissionGroup[]) {
  return groups.flatMap((group) => group.events.map((event) => event.id));
}

function filterPermissionModules(modules: PermissionModule[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return modules;
  }

  return modules
    .map((module) => {
      const moduleMatches =
        module.label.toLowerCase().includes(query) ||
        module.id.toLowerCase().includes(query);
      const groups = module.groups
        .map((group) => {
          const groupMatches =
            group.label.toLowerCase().includes(query) ||
            group.id.toLowerCase().includes(query);
          const events = group.events.filter((event) => {
            return (
              moduleMatches ||
              groupMatches ||
              event.id.toLowerCase().includes(query) ||
              event.label.toLowerCase().includes(query)
            );
          });

          return events.length || groupMatches ? { ...group, events } : null;
        })
        .filter((group): group is PermissionGroup => Boolean(group));

      return groups.length || moduleMatches ? { ...module, groups } : null;
    })
    .filter((module): module is PermissionModule => Boolean(module));
}

function countSelected(ids: string[], selectedIds: string[]) {
  return ids.filter((id) => selectedIds.includes(id)).length;
}

function isEveryModulePermissionSelected(
  groups: PermissionGroup[],
  selectedIds: string[],
) {
  const ids = getGroupIds(groups);
  return ids.every((id) => selectedIds.includes(id));
}

function toggleIds(current: string[], ids: string[], checked: boolean) {
  if (checked) {
    return Array.from(new Set([...current, ...ids]));
  }

  return current.filter((id) => !ids.includes(id));
}

function generatePassword() {
  const requiredCharacters = [
    getSecureCharacter(PASSWORD_LOWERCASE),
    getSecureCharacter(PASSWORD_UPPERCASE),
    getSecureCharacter(PASSWORD_NUMBERS),
    getSecureCharacter(PASSWORD_SYMBOLS),
  ];
  const allCharacters = [
    PASSWORD_LOWERCASE,
    PASSWORD_UPPERCASE,
    PASSWORD_NUMBERS,
    PASSWORD_SYMBOLS,
  ].join("");
  const remainingCharacters = Array.from({ length: 8 }, () =>
    getSecureCharacter(allCharacters),
  );

  return shuffleSecure([...requiredCharacters, ...remainingCharacters]).join("");
}

function moneyValue(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getSecureCharacter(characters: string) {
  return characters[getSecureIndex(characters.length)];
}

function getSecureIndex(length: number) {
  if (typeof window === "undefined" || !window.crypto) {
    return Math.floor(Math.random() * length);
  }

  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);

  return values[0] % length;
}

function shuffleSecure(characters: string[]) {
  return characters
    .map((character) => ({ character, sort: getSecureIndex(1000000) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ character }) => character);
}
