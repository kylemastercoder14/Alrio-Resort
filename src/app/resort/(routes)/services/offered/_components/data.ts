export type OfferedServiceStatus = "Active" | "Inactive";

export type OfferedServiceBillingType =
  | "Fixed price"
  | "Per hour"
  | "Per guest"
  | "Custom quote";

export type OfferedService = {
  baseCharge: string;
  billingType: OfferedServiceBillingType;
  bookingLeadTime: string;
  category: string;
  code: string;
  createdAt: Date | string;
  description: string;
  duration: string;
  feeNote: string;
  id: string;
  internalNotes: string;
  provider: string;
  showOnBookingPage: boolean;
  status: OfferedServiceStatus;
  title: string;
  updatedAt: Date | string;
};

export const SERVICE_CATEGORIES = [
  "Maintenance",
  "Events",
  "Wellness",
  "Transport",
  "Food & Beverage",
  "Guest Experience",
];

export const SERVICE_BILLING_TYPES: OfferedServiceBillingType[] = [
  "Fixed price",
  "Per hour",
  "Per guest",
  "Custom quote",
];

export const SERVICE_STATUS_STYLE: Record<OfferedServiceStatus, string> = {
  Active: "border-black bg-black text-white",
  Inactive: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

export const OFFERED_SERVICES: OfferedService[] = [
  {
    id: "svc_1001",
    code: "SVC-1001",
    title: "Aircon deep cleaning",
    category: "Maintenance",
    provider: "North Shore HVAC",
    baseCharge: "1850",
    billingType: "Fixed price",
    duration: "2 hours",
    bookingLeadTime: "24 hours",
    feeNote: "Includes 5% platform fee",
    description: "Deep cleaning for split-type room air conditioning units.",
    internalNotes: "Materials billed by provider if extra parts are needed.",
    showOnBookingPage: true,
    status: "Active",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-17",
  },
  {
    id: "svc_1002",
    code: "SVC-1002",
    title: "Event styling setup",
    category: "Events",
    provider: "Island Events Crew",
    baseCharge: "8500",
    billingType: "Custom quote",
    duration: "4 hours",
    bookingLeadTime: "72 hours",
    feeNote: "Basic labor charge only",
    description: "Styling crew for resort events, parties, and small receptions.",
    internalNotes: "Final quote depends on theme, materials, and event scale.",
    showOnBookingPage: true,
    status: "Active",
    createdAt: "2026-07-03",
    updatedAt: "2026-07-17",
  },
  {
    id: "svc_1003",
    code: "SVC-1003",
    title: "Pool pump inspection",
    category: "Maintenance",
    provider: "AquaWorks",
    baseCharge: "2400",
    billingType: "Fixed price",
    duration: "90 minutes",
    bookingLeadTime: "12 hours",
    feeNote: "Materials billed by provider",
    description: "Inspection and diagnostics for pool pump issues.",
    internalNotes: "Do not book during peak swim hours.",
    showOnBookingPage: false,
    status: "Active",
    createdAt: "2026-07-04",
    updatedAt: "2026-07-17",
  },
  {
    id: "svc_1004",
    code: "SVC-1004",
    title: "Spa massage partner",
    category: "Wellness",
    provider: "Bamboo Spa",
    baseCharge: "1200",
    billingType: "Per guest",
    duration: "1 hour",
    bookingLeadTime: "24 hours",
    feeNote: "Includes 5% platform fee",
    description: "Partner massage service for in-room or spa area requests.",
    internalNotes: "Temporarily inactive while provider renews agreement.",
    showOnBookingPage: false,
    status: "Inactive",
    createdAt: "2026-07-06",
    updatedAt: "2026-07-17",
  },
  {
    id: "svc_1005",
    code: "SVC-1005",
    title: "Private van transfer",
    category: "Transport",
    provider: "Resort Shuttle PH",
    baseCharge: "3800",
    billingType: "Fixed price",
    duration: "One-way",
    bookingLeadTime: "24 hours",
    feeNote: "Location surcharge possible",
    description: "Private van pickup or drop-off for guest transfers.",
    internalNotes: "Confirm pickup point before dispatch.",
    showOnBookingPage: true,
    status: "Active",
    createdAt: "2026-07-08",
    updatedAt: "2026-07-17",
  },
];
