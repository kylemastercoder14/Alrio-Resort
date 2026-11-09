"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck2,
  CalendarPlus,
  ClipboardList,
  Clock3,
  Hotel,
  Inbox,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import { ReusableDataTable } from "@/components/reusable/data-table";
import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useTRPC } from "@/trpc/client";

type ReservationRow = {
  id: string;
  adults: number;
  checkIn: Date | string;
  checkOut: Date | string;
  children: number;
  createdAt: Date | string;
  guestName: string;
  nights: number;
  roomCode: string;
  roomName: string;
  roomType: string;
  status: string;
  totalAmount: string;
};

type InvoiceRow = {
  balanceDue: string;
  dueDate: Date | string;
  id: string;
  status: string;
};

const occupancyChartConfig = {
  available: { label: "Available", color: "#e4e4e7" },
  occupied: { label: "Occupied", color: "#09090b" },
} satisfies ChartConfig;

const revenueChartConfig = {
  expenses: { label: "Expenses", color: "#a1a1aa" },
  revenue: { label: "Revenue", color: "#09090b" },
} satisfies ChartConfig;

const quickActions = [
  {
    description: "Create room reservation",
    href: "/resort/reservations/new",
    icon: CalendarPlus,
    label: "Create booking",
  },
  {
    description: "Walk-in, check-in, checkout",
    href: "/resort/operations/reception",
    icon: ClipboardList,
    label: "Front desk",
  },
  {
    description: "Room status board",
    href: "/resort/operations/housekeeping",
    icon: BedDouble,
    label: "Housekeeping",
  },
  {
    description: "Billing and collections",
    href: "/resort/invoices",
    icon: ReceiptText,
    label: "Invoices",
  },
];

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    currency: "PHP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function dateKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function statusClassName(status: string) {
  if (status === "Checked in" || status === "Confirmed" || status === "Paid") {
    return "border-black bg-black text-white";
  }
  if (status === "Checked out") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  if (status === "Canceled" || status === "Overdue") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-zinc-200 bg-white text-zinc-950";
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="rounded-xl h-fit border-zinc-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-zinc-950">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const analytics = useQuery({
    ...trpc.resort.analytics.summary.queryOptions({ period: "week" }),
  });
  const reservationsQuery = useQuery({
    ...trpc.resort.reservations.list.queryOptions(),
  });
  const invoicesQuery = useQuery({
    ...trpc.resort.invoices.list.queryOptions(),
  });

  const reservations = useMemo(
    () => (reservationsQuery.data ?? []) as ReservationRow[],
    [reservationsQuery.data],
  );
  const invoices = useMemo(
    () => (invoicesQuery.data ?? []) as InvoiceRow[],
    [invoicesQuery.data],
  );
  const todayDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const today = dateKey(todayDate);

  const dashboardStats = useMemo(() => {
    const arrivalsToday = reservations.filter(
      (item) => dateKey(item.checkIn) === today && item.status !== "Canceled",
    ).length;
    const inHouse = reservations.filter(
      (item) => item.status === "Checked in",
    ).length;
    const dueSoon = invoices.filter((invoice) => {
      const due = new Date(invoice.dueDate).getTime();
      const diffDays = (due - todayDate.getTime()) / 86_400_000;
      return invoice.status !== "Paid" && diffDays >= 0 && diffDays <= 3;
    }).length;
    const openBalance = invoices
      .filter((invoice) => invoice.status !== "Paid" && invoice.status !== "Void")
      .reduce((total, invoice) => total + toNumber(invoice.balanceDue), 0);

    return {
      arrivalsToday,
      dueSoon,
      inHouse,
      openBalance,
    };
  }, [invoices, reservations, today, todayDate]);

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        icon: <Hotel className="size-4" />,
        note: analytics.data?.kpi[0]?.note ?? "7-day average",
        title: "Occupancy",
        value: analytics.data?.kpi[0]?.value ?? "--",
      },
      {
        icon: <CalendarCheck2 className="size-4" />,
        note: "Arriving today",
        title: "Arrivals",
        value: dashboardStats.arrivalsToday,
      },
      {
        icon: <Users className="size-4" />,
        note: "Currently checked in",
        title: "In-house guests",
        value: dashboardStats.inHouse,
      },
      {
        icon: <WalletCards className="size-4" />,
        note: `${dashboardStats.dueSoon} due soon`,
        title: "Open balance",
        value: formatMoney(dashboardStats.openBalance),
      },
    ],
    [analytics.data?.kpi, dashboardStats],
  );

  const recentBookings = useMemo(
    () =>
      [...reservations]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 8),
    [reservations],
  );

  const bookingColumns = useMemo<ColumnDef<ReservationRow>[]>(
    () => [
      {
        accessorKey: "guestName",
        header: "Guest",
        cell: ({ row }) => (
          <div>
            <p className="font-bold text-zinc-950">{row.original.guestName}</p>
            <p className="text-xs font-medium text-muted-foreground">
              {row.original.adults} adults, {row.original.children} children
            </p>
          </div>
        ),
      },
      {
        accessorKey: "roomName",
        header: "Room",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-zinc-950">
              {row.original.roomCode} - {row.original.roomName}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.roomType}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "checkIn",
        header: "Stay",
        cell: ({ row }) => (
          <span>
            {formatDate(row.original.checkIn)} - {formatDate(row.original.checkOut)}
          </span>
        ),
      },
      {
        accessorKey: "nights",
        header: "Nights",
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatMoney(toNumber(row.original.totalAmount)),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={statusClassName(row.original.status)}
            variant="outline"
          >
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  const taskRows = analytics.data?.taskData ?? [];
  const topTasks = [...taskRows].sort((a, b) => a.completed - b.completed).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => router.push("/resort/analytics")}
          >
            View analytics
          </Button>
          <Button
            type="button"
            size="xs"
            onClick={() => router.push("/resort/reservations/new")}
          >
            <CalendarPlus className="size-4" />
            Create booking
          </Button>
        </div>
      </div>

      <KpiGrid items={kpiItems} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard
            description="Room capacity and occupied nights for this week."
            title="Occupancy trend"
          >
            <ChartContainer
              className="h-[280px] w-full"
              config={occupancyChartConfig}
            >
              <BarChart data={analytics.data?.occupancyData ?? []} barGap={4}>
                <CartesianGrid
                  stroke="#f4f4f5"
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="day"
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickLine={false}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "#fafafa" }}
                />
                <Bar
                  dataKey="occupied"
                  fill="var(--color-occupied)"
                  maxBarSize={28}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="available"
                  fill="var(--color-available)"
                  maxBarSize={28}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </ChartCard>

          <ChartCard
            description="Revenue and expenses from cleared finance entries."
            title="Revenue trend"
          >
            <ChartContainer
              className="h-[280px] w-full"
              config={revenueChartConfig}
            >
              <ComposedChart data={analytics.data?.revenueData ?? []}>
                <defs>
                  <linearGradient id="dashboardRevenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#09090b" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#09090b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#f4f4f5"
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="revenue"
                  fill="url(#dashboardRevenueFill)"
                  stroke="none"
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 4 }}
                  dataKey="revenue"
                  dot={false}
                  stroke="var(--color-revenue)"
                  strokeWidth={2.5}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 4 }}
                  dataKey="expenses"
                  dot={false}
                  stroke="var(--color-expenses)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  type="monotone"
                />
              </ComposedChart>
            </ChartContainer>
          </ChartCard>
        </div>

        <div className="space-y-5">
          <Card className="rounded-xl border-zinc-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-zinc-950">Quick actions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Common front desk and operating flows.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 text-left transition hover:bg-zinc-50"
                    key={action.href}
                    onClick={() => router.push(action.href)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-zinc-950">
                          {action.label}
                        </span>
                        <span className="block truncate text-xs font-medium text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-zinc-400" />
                  </button>
                );
              })}
            </div>
          </Card>

        </div>
      </section>

      <Card className="overflow-hidden rounded-xl gap-0! pt-0! border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Recent bookings
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest reservations saved from booking and reception flows.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/resort/reservations/calendar")}
            >
              <Clock3 className="size-4" />
              View calendar
            </Button>
          </div>
        </div>
        <ReusableDataTable
          columns={bookingColumns}
          data={recentBookings}
          emptyState={{
            description: "Create a booking to populate this dashboard table.",
            icon: Inbox,
            title: "No bookings yet",
          }}
          filterOptions={[
            { label: "All", value: "all" },
            { label: "Pending", value: "Pending" },
            { label: "Confirmed", value: "Confirmed" },
            { label: "Checked in", value: "Checked in" },
            { label: "Checked out", value: "Checked out" },
          ]}
          rowLabel="bookings"
          searchPlaceholder="Search guest, room, status, or date"
        />
      </Card>
    </div>
  );
}
