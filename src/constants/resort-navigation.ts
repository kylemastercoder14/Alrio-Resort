export const RESORT_NAVIGATION_DATA = [
  // ===== Overview =====
  {
    label: "Dashboard",
    href: "/resort/dashboard",
    icon: "House",
    group: "Overview",
  },

  // ===== Foundation & Access =====
  {
    label: "Workspace Access",
    href: "/resort/access",
    icon: "ShieldCheck",
    group: "Foundation & Access",
    children: [
      { label: "Users", href: "/resort/access/users" },
      { label: "Roles", href: "/resort/access/roles" },
      { label: "Departments", href: "/resort/access/departments" },
    ],
  },

  // ===== Booking & Sales =====
  {
    label: "Reservations",
    href: "/resort/reservations",
    icon: "CalendarClock",
    group: "Booking & Sales",
    children: [
      { label: "Calendar", href: "/resort/reservations/calendar" },
      { label: "Create Booking", href: "/resort/reservations/new" },
    ],
  },
  {
    label: "Guests",
    href: "/resort/guests",
    icon: "Guests",
    group: "Booking & Sales",
  },
  {
    label: "Services",
    href: "/resort/services",
    icon: "Wrench",
    group: "Booking & Sales",
    children: [
      { label: "Services Offered", href: "/resort/services/offered" },
      { label: "Rooms", href: "/resort/services/rooms" },
      { label: "Amenities", href: "/resort/services/amenities" },
      { label: "Packages", href: "/resort/services/packages" },
    ],
  },
  {
    label: "Leads Pipeline",
    href: "/resort/leads",
    icon: "Flame",
    group: "Booking & Sales",
  },
  {
    label: "Invoices",
    href: "/resort/invoices",
    icon: "FileText",
    group: "Booking & Sales",
    children: [
      { label: "Create Invoice", href: "/resort/invoices/new" },
      { label: "Payment Reminders", href: "/resort/invoices/reminders" },
    ],
  },

  // ===== Finance, HR & Ops =====
  {
    label: "Finance",
    href: "/resort/finance",
    icon: "CreditCard",
    group: "Finance, HR & Ops",
    children: [
      { label: "Revenue & Expenses", href: "/resort/finance/revenue-expenses" },
      { label: "Cash Flow", href: "/resort/finance/cash-flow" },
      { label: "Money Status", href: "/resort/finance/money-status" },
      { label: "Receipts", href: "/resort/finance/receipts" },
      { label: "Transaction Export", href: "/resort/finance/export" },
    ],
  },
  {
    label: "HR",
    href: "/resort/hr",
    icon: "User",
    group: "Finance, HR & Ops",
    children: [
      { label: "Staff Records", href: "/resort/hr/staff-records" },
      { label: "Timekeeping", href: "/resort/hr/timekeeping" },
      { label: "Scheduling", href: "/resort/hr/scheduling" },
      { label: "Leave Requests", href: "/resort/hr/leave-requests" },
      { label: "Overtime/Undertime", href: "/resort/hr/ot-undertime" },
      { label: "Generate Payroll", href: "/resort/hr/generate-payroll" },
    ],
  },
  {
    label: "Operations",
    href: "/resort/operations",
    icon: "Wrench",
    group: "Finance, HR & Ops",
    children: [
      { label: "Reception", href: "/resort/operations/reception" },
      { label: "Housekeeping", href: "/resort/operations/housekeeping" },
      { label: "Maintenance", href: "/resort/operations/maintenance" },
      { label: "Laundry", href: "/resort/operations/laundry" },
      { label: "Inventory", href: "/resort/operations/inventory" },
    ],
  },

  // ===== Analytics & Growth =====
  {
    label: "Reports & Analytics",
    href: "/resort/analytics",
    icon: "BarChart3",
    group: "Analytics & Growth",
  },
] as const;
