export type UserRoleStatus = "Active" | "Invited" | "Suspended";

export type UserRoleRecord = {
  email: string;
  id: string;
  image?: string;
  initials: string;
  lastActive: string;
  name: string;
  phone: string;
  recordType?: "staff" | "invitation";
  role: string;
  status: UserRoleStatus;
};

export type PermissionEvent = {
  id: string;
  label: string;
};

export type PermissionGroup = {
  events: PermissionEvent[];
  id: string;
  label: string;
};

export type PermissionModule = {
  groups: PermissionGroup[];
  id: string;
  label: string;
};

export const USER_ROLE_KPI = [
  {
    title: "Total users",
    value: "14",
    note: "Across 6 active roles",
  },
  {
    title: "Active users",
    value: "10",
    note: "Ready to access workspace",
  },
  {
    title: "Invites pending",
    value: "3",
    note: "Waiting for acceptance",
  },
  {
    title: "Permission templates",
    value: "5",
    note: "Reusable access presets",
  },
] as const;

export const USER_ROLE_TABLE_DATA: UserRoleRecord[] = [
  {
    id: "USR-1001",
    name: "Kyle Anderson",
    email: "kyle.anderson@alrioprivateresort.com",
    role: "Owner",
    status: "Active",
    lastActive: "Today, 9:12 AM",
    phone: "+63 912 323 4345",
    initials: "KA",
  },
  {
    id: "USR-1002",
    name: "Mara Santos",
    email: "mara.santos@alrioprivateresort.com",
    role: "Reservations manager",
    status: "Active",
    lastActive: "Today, 8:40 AM",
    phone: "+63 917 440 1200",
    initials: "MS",
  },
  {
    id: "USR-1003",
    name: "Rafael Cruz",
    email: "rafael.cruz@alrioprivateresort.com",
    role: "Finance officer",
    status: "Active",
    lastActive: "Yesterday, 4:22 PM",
    phone: "+63 918 775 9021",
    initials: "RC",
  },
  {
    id: "USR-1004",
    name: "Andrea Lim",
    email: "andrea.lim@alrioprivateresort.com",
    role: "Housekeeping lead",
    status: "Invited",
    lastActive: "Invite sent Jul 10",
    phone: "+63 915 008 7712",
    initials: "AL",
  },
  {
    id: "USR-1005",
    name: "Paolo Reyes",
    email: "paolo.reyes@alrioprivateresort.com",
    role: "Dining supervisor",
    status: "Active",
    lastActive: "Jul 11, 2:16 PM",
    phone: "+63 919 112 8821",
    initials: "PR",
  },
  {
    id: "USR-1006",
    name: "Celina Gomez",
    email: "celina.gomez@alrioprivateresort.com",
    role: "Marketing assistant",
    status: "Invited",
    lastActive: "Invite sent Jul 9",
    phone: "+63 916 221 9088",
    initials: "CG",
  },
  {
    id: "USR-1007",
    name: "Daniel Yu",
    email: "daniel.yu@alrioprivateresort.com",
    role: "Guest relations",
    status: "Active",
    lastActive: "Jul 10, 6:30 PM",
    phone: "+63 922 610 3344",
    initials: "DY",
  },
  {
    id: "USR-1008",
    name: "Bianca Flores",
    email: "bianca.flores@alrioprivateresort.com",
    role: "Auditor",
    status: "Suspended",
    lastActive: "Jun 29, 1:05 PM",
    phone: "+63 927 019 1180",
    initials: "BF",
  },
  {
    id: "USR-1009",
    name: "Marco Villanueva",
    email: "marco.villanueva@alrioprivateresort.com",
    role: "Maintenance coordinator",
    status: "Active",
    lastActive: "Jul 8, 11:48 AM",
    phone: "+63 917 880 4411",
    initials: "MV",
  },
  {
    id: "USR-1010",
    name: "Nina Ramos",
    email: "nina.ramos@alrioprivateresort.com",
    role: "Receptionist",
    status: "Active",
    lastActive: "Today, 7:55 AM",
    phone: "+63 935 407 6655",
    initials: "NR",
  },
  {
    id: "USR-1011",
    name: "Oscar Bautista",
    email: "oscar.bautista@alrioprivateresort.com",
    role: "Night manager",
    status: "Invited",
    lastActive: "Invite sent Jul 7",
    phone: "+63 936 880 1290",
    initials: "OB",
  },
  {
    id: "USR-1012",
    name: "Lara Mendoza",
    email: "lara.mendoza@alrioprivateresort.com",
    role: "HR coordinator",
    status: "Active",
    lastActive: "Jul 11, 9:03 AM",
    phone: "+63 939 201 7644",
    initials: "LM",
  },
] as const;

export const USER_ROLE_OPTIONS = [
  "Reservations manager",
  "Finance officer",
  "Housekeeping lead",
  "Guest relations officer",
  "Auditor",
  "Maintenance coordinator",
  "Receptionist",
  "Night manager",
  "HR coordinator",
  "Information Technology Officer",
  "Resort operations manager",
  "General manager",
] as const;

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "workspaceAccess",
    label: "Workspace Access",
    groups: [
      {
        id: "dashboard",
        label: "Dashboard",
        events: [{ id: "dashboard.view", label: "View dashboard" }],
      },
      {
        id: "usersRoles",
        label: "Users & Roles",
        events: [
          { id: "usersRoles.view", label: "View staff and invitations" },
          { id: "usersRoles.create", label: "Invite staff" },
          { id: "usersRoles.update", label: "Update staff access" },
          { id: "usersRoles.delete", label: "Remove staff access" },
          { id: "usersRoles.permissions.manage", label: "Manage roles and permissions" },
        ],
      },
      {
        id: "departments",
        label: "Departments",
        events: [
          { id: "departments.view", label: "View departments" },
          { id: "departments.manage", label: "Manage departments" },
        ],
      },
    ],
  },
  {
    id: "bookingSales",
    label: "Booking & Sales",
    groups: [
      {
        id: "reservations",
        label: "Reservations",
        events: [
          { id: "reservations.view", label: "View bookings and calendar" },
          { id: "reservations.create", label: "Create bookings" },
          { id: "reservations.update", label: "Update booking status and payments" },
        ],
      },
      {
        id: "guests",
        label: "Guests",
        events: [
          { id: "guestExperience.profiles.manage", label: "Manage guest profiles and account status" },
        ],
      },
      {
        id: "leadsPipeline",
        label: "Leads Pipeline",
        events: [
          { id: "leads.view", label: "View enquiries and leads" },
          { id: "leads.assign", label: "Manage and reply to leads" },
          { id: "leads.convert", label: "Convert leads to bookings" },
        ],
      },
      {
        id: "invoices",
        label: "Invoices",
        events: [
          { id: "invoices.view", label: "View invoices" },
          { id: "invoices.create", label: "Create and manage invoices" },
          { id: "invoices.reminders.send", label: "Send invoice reminders" },
        ],
      },
    ],
  },
  {
    id: "financeHrOps",
    label: "Finance, HR & Ops",
    groups: [
      {
        id: "finance",
        label: "Finance",
        events: [
          { id: "finance.revenueExpenses.view", label: "View revenue and expenses" },
          { id: "finance.cashFlow.view", label: "View cash flow" },
          { id: "finance.moneyStatus.view", label: "View money status" },
          { id: "finance.receipts.manage", label: "Manage receipts and transactions" },
          { id: "finance.export", label: "Export finance reports" },
        ],
      },
      {
        id: "hr",
        label: "HR",
        events: [
          { id: "hr.staffRecords.view", label: "View staff records" },
          { id: "hr.staffRecords.manage", label: "Manage staff records" },
          { id: "hr.timekeeping.view", label: "View timekeeping" },
          { id: "hr.timekeeping.manage", label: "Manage timekeeping" },
          { id: "hr.scheduling.manage", label: "Manage staff schedules" },
          { id: "hr.leaveRequests.view", label: "View leave requests" },
          { id: "hr.leaveRequests.manage", label: "Manage leave requests" },
          { id: "hr.otUndertime.view", label: "View overtime and undertime" },
          { id: "hr.otUndertime.manage", label: "Manage overtime and undertime" },
          { id: "payroll.view", label: "View payroll" },
          { id: "payroll.manage", label: "Manage payroll" },
        ],
      },
      {
        id: "operations",
        label: "Operations",
        events: [
          { id: "operations.reception.manage", label: "Manage front desk" },
          { id: "operations.housekeeping.manage", label: "Manage housekeeping" },
          { id: "operations.maintenance.manage", label: "Manage maintenance" },
          { id: "operations.laundry.manage", label: "Manage laundry" },
          { id: "operations.inventory.manage", label: "Manage inventory" },
        ],
      },
    ],
  },
  {
    id: "resortServices",
    label: "Resort Services & Inclusions",
    groups: [
      {
        id: "servicesAndPackages",
        label: "Services and packages",
        events: [
          { id: "services.view", label: "View services and packages" },
          { id: "services.manage", label: "Manage services and packages" },
        ],
      },
      {
        id: "rooms",
        label: "Rooms",
        events: [
          { id: "rooms.view", label: "View rooms" },
          { id: "rooms.manage", label: "Manage rooms" },
        ],
      },
      {
        id: "amenities",
        label: "Amenities",
        events: [
          { id: "amenities.view", label: "View amenities" },
          { id: "amenities.manage", label: "Manage amenities" },
        ],
      },
    ],
  },
  {
    id: "reportsAndSettings",
    label: "Reports & Settings",
    groups: [
      {
        id: "reports",
        label: "Reports and analytics",
        events: [
          { id: "analytics.reports.view", label: "View reports and analytics" },
        ],
      },
      {
        id: "brandingSettings",
        label: "Branding and landing page",
        events: [
          { id: "settings.branding.manage", label: "Manage landing page text, imagery, and Facebook feedback" },
        ],
      },
      {
        id: "developerSettings",
        label: "Developer settings",
        events: [
          { id: "settings.developer.manage", label: "Manage secure integrations and runtime settings" },
        ],
      },
    ],
  },
];

export const CURRENT_PERMISSION_IDS = PERMISSION_MODULES.flatMap((module) =>
  module.groups.flatMap((group) => group.events.map((event) => event.id)),
);
