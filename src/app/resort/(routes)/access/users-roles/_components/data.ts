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
  "Dining supervisor",
  "Marketing assistant",
  "Guest relations",
  "Auditor",
  "Maintenance coordinator",
  "Receptionist",
  "Night manager",
  "HR coordinator",
] as const;

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "workspaceAccess",
    label: "Workspace Access",
    groups: [
      {
        id: "dashboard",
        label: "Dashboard",
        events: [{ id: "dashboard.view", label: "dashboard.view" }],
      },
      {
        id: "usersRoles",
        label: "Users & Roles",
        events: [
          { id: "usersRoles.view", label: "usersRoles.view" },
          { id: "usersRoles.create", label: "usersRoles.create" },
          { id: "usersRoles.update", label: "usersRoles.update" },
          { id: "usersRoles.delete", label: "usersRoles.delete" },
          { id: "usersRoles.permissions.manage", label: "usersRoles.permissions.manage" },
        ],
      },
      {
        id: "departments",
        label: "Departments",
        events: [
          { id: "departments.view", label: "departments.view" },
          { id: "departments.manage", label: "departments.manage" },
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
          { id: "reservations.view", label: "reservations.view" },
          { id: "reservations.create", label: "reservations.create" },
          { id: "reservations.update", label: "reservations.update" },
          { id: "reservations.cancel", label: "reservations.cancel" },
        ],
      },
      {
        id: "guestExperience",
        label: "Guest Experience",
        events: [
          { id: "guestExperience.inquiries.view", label: "guestExperience.inquiries.view" },
          { id: "guestExperience.profiles.manage", label: "guestExperience.profiles.manage" },
          { id: "guestExperience.messages.send", label: "guestExperience.messages.send" },
        ],
      },
      {
        id: "leadsPipeline",
        label: "Leads Pipeline",
        events: [
          { id: "leads.view", label: "leads.view" },
          { id: "leads.assign", label: "leads.assign" },
          { id: "leads.convert", label: "leads.convert" },
        ],
      },
      {
        id: "invoices",
        label: "Invoices",
        events: [
          { id: "invoices.view", label: "invoices.view" },
          { id: "invoices.create", label: "invoices.create" },
          { id: "invoices.reminders.send", label: "invoices.reminders.send" },
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
          { id: "finance.revenueExpenses.view", label: "finance.revenueExpenses.view" },
          { id: "finance.cashFlow.view", label: "finance.cashFlow.view" },
          { id: "finance.moneyStatus.view", label: "finance.moneyStatus.view" },
          { id: "finance.receipts.manage", label: "finance.receipts.manage" },
          { id: "finance.export", label: "finance.export" },
        ],
      },
      {
        id: "hr",
        label: "HR",
        events: [
          { id: "hr.staffRecords.view", label: "hr.staffRecords.view" },
          { id: "hr.staffRecords.manage", label: "hr.staffRecords.manage" },
          { id: "hr.timekeeping.view", label: "hr.timekeeping.view" },
          { id: "hr.scheduling.manage", label: "hr.scheduling.manage" },
          { id: "hr.leaveRequests.view", label: "hr.leaveRequests.view" },
          { id: "hr.leaveRequests.manage", label: "hr.leaveRequests.manage" },
          { id: "hr.otUndertime.view", label: "hr.otUndertime.view" },
          { id: "hr.otUndertime.manage", label: "hr.otUndertime.manage" },
          { id: "payroll.view", label: "payroll.view" },
          { id: "payroll.manage", label: "payroll.manage" },
        ],
      },
      {
        id: "operations",
        label: "Operations",
        events: [
          { id: "operations.reception.manage", label: "operations.reception.manage" },
          { id: "operations.housekeeping.manage", label: "operations.housekeeping.manage" },
          { id: "operations.maintenance.manage", label: "operations.maintenance.manage" },
          { id: "operations.laundry.manage", label: "operations.laundry.manage" },
          { id: "operations.inventory.manage", label: "operations.inventory.manage" },
        ],
      },
    ],
  },
  {
    id: "appsGrowth",
    label: "Apps & Growth",
    groups: [
      {
        id: "dining",
        label: "Dining",
        events: [
          { id: "dining.kitchenOrders.manage", label: "dining.kitchenOrders.manage" },
          { id: "dining.waiterOrders.manage", label: "dining.waiterOrders.manage" },
          { id: "dining.checkoutCharges.manage", label: "dining.checkoutCharges.manage" },
        ],
      },
      {
        id: "services",
        label: "Services",
        events: [
          { id: "services.view", label: "services.view" },
          { id: "services.manage", label: "services.manage" },
          { id: "rooms.view", label: "rooms.view" },
          { id: "rooms.manage", label: "rooms.manage" },
          { id: "amenities.view", label: "amenities.view" },
          { id: "amenities.manage", label: "amenities.manage" },
        ],
      },
      {
        id: "websiteMarketing",
        label: "Website & Marketing",
        events: [
          { id: "websiteBuilder.manage", label: "websiteBuilder.manage" },
          { id: "marketing.ads.manage", label: "marketing.ads.manage" },
          { id: "marketing.leadsPipeline.manage", label: "marketing.leadsPipeline.manage" },
        ],
      },
      {
        id: "analyticsGrowth",
        label: "Analytics & Growth",
        events: [
          { id: "analytics.reports.view", label: "analytics.reports.view" },
          { id: "aiGrowth.view", label: "aiGrowth.view" },
          { id: "aiGrowth.manage", label: "aiGrowth.manage" },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        events: [
          { id: "settings.general.manage", label: "settings.general.manage" },
          { id: "settings.notifications.manage", label: "settings.notifications.manage" },
          { id: "settings.billing.manage", label: "settings.billing.manage" },
          { id: "settings.integrations.manage", label: "settings.integrations.manage" },
        ],
      },
    ],
  },
];
