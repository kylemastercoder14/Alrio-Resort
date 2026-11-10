"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import toast from "react-hot-toast";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reusable/stepper";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

type Employee = {
  absentCount: number;
  allowances: number;
  basicSalary: number;
  bonus: number;
  commission: number;
  deductions: number;
  daysWorked: number;
  department: string;
  employeeId: string;
  employmentType: string;
  governmentDeductions: number;
  grossPay: number;
  id: string;
  included: boolean;
  incentives: number;
  image: string | null;
  lateCount: number;
  leaveDays: number;
  leaveDeduction: number;
  location: string;
  name: string;
  netPay: number;
  otherDeductions: number;
  overtimeHours: number;
  overtimePay: number;
  pagIbigContribution: number;
  philHealthContribution: number;
  position: string;
  regularHours: number;
  sssContribution: number;
  staffProfileId: string;
  totalDeductions: number;
  totalEarnings: number;
  undertimeDeduction: number;
  undertimeHours: number;
  withholdingTax: number;
};

type WizardStep = 1 | 2 | 3 | 4;

type PayrollTotals = {
  employerContributions: number;
  employerCost: number;
  excludedEmployees: number;
  includedEmployees: number;
  totalAllowances: number;
  totalBasicSalary: number;
  totalBonus: number;
  totalCommission: number;
  totalDeductions: number;
  totalEarnings: number;
  totalEmployees: number;
  totalGovernmentDeductions: number;
  totalIncentives: number;
  totalLeaveDeductions: number;
  totalNetPay: number;
  totalOtherDeductions: number;
  totalOvertimePay: number;
  totalUndertimeDeductions: number;
};

type PayFrequency = "Monthly" | "Bi-weekly";
type PayType = "Regular Payroll" | "Final Payroll";
type RoundingOption = "Nearest Peso" | "None";
type EmployeePayrollOverride = Partial<
  Pick<
    Employee,
    | "allowances"
    | "basicSalary"
    | "bonus"
    | "commission"
    | "included"
    | "incentives"
    | "otherDeductions"
  >
>;
type EditableEmployeeMoneyField = Exclude<
  keyof EmployeePayrollOverride,
  "included"
>;
type PayPeriodOption = {
  end: string;
  frequency: PayFrequency;
  label: string;
  payDate: string;
  start: string;
  value: string;
};

const STEPS = [
  {
    step: 1,
    title: "Select Criteria",
    description: "Choose payroll parameters",
  },
  {
    step: 2,
    title: "Review Employees",
    description: "120 included",
  },
  {
    step: 3,
    title: "Generate Payroll",
    description: "Configure payroll details",
  },
  {
    step: 4,
    title: "Confirm & Generate",
    description: "Review and confirm",
  },
] satisfies { description: string; step: WizardStep; title: string }[];

const PAY_PERIODS: PayPeriodOption[] = [
  {
    value: "jul-2026",
    label: "Jul 1, 2026 - Jul 31, 2026",
    start: "2026-07-01",
    end: "2026-07-31",
    payDate: "2026-08-05",
    frequency: "Monthly",
  },
  {
    value: "jun-2026",
    label: "Jun 1, 2026 - Jun 30, 2026",
    start: "2026-06-01",
    end: "2026-06-30",
    payDate: "2026-07-05",
    frequency: "Monthly",
  },
  {
    value: "may-2026",
    label: "May 1, 2026 - May 31, 2026",
    start: "2026-05-01",
    end: "2026-05-31",
    payDate: "2026-06-05",
    frequency: "Monthly",
  },
  {
    value: "jul-1-2026",
    label: "Jul 1, 2026 - Jul 15, 2026",
    start: "2026-07-01",
    end: "2026-07-15",
    payDate: "2026-07-16",
    frequency: "Bi-weekly",
  },
  {
    value: "jul-2-2026",
    label: "Jul 16, 2026 - Jul 31, 2026",
    start: "2026-07-16",
    end: "2026-07-31",
    payDate: "2026-08-01",
    frequency: "Bi-weekly",
  },
];

const DEFAULT_PAY_PERIOD = PAY_PERIODS[0];

function applyEmployeeOverrides(
  employees: Employee[],
  overrides: Record<string, EmployeePayrollOverride>,
) {
  return employees.map((employee) => {
    const override = overrides[employee.staffProfileId];

    if (!override) return employee;

    return recalculateEmployee({
      ...employee,
      ...override,
    });
  });
}

function recalculateEmployee(employee: Employee): Employee {
  const grossPay =
    employee.basicSalary +
    employee.allowances +
    employee.incentives +
    employee.commission +
    employee.bonus +
    employee.overtimePay;
  const totalDeductions =
    employee.leaveDeduction +
    employee.undertimeDeduction +
    employee.governmentDeductions +
    employee.otherDeductions;
  const netPay = employee.included ? Math.max(grossPay - totalDeductions, 0) : 0;

  return {
    ...employee,
    deductions: totalDeductions,
    grossPay,
    netPay,
    totalDeductions,
    totalEarnings: grossPay,
  };
}

function calculatePayrollTotals(employees: Employee[]): PayrollTotals {
  const includedEmployees = employees.filter((employee) => employee.included);
  const totals = {
    employerContributions: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.governmentDeductions,
    ),
    excludedEmployees: employees.length - includedEmployees.length,
    includedEmployees: includedEmployees.length,
    totalAllowances: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.allowances,
    ),
    totalBasicSalary: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.basicSalary,
    ),
    totalBonus: sumEmployeeMoney(includedEmployees, (employee) => employee.bonus),
    totalCommission: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.commission,
    ),
    totalDeductions: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.totalDeductions,
    ),
    totalEarnings: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.totalEarnings,
    ),
    totalEmployees: employees.length,
    totalGovernmentDeductions: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.governmentDeductions,
    ),
    totalIncentives: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.incentives,
    ),
    totalLeaveDeductions: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.leaveDeduction,
    ),
    totalNetPay: sumEmployeeMoney(includedEmployees, (employee) => employee.netPay),
    totalOtherDeductions: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.otherDeductions,
    ),
    totalOvertimePay: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.overtimePay,
    ),
    totalUndertimeDeductions: sumEmployeeMoney(
      includedEmployees,
      (employee) => employee.undertimeDeduction,
    ),
  };

  return {
    ...totals,
    employerCost: totals.totalEarnings + totals.employerContributions,
  };
}

function sumEmployeeMoney(
  employees: Employee[],
  selector: (employee: Employee) => number,
) {
  return employees.reduce((total, employee) => total + selector(employee), 0);
}

function getEmployeeColumns({
  employees,
  onToggleEmployeeIncluded,
  onUpdateEmployeeAmount,
  readOnly = false,
}: {
  employees: Employee[];
  onToggleEmployeeIncluded: (staffProfileId: string, included: boolean) => void;
  onUpdateEmployeeAmount: (
    staffProfileId: string,
    field: EditableEmployeeMoneyField,
    value: number,
  ) => void;
  readOnly?: boolean;
}): ColumnDef<Employee>[] {
  const allIncluded =
    employees.length > 0 && employees.every((employee) => employee.included);
  const someIncluded = employees.some((employee) => employee.included);

  return [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allIncluded ? true : someIncluded ? "indeterminate" : false}
          disabled={readOnly}
          aria-label="Select all employees"
          onCheckedChange={(value) => {
            if (readOnly) return;
            const included = value === true;
            employees.forEach((employee) =>
              onToggleEmployeeIncluded(employee.staffProfileId, included),
            );
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.included}
          disabled={readOnly}
          aria-label={`Select ${row.original.name}`}
          onCheckedChange={(value) => {
            if (readOnly) return;
            onToggleEmployeeIncluded(row.original.staffProfileId, value === true)
          }}
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => {
        const employee = row.original;

        return (
          <div className="flex min-w-52 items-center gap-3">
            <Avatar className="size-9 border border-zinc-200">
              {employee.image ? (
                <AvatarImage
                  alt={`${employee.name}'s profile photo`}
                  className="object-cover"
                  src={employee.image}
                />
              ) : null}
              <AvatarFallback className="bg-blue-50 text-blue-700">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-zinc-950">{employee.name}</p>
              <p className="text-xs font-medium text-zinc-500">
                {employee.position}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "basicSalary",
      header: "Basic Salary",
      cell: ({ row }) => (
        <EditableMoneyCell
          readOnly={readOnly}
          value={row.original.basicSalary}
          onChange={(value) =>
            onUpdateEmployeeAmount(
              row.original.staffProfileId,
              "basicSalary",
              value,
            )
          }
        />
      ),
    },
    {
      accessorKey: "allowances",
      header: "Allowances",
      cell: ({ row }) => (
        <EditableMoneyCell
          readOnly={readOnly}
          value={row.original.allowances}
          onChange={(value) =>
            onUpdateEmployeeAmount(
              row.original.staffProfileId,
              "allowances",
              value,
            )
          }
        />
      ),
    },
    {
      accessorKey: "incentives",
      header: "Incentives",
      cell: ({ row }) => (
        <EditableMoneyCell
          readOnly={readOnly}
          value={row.original.incentives}
          onChange={(value) =>
            onUpdateEmployeeAmount(
              row.original.staffProfileId,
              "incentives",
              value,
            )
          }
        />
      ),
    },
    {
      accessorKey: "commission",
      header: "Commission",
      cell: ({ row }) => (
        <EditableMoneyCell
          readOnly={readOnly}
          value={row.original.commission}
          onChange={(value) =>
            onUpdateEmployeeAmount(
              row.original.staffProfileId,
              "commission",
              value,
            )
          }
        />
      ),
    },
    {
      accessorKey: "bonus",
      header: "Bonus",
      cell: ({ row }) => (
        <EditableMoneyCell
          readOnly={readOnly}
          value={row.original.bonus}
          onChange={(value) =>
            onUpdateEmployeeAmount(row.original.staffProfileId, "bonus", value)
          }
        />
      ),
    },
    {
      accessorKey: "deductions",
      header: "Deductions",
      cell: ({ row }) => (
        <EditableMoneyCell
          readOnly={readOnly}
          value={row.original.otherDeductions}
          onChange={(value) =>
            onUpdateEmployeeAmount(
              row.original.staffProfileId,
              "otherDeductions",
              value,
            )
          }
        />
      ),
    },
    {
      accessorKey: "netPay",
      header: "Net Pay",
      cell: ({ row }) => formatCurrency(row.original.netPay),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.included ? "default" : "secondary"}>
          {row.original.included ? "Included" : "Excluded"}
        </Badge>
      ),
    },
  ];
}

function EditableMoneyCell({
  onChange,
  readOnly = false,
  value,
}: {
  onChange: (value: number) => void;
  readOnly?: boolean;
  value: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  function startEditing() {
    if (readOnly) return;
    setDraft(String(value));
    setIsEditing(true);
  }

  function commitDraft() {
    const numericValue = Number(draft);
    onChange(Number.isFinite(numericValue) ? Math.max(numericValue, 0) : 0);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <Input
        autoFocus
        className="h-8 w-28 rounded-lg text-sm"
        min={0}
        step="0.01"
        type="number"
        value={draft}
        onBlur={commitDraft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft();
          }

          if (event.key === "Escape") {
            setDraft(String(value));
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      className="rounded-md px-1 py-0.5 text-left tabular-nums hover:bg-zinc-100"
      title="Double-click to edit"
      type="button"
      onDoubleClick={startEditing}
    >
      {formatCurrency(value)}
    </button>
  );
}

export default function PayrollWizardPage() {
  const router = useRouter();
  const params = useParams<{ payrollId: string }>();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const payrollId = params.payrollId;
  const isCreateMode = payrollId === "create";
  const isViewMode = !isCreateMode && searchParams.get("mode") === "view";
  const payrollRun = useQuery({
    ...trpc.resort.payroll.get.queryOptions({
      id: payrollId,
    }),
    enabled: !isCreateMode,
    retry: false,
  });

  const [step, setStep] = useState<WizardStep>(isViewMode ? 2 : 1);
  const [confirmed, setConfirmed] = useState(false);
  const [department, setDepartment] = useState("all");
  const [employmentType, setEmploymentType] = useState("all");
  const [location, setLocation] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "included" | "excluded"
  >("all");
  const [payrollName, setPayrollName] = useState(
    "Monthly Payroll - July 2026",
  );
  const [notes, setNotes] = useState("");
  const [payPeriodRange, setPayPeriodRange] = useState<DateRange>({
    from: parseDateInput(DEFAULT_PAY_PERIOD.start),
    to: parseDateInput(DEFAULT_PAY_PERIOD.end),
  });
  const [payDate, setPayDate] = useState(DEFAULT_PAY_PERIOD.payDate);
  const [frequency, setFrequency] = useState<PayFrequency>(
    DEFAULT_PAY_PERIOD.frequency,
  );
  const [payType, setPayType] = useState<PayType>("Regular Payroll");
  const [includeBasicSalary, setIncludeBasicSalary] = useState(true);
  const [includeAllowance, setIncludeAllowance] = useState(true);
  const [includeIncentives, setIncludeIncentives] = useState(true);
  const [includeCommission, setIncludeCommission] = useState(true);
  const [includeBonus, setIncludeBonus] = useState(true);
  const [includeOtPay, setIncludeOtPay] = useState(true);
  const [includeLeaveDeduction, setIncludeLeaveDeduction] = useState(true);
  const [includeGovernmentContributions, setIncludeGovernmentContributions] =
    useState(true);
  const [includeLeaveEncashment, setIncludeLeaveEncashment] = useState(false);
  const [sendPayslipNotification, setSendPayslipNotification] = useState(false);
  const [lockPayrollAfterGeneration, setLockPayrollAfterGeneration] =
    useState(true);
  const [createJournalEntry, setCreateJournalEntry] = useState(true);
  const [backupPayrollData, setBackupPayrollData] = useState(false);
  const [roundingOption, setRoundingOption] =
    useState<RoundingOption>("Nearest Peso");
  const [employeeOverrides, setEmployeeOverrides] = useState<
    Record<string, EmployeePayrollOverride>
  >({});

  const payPeriod = useMemo(
    () => toPayPeriodOption(payPeriodRange, frequency),
    [frequency, payPeriodRange],
  );
  const employeeOverridePayload = useMemo(
    () =>
      Object.entries(employeeOverrides).map(([staffProfileId, override]) => ({
        allowance: override.allowances,
        basicSalary: override.basicSalary,
        bonus: override.bonus,
        commission: override.commission,
        included: override.included,
        incentives: override.incentives,
        otherDeductions: override.otherDeductions,
        staffProfileId,
      })),
    [employeeOverrides],
  );
  const payrollInput = useMemo(
    () => ({
      action: isCreateMode ? ("create" as const) : ("update" as const),
      backupPayrollData,
      createJournalEntry,
      department: department === "all" ? undefined : department,
      employeeOverrides: employeeOverridePayload,
      frequency,
      id: isCreateMode ? undefined : payrollRun.data?.id ?? payrollId,
      includeAllowance,
      includeBasicSalary,
      includeBonus,
      includeCommission,
      includeGovernmentContributions,
      includeIncentives,
      includeLeaveDeduction,
      includeLeaveEncashment,
      includeOtPay,
      lockPayrollAfterGeneration,
      name: payrollName.trim() || "Payroll Run",
      notes,
      payDate: new Date(`${payDate}T00:00:00`),
      payType,
      periodEnd: new Date(`${payPeriod.end}T23:59:59`),
      periodStart: new Date(`${payPeriod.start}T00:00:00`),
      roundingOption,
      sendPayslipNotification,
    }),
    [
      backupPayrollData,
      createJournalEntry,
      department,
      employeeOverridePayload,
      frequency,
      includeAllowance,
      includeBasicSalary,
      includeBonus,
      includeCommission,
      includeGovernmentContributions,
      includeIncentives,
      includeLeaveDeduction,
      includeLeaveEncashment,
      includeOtPay,
      isCreateMode,
      lockPayrollAfterGeneration,
      notes,
      payDate,
      payPeriod.end,
      payPeriod.start,
      payType,
      payrollId,
      payrollRun.data?.id,
      payrollName,
      roundingOption,
      sendPayslipNotification,
    ],
  );
  const payrollPreview = useQuery({
    ...trpc.resort.payroll.preview.queryOptions(payrollInput, {
      enabled: !isViewMode,
    }),
    retry: false,
  });
  const savePayroll = useMutation(
    trpc.resort.payroll.save.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: async (run) => {
        await queryClient.invalidateQueries();
        toast.success(
          run.status === "DRAFT"
            ? "Payroll draft saved."
            : isCreateMode
              ? "Payroll finalized."
              : "Payroll updated.",
        );
        router.push("/resort/hr/generate-payroll");
      },
    }),
  );
  const employees = useMemo(
    () =>
      applyEmployeeOverrides(
        ((isViewMode
          ? payrollRun.data?.items
          : payrollPreview.data?.employees ?? payrollRun.data?.items) ??
          []) as Employee[],
        employeeOverrides,
      ),
    [
      employeeOverrides,
      isViewMode,
      payrollPreview.data?.employees,
      payrollRun.data?.items,
    ],
  );
  const totals = useMemo(
    () => calculatePayrollTotals(employees),
    [employees],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isCreateMode || !payrollRun.data) return;

    const savedRun = payrollRun.data;
    const savedPeriod = getPayPeriodOptionForRun(savedRun);
    const options = getPayrollOptions(savedRun.options);

    setPayPeriodRange({
      from: parseDateInput(savedPeriod.option.start),
      to: parseDateInput(savedPeriod.option.end),
    });
    setDepartment(savedRun.department || "all");
    setFrequency(savedRun.frequency as PayFrequency);
    setNotes(savedRun.notes || "");
    setPayDate(toDateInputValue(savedRun.payDate));
    setPayType(savedRun.payType as PayType);
    setPayrollName(savedRun.name);
    setBackupPayrollData(options.backupPayrollData ?? false);
    setCreateJournalEntry(options.createJournalEntry ?? true);
    setIncludeAllowance(options.includeAllowance ?? true);
    setIncludeBasicSalary(options.includeBasicSalary ?? true);
    setIncludeBonus(options.includeBonus ?? true);
    setIncludeCommission(options.includeCommission ?? true);
    setIncludeGovernmentContributions(
      options.includeGovernmentContributions ?? true,
    );
    setIncludeIncentives(options.includeIncentives ?? true);
    setIncludeLeaveDeduction(options.includeLeaveDeduction ?? true);
    setIncludeLeaveEncashment(options.includeLeaveEncashment ?? false);
    setIncludeOtPay(options.includeOtPay ?? true);
    setLockPayrollAfterGeneration(options.lockPayrollAfterGeneration ?? true);
    setRoundingOption(options.roundingOption ?? "Nearest Peso");
    setSendPayslipNotification(options.sendPayslipNotification ?? false);
    setEmployeeOverrides(
      Object.fromEntries(
        (savedRun.items ?? []).map((employee) => [
          employee.staffProfileId,
          {
            allowances: employee.allowances,
            basicSalary: employee.basicSalary,
            bonus: employee.bonus,
            commission: employee.commission,
            included: employee.included,
            incentives: employee.incentives,
            otherDeductions: employee.otherDeductions,
          },
        ]),
      ),
    );
  }, [isCreateMode, payrollRun.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleToggleEmployeeIncluded(
    staffProfileId: string,
    included: boolean,
  ) {
    if (isViewMode) return;

    setEmployeeOverrides((current) => ({
      ...current,
      [staffProfileId]: {
        ...current[staffProfileId],
        included,
      },
    }));
  }

  function handleUpdateEmployeeAmount(
    staffProfileId: string,
    field: EditableEmployeeMoneyField,
    value: number,
  ) {
    if (isViewMode) return;

    setEmployeeOverrides((current) => ({
      ...current,
      [staffProfileId]: {
        ...current[staffProfileId],
        [field]: value,
      },
    }));
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesDepartment =
        department === "all" || employee.department === department;
      const matchesEmploymentType =
        employmentType === "all" || employee.employmentType === employmentType;
      const matchesLocation =
        location === "all" || employee.location === location;
      const matchesReview =
        reviewFilter === "all" ||
        (reviewFilter === "included" && employee.included) ||
        (reviewFilter === "excluded" && !employee.included);

      return (
        matchesDepartment &&
        matchesEmploymentType &&
        matchesLocation &&
        matchesReview
      );
    });
  }, [department, employees, employmentType, location, reviewFilter]);

  const nextLabel =
    step === 1
      ? "Next: Review Employees"
      : step === 2
        ? "Next: Generate Payroll"
        : step === 3
          ? "Next: Confirm & Generate"
          : isCreateMode
            ? "Generate payroll"
            : "Update payroll";

  const kpis = getKpis(step, totals);
  const isSavingDisabled =
    savePayroll.isPending ||
    payrollPreview.isPending ||
    (!isCreateMode && payrollRun.isPending);

  function handleNext(mode: "draft" | "finalize" = "finalize") {
    if (isViewMode) {
      return;
    }

    if (step < 4) {
      setStep((step + 1) as WizardStep);
      return;
    }

    if (!confirmed) {
      toast.error("Confirm payroll details first.");
      return;
    }

    savePayroll.mutate({ ...payrollInput, mode });
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          {isViewMode ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => router.push("/resort/hr/generate-payroll")}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => setStep((step - 1) as WizardStep)}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : null}
          {isViewMode && payrollRun.data?.status === "DRAFT" ? (
            <Button
              size="xs"
              type="button"
              onClick={() => router.push(`/resort/hr/generate-payroll/${payrollId}`)}
            >
              Edit payroll
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <>
              <Button asChild size="xs" variant="secondary">
                <Link href="/resort/hr/generate-payroll">Cancel</Link>
              </Button>
              {step === 4 ? (
                <Button
                  size="xs"
                  type="button"
                  variant="secondary"
                  disabled={isSavingDisabled}
                  onClick={() => handleNext("draft")}
                >
                  {savePayroll.isPending ? "Saving..." : "Save draft"}
                </Button>
              ) : null}
              <Button
                size="xs"
                type="button"
                disabled={isSavingDisabled}
                onClick={() => handleNext("finalize")}
              >
                {savePayroll.isPending ? "Saving..." : nextLabel}
                <ArrowRight className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-5" items={kpis} />

      {isViewMode ? (
        <Card className="rounded-xl border-zinc-200 bg-white p-5">
          <h1 className="text-lg font-bold text-zinc-950">
            View payroll
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Read-only payroll details. Finalized payrolls are locked to preserve
            the audit trail.
          </p>
        </Card>
      ) : (
        <Card className="rounded-xl border-zinc-200 bg-white p-5">
          <Stepper
            value={step}
            onValueChange={(value) => setStep(value as WizardStep)}
          >
            <StepperNav>
              {STEPS.map((item, index) => (
                <StepperItem key={item.step} step={item.step}>
                  <StepperTrigger className="w-full min-w-0 justify-start">
                    <StepperIndicator>
                      {item.step < step ? (
                        <Check className="size-4" />
                      ) : (
                        item.step
                      )}
                    </StepperIndicator>
                    <div className="min-w-0 text-left">
                      <StepperTitle className="truncate text-sm font-bold text-zinc-950">
                        {item.title}
                      </StepperTitle>
                      <StepperDescription className="truncate text-xs">
                        {item.step === 2
                          ? `${totals.includedEmployees} included`
                          : item.description}
                      </StepperDescription>
                    </div>
                  </StepperTrigger>
                  {index < STEPS.length - 1 ? (
                    <StepperSeparator className="mx-4 hidden sm:block" />
                  ) : null}
                </StepperItem>
              ))}
            </StepperNav>
          </Stepper>
        </Card>
      )}

      {!isViewMode && step === 1 ? (
        <SelectCriteriaStep
          backupPayrollData={backupPayrollData}
          createJournalEntry={createJournalEntry}
          department={department}
          frequency={frequency}
          includeAllowance={includeAllowance}
          includeBasicSalary={includeBasicSalary}
          includeBonus={includeBonus}
          includeCommission={includeCommission}
          includeGovernmentContributions={includeGovernmentContributions}
          includeIncentives={includeIncentives}
          includeLeaveDeduction={includeLeaveDeduction}
          includeLeaveEncashment={includeLeaveEncashment}
          includeOtPay={includeOtPay}
          lockPayrollAfterGeneration={lockPayrollAfterGeneration}
          payDate={payDate}
          payPeriod={payPeriod}
          payPeriodRange={payPeriodRange}
          payType={payType}
          roundingOption={roundingOption}
          sendPayslipNotification={sendPayslipNotification}
          setBackupPayrollData={setBackupPayrollData}
          setCreateJournalEntry={setCreateJournalEntry}
          setDepartment={setDepartment}
          setFrequency={setFrequency}
          setIncludeAllowance={setIncludeAllowance}
          setIncludeBasicSalary={setIncludeBasicSalary}
          setIncludeBonus={setIncludeBonus}
          setIncludeCommission={setIncludeCommission}
          setIncludeGovernmentContributions={setIncludeGovernmentContributions}
          setIncludeIncentives={setIncludeIncentives}
          setIncludeLeaveDeduction={setIncludeLeaveDeduction}
          setIncludeLeaveEncashment={setIncludeLeaveEncashment}
          setIncludeOtPay={setIncludeOtPay}
          setLockPayrollAfterGeneration={setLockPayrollAfterGeneration}
          setPayDate={setPayDate}
          setPayType={setPayType}
          setRoundingOption={setRoundingOption}
          setPayPeriodRange={setPayPeriodRange}
          setSendPayslipNotification={setSendPayslipNotification}
          totals={totals}
        />
      ) : null}

      {(isViewMode || step === 2) ? (
        <ReviewEmployeesStep
          department={department}
          employees={filteredEmployees}
          employmentType={employmentType}
          isLoading={payrollPreview.isPending || payrollRun.isPending}
          location={location}
          reviewFilter={reviewFilter}
          setDepartment={setDepartment}
          setEmploymentType={setEmploymentType}
          setLocation={setLocation}
          setReviewFilter={setReviewFilter}
          onToggleEmployeeIncluded={handleToggleEmployeeIncluded}
          onUpdateEmployeeAmount={handleUpdateEmployeeAmount}
          readOnly={isViewMode}
          totals={totals}
        />
      ) : null}

      {!isViewMode && step === 3 ? (
        <GeneratePayrollStep
          department={department}
          backupPayrollData={backupPayrollData}
          createJournalEntry={createJournalEntry}
          frequency={frequency}
          includeGovernmentContributions={includeGovernmentContributions}
          includeLeaveEncashment={includeLeaveEncashment}
          lockPayrollAfterGeneration={lockPayrollAfterGeneration}
          notes={notes}
          payDate={payDate}
          payPeriod={payPeriod}
          payPeriodRange={payPeriodRange}
          payType={payType}
          payrollName={payrollName}
          sendPayslipNotification={sendPayslipNotification}
          setBackupPayrollData={setBackupPayrollData}
          setCreateJournalEntry={setCreateJournalEntry}
          setDepartment={setDepartment}
          setIncludeGovernmentContributions={setIncludeGovernmentContributions}
          setIncludeLeaveEncashment={setIncludeLeaveEncashment}
          setLockPayrollAfterGeneration={setLockPayrollAfterGeneration}
          setNotes={setNotes}
          setPayDate={setPayDate}
          setPayType={setPayType}
          setPayrollName={setPayrollName}
          setPayPeriodRange={setPayPeriodRange}
          setSendPayslipNotification={setSendPayslipNotification}
          totals={totals}
        />
      ) : null}

      {!isViewMode && step === 4 ? (
        <ConfirmStep
          confirmed={confirmed}
          isCreateMode={isCreateMode}
          payDate={payDate}
          payPeriod={payPeriod}
          payType={payType}
          payrollName={payrollName}
          payrollRun={payrollRun.data}
          setConfirmed={setConfirmed}
          totals={totals}
        />
      ) : null}
    </main>
  );
}

function SelectCriteriaStep({
  backupPayrollData,
  createJournalEntry,
  department,
  frequency,
  includeAllowance,
  includeBasicSalary,
  includeBonus,
  includeCommission,
  includeGovernmentContributions,
  includeIncentives,
  includeLeaveDeduction,
  includeLeaveEncashment,
  includeOtPay,
  lockPayrollAfterGeneration,
  payDate,
  payPeriod,
  payPeriodRange,
  payType,
  roundingOption,
  sendPayslipNotification,
  setBackupPayrollData,
  setCreateJournalEntry,
  setDepartment,
  setFrequency,
  setIncludeAllowance,
  setIncludeBasicSalary,
  setIncludeBonus,
  setIncludeCommission,
  setIncludeGovernmentContributions,
  setIncludeIncentives,
  setIncludeLeaveDeduction,
  setIncludeLeaveEncashment,
  setIncludeOtPay,
  setLockPayrollAfterGeneration,
  setPayDate,
  setPayPeriodRange,
  setPayType,
  setRoundingOption,
  setSendPayslipNotification,
  totals,
}: {
  backupPayrollData: boolean;
  createJournalEntry: boolean;
  department: string;
  frequency: PayFrequency;
  includeAllowance: boolean;
  includeBasicSalary: boolean;
  includeBonus: boolean;
  includeCommission: boolean;
  includeGovernmentContributions: boolean;
  includeIncentives: boolean;
  includeLeaveDeduction: boolean;
  includeLeaveEncashment: boolean;
  includeOtPay: boolean;
  lockPayrollAfterGeneration: boolean;
  payDate: string;
  payPeriod: PayPeriodOption;
  payPeriodRange: DateRange;
  payType: PayType;
  roundingOption: RoundingOption;
  sendPayslipNotification: boolean;
  setBackupPayrollData: (value: boolean) => void;
  setCreateJournalEntry: (value: boolean) => void;
  setDepartment: (value: string) => void;
  setFrequency: (value: PayFrequency) => void;
  setIncludeAllowance: (value: boolean) => void;
  setIncludeBasicSalary: (value: boolean) => void;
  setIncludeBonus: (value: boolean) => void;
  setIncludeCommission: (value: boolean) => void;
  setIncludeGovernmentContributions: (value: boolean) => void;
  setIncludeIncentives: (value: boolean) => void;
  setIncludeLeaveDeduction: (value: boolean) => void;
  setIncludeLeaveEncashment: (value: boolean) => void;
  setIncludeOtPay: (value: boolean) => void;
  setLockPayrollAfterGeneration: (value: boolean) => void;
  setPayDate: (value: string) => void;
  setPayPeriodRange: (value: DateRange) => void;
  setPayType: (value: PayType) => void;
  setRoundingOption: (value: RoundingOption) => void;
  setSendPayslipNotification: (value: boolean) => void;
  totals: PayrollTotals;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <PayrollConfiguration
        backupPayrollData={backupPayrollData}
        createJournalEntry={createJournalEntry}
        department={department}
        frequency={frequency}
        includeAllowance={includeAllowance}
        includeBasicSalary={includeBasicSalary}
        includeBonus={includeBonus}
        includeCommission={includeCommission}
        includeGovernmentContributions={includeGovernmentContributions}
        includeIncentives={includeIncentives}
        includeLeaveDeduction={includeLeaveDeduction}
        includeLeaveEncashment={includeLeaveEncashment}
        includeOtPay={includeOtPay}
        lockPayrollAfterGeneration={lockPayrollAfterGeneration}
        payDate={payDate}
        payPeriod={payPeriod}
        payPeriodRange={payPeriodRange}
        payType={payType}
        roundingOption={roundingOption}
        sendPayslipNotification={sendPayslipNotification}
        setBackupPayrollData={setBackupPayrollData}
        setCreateJournalEntry={setCreateJournalEntry}
        setDepartment={setDepartment}
        setFrequency={setFrequency}
        setIncludeAllowance={setIncludeAllowance}
        setIncludeBasicSalary={setIncludeBasicSalary}
        setIncludeBonus={setIncludeBonus}
        setIncludeCommission={setIncludeCommission}
        setIncludeGovernmentContributions={setIncludeGovernmentContributions}
        setIncludeIncentives={setIncludeIncentives}
        setIncludeLeaveDeduction={setIncludeLeaveDeduction}
        setIncludeLeaveEncashment={setIncludeLeaveEncashment}
        setIncludeOtPay={setIncludeOtPay}
        setLockPayrollAfterGeneration={setLockPayrollAfterGeneration}
        setPayDate={setPayDate}
        setPayPeriodRange={setPayPeriodRange}
        setPayType={setPayType}
        setRoundingOption={setRoundingOption}
        setSendPayslipNotification={setSendPayslipNotification}
      />
      <PayrollSummaryCard totals={totals} />
    </div>
  );
}

function ReviewEmployeesStep({
  department,
  employees,
  employmentType,
  isLoading,
  location,
  onToggleEmployeeIncluded,
  onUpdateEmployeeAmount,
  readOnly = false,
  reviewFilter,
  setDepartment,
  setEmploymentType,
  setLocation,
  setReviewFilter,
  totals,
}: {
  department: string;
  employees: Employee[];
  employmentType: string;
  isLoading: boolean;
  location: string;
  onToggleEmployeeIncluded: (staffProfileId: string, included: boolean) => void;
  onUpdateEmployeeAmount: (
    staffProfileId: string,
    field: EditableEmployeeMoneyField,
    value: number,
  ) => void;
  readOnly?: boolean;
  reviewFilter: "all" | "included" | "excluded";
  setDepartment: (value: string) => void;
  setEmploymentType: (value: string) => void;
  setLocation: (value: string) => void;
  setReviewFilter: (value: "all" | "included" | "excluded") => void;
  totals: PayrollTotals;
}) {
  const columns = useMemo(
    () =>
      getEmployeeColumns({
        employees,
        onToggleEmployeeIncluded,
        onUpdateEmployeeAmount,
        readOnly,
      }),
    [employees, onToggleEmployeeIncluded, onUpdateEmployeeAmount, readOnly],
  );
  const toolbarActions = (
    <div className="hidden items-center gap-2 xl:flex">
      <div className="w-52">
        <DepartmentSelect value={department} onValueChange={setDepartment} />
      </div>
      <Select value={employmentType} onValueChange={setEmploymentType}>
        <SelectTrigger className="w-52 rounded-lg">
          <SelectValue placeholder="All Employment Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Employment Types</SelectItem>
          <SelectItem value="Regular">Regular</SelectItem>
          <SelectItem value="Probationary">Probationary</SelectItem>
          <SelectItem value="Contractual">Contractual</SelectItem>
        </SelectContent>
      </Select>
      <Select value={location} onValueChange={setLocation}>
        <SelectTrigger className="w-44 rounded-lg">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          <SelectItem value="Head Office">Head Office</SelectItem>
          <SelectItem value="Front Desk">Front Desk</SelectItem>
          <SelectItem value="Resort Office">Resort Office</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-zinc-950">Review Employees</h2>
      </div>

      <Tabs
        value={reviewFilter}
        onValueChange={(value) =>
          setReviewFilter(value as "all" | "included" | "excluded")
        }
      >
        <TabsList variant="line">
          <TabsTrigger value="all">All ({totals.totalEmployees})</TabsTrigger>
          <TabsTrigger value="included">
            Included ({totals.includedEmployees})
          </TabsTrigger>
          <TabsTrigger value="excluded">
            Excluded ({totals.excludedEmployees})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-2 md:grid-cols-3 xl:hidden">
        <DepartmentSelect value={department} onValueChange={setDepartment} />
        <Select value={employmentType} onValueChange={setEmploymentType}>
          <SelectTrigger className="w-full rounded-lg">
            <SelectValue placeholder="All Employment Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employment Types</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Probationary">Probationary</SelectItem>
            <SelectItem value="Contractual">Contractual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-full rounded-lg">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Head Office">Head Office</SelectItem>
            <SelectItem value="Front Desk">Front Desk</SelectItem>
            <SelectItem value="Resort Office">Resort Office</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ReusableDataTable
        columnToggleIds={[
          // "employeeId",
          "department",
          "employmentType",
          "location",
          "basicSalary",
          "allowances",
          "incentives",
          "commission",
          "bonus",
          "deductions",
          "netPay",
          "status",
        ]}
        columns={columns}
        data={employees}
        emptyState={{
          title: isLoading ? "Loading employees" : "No employees found",
          description: isLoading
            ? "Staff payroll records are loading."
            : "Try changing payroll filters or search term.",
        }}
        filterOptions={[{ label: "All", value: "all" }]}
        rowLabel="employees"
        searchPlaceholder="Search employee, department, or amount"
        toolbarActions={<>{toolbarActions}</>}
      />
    </section>
  );
}

function GeneratePayrollStep({
  backupPayrollData,
  createJournalEntry,
  department,
  frequency,
  includeGovernmentContributions,
  includeLeaveEncashment,
  lockPayrollAfterGeneration,
  notes,
  payDate,
  payPeriod,
  payPeriodRange,
  payType,
  payrollName,
  sendPayslipNotification,
  setBackupPayrollData,
  setCreateJournalEntry,
  setDepartment,
  setIncludeGovernmentContributions,
  setIncludeLeaveEncashment,
  setLockPayrollAfterGeneration,
  setNotes,
  setPayDate,
  setPayPeriodRange,
  setPayType,
  setPayrollName,
  setSendPayslipNotification,
  totals,
}: {
  backupPayrollData: boolean;
  createJournalEntry: boolean;
  department: string;
  frequency: PayFrequency;
  includeGovernmentContributions: boolean;
  includeLeaveEncashment: boolean;
  lockPayrollAfterGeneration: boolean;
  notes: string;
  payDate: string;
  payPeriod: PayPeriodOption;
  payPeriodRange: DateRange;
  payType: PayType;
  payrollName: string;
  sendPayslipNotification: boolean;
  setBackupPayrollData: (value: boolean) => void;
  setCreateJournalEntry: (value: boolean) => void;
  setDepartment: (value: string) => void;
  setIncludeGovernmentContributions: (value: boolean) => void;
  setIncludeLeaveEncashment: (value: boolean) => void;
  setLockPayrollAfterGeneration: (value: boolean) => void;
  setNotes: (value: string) => void;
  setPayDate: (value: string) => void;
  setPayPeriodRange: (value: DateRange) => void;
  setPayType: (value: PayType) => void;
  setPayrollName: (value: string) => void;
  setSendPayslipNotification: (value: boolean) => void;
  totals: PayrollTotals;
}) {
  return (
    <section className="space-y-5">
      <Card className="rounded-xl border-zinc-200 bg-white p-5">
        <h2 className="text-base font-bold text-zinc-950">
          Payroll Parameters
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field label="Payroll Name *">
            <Input
              className="rounded-lg"
              value={payrollName}
              onChange={(event) => setPayrollName(event.target.value)}
            />
          </Field>
          <Field label="Payroll Frequency">
            <Input className="rounded-lg" value={frequency} disabled />
          </Field>
          <Field label="Pay Period *">
            <PayPeriodRangePicker
              value={payPeriodRange}
              label={payPeriod.label}
              onChange={setPayPeriodRange}
            />
          </Field>
          <Field label="Cut-off Date">
            <Input
              className="rounded-lg"
              value={`${toDisplayDate(payPeriod.end)} 11:59 PM`}
              readOnly
            />
          </Field>
          <Field label="Payment Date *">
            <DatePicker
              value={payDate}
              onChange={setPayDate}
            />
          </Field>
          <Field label="Department Filter">
            <DepartmentSelect
              value={department}
              onValueChange={setDepartment}
            />
          </Field>
          <Field label="Pay Type *">
            <Select
              value={payType}
              onValueChange={(value) => setPayType(value as PayType)}
            >
              <SelectTrigger className="w-full rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Regular Payroll">Regular Payroll</SelectItem>
                <SelectItem value="Final Payroll">Final Payroll</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes (Optional)">
            <Textarea
              className="min-h-24 rounded-lg"
              placeholder="Enter any notes for this payroll run"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <AmountCard
          title="Earnings"
          totalLabel="Total Earnings"
          total={totals.totalEarnings}
          rows={[
            ["Basic Salary", totals.totalBasicSalary],
            ["Allowances", totals.totalAllowances],
            ["Incentives", totals.totalIncentives],
            ["Commission", totals.totalCommission],
            ["Bonus", totals.totalBonus],
            ["Overtime Pay", totals.totalOvertimePay],
          ]}
        />
        <AmountCard
          title="Deductions"
          totalLabel="Total Deductions"
          total={totals.totalDeductions}
          rows={[
            ["Leave Deduction", totals.totalLeaveDeductions],
            ["Undertime Deduction", totals.totalUndertimeDeductions],
            ["Government Deductions", totals.totalGovernmentDeductions],
            ["Other Deductions", totals.totalOtherDeductions],
          ]}
        />
        <AmountCard
          title="Summary"
          totalLabel="Net Pay"
          total={totals.totalNetPay}
          rows={[
            ["Total Employees", totals.totalEmployees],
            ["Included in Payroll", totals.includedEmployees],
            ["Excluded from Payroll", totals.excludedEmployees],
            ["Total Earnings", totals.totalEarnings],
            ["Total Deductions", totals.totalDeductions],
          ]}
        />
      </div>

      <Card className="rounded-xl border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold text-zinc-950">Additional Options</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckLabel
            label="Include Leave Encashment"
            checked={includeLeaveEncashment}
            onCheckedChange={setIncludeLeaveEncashment}
          />
          <CheckLabel
            label="Include Government Contributions"
            checked={includeGovernmentContributions}
            onCheckedChange={setIncludeGovernmentContributions}
          />
          <CheckLabel
            label="Send Payslip Notification"
            checked={sendPayslipNotification}
            onCheckedChange={setSendPayslipNotification}
          />
          <CheckLabel
            label="Lock Payroll After Generation"
            checked={lockPayrollAfterGeneration}
            onCheckedChange={setLockPayrollAfterGeneration}
          />
          <CheckLabel
            label="Create Journal Entry"
            checked={createJournalEntry}
            onCheckedChange={setCreateJournalEntry}
          />
          <CheckLabel
            label="Backup Payroll Data"
            checked={backupPayrollData}
            onCheckedChange={setBackupPayrollData}
          />
        </div>
      </Card>
    </section>
  );
}

function ConfirmStep({
  confirmed,
  isCreateMode,
  payDate,
  payPeriod,
  payType,
  payrollName,
  payrollRun,
  setConfirmed,
  totals,
}: {
  confirmed: boolean;
  isCreateMode: boolean;
  payDate: string;
  payPeriod: PayPeriodOption;
  payType: PayType;
  payrollName: string;
  payrollRun:
    | {
        generatedAt?: Date | string | null;
        generatedBy?: string | null;
      }
    | null
    | undefined;
  setConfirmed: (value: boolean) => void;
  totals: PayrollTotals;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-950">
            Confirm & Generate Payroll
          </h2>
          <p className="text-sm font-medium text-zinc-500">
            Review all details below. Once confirmed, payroll will be generated
            and locked.
          </p>
        </div>

        <Card className="p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="font-bold">You are ready to generate payroll</h3>
              <p className="text-sm">
                All checks passed. You can{" "}
                {isCreateMode ? "generate" : "update"} payroll for selected
                period.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="rounded-xl border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-bold text-zinc-950">Payroll Details</h3>
            <DetailGrid
              rows={[
                ["Payroll Name", payrollName],
                ["Pay Period", payPeriod.label],
                ["Payment Date", toDisplayDate(payDate)],
                ["Pay Type", payType],
                ["Employees Included", String(totals.includedEmployees)],
                ["Employees Excluded", String(totals.excludedEmployees)],
                ["Generated By", payrollRun?.generatedBy || "Admin"],
                [
                  "Date Generated",
                  payrollRun?.generatedAt
                    ? formatDateTime(payrollRun.generatedAt)
                    : isCreateMode
                      ? "Will be set on save"
                      : "--",
                ],
              ]}
            />
          </Card>
          <Card className="rounded-xl border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-bold text-zinc-950">Payroll Summary</h3>
            <DetailGrid
              rows={[
                ["Total Basic Salary", formatCurrency(totals.totalBasicSalary)],
                ["Total Allowances", formatCurrency(totals.totalAllowances)],
                ["Total Deductions", formatCurrency(totals.totalDeductions)],
                ["Total Net Pay", formatCurrency(totals.totalNetPay)],
              ]}
            />
          </Card>
        </div>

        <Card className="rounded-xl border-zinc-200 bg-white p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-zinc-600" />
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-zinc-950">
                  Please confirm to {isCreateMode ? "generate" : "update"}{" "}
                  payroll
                </h3>
                <p className="text-sm font-medium text-zinc-500">
                  Payroll will be locked and payslips will be available after
                  generation.
                </p>
              </div>
              <CheckLabel
                label="I have reviewed all details and confirm information is correct."
                checked={confirmed}
                onCheckedChange={setConfirmed}
              />
            </div>
          </div>
        </Card>
      </section>

      <aside className="space-y-5">
        <PayrollSummaryCard totals={totals} />
        <Card className="rounded-xl border-zinc-200 bg-white p-5">
          <h3 className="text-lg font-bold text-zinc-950">
            Validation Checklist
          </h3>
          <div className="space-y-4">
            {[
              "All employees have basic salary",
              "Pay period is valid",
              "Payment date is valid",
              "All required deductions configured",
              "Employee attendance data is available",
              "No validation errors found",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span className="truncate text-sm font-medium text-zinc-700">
                    {item}
                  </span>
                </div>
                <Badge>
                  Passed
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function PayrollConfiguration({
  backupPayrollData,
  createJournalEntry,
  department,
  frequency,
  includeAllowance,
  includeBasicSalary,
  includeBonus,
  includeCommission,
  includeGovernmentContributions,
  includeIncentives,
  includeLeaveDeduction,
  includeLeaveEncashment,
  includeOtPay,
  lockPayrollAfterGeneration,
  payDate,
  payPeriod,
  payPeriodRange,
  payType,
  roundingOption,
  sendPayslipNotification,
  setBackupPayrollData,
  setCreateJournalEntry,
  setDepartment,
  setFrequency,
  setIncludeAllowance,
  setIncludeBasicSalary,
  setIncludeBonus,
  setIncludeCommission,
  setIncludeGovernmentContributions,
  setIncludeIncentives,
  setIncludeLeaveDeduction,
  setIncludeLeaveEncashment,
  setIncludeOtPay,
  setLockPayrollAfterGeneration,
  setPayDate,
  setPayPeriodRange,
  setPayType,
  setRoundingOption,
  setSendPayslipNotification,
}: {
  backupPayrollData: boolean;
  createJournalEntry: boolean;
  department: string;
  frequency: PayFrequency;
  includeAllowance: boolean;
  includeBasicSalary: boolean;
  includeBonus: boolean;
  includeCommission: boolean;
  includeGovernmentContributions: boolean;
  includeIncentives: boolean;
  includeLeaveDeduction: boolean;
  includeLeaveEncashment: boolean;
  includeOtPay: boolean;
  lockPayrollAfterGeneration: boolean;
  payDate: string;
  payPeriod: PayPeriodOption;
  payPeriodRange: DateRange;
  payType: PayType;
  roundingOption: RoundingOption;
  sendPayslipNotification: boolean;
  setBackupPayrollData: (value: boolean) => void;
  setCreateJournalEntry: (value: boolean) => void;
  setDepartment: (value: string) => void;
  setFrequency: (value: PayFrequency) => void;
  setIncludeAllowance: (value: boolean) => void;
  setIncludeBasicSalary: (value: boolean) => void;
  setIncludeBonus: (value: boolean) => void;
  setIncludeCommission: (value: boolean) => void;
  setIncludeGovernmentContributions: (value: boolean) => void;
  setIncludeIncentives: (value: boolean) => void;
  setIncludeLeaveDeduction: (value: boolean) => void;
  setIncludeLeaveEncashment: (value: boolean) => void;
  setIncludeOtPay: (value: boolean) => void;
  setLockPayrollAfterGeneration: (value: boolean) => void;
  setPayDate: (value: string) => void;
  setPayPeriodRange: (value: DateRange) => void;
  setPayType: (value: PayType) => void;
  setRoundingOption: (value: RoundingOption) => void;
  setSendPayslipNotification: (value: boolean) => void;
}) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-zinc-950">
        Payroll Configuration
      </h2>
      <div className="space-y-5">
        <Field label="Pay Period">
          <PayPeriodRangePicker
            value={payPeriodRange}
            label={payPeriod.label}
            onChange={setPayPeriodRange}
          />
        </Field>
        <Field label="Pay Date">
          <DatePicker
            value={payDate}
            onChange={setPayDate}
          />
        </Field>
        <Field label="Payroll Type">
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as PayFrequency)}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Monthly">Monthly Payroll</SelectItem>
              <SelectItem value="Bi-weekly">Bi-weekly Payroll</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Pay Type">
          <Select
            value={payType}
            onValueChange={(value) => setPayType(value as PayType)}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Regular Payroll">Regular Payroll</SelectItem>
              <SelectItem value="Final Payroll">Final Payroll</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Department">
          <DepartmentSelect value={department} onValueChange={setDepartment} />
        </Field>
        <Field label="Include in Payroll">
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckLabel
              label="Basic Salary"
              checked={includeBasicSalary}
              onCheckedChange={setIncludeBasicSalary}
            />
            <CheckLabel
              label="Allowances"
              checked={includeAllowance}
              onCheckedChange={setIncludeAllowance}
            />
            <CheckLabel
              label="Incentives"
              checked={includeIncentives}
              onCheckedChange={setIncludeIncentives}
            />
            <CheckLabel
              label="Commission"
              checked={includeCommission}
              onCheckedChange={setIncludeCommission}
            />
            <CheckLabel
              label="Bonus"
              checked={includeBonus}
              onCheckedChange={setIncludeBonus}
            />
            <CheckLabel
              label="Overtime Pay"
              checked={includeOtPay}
              onCheckedChange={setIncludeOtPay}
            />
            <CheckLabel
              label="Leave Deductions"
              checked={includeLeaveDeduction}
              onCheckedChange={setIncludeLeaveDeduction}
            />
            <CheckLabel
              label="Government Contributions"
              checked={includeGovernmentContributions}
              onCheckedChange={setIncludeGovernmentContributions}
            />
            <CheckLabel
              label="Leave Encashment"
              checked={includeLeaveEncashment}
              onCheckedChange={setIncludeLeaveEncashment}
            />
          </div>
        </Field>
        <Field label="Rounding Option">
          <Select
            value={roundingOption}
            onValueChange={(value) => setRoundingOption(value as RoundingOption)}
          >
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nearest Peso">Round to Nearest Peso</SelectItem>
              <SelectItem value="None">No rounding</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Run Options">
          <div className="grid gap-3 sm:grid-cols-2">
            <CheckLabel
              label="Send Payslip Notification"
              checked={sendPayslipNotification}
              onCheckedChange={setSendPayslipNotification}
            />
            <CheckLabel
              label="Lock Payroll After Generation"
              checked={lockPayrollAfterGeneration}
              onCheckedChange={setLockPayrollAfterGeneration}
            />
            <CheckLabel
              label="Create Journal Entry"
              checked={createJournalEntry}
              onCheckedChange={setCreateJournalEntry}
            />
            <CheckLabel
              label="Backup Payroll Data"
              checked={backupPayrollData}
              onCheckedChange={setBackupPayrollData}
            />
          </div>
        </Field>
      </div>
    </Card>
  );
}

function PayrollSummaryCard({ totals }: { totals: PayrollTotals }) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-zinc-950">Payroll Summary</h2>
      <div className="space-y-4 text-sm text-zinc-600">
        <SummaryRow label="Employees Included" value={totals.includedEmployees} />
        <SummaryRow label="Employees Excluded" value={totals.excludedEmployees} />
        <SummaryRow
          label="Total Basic Salary"
          value={formatCurrency(totals.totalBasicSalary)}
        />
        <SummaryRow
          label="Total Allowances"
          value={formatCurrency(totals.totalAllowances)}
        />
        <SummaryRow
          label="Total Deductions"
          value={formatCurrency(totals.totalDeductions)}
        />
        <SummaryRow
          label="Total Net Pay"
          value={formatCurrency(totals.totalNetPay)}
        />
        <SummaryRow
          label="Employer Contributions"
          value={formatCurrency(totals.employerContributions)}
        />
        <SummaryRow
          label="Total Employer Cost"
          value={formatCurrency(totals.employerCost)}
        />
      </div>
    </Card>
  );
}

function AmountCard({
  rows,
  title,
  total,
  totalLabel,
}: {
  rows: [string, number][];
  title: string;
  total: number;
  totalLabel: string;
}) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white p-5">
      <h3 className="text-base font-bold text-zinc-950">{title}</h3>
      <p className="text-2xl font-bold text-zinc-950">
        {formatCurrency(total)}
      </p>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <SummaryRow
            key={label}
            label={label}
            value={
              label.includes("Employees") || label === "Included in Payroll"
                ? value
                : formatCurrency(value)
            }
          />
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-zinc-100 px-4 py-3">
        <SummaryRow label={totalLabel} value={formatCurrency(total)} strong />
      </div>
    </Card>
  );
}

function DetailGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-medium text-zinc-500">{label}</dt>
          <dd className="mt-1 font-semibold text-zinc-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DepartmentSelect({
  onValueChange,
  value,
}: {
  onValueChange: (value: string) => void;
  value: string;
}) {
  const trpc = useTRPC();
  const departments = useQuery({
    ...trpc.resort.departments.list.queryOptions(),
  });
  const departmentOptions = departments.data ?? [];

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={departments.isPending}
    >
      <SelectTrigger className="w-full rounded-lg">
        <SelectValue
          placeholder={
            departments.isPending ? "Loading departments..." : "All Departments"
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Departments</SelectItem>
        {departmentOptions.map((department) => (
          <SelectItem key={department.id} value={department.name}>
            {department.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PayPeriodRangePicker({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: DateRange) => void;
  value: DateRange;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-start gap-2 rounded-lg bg-white px-3 text-left text-sm font-normal text-zinc-950 shadow-xs"
        >
          <CalendarDays className="size-4 shrink-0 text-zinc-500" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={(range) => {
            if (range) {
              onChange(range);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function DatePicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-start gap-2 rounded-lg bg-white px-3 text-left text-sm font-normal text-zinc-950 shadow-xs"
        >
          <CalendarDays className="size-4 shrink-0 text-zinc-500" />
          <span>{toDisplayDate(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={parseDateInput(value)}
          onSelect={(date) => {
            if (date) {
              onChange(toDateInputValue(date));
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-zinc-700">{label}</Label>
      {children}
    </div>
  );
}

function CheckLabel({
  checked = false,
  label,
  onCheckedChange,
}: {
  checked?: boolean;
  label: string;
  onCheckedChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
      />
      {label}
    </label>
  );
}

function SummaryRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "font-bold text-zinc-950" : "text-zinc-600"}>
        {label}
      </span>
      <span className="font-bold text-zinc-950">{value}</span>
    </div>
  );
}

function getPayrollOptions(options: unknown) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    return {};
  }

  return options as Partial<{
    backupPayrollData: boolean;
    createJournalEntry: boolean;
    includeAllowance: boolean;
    includeBasicSalary: boolean;
    includeBonus: boolean;
    includeCommission: boolean;
    includeGovernmentContributions: boolean;
    includeIncentives: boolean;
    includeLeaveDeduction: boolean;
    includeLeaveEncashment: boolean;
    includeOtPay: boolean;
    lockPayrollAfterGeneration: boolean;
    roundingOption: RoundingOption;
    sendPayslipNotification: boolean;
  }>;
}

function getPayPeriodOptionForRun(run: {
  frequency: string;
  id?: string;
  payDate: Date | string;
  payPeriod: string;
  periodEnd: Date | string;
  periodStart: Date | string;
}) {
  const start = toDateInputValue(run.periodStart);
  const end = toDateInputValue(run.periodEnd);
  const payDate = toDateInputValue(run.payDate);
  const frequency: PayFrequency =
    run.frequency === "Bi-weekly" ? "Bi-weekly" : "Monthly";
  const existing = PAY_PERIODS.find(
    (period) => period.start === start && period.end === end,
  );

  if (existing) {
    return {
      custom: false,
      option: {
        ...existing,
        frequency,
        payDate,
      },
    };
  }

  return {
    custom: true,
    option: {
      end,
      frequency,
      label: run.payPeriod || `${toDisplayDate(start)} - ${toDisplayDate(end)}`,
      payDate,
      start,
      value: run.id ? `saved-${run.id}` : "saved-period",
    },
  };
}

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toPayPeriodOption(range: DateRange, frequency: PayFrequency) {
  const from = range.from ?? parseDateInput(DEFAULT_PAY_PERIOD.start);
  const to = range.to ?? from;
  const start = toDateInputValue(from);
  const end = toDateInputValue(to);

  return {
    end,
    frequency,
    label: `${toDisplayDate(start)} - ${toDisplayDate(end)}`,
    payDate: DEFAULT_PAY_PERIOD.payDate,
    start,
    value: `${start}_${end}`,
  };
}

function toDateInputValue(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return DEFAULT_PAY_PERIOD.payDate;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDisplayDate(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getKpis(step: WizardStep, totals: PayrollTotals): KpiGridItem[] {
  if (step === 2) {
    return [
      {
        title: "Total Employees",
        value: totals.totalEmployees,
        note: "Selected for payroll",
        icon: <Users className="size-4" />,
      },
      {
        title: "Included Employees",
        value: totals.includedEmployees,
        note: "Will be paid",
        icon: <CheckCircle2 className="size-4" />,
      },
      {
        title: "Excluded Employees",
        value: totals.excludedEmployees,
        note: "Not included",
        icon: <Users className="size-4" />,
      },
      {
        title: "Total Basic Salary",
        value: formatCurrency(totals.totalBasicSalary),
        note: "Total basic pay",
        icon: <WalletCards className="size-4" />,
      },
      {
        title: "Total Deductions",
        value: formatCurrency(totals.totalDeductions),
        note: "Total deductions",
        icon: <FileText className="size-4" />,
      },
    ];
  }

  return [
    {
      title: "Total Employees",
      value: totals.totalEmployees,
      note: "Active employees",
      icon: <Users className="size-4" />,
    },
    {
      title: "Gross Payroll",
      value: formatCurrency(totals.totalEarnings),
      note: "Total gross pay",
      icon: <WalletCards className="size-4" />,
    },
    {
      title: "Total Deductions",
      value: formatCurrency(totals.totalDeductions),
      note: "Total deductions",
      icon: <FileText className="size-4" />,
    },
    {
      title: "Net Payroll",
      value: formatCurrency(totals.totalNetPay),
      note: "Total net pay",
      icon: <CheckCircle2 className="size-4" />,
    },
    {
      title: "Employer Cost",
      value: formatCurrency(totals.employerCost),
      note: "Incl. contributions",
      icon: <WalletCards className="size-4" />,
    },
  ];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
