import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateRandomString, hashPassword } from "better-auth/crypto";
import { Prisma } from "@/generated/prisma/client";
import { guestProfileSchema } from "@/lib/guest-profile";
import {
  DEFAULT_LANDING_BRANDING,
  landingBrandingSchema,
  parseLandingBranding,
} from "@/lib/landing-branding";
import { geographyRouter } from "./geography";
import {
  sendReservationConfirmationEmail,
  sendStaffInviteEmail,
} from "@/lib/invite-email";
import {
  sendInvoiceEmailNow,
  sendInvoiceReminderNow,
} from "@/lib/invoice-reminders";
import { sendPayrollPayslipEmail } from "@/lib/payroll-email";
import {
  generateInviteToken,
  getInviteExpiresAt,
  hashInviteToken,
} from "@/lib/invite-token";
import { FULL_PERMISSION, hasResortPermission } from "@/lib/resort-permissions";
import {
  extractMessengerTargetDate,
  fetchMessengerProfile,
  inferMessengerLeadStage,
} from "@/lib/messenger-leads";
import { prisma } from "@/lib/prisma";
import { getPublicResortLocations } from "@/lib/public-resort-locations";
import {
  clearRuntimeSetting,
  getRuntimeSetting,
  isRuntimeSettingKey,
  RUNTIME_SETTING_DEFINITIONS,
  saveRuntimeSetting,
} from "@/lib/runtime-settings";
import { getSignInRedirect } from "@/lib/sign-in-redirect";
import {
  recordStaffActivityForProfile,
  safelyRecordStaffActivityForAuthUser,
  STAFF_ACTIVITY_ACTIONS,
} from "@/lib/staff-activity";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const resortStaffStatusSchema = z.enum(["Active", "Invited", "Suspended"]);
const resortTimeLogFlagSchema = z.enum(["On time", "Late", "Absent"]);
const resortScheduleShiftStatusSchema = z.enum(["Assigned", "Open", "Changed"]);
const resortLeaveRequestStatusSchema = z.enum([
  "Approved",
  "Pending",
  "Rejected",
]);
const resortOtUndertimeTypeSchema = z.enum(["Overtime", "Undertime"]);
const resortOtUndertimeStatusSchema = z.enum([
  "Approved",
  "Pending",
  "Rejected",
]);

async function getConfiguredAppUrl(resortProfileId: string) {
  return (
    (await getRuntimeSetting(resortProfileId, "APP_URL")) ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

async function getMessengerSettings(resortProfileId: string) {
  const [
    appSecret,
    graphVersion,
    pageAccessToken,
    pageId,
    verifyToken,
    webhookUrl,
  ] = await Promise.all([
    getRuntimeSetting(resortProfileId, "META_APP_SECRET"),
    getRuntimeSetting(resortProfileId, "META_GRAPH_API_VERSION"),
    getRuntimeSetting(resortProfileId, "META_PAGE_ACCESS_TOKEN"),
    getRuntimeSetting(resortProfileId, "META_PAGE_ID"),
    getRuntimeSetting(resortProfileId, "META_VERIFY_TOKEN"),
    getRuntimeSetting(resortProfileId, "META_MESSENGER_WEBHOOK_URL"),
  ]);

  return {
    appSecret,
    graphVersion: graphVersion || "v25.0",
    pageAccessToken,
    pageId,
    verifyToken,
    webhookUrl,
  };
}
const resortDepartmentStatusSchema = z.enum(["Active", "Paused", "Archived"]);
const resortAmenityStatusSchema = z.enum(["Active", "Inactive"]);
const resortAmenityScopeSchema = z.enum(["Room-level", "Property-level"]);
const resortAmenityFeeUnitSchema = z.enum(["per stay", "per day", "per use"]);
const resortRoomStatusSchema = z.enum([
  "Available",
  "Occupied",
  "Maintenance",
  "Out of Service",
]);
const resortHousekeepingStatusSchema = z.enum([
  "Clean",
  "Dirty",
  "Occupied",
  "Vacant",
]);
const resortRoomSmokingPolicySchema = z.enum(["Non-smoking", "Smoking"]);
const resortReservationStatusSchema = z.enum([
  "Pending",
  "Confirmed",
  "Checked in",
  "Checked out",
  "Canceled",
]);
const resortReceptionQueueStatusSchema = z.enum([
  "In-house",
  "Checking out",
  "Completed",
]);
const resortReceptionRequestPrioritySchema = z.enum(["Normal", "Urgent"]);
const resortMaintenancePrioritySchema = z.enum(["Normal", "Urgent"]);
const resortReceptionRequestSchema = z.object({
  department: z.string().trim().min(1, "Department is required."),
  note: z.string().trim().min(1, "Request note is required."),
  priority: resortReceptionRequestPrioritySchema,
  reservationId: z.string().optional(),
  roomOrArea: z.string().trim().min(1, "Room or area is required."),
});
const resortReceptionShiftNoteSchema = z.object({
  note: z.string().trim().min(1, "Note is required."),
  title: z.string().trim().min(1, "Title is required."),
});
const resortMaintenanceRequestSchema = z.object({
  area: z.string().trim().min(1, "Room or area is required."),
  issue: z.string().trim().min(1, "Issue title is required."),
  notes: z.string().optional(),
  priority: resortMaintenancePrioritySchema,
  roomId: z.string().optional(),
});
const resortMaintenanceCompleteSchema = z.object({
  id: z.string().trim().min(1, "Request is required."),
  resolution: z.string().trim().min(1, "Resolution is required."),
});
const resortLaundryStatusSchema = z.enum([
  "Received",
  "Washing",
  "Drying",
  "Ready",
  "Returned",
]);
const resortLaundryPrioritySchema = z.enum(["Normal", "Urgent"]);
const resortLaundryJobSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  dueTime: z.string().trim().optional(),
  guestOrRoom: z.string().trim().min(1, "Room, guest, or source is required."),
  notes: z.string().optional(),
  pieces: z.coerce.number().int().min(1, "Pieces must be at least 1."),
  priority: resortLaundryPrioritySchema,
});
const resortInventoryMovementTypeSchema = z.enum(["IN", "OUT"]);
const resortInventoryItemSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().min(1, "Item code is required."),
  dashboardAlert: z.boolean().default(true),
  description: z.string().optional(),
  id: z.string().optional(),
  name: z.string().trim().min(1, "Item name is required."),
  notes: z.string().optional(),
  quantity: z.coerce.number().int().min(0),
  threshold: z.coerce.number().int().min(0),
  unit: z.string().trim().min(1, "Unit is required."),
});
const resortInventoryMovementSchema = z.object({
  itemId: z.string().trim().min(1, "Item is required."),
  quantity: z.coerce.number().int().min(1, "Quantity is required."),
  reason: z.string().trim().min(1, "Reason is required."),
  type: resortInventoryMovementTypeSchema,
});
const resortHousekeepingPhotoSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  size: z.number().int().optional(),
  url: z.string().trim().url(),
});
const resortHousekeepingReadySchema = z.object({
  attendantStaffProfileId: z.string().optional(),
  photo: resortHousekeepingPhotoSchema.optional(),
  photoNote: z.string().optional(),
  roomId: z.string().trim().min(1, "Room is required."),
});
const resortHousekeepingDamageSchema = z.object({
  details: z.string().trim().min(1, "Details are required."),
  photo: resortHousekeepingPhotoSchema.optional(),
  photoNote: z.string().optional(),
  roomId: z.string().trim().min(1, "Room is required."),
  title: z.string().trim().min(1, "Damage title is required."),
});
const resortServiceStatusSchema = z.enum(["Active", "Inactive"]);
const resortPackageStatusSchema = z.enum(["Active", "Inactive", "Archived"]);
const resortServiceBillingTypeSchema = z.enum([
  "Fixed price",
  "Per hour",
  "Per guest",
  "Custom quote",
]);
const resortInvoiceStatusSchema = z.enum([
  "Draft",
  "Sent",
  "Paid",
  "Overdue",
  "Void",
]);
const resortFolioChargeStatusSchema = z.enum([
  "Un-billed",
  "Invoiced",
  "Voided",
  "Adjusted",
]);
const resortFolioChargeTypeSchema = z.enum([
  "Stay",
  "Additional",
  "Fee",
  "Adjustment",
]);
const resortInvoiceReminderCadenceSchema = z.enum([
  "Standard",
  "Light",
  "Strict",
  "Paused",
]);
const resortFinanceEntryTypeSchema = z.enum(["Revenue", "Expense"]);
const resortFinanceEntrySourceSchema = z.enum([
  "Manual entry",
  "Auto booking",
  "Invoice payment",
]);
const resortFinanceEntryStatusSchema = z.enum(["Cleared", "Pending"]);
const resortTransactionExportFormatSchema = z.enum([
  "CSV",
  "PDF",
  "TXT",
  "XLSX",
]);
const resortTransactionExportNameSchema = z.enum([
  "Revenue & expenses",
  "Cash flow",
  "Receipts",
  "Money status",
  "Invoices summary",
]);

const resortLeadStageSchema = z.enum([
  "INTAKE",
  "QUALIFIED",
  "PAYMENT_DONE",
  "CONVERTED",
]);
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);
const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().email().optional(),
);
const optionalUsername = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .optional(),
);
const payrollMoneySchema = z.coerce.number().min(0).default(0);
const resortPayrollPayTypeSchema = z.enum(["Regular Payroll", "Final Payroll"]);
const resortPayrollFrequencySchema = z.enum(["Monthly", "Bi-weekly"]);
const resortPayrollRoundingSchema = z.enum(["Nearest Peso", "None"]);
const resortPayrollEmployeeOverrideSchema = z.object({
  allowance: payrollMoneySchema.optional(),
  basicSalary: payrollMoneySchema.optional(),
  bonus: payrollMoneySchema.optional(),
  commission: payrollMoneySchema.optional(),
  included: z.boolean().optional(),
  incentives: payrollMoneySchema.optional(),
  otherDeductions: payrollMoneySchema.optional(),
  staffProfileId: z.string(),
});
const resortPayrollInputSchema = z.object({
  action: z.enum(["create", "update"]).optional(),
  mode: z.enum(["draft", "finalize"]).default("finalize"),
  backupPayrollData: z.boolean().default(false),
  createJournalEntry: z.boolean().default(true),
  department: optionalTrimmedString,
  employeeOverrides: z.array(resortPayrollEmployeeOverrideSchema).default([]),
  frequency: resortPayrollFrequencySchema.default("Monthly"),
  id: z.string().optional(),
  includeAllowance: z.boolean().default(true),
  includeBasicSalary: z.boolean().default(true),
  includeBonus: z.boolean().default(true),
  includeCommission: z.boolean().default(true),
  includeGovernmentContributions: z.boolean().default(true),
  includeIncentives: z.boolean().default(true),
  includeLeaveDeduction: z.boolean().default(true),
  includeLeaveEncashment: z.boolean().default(false),
  includeOtPay: z.boolean().default(true),
  lockPayrollAfterGeneration: z.boolean().default(true),
  name: z.string().trim().min(1, "Payroll name is required."),
  notes: optionalString,
  payDate: z.coerce.date(),
  payType: resortPayrollPayTypeSchema.default("Regular Payroll"),
  periodEnd: z.coerce.date(),
  periodStart: z.coerce.date(),
  roundingOption: resortPayrollRoundingSchema.default("Nearest Peso"),
  sendPayslipNotification: z.boolean().default(false),
});
const resortLeadSaveSchema = z.object({
  guestName: z.string().trim().min(1, "Guest name is required."),
  id: z.string().optional(),
  inquiry: optionalTrimmedString,
  lastMessage: optionalTrimmedString,
  source: z.string().trim().min(1, "Source is required.").default("Organic"),
  stage: resortLeadStageSchema.default("INTAKE"),
  targetDate: optionalTrimmedString,
});
const resortLeadReplySchema = z.object({
  id: z.string().trim().min(1, "Lead is required."),
  text: z.string().trim().min(1, "Reply is required."),
});
const resortStaffProfileSchema = z
  .object({
    id: z.string().optional(),
    accessRoleId: optionalTrimmedString,
    firstName: optionalTrimmedString,
    lastName: optionalTrimmedString,
    email: optionalEmail,
    username: optionalUsername,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .optional()
      .or(z.literal("")),
    phoneNumber: optionalString,
    departmentId: optionalString,
    roleName: z.string().trim().min(1, "Role is required."),
    status: resortStaffStatusSchema,
    employmentType: optionalString,
    workLocation: optionalString,
    basicSalary: payrollMoneySchema,
    allowance: payrollMoneySchema,
    incentives: payrollMoneySchema,
    commission: payrollMoneySchema,
    bonus: payrollMoneySchema,
    leaveDeduction: payrollMoneySchema,
    sssContribution: payrollMoneySchema,
    philHealthContribution: payrollMoneySchema,
    pagIbigContribution: payrollMoneySchema,
    withholdingTax: payrollMoneySchema,
    otherDeductions: payrollMoneySchema,
    notes: optionalString,
    tags: z.array(z.string()).default([]),
  })
  .refine((value) => value.email || value.username, {
    message: "Email or username is required.",
    path: ["username"],
  });
const resortStaffInviteSchema = z.object({
  email: z.string().trim().email("Valid email is required."),
  message: optionalString,
  accessRoleId: optionalTrimmedString,
  roleName: z.string().trim().min(1, "Role is required."),
});
const resortAccessRoleSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Role name is required."),
  description: optionalString,
  permissions: z.array(z.string()).default([]),
});
const resortDepartmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Department name is required."),
  code: z.string().trim().min(1, "Department code is required."),
  description: optionalString,
  email: optionalEmail,
  notes: optionalString,
  routing: optionalString,
  status: resortDepartmentStatusSchema,
  staffProfileIds: z.array(z.string()).default([]),
  headStaffProfileId: optionalString,
});
const resortAmenitySchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1, "Amenity code is required."),
  name: z.string().trim().min(1, "Amenity name is required."),
  category: z.string().trim().min(1, "Category is required."),
  icon: z.string().trim().min(1, "Icon is required."),
  description: optionalString,
  appliesTo: resortAmenityScopeSchema,
  chargeable: z.boolean(),
  feeAmount: optionalString,
  feeUnit: resortAmenityFeeUnitSchema,
  status: resortAmenityStatusSchema,
  showOnBookingPage: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  internalNotes: optionalString,
});
const resortRoomPhotoSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  size: z.number().int().optional(),
  url: z.string().trim().url(),
});
const resortRoomSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(1, "Room code is required."),
  name: z.string().trim().min(1, "Room name is required."),
  type: z.string().trim().min(1, "Room type is required."),
  building: z.string().trim().min(1, "Building is required."),
  floor: z.string().trim().min(1, "Floor is required."),
  baseRate: z.string().trim().min(1, "Base rate is required."),
  peakRate: optionalString,
  extraPersonCharge: optionalString,
  maxAdults: z.coerce.number().int().min(0),
  childrenOccupancy: z.coerce.number().int().min(0),
  bedConfiguration: z.string().trim().min(1, "Bed configuration is required."),
  roomSize: optionalString,
  viewType: z.string().trim().min(1, "View type is required."),
  smokingPolicy: resortRoomSmokingPolicySchema,
  status: resortRoomStatusSchema,
  checkIn: z.string().trim().min(1),
  checkOut: z.string().trim().min(1),
  minNights: z.coerce.number().int().min(1),
  guestNote: optionalString,
  notes: optionalString,
  amenityIds: z.array(z.string()).default([]),
  photos: z.array(resortRoomPhotoSchema).default([]),
});
const resortReservationSchema = z.object({
  guestAccountId: optionalTrimmedString,
  guestName: z.string().trim().min(1, "Guest name is required."),
  guestEmail: optionalEmail,
  guestPhone: optionalString,
  checkIn: z.string().trim().min(1, "Check-in is required."),
  checkOut: z.string().trim().min(1, "Check-out is required."),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0),
  rate: z.string().trim().min(1, "Rate is required."),
  deposit: optionalString,
  totalAmount: z.string().trim().min(1, "Total amount is required."),
  paymentMethod: optionalString,
  status: resortReservationStatusSchema,
  notes: optionalString,
});
const resortServiceSchema = z.object({
  id: z.string().optional(),
  baseCharge: z.string().trim().min(1, "Base charge is required."),
  billingType: resortServiceBillingTypeSchema,
  bookingLeadTime: optionalString,
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().min(1, "Service code is required."),
  description: optionalString,
  duration: optionalString,
  feeNote: optionalString,
  internalNotes: optionalString,
  provider: optionalString,
  showOnBookingPage: z.boolean(),
  status: resortServiceStatusSchema,
  title: z.string().trim().min(1, "Service name is required."),
});
const resortPackageSchema = z.object({
  id: z.string().optional(),
  amenityIds: z.array(z.string()).default([]),
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().min(1, "Package code is required."),
  compareAtPrice: optionalString,
  description: optionalString,
  featured: z.boolean(),
  inclusionsNote: optionalString,
  maxGuests: z.coerce.number().int().min(0).optional(),
  minNights: z.coerce.number().int().min(1),
  name: z.string().trim().min(1, "Package name is required."),
  price: z.string().trim().min(1, "Package price is required."),
  roomIds: z.array(z.string()).default([]),
  serviceIds: z.array(z.string()).default([]),
  showOnBookingPage: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: resortPackageStatusSchema,
});
const resortInvoiceLineItemSchema = z.object({
  amount: z.string().trim().min(1),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1),
  rate: z.string().trim().min(1),
});
const resortInvoiceSchema = z.object({
  id: z.string().optional(),
  balanceDue: z.string().trim().min(1),
  code: z.string().trim().min(1, "Invoice number is required."),
  depositPaid: z.string().trim().default("0"),
  discount: z.string().trim().default("0"),
  dueDate: z.string().trim().min(1, "Due date is required."),
  guestEmail: optionalEmail,
  guestName: z.string().trim().min(1, "Guest name is required."),
  invoiceDate: z.string().trim().min(1, "Invoice date is required."),
  lineItems: z.array(resortInvoiceLineItemSchema).min(1),
  notes: optionalString,
  paymentInstructions: optionalString,
  paymentMethod: optionalString,
  reminderCadence: resortInvoiceReminderCadenceSchema,
  reservationId: optionalString,
  status: resortInvoiceStatusSchema,
  subtotal: z.string().trim().min(1),
  tax: z.string().trim().default("0"),
  totalAmount: z.string().trim().min(1),
});
const resortFolioChargeSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required."),
  description: z.string().trim().min(1, "Description is required."),
  quantity: z.coerce.number().int().min(1),
  rate: z.string().trim().min(1, "Rate is required."),
  reservationId: z.string().trim().min(1, "Reservation is required."),
  status: resortFolioChargeStatusSchema.default("Un-billed"),
  type: resortFolioChargeTypeSchema.default("Additional"),
});
const resortPaymentLogSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required."),
  invoiceIds: z.array(z.string()).default([]),
  paymentMethod: z.string().trim().min(1, "Payment method is required."),
  proofNote: optionalTrimmedString,
  proofUrl: optionalTrimmedString,
  reservationId: z.string().trim().min(1, "Reservation is required."),
});
const resortLeadConvertReservationSchema = z.object({
  adults: z.coerce.number().int().min(1),
  checkIn: z.string().trim().min(1, "Check-in is required."),
  checkOut: z.string().trim().min(1, "Check-out is required."),
  children: z.coerce.number().int().min(0),
  deposit: optionalString,
  leadId: z.string().trim().min(1, "Lead is required."),
  notes: optionalString,
  paymentMethod: optionalString,
  rate: z.string().trim().min(1, "Rate is required."),
  status: resortReservationStatusSchema.default("Confirmed"),
  totalAmount: z.string().trim().min(1, "Total amount is required."),
});
const resortFinanceEntrySchema = z.object({
  id: z.string().optional(),
  amount: z.string().trim().min(1, "Amount is required."),
  category: z.string().trim().min(1, "Category is required."),
  code: z.string().trim().optional(),
  department: optionalTrimmedString,
  description: z.string().trim().min(1, "Description is required."),
  entryDate: z.string().trim().min(1, "Entry date is required."),
  notes: optionalTrimmedString,
  receiptKey: optionalTrimmedString,
  receiptName: optionalTrimmedString,
  receiptSize: z.number().int().nonnegative().optional(),
  receiptType: optionalTrimmedString,
  receiptUrl: optionalTrimmedString,
  source: resortFinanceEntrySourceSchema,
  status: resortFinanceEntryStatusSchema,
  type: resortFinanceEntryTypeSchema,
});
const resortTransactionExportSchema = z.object({
  format: resortTransactionExportFormatSchema,
  name: resortTransactionExportNameSchema,
  period: optionalTrimmedString,
});

function toResortStaffStatus(status: z.infer<typeof resortStaffStatusSchema>) {
  if (status === "Active") return "ACTIVE";
  if (status === "Suspended") return "SUSPENDED";
  return "INVITED";
}

function fromResortStaffStatus(status: "ACTIVE" | "INVITED" | "SUSPENDED") {
  if (status === "ACTIVE") return "Active";
  if (status === "SUSPENDED") return "Suspended";
  return "Invited";
}

function toResortTimeLogFlag(flag: z.infer<typeof resortTimeLogFlagSchema>) {
  if (flag === "Late") return "LATE";
  if (flag === "Absent") return "ABSENT";
  return "ON_TIME";
}

function fromResortTimeLogFlag(flag: "ON_TIME" | "LATE" | "ABSENT") {
  if (flag === "LATE") return "Late";
  if (flag === "ABSENT") return "Absent";
  return "On time";
}

function toResortScheduleShiftStatus(
  status: z.infer<typeof resortScheduleShiftStatusSchema>,
) {
  if (status === "Open") return "OPEN";
  if (status === "Changed") return "CHANGED";
  return "ASSIGNED";
}

function fromResortScheduleShiftStatus(
  status: "ASSIGNED" | "OPEN" | "CHANGED",
) {
  if (status === "OPEN") return "Open";
  if (status === "CHANGED") return "Changed";
  return "Assigned";
}

function toResortLeaveRequestStatus(
  status: z.infer<typeof resortLeaveRequestStatusSchema>,
) {
  if (status === "Approved") return "APPROVED";
  if (status === "Rejected") return "REJECTED";
  return "PENDING";
}

function fromResortLeaveRequestStatus(
  status: "APPROVED" | "PENDING" | "REJECTED",
) {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function toResortOtUndertimeType(
  type: z.infer<typeof resortOtUndertimeTypeSchema>,
) {
  return type === "Undertime" ? "UNDERTIME" : "OVERTIME";
}

function fromResortOtUndertimeType(type: "OVERTIME" | "UNDERTIME") {
  return type === "UNDERTIME" ? "Undertime" : "Overtime";
}

function toResortOtUndertimeStatus(
  status: z.infer<typeof resortOtUndertimeStatusSchema>,
) {
  if (status === "Approved") return "APPROVED";
  if (status === "Rejected") return "REJECTED";
  return "PENDING";
}

function fromResortOtUndertimeStatus(
  status: "APPROVED" | "PENDING" | "REJECTED",
) {
  if (status === "APPROVED") return "Approved";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

function toResortDepartmentStatus(
  status: z.infer<typeof resortDepartmentStatusSchema>,
) {
  if (status === "Paused") return "PAUSED";
  if (status === "Archived") return "ARCHIVED";
  return "ACTIVE";
}

function fromResortDepartmentStatus(status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  if (status === "PAUSED") return "Paused";
  if (status === "ARCHIVED") return "Archived";
  return "Active";
}

function toResortAmenityStatus(
  status: z.infer<typeof resortAmenityStatusSchema>,
): "ACTIVE" | "INACTIVE" {
  return status === "Inactive" ? "INACTIVE" : "ACTIVE";
}

function fromResortAmenityStatus(status: "ACTIVE" | "INACTIVE") {
  return status === "INACTIVE" ? "Inactive" : "Active";
}

function toResortAmenityScope(
  scope: z.infer<typeof resortAmenityScopeSchema>,
): "ROOM_LEVEL" | "PROPERTY_LEVEL" {
  return scope === "Property-level" ? "PROPERTY_LEVEL" : "ROOM_LEVEL";
}

function fromResortAmenityScope(scope: "ROOM_LEVEL" | "PROPERTY_LEVEL") {
  return scope === "PROPERTY_LEVEL" ? "Property-level" : "Room-level";
}

function toResortAmenityFeeUnit(
  unit: z.infer<typeof resortAmenityFeeUnitSchema>,
): "PER_STAY" | "PER_DAY" | "PER_USE" {
  if (unit === "per day") return "PER_DAY";
  if (unit === "per use") return "PER_USE";
  return "PER_STAY";
}

function fromResortAmenityFeeUnit(unit: "PER_STAY" | "PER_DAY" | "PER_USE") {
  if (unit === "PER_DAY") return "per day";
  if (unit === "PER_USE") return "per use";
  return "per stay";
}

function toResortRoomStatus(
  status: z.infer<typeof resortRoomStatusSchema>,
): "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE" {
  if (status === "Occupied") return "OCCUPIED";
  if (status === "Maintenance") return "MAINTENANCE";
  if (status === "Out of Service") return "OUT_OF_SERVICE";
  return "AVAILABLE";
}

function fromResortRoomStatus(
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE",
) {
  if (status === "OCCUPIED") return "Occupied";
  if (status === "MAINTENANCE") return "Maintenance";
  if (status === "OUT_OF_SERVICE") return "Out of Service";
  return "Available";
}

function toResortHousekeepingStatus(
  status: z.infer<typeof resortHousekeepingStatusSchema>,
): "CLEAN" | "DIRTY" | "OCCUPIED" | "VACANT" {
  if (status === "Clean") return "CLEAN";
  if (status === "Dirty") return "DIRTY";
  if (status === "Occupied") return "OCCUPIED";
  return "VACANT";
}

function fromResortHousekeepingStatus(
  status: "CLEAN" | "DIRTY" | "OCCUPIED" | "VACANT",
) {
  if (status === "CLEAN") return "Clean";
  if (status === "DIRTY") return "Dirty";
  if (status === "OCCUPIED") return "Occupied";
  return "Vacant";
}

function getHousekeepingStatusFromRoomStatus(
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE",
): "Clean" | "Dirty" | "Occupied" | "Vacant" {
  if (status === "OCCUPIED") return "Occupied";
  if (status === "MAINTENANCE" || status === "OUT_OF_SERVICE") return "Dirty";
  return "Vacant";
}

function getRoomStatusFromHousekeepingStatus(
  status: z.infer<typeof resortHousekeepingStatusSchema>,
): "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" {
  if (status === "Occupied") return "OCCUPIED";
  if (status === "Dirty") return "MAINTENANCE";
  return "AVAILABLE";
}

function toResortRoomSmokingPolicy(
  policy: z.infer<typeof resortRoomSmokingPolicySchema>,
): "NON_SMOKING" | "SMOKING" {
  return policy === "Smoking" ? "SMOKING" : "NON_SMOKING";
}

function fromResortRoomSmokingPolicy(policy: "NON_SMOKING" | "SMOKING") {
  return policy === "SMOKING" ? "Smoking" : "Non-smoking";
}

function toResortReservationStatus(
  status: z.infer<typeof resortReservationStatusSchema>,
): "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED" {
  if (status === "Pending") return "PENDING";
  if (status === "Checked in") return "CHECKED_IN";
  if (status === "Checked out") return "CHECKED_OUT";
  if (status === "Canceled") return "CANCELED";
  return "CONFIRMED";
}

function fromResortReservationStatus(
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED",
) {
  if (status === "PENDING") return "Pending";
  if (status === "CHECKED_IN") return "Checked in";
  if (status === "CHECKED_OUT") return "Checked out";
  if (status === "CANCELED") return "Canceled";
  return "Confirmed";
}

function toResortServiceStatus(
  status: z.infer<typeof resortServiceStatusSchema>,
): "ACTIVE" | "INACTIVE" {
  return status === "Inactive" ? "INACTIVE" : "ACTIVE";
}

function fromResortServiceStatus(status: "ACTIVE" | "INACTIVE") {
  return status === "INACTIVE" ? "Inactive" : "Active";
}

function toResortPackageStatus(
  status: z.infer<typeof resortPackageStatusSchema>,
): "ACTIVE" | "INACTIVE" | "ARCHIVED" {
  if (status === "Archived") return "ARCHIVED";
  return status === "Inactive" ? "INACTIVE" : "ACTIVE";
}

function fromResortPackageStatus(status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
  if (status === "ARCHIVED") return "Archived";
  return status === "INACTIVE" ? "Inactive" : "Active";
}

function toResortServiceBillingType(
  billingType: z.infer<typeof resortServiceBillingTypeSchema>,
): "FIXED_PRICE" | "PER_HOUR" | "PER_GUEST" | "CUSTOM_QUOTE" {
  if (billingType === "Per hour") return "PER_HOUR";
  if (billingType === "Per guest") return "PER_GUEST";
  if (billingType === "Custom quote") return "CUSTOM_QUOTE";
  return "FIXED_PRICE";
}

function fromResortServiceBillingType(
  billingType: "FIXED_PRICE" | "PER_HOUR" | "PER_GUEST" | "CUSTOM_QUOTE",
) {
  if (billingType === "PER_HOUR") return "Per hour";
  if (billingType === "PER_GUEST") return "Per guest";
  if (billingType === "CUSTOM_QUOTE") return "Custom quote";
  return "Fixed price";
}

function toResortInvoiceStatus(
  status: z.infer<typeof resortInvoiceStatusSchema>,
): "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID" {
  if (status === "Sent") return "SENT";
  if (status === "Paid") return "PAID";
  if (status === "Overdue") return "OVERDUE";
  if (status === "Void") return "VOID";
  return "DRAFT";
}

function fromResortInvoiceStatus(
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID",
) {
  if (status === "SENT") return "Sent";
  if (status === "PAID") return "Paid";
  if (status === "OVERDUE") return "Overdue";
  if (status === "VOID") return "Void";
  return "Draft";
}

function toResortInvoiceReminderCadence(
  cadence: z.infer<typeof resortInvoiceReminderCadenceSchema>,
): "STANDARD" | "LIGHT" | "STRICT" | "PAUSED" {
  if (cadence === "Light") return "LIGHT";
  if (cadence === "Strict") return "STRICT";
  if (cadence === "Paused") return "PAUSED";
  return "STANDARD";
}

function fromResortInvoiceReminderCadence(
  cadence: "STANDARD" | "LIGHT" | "STRICT" | "PAUSED",
) {
  if (cadence === "LIGHT") return "Light";
  if (cadence === "STRICT") return "Strict";
  if (cadence === "PAUSED") return "Paused";
  return "Standard";
}

function toResortFinanceEntryType(
  type: z.infer<typeof resortFinanceEntryTypeSchema>,
): "REVENUE" | "EXPENSE" {
  return type === "Revenue" ? "REVENUE" : "EXPENSE";
}

function fromResortFinanceEntryType(type: "REVENUE" | "EXPENSE") {
  return type === "REVENUE" ? "Revenue" : "Expense";
}

function toResortFinanceEntrySource(
  source: z.infer<typeof resortFinanceEntrySourceSchema>,
): "MANUAL" | "AUTO_BOOKING" | "INVOICE_PAYMENT" {
  if (source === "Auto booking") return "AUTO_BOOKING";
  if (source === "Invoice payment") return "INVOICE_PAYMENT";
  return "MANUAL";
}

function fromResortFinanceEntrySource(
  source: "MANUAL" | "AUTO_BOOKING" | "INVOICE_PAYMENT",
) {
  if (source === "AUTO_BOOKING") return "Auto booking";
  if (source === "INVOICE_PAYMENT") return "Invoice payment";
  return "Manual entry";
}

function toResortFinanceEntryStatus(
  status: z.infer<typeof resortFinanceEntryStatusSchema>,
): "CLEARED" | "PENDING" {
  return status === "Cleared" ? "CLEARED" : "PENDING";
}

function fromResortFinanceEntryStatus(status: "CLEARED" | "PENDING") {
  return status === "CLEARED" ? "Cleared" : "Pending";
}

function parseReservationDate(value: string, field: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${field} must be a valid date.`,
    });
  }

  return date;
}

function parseDateField(value: string, field: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${field} must be a valid date.`,
    });
  }

  return date;
}

function parseMoneyAmount(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function toMoneyString(value: number) {
  return String(Math.max(value, 0));
}

function getResortInvoiceSuffix(resortName?: string | null) {
  const letters = (resortName ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();

  return letters.padEnd(2, "X") || "RC";
}

function getNextFolioChargeCode(resortProfileId: string) {
  return prisma.resortFolioCharge
    .count({
      where: {
        resortProfileId,
        code: {
          startsWith: "FOL-",
        },
      },
    })
    .then((count) => `FOL-${String(count + 1).padStart(5, "0")}`);
}

function getNextPaymentLogCode(resortProfileId: string) {
  return prisma.resortPaymentLog
    .count({
      where: {
        resortProfileId,
        code: {
          startsWith: "PAY-",
        },
      },
    })
    .then((count) => `PAY-${String(count + 1).padStart(5, "0")}`);
}

async function getNextInvoiceCode(resortProfile: {
  id: string;
  resortName?: string | null;
}) {
  const year = String(new Date().getFullYear()).slice(-2);
  const resortName = resortProfile.resortName ?? "Alrio Private Resort";
  const suffix = getResortInvoiceSuffix(resortName);
  const prefix = `INV-${year}-`;
  const count = await prisma.resortInvoice.count({
    where: {
      resortProfileId: resortProfile.id,
      code: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}${String(count + 1).padStart(5, "0")}-${suffix}`;
}

async function getNextFinanceEntryCode(
  resortProfileId: string,
  type: z.infer<typeof resortFinanceEntryTypeSchema>,
) {
  const prefix = type === "Revenue" ? "REV" : "EXP";
  const count = await prisma.resortFinanceEntry.count({
    where: {
      resortProfileId,
      code: {
        startsWith: `${prefix}-`,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

async function getNextTransactionExportCode(resortProfileId: string) {
  const prefix = "EXP-JOB";
  const count = await prisma.resortTransactionExport.count({
    where: {
      resortProfileId,
      code: {
        startsWith: `${prefix}-`,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

function getDefaultExportPeriod(
  name: z.infer<typeof resortTransactionExportNameSchema>,
) {
  const now = new Date();
  const month = now.toLocaleString("en-PH", { month: "short" });
  const year = now.getFullYear();

  if (name === "Cash flow") return "Next 30 days";
  if (name === "Invoices summary") return `${month} ${year}`;
  return `${month} 1 - ${now.getDate()}, ${year}`;
}

function formatExportSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getAnalyticsRange(period: "week" | "month" | "quarter") {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  if (period === "week") {
    start.setDate(start.getDate() - 6);
  } else if (period === "quarter") {
    start.setMonth(start.getMonth() - 2, 1);
  } else {
    start.setDate(1);
  }

  start.setHours(0, 0, 0, 0);

  return { end, start };
}

function getAnalyticsDays(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getAnalyticsMonthStarts(count = 6) {
  const starts: Date[] = [];
  const now = new Date();

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    date.setHours(0, 0, 0, 0);
    starts.push(date);
  }

  return starts;
}

function isDateInRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function formatAnalyticsMoney(value: number) {
  if (Math.abs(value) >= 1000) return `₱${Math.round(value / 1000)}K`;
  return `₱${Math.round(value).toLocaleString("en-PH")}`;
}

function getAnalyticsPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

async function buildTransactionExportPayload(
  resortProfileId: string,
  name: z.infer<typeof resortTransactionExportNameSchema>,
  period: string,
) {
  const range = getTransactionExportDateRange(period);
  if (name === "Invoices summary") {
    const invoices = await prisma.resortInvoice.findMany({
      where: {
        resortProfileId,
        invoiceDate: range,
      },
      include: {
        reservation: {
          include: {
            room: true,
          },
        },
      },
      orderBy: { invoiceDate: "desc" },
    });

    return invoices.map((invoice) => ({
      balanceDue: invoice.balanceDue,
      code: invoice.code,
      dueDate: invoice.dueDate.toISOString(),
      guestName: invoice.guestName,
      room: invoice.reservation
        ? invoice.reservation.room
          ? `${invoice.reservation.room.code} - ${invoice.reservation.room.name}`
          : "Alrio Private Resort - Whole Resort"
        : "",
      status: fromResortInvoiceStatus(invoice.status),
      totalAmount: invoice.totalAmount,
    }));
  }

  const entries = await prisma.resortFinanceEntry.findMany({
    where: {
      resortProfileId,
      entryDate: range,
      receiptUrl:
        name === "Receipts"
          ? {
              not: null,
            }
          : undefined,
    },
    orderBy: { entryDate: "desc" },
  });

  if (name === "Money status") {
    const revenue = entries
      .filter((entry) => entry.type === "REVENUE" && entry.status === "CLEARED")
      .reduce((total, entry) => total + parseMoneyAmount(entry.amount), 0);
    const expenses = entries
      .filter((entry) => entry.type === "EXPENSE" && entry.status === "CLEARED")
      .reduce((total, entry) => total + parseMoneyAmount(entry.amount), 0);
    const openInvoices = await prisma.resortInvoice.findMany({
      where: {
        resortProfileId,
        invoiceDate: range,
        status: {
          notIn: ["PAID", "VOID"],
        },
      },
    });
    const receivables = openInvoices.reduce(
      (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
      0,
    );

    return [
      { account: "Cash on hand", amount: toMoneyString(revenue - expenses) },
      { account: "Receivables", amount: toMoneyString(receivables) },
      { account: "Revenue", amount: toMoneyString(revenue) },
      { account: "Expenses", amount: toMoneyString(expenses) },
    ];
  }

  return entries.map((entry) => ({
    amount: entry.amount,
    category: entry.category,
    code: entry.code,
    date: entry.entryDate.toISOString(),
    department: entry.department ?? "",
    description: entry.description,
    receiptUrl: name === "Receipts" ? entry.receiptUrl : undefined,
    source: fromResortFinanceEntrySource(entry.source),
    status: fromResortFinanceEntryStatus(entry.status),
    type: fromResortFinanceEntryType(entry.type),
  }));
}

function getTransactionExportDateRange(period: string) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "All time") return undefined;
  if (period === "This year") {
    start.setMonth(0, 1);
  } else if (period === "Last 30 days") {
    start.setDate(start.getDate() - 29);
  } else if (period === "Next 30 days") {
    end.setDate(end.getDate() + 30);
  } else {
    // "This month" and legacy generated labels remain constrained to the
    // current month after the export-period feature is introduced.
    start.setDate(1);
  }

  return { gte: start, lte: end };
}

function getReservationNights(checkIn: Date, checkOut: Date) {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / 86_400_000,
  );

  if (nights < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Check-out must be after check-in.",
    });
  }

  return nights;
}

async function createInvoiceForReservation(input: {
  resortProfileId: string;
  reservation: {
    id: string;
    checkIn: Date;
    checkOut: Date;
    deposit: string | null;
    guestEmail: string | null;
    guestName: string;
    nights: number;
    rate: string;
    totalAmount: string;
  };
}) {
  const existingInvoice = await prisma.resortInvoice.findFirst({
    where: {
      reservationId: input.reservation.id,
      resortProfileId: input.resortProfileId,
      folioCharges: {
        some: {
          type: "STAY",
        },
      },
    },
  });

  if (existingInvoice) return existingInvoice;

  let stayCharge = await prisma.resortFolioCharge.findFirst({
    where: {
      reservationId: input.reservation.id,
      resortProfileId: input.resortProfileId,
      type: "STAY",
    },
  });

  if (!stayCharge) {
    stayCharge = await prisma.resortFolioCharge.create({
      data: {
        amount: input.reservation.totalAmount,
        code: await getNextFolioChargeCode(input.resortProfileId),
        description: `Exclusive use of Alrio Private Resort (${input.reservation.nights} night${input.reservation.nights === 1 ? "" : "s"})`,
        quantity: input.reservation.nights,
        rate: input.reservation.rate,
        reservationId: input.reservation.id,
        status: "UNBILLED",
        resortProfileId: input.resortProfileId,
        type: "STAY",
      },
    });
  }

  return createInvoiceForFolioCharges({
    chargeIds: [stayCharge.id],
    depositPaid: input.reservation.deposit ?? "0",
    paymentMethod: "Reservation payment",
    resortProfileId: input.resortProfileId,
  });
}

async function createInvoiceForFolioCharges(input: {
  chargeIds: string[];
  depositPaid?: string;
  paymentMethod?: string;
  resortProfileId: string;
}) {
  const charges = await prisma.resortFolioCharge.findMany({
    where: {
      id: {
        in: input.chargeIds,
      },
      status: "UNBILLED",
      resortProfileId: input.resortProfileId,
    },
    include: {
      reservation: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!charges.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No un-billed folio charges found.",
    });
  }

  const reservationIds = new Set(charges.map((charge) => charge.reservationId));
  if (reservationIds.size > 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Generate one invoice per booking reference.",
    });
  }

  const reservation = charges[0].reservation;
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(invoiceDate.getDate() + 3);

  const depositPaid = input.depositPaid ?? "0";
  const subtotal = toMoneyString(
    charges.reduce(
      (total, charge) => total + parseMoneyAmount(charge.amount),
      0,
    ),
  );
  const discount = "0";
  const tax = "0";
  const totalAmount = String(
    parseMoneyAmount(subtotal) -
      parseMoneyAmount(discount) +
      parseMoneyAmount(tax),
  );
  const balanceDue = toMoneyString(
    parseMoneyAmount(totalAmount) - parseMoneyAmount(depositPaid),
  );
  const resortProfile = await prisma.resortProfile.findUnique({
    where: {
      id: input.resortProfileId,
    },
    select: {
      id: true,
      resortName: true,
    },
  });

  if (!resortProfile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Resort profile not found.",
    });
  }

  const code = await getNextInvoiceCode(resortProfile);
  const depositAmount = parseMoneyAmount(depositPaid);
  const shouldMarkPaid = parseMoneyAmount(balanceDue) <= 0 && depositAmount > 0;
  const depositPaymentCode =
    depositAmount > 0 ? await getNextPaymentLogCode(input.resortProfileId) : "";
  const financeCode =
    depositAmount > 0
      ? await getNextFinanceEntryCode(input.resortProfileId, "Revenue")
      : "";

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.resortInvoice.create({
      data: {
        balanceDue,
        code,
        depositPaid,
        discount,
        dueDate,
        guestEmail: reservation.guestEmail,
        guestName: reservation.guestName,
        invoiceDate,
        paidAt: shouldMarkPaid ? new Date() : undefined,
        paymentMethod: input.paymentMethod ?? "Reservation payment",
        reminderCadence: "STANDARD",
        reservationId: reservation.id,
        // Creating an invoice is not the same as delivering it. Keep unpaid
        // invoices in Draft until a staff member explicitly selects Send invoice.
        status: shouldMarkPaid ? "PAID" : "DRAFT",
        subtotal,
        tax,
        resortProfileId: input.resortProfileId,
        totalAmount,
        lineItems: {
          create: charges.map((charge, index) => ({
            amount: charge.amount,
            description: charge.description,
            quantity: charge.quantity,
            rate: charge.rate,
            sortOrder: index,
          })),
        },
      },
    });

    await tx.resortFolioCharge.updateMany({
      where: {
        id: {
          in: charges.map((charge) => charge.id),
        },
      },
      data: {
        invoiceId: invoice.id,
        status: "INVOICED",
      },
    });

    if (depositAmount > 0) {
      await tx.resortPaymentLog.create({
        data: {
          amount: depositPaid,
          code: depositPaymentCode,
          invoiceId: invoice.id,
          paidAt: new Date(),
          paymentMethod: input.paymentMethod ?? "Reservation payment",
          proofNote: "Booking deposit",
          reservationId: reservation.id,
          status: "RECORDED",
          resortProfileId: input.resortProfileId,
        },
      });

      await tx.resortFinanceEntry.create({
        data: {
          amount: depositPaid,
          category: "Invoice payment",
          code: financeCode,
          description: `Deposit for booking ${reservation.id}`,
          entryDate: new Date(),
          notes: `${input.paymentMethod ?? "Reservation payment"} · Booking deposit`,
          source: "INVOICE_PAYMENT",
          status: "CLEARED",
          resortProfileId: input.resortProfileId,
          type: "REVENUE",
        },
      });
    }

    return invoice;
  });
}

async function requireInvoiceCreator(authUserId: string) {
  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId,
    },
    include: {
      resortProfile: true,
      staffProfile: {
        include: {
          accessRole: true,
        },
      },
    },
  });

  if (appUser?.resortProfile) return;

  const roleName = [appUser?.staffProfile?.accessRole?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const permissions = appUser?.staffProfile?.accessRole?.permissions ?? [];
  const accountingRole =
    roleName.includes("acctg") ||
    roleName.includes("account") ||
    roleName.includes("finance");

  if (
    accountingRole ||
    hasResortPermission(permissions, "invoices.create") ||
    hasResortPermission(permissions, "finance.receipts.manage")
  ) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Only owner or accounting staff can create invoices.",
  });
}

function makeInternalStaffEmail(authUserId: string) {
  return `${authUserId}@staff.alrio.local`;
}

function isInternalStaffEmail(email: string) {
  return email.includes("@staff.") && email.endsWith(".local");
}

async function getResortProfileForSession(authUserId: string) {
  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId,
    },
    include: {
      resortProfile: true,
      staffProfile: {
        include: {
          resortProfile: true,
        },
      },
    },
  });

  const resortProfile =
    appUser?.resortProfile ?? appUser?.staffProfile?.resortProfile ?? null;

  if (appUser?.staffProfile?.status === "SUSPENDED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff account suspended.",
    });
  }

  if (!appUser || !resortProfile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resort workspace access required.",
    });
  }

  return resortProfile;
}

async function getResortPermissionsForSession(authUserId: string) {
  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId,
    },
    include: {
      resortProfile: {
        select: {
          id: true,
        },
      },
      staffProfile: {
        include: {
          accessRole: true,
        },
      },
    },
  });

  if (!appUser) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Resort workspace access required.",
    });
  }

  if (appUser.resortProfile) {
    return [FULL_PERMISSION];
  }

  if (appUser.staffProfile) {
    if (appUser.staffProfile.status === "SUSPENDED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Staff account suspended.",
      });
    }
    return appUser.staffProfile.accessRole.permissions;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Resort workspace access required.",
  });
}

async function requireResortPermission(authUserId: string, permission: string) {
  const permissions = await getResortPermissionsForSession(authUserId);

  if (!hasResortPermission(permissions, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    });
  }
}

async function requireAnyResortPermission(
  authUserId: string,
  permissionIds: string[],
) {
  const permissions = await getResortPermissionsForSession(authUserId);

  if (
    !permissionIds.some((permission) =>
      hasResortPermission(permissions, permission),
    )
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    });
  }
}

function toResortStaffOutput(
  staffProfile: NonNullable<
    Awaited<ReturnType<typeof prisma.resortStaffProfile.findUnique>>
  > & {
    appUser: {
      authUserId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      displayName: string;
      authUser?: {
        image: string | null;
        sessions?: Array<{
          updatedAt: Date;
        }>;
      };
    };
    department?: {
      name: string;
    } | null;
    accessRole?: {
      id: string;
      name: string;
      permissions: string[];
    } | null;
  },
) {
  const basicSalary = Number(staffProfile.basicSalary ?? 0);
  const allowance = Number(staffProfile.allowance ?? 0);
  const incentives = Number(staffProfile.incentives ?? 0);
  const commission = Number(staffProfile.commission ?? 0);
  const bonus = Number(staffProfile.bonus ?? 0);
  const leaveDeduction = Number(staffProfile.leaveDeduction ?? 0);
  const sssContribution = Number(staffProfile.sssContribution ?? 0);
  const philHealthContribution = Number(
    staffProfile.philHealthContribution ?? 0,
  );
  const pagIbigContribution = Number(staffProfile.pagIbigContribution ?? 0);
  const withholdingTax = Number(staffProfile.withholdingTax ?? 0);
  const otherDeductions = Number(staffProfile.otherDeductions ?? 0);
  const governmentDeductions =
    sssContribution +
    philHealthContribution +
    pagIbigContribution +
    withholdingTax;
  const totalEarnings =
    basicSalary + allowance + incentives + commission + bonus;
  const totalDeductions =
    leaveDeduction + governmentDeductions + otherDeductions;

  return {
    recordType: "staff" as const,
    id: staffProfile.id,
    authUserId: staffProfile.appUser.authUserId,
    email: isInternalStaffEmail(staffProfile.appUser.email)
      ? ""
      : staffProfile.appUser.email,
    firstName: staffProfile.appUser.firstName ?? "",
    lastName: staffProfile.appUser.lastName ?? "",
    displayName: staffProfile.appUser.displayName,
    image: staffProfile.appUser.authUser?.image ?? "",
    lastActiveAt:
      staffProfile.appUser.authUser?.sessions?.[0]?.updatedAt ?? null,
    username: staffProfile.username ?? "",
    phoneNumber: staffProfile.phoneNumber ?? "",
    departmentId: staffProfile.departmentId ?? "",
    departmentName: staffProfile.department?.name ?? "",
    isDepartmentHead: staffProfile.isDepartmentHead,
    accessRoleId: staffProfile.accessRoleId ?? "",
    roleName: staffProfile.accessRole?.name ?? "Staff",
    status: fromResortStaffStatus(staffProfile.status),
    permissions:
      staffProfile.accessRole?.permissions ?? [],
    employmentType: staffProfile.employmentType,
    workLocation: staffProfile.workLocation,
    basicSalary,
    allowance,
    incentives,
    commission,
    bonus,
    leaveDeduction,
    sssContribution,
    philHealthContribution,
    pagIbigContribution,
    withholdingTax,
    otherDeductions,
    governmentDeductions,
    totalEarnings,
    totalDeductions,
    netPay: totalEarnings - totalDeductions,
    notes: staffProfile.notes ?? "",
    tags: staffProfile.tags,
    createdAt: staffProfile.createdAt,
    updatedAt: staffProfile.updatedAt,
  };
}

function toResortAccessRoleOutput(role: {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    staffProfiles: number;
  };
}) {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    permissions: role.permissions,
    usersCount: role._count?.staffProfiles ?? 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function resolveResortAccessRole(input: {
  accessRoleId?: string;
  roleName?: string;
  resortProfileId: string;
}) {
  const role = input.accessRoleId
    ? await prisma.resortAccessRole.findFirst({
        where: {
          id: input.accessRoleId,
          resortProfileId: input.resortProfileId,
        },
      })
    : await prisma.resortAccessRole.findFirst({
        where: {
          resortProfileId: input.resortProfileId,
          name: input.roleName,
        },
      });

  if (!role) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Role not found. Create the role before assigning users.",
    });
  }

  return role;
}

function getWorkdayStart(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTimeLogFlag(clockIn: Date | null | undefined) {
  if (!clockIn) return "ABSENT" as const;

  const lateThreshold = new Date(clockIn);
  lateThreshold.setHours(9, 0, 0, 0);

  return clockIn > lateThreshold ? ("LATE" as const) : ("ON_TIME" as const);
}

function getTimeLogHours(clockIn: Date | null, clockOut: Date | null) {
  if (!clockIn || !clockOut) return "--";

  const hours = (clockOut.getTime() - clockIn.getTime()) / 1000 / 60 / 60;
  return Math.max(0, hours).toFixed(1);
}

function toResortTimeLogOutput(timeLog: {
  id: string;
  date: Date;
  clockIn: Date | null;
  clockOut: Date | null;
  flag: "ON_TIME" | "LATE" | "ABSENT";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile: {
    id: string;
    accessRole?: {
      name: string;
    } | null;
    department?: {
      name: string;
    } | null;
    appUser: {
      displayName: string;
    };
  };
}) {
  return {
    id: timeLog.id,
    staffProfileId: timeLog.staffProfile.id,
    name: timeLog.staffProfile.appUser.displayName,
    role: timeLog.staffProfile.accessRole?.name ?? "Staff",
    department: timeLog.staffProfile.department?.name ?? "",
    date: timeLog.date,
    clockIn: timeLog.clockIn,
    clockOut: timeLog.clockOut,
    hours: getTimeLogHours(timeLog.clockIn, timeLog.clockOut),
    flag: fromResortTimeLogFlag(timeLog.flag),
    notes: timeLog.notes ?? "",
    createdAt: timeLog.createdAt,
    updatedAt: timeLog.updatedAt,
  };
}

function toResortScheduleShiftOutput(shift: {
  id: string;
  shift: string;
  role: string;
  department: string | null;
  startAt: Date;
  endAt: Date;
  status: "ASSIGNED" | "OPEN" | "CHANGED";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile?: {
    id: string;
    appUser: {
      displayName: string;
    };
  } | null;
}) {
  return {
    id: shift.id,
    staffProfileId: shift.staffProfile?.id ?? "",
    name: shift.staffProfile?.appUser.displayName ?? "--",
    role: shift.role,
    department: shift.department ?? "",
    shift: shift.shift,
    startAt: shift.startAt,
    endAt: shift.endAt,
    status: fromResortScheduleShiftStatus(shift.status),
    notes: shift.notes ?? "",
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

function toResortLeaveRequestOutput(request: {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  balanceDays: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  leavePolicyId?: string | null;
  staffProfile: {
    id: string;
    accessRole?: {
      name: string;
    } | null;
    appUser: {
      displayName: string;
    };
  };
}, availableDays?: number) {
  return {
    id: request.id,
    staffProfileId: request.staffProfile.id,
    name: request.staffProfile.appUser.displayName,
    role: request.staffProfile.accessRole?.name ?? "Staff",
    type: request.leaveType,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    balance: `${availableDays ?? request.balanceDays} days`,
    balanceDays: availableDays ?? request.balanceDays,
    leavePolicyId: request.leavePolicyId ?? null,
    status: fromResortLeaveRequestStatus(request.status),
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function getLeaveDays(startDate: Date, endDate: Date) {
  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.floor((end - start) / 86_400_000) + 1;
}

function getLeaveBalanceAvailable(balance: {
  openingDays: number;
  allocatedDays: number;
  adjustmentDays: number;
  usedDays: number;
}) {
  return balance.openingDays + balance.allocatedDays + balance.adjustmentDays - balance.usedDays;
}

function toResortOtUndertimeOutput(entry: {
  id: string;
  type: "OVERTIME" | "UNDERTIME";
  hours: string;
  payPeriod: string;
  reason: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  staffProfile: {
    id: string;
    accessRole?: {
      name: string;
    } | null;
    appUser: {
      displayName: string;
    };
  };
}) {
  return {
    id: entry.id,
    staffProfileId: entry.staffProfile.id,
    name: entry.staffProfile.appUser.displayName,
    role: entry.staffProfile.accessRole?.name ?? "Staff",
    type: fromResortOtUndertimeType(entry.type),
    hours: entry.hours,
    payPeriod: entry.payPeriod,
    reason: entry.reason,
    status: fromResortOtUndertimeStatus(entry.status),
    reviewedAt: entry.reviewedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

type ResortPayrollInput = z.infer<typeof resortPayrollInputSchema>;

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatPayrollPeriod(start: Date, end: Date) {
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function normalizePayrollPeriod(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesPayrollPeriod(value: string, payPeriod: string) {
  const normalizedValue = normalizePayrollPeriod(value);
  const normalizedPayPeriod = normalizePayrollPeriod(payPeriod);

  return (
    normalizedValue === normalizedPayPeriod ||
    normalizedValue.includes(normalizedPayPeriod) ||
    normalizedPayPeriod.includes(normalizedValue)
  );
}

function getNumericHours(value: string) {
  const hours = Number.parseFloat(value);
  return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

function getHoursBetween(clockIn: Date | null, clockOut: Date | null) {
  if (!clockIn || !clockOut) return 0;

  return Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 1000 / 60 / 60);
}

function countInclusiveDays(start: Date, end: Date) {
  const startDay = getWorkdayStart(start).getTime();
  const endDay = getWorkdayStart(end).getTime();
  const dayMs = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.floor((endDay - startDay) / dayMs) + 1);
}

function countLeaveDaysInPeriod(
  startDate: Date,
  endDate: Date,
  periodStart: Date,
  periodEnd: Date,
) {
  const start = new Date(Math.max(startDate.getTime(), periodStart.getTime()));
  const end = new Date(Math.min(endDate.getTime(), periodEnd.getTime()));

  if (end < start) return 0;

  return countInclusiveDays(start, end);
}

function roundPayrollAmount(
  value: number,
  roundingOption: ResortPayrollInput["roundingOption"],
) {
  if (!Number.isFinite(value)) return 0;

  return roundingOption === "Nearest Peso"
    ? Math.round(value)
    : Number(value.toFixed(2));
}

function decimalNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toResortPayrollPayType(value: ResortPayrollInput["payType"]) {
  return value === "Final Payroll" ? ("FINAL" as const) : ("REGULAR" as const);
}

function fromResortPayrollPayType(value: "REGULAR" | "FINAL") {
  return value === "FINAL" ? "Final Payroll" : "Regular Payroll";
}

function toResortPayrollFrequency(value: ResortPayrollInput["frequency"]) {
  return value === "Bi-weekly" ? ("BI_WEEKLY" as const) : ("MONTHLY" as const);
}

function fromResortPayrollFrequency(value: "MONTHLY" | "BI_WEEKLY") {
  return value === "BI_WEEKLY" ? "Bi-weekly" : "Monthly";
}

async function getNextResortPayrollCode(
  resortProfileId: string,
  periodStart: Date,
) {
  const year = periodStart.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const count = await prisma.resortPayrollRun.count({
    where: {
      periodStart: {
        gte: yearStart,
        lte: yearEnd,
      },
      resortProfileId,
    },
  });

  return `PR-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function buildResortPayrollPreview(
  resortProfileId: string,
  input: ResortPayrollInput,
) {
  const periodStart = getWorkdayStart(input.periodStart);
  const periodEnd = endOfDay(input.periodEnd);

  if (periodEnd < periodStart) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Payroll period end must be after start.",
    });
  }

  const payPeriod = formatPayrollPeriod(periodStart, periodEnd);
  const staffProfiles = await prisma.resortStaffProfile.findMany({
    where: {
      resortProfileId,
      ...(input.department && input.department !== "all"
        ? {
            department: {
              name: input.department,
            },
          }
        : {}),
    },
    include: {
      appUser: {
        include: {
          authUser: {
            select: {
              image: true,
            },
          },
        },
      },
      accessRole: true,
      department: true,
      leaveRequests: {
        where: {
          endDate: {
            gte: periodStart,
          },
          startDate: {
            lte: periodEnd,
          },
          status: "APPROVED",
        },
      },
      leaveBalances: {
        where: {
          year: periodEnd.getFullYear(),
        },
      },
      otUndertimeEntries: {
        where: {
          status: "APPROVED",
        },
      },
      timeLogs: {
        where: {
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const employeeOverrides = new Map(
    input.employeeOverrides.map((override) => [
      override.staffProfileId,
      override,
    ]),
  );

  const employees = staffProfiles.map((staffProfile, index) => {
    const override = employeeOverrides.get(staffProfile.id);
    const included = override?.included ?? staffProfile.status === "ACTIVE";
    const baseHourlyRate = decimalNumber(staffProfile.basicSalary) / 22 / 8;
    const approvedPeriodEntries = staffProfile.otUndertimeEntries.filter(
      (entry) => matchesPayrollPeriod(entry.payPeriod, payPeriod),
    );
    const overtimeHours = approvedPeriodEntries
      .filter((entry) => entry.type === "OVERTIME")
      .reduce((total, entry) => total + getNumericHours(entry.hours), 0);
    const undertimeHours = approvedPeriodEntries
      .filter((entry) => entry.type === "UNDERTIME")
      .reduce((total, entry) => total + getNumericHours(entry.hours), 0);
    const leaveDays = staffProfile.leaveRequests.reduce(
      (total, leave) =>
        total +
        countLeaveDaysInPeriod(
          leave.startDate,
          leave.endDate,
          periodStart,
          periodEnd,
        ),
      0,
    );
    const regularHours = staffProfile.timeLogs.reduce(
      (total, log) => total + getHoursBetween(log.clockIn, log.clockOut),
      0,
    );
    const daysWorked = staffProfile.timeLogs.filter(
      (log) => log.clockIn,
    ).length;
    const lateCount = staffProfile.timeLogs.filter(
      (log) => log.flag === "LATE",
    ).length;
    const absentCount = staffProfile.timeLogs.filter(
      (log) => log.flag === "ABSENT",
    ).length;
    const basicSalary =
      override?.basicSalary ??
      (input.includeBasicSalary ? decimalNumber(staffProfile.basicSalary) : 0);
    const allowance =
      override?.allowance ??
      (input.includeAllowance ? decimalNumber(staffProfile.allowance) : 0);
    const incentives =
      override?.incentives ??
      (input.includeIncentives ? decimalNumber(staffProfile.incentives) : 0);
    const commission =
      override?.commission ??
      (input.includeCommission ? decimalNumber(staffProfile.commission) : 0);
    const bonus =
      override?.bonus ??
      (input.includeBonus ? decimalNumber(staffProfile.bonus) : 0);
    const leaveEncashment = input.includeLeaveEncashment
      ? roundPayrollAmount(
          staffProfile.leaveBalances.reduce(
            (total, balance) =>
              total +
              Math.max(
                0,
                balance.openingDays +
                  balance.allocatedDays +
                  balance.adjustmentDays -
                  balance.usedDays,
              ),
            0,
          ) *
            (decimalNumber(staffProfile.basicSalary) / 22),
          input.roundingOption,
        )
      : 0;
    const overtimePay = input.includeOtPay
      ? roundPayrollAmount(
          overtimeHours * baseHourlyRate * 1.25,
          input.roundingOption,
        )
      : 0;
    const leaveDeduction = input.includeLeaveDeduction
      ? roundPayrollAmount(
          leaveDays * decimalNumber(staffProfile.leaveDeduction),
          input.roundingOption,
        )
      : 0;
    const undertimeDeduction = input.includeLeaveDeduction
      ? roundPayrollAmount(
          undertimeHours * baseHourlyRate,
          input.roundingOption,
        )
      : 0;
    const governmentDeductions = input.includeGovernmentContributions
      ? decimalNumber(staffProfile.sssContribution) +
        decimalNumber(staffProfile.philHealthContribution) +
        decimalNumber(staffProfile.pagIbigContribution) +
        decimalNumber(staffProfile.withholdingTax)
      : 0;
    const otherDeductions =
      override?.otherDeductions ?? decimalNumber(staffProfile.otherDeductions);
    const grossPay =
      basicSalary + allowance + incentives + commission + bonus + leaveEncashment + overtimePay;
    const totalDeductions =
      leaveDeduction +
      undertimeDeduction +
      governmentDeductions +
      otherDeductions;
    const netPay = grossPay - totalDeductions;

    return {
      absentCount,
      allowances: allowance,
      basicSalary,
      bonus: bonus + leaveEncashment,
      commission,
      deductions: totalDeductions,
      daysWorked,
      department: staffProfile.department?.name ?? "Unassigned",
      employeeId: `STF-${String(index + 1).padStart(4, "0")}`,
      employmentType: staffProfile.employmentType,
      governmentDeductions,
      grossPay,
      id: staffProfile.id,
      image: staffProfile.appUser.authUser.image,
      included,
      incentives,
      lateCount,
      leaveDays,
      leaveDeduction,
      location: staffProfile.workLocation,
      name:
        staffProfile.appUser.displayName ||
        staffProfile.username ||
        staffProfile.appUser.email ||
        "Staff user",
      netPay,
      otherDeductions,
      overtimeHours,
      overtimePay,
      pagIbigContribution: decimalNumber(staffProfile.pagIbigContribution),
      philHealthContribution: decimalNumber(
        staffProfile.philHealthContribution,
      ),
      position: staffProfile.accessRole?.name ?? "Staff",
      regularHours,
      sssContribution: decimalNumber(staffProfile.sssContribution),
      staffProfileId: staffProfile.id,
      totalDeductions,
      totalEarnings: grossPay,
      undertimeDeduction,
      undertimeHours,
      withholdingTax: decimalNumber(staffProfile.withholdingTax),
    };
  });
  const includedEmployees = employees.filter((employee) => employee.included);
  const totals = {
    employerContributions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.governmentDeductions,
    ),
    excludedEmployees: employees.length - includedEmployees.length,
    includedEmployees: includedEmployees.length,
    totalAllowances: sumPayrollItems(
      includedEmployees,
      (employee) => employee.allowances,
    ),
    totalBasicSalary: sumPayrollItems(
      includedEmployees,
      (employee) => employee.basicSalary,
    ),
    totalBonus: sumPayrollItems(
      includedEmployees,
      (employee) => employee.bonus,
    ),
    totalCommission: sumPayrollItems(
      includedEmployees,
      (employee) => employee.commission,
    ),
    totalDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.totalDeductions,
    ),
    totalEarnings: sumPayrollItems(
      includedEmployees,
      (employee) => employee.totalEarnings,
    ),
    totalEmployees: employees.length,
    totalGovernmentDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.governmentDeductions,
    ),
    totalIncentives: sumPayrollItems(
      includedEmployees,
      (employee) => employee.incentives,
    ),
    totalLeaveDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.leaveDeduction,
    ),
    totalNetPay: sumPayrollItems(
      includedEmployees,
      (employee) => employee.netPay,
    ),
    totalOtherDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.otherDeductions,
    ),
    totalOvertimePay: sumPayrollItems(
      includedEmployees,
      (employee) => employee.overtimePay,
    ),
    totalUndertimeDeductions: sumPayrollItems(
      includedEmployees,
      (employee) => employee.undertimeDeduction,
    ),
  };

  return {
    employees,
    payPeriod,
    periodEnd,
    periodStart,
    totals: {
      ...totals,
      employerCost: totals.totalEarnings + totals.employerContributions,
    },
  };
}

function sumPayrollItems<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

const payrollItemsWithProfileImage = {
  orderBy: {
    employeeName: "asc",
  },
  include: {
    staffProfile: {
      select: {
        appUser: {
          select: {
            authUser: {
              select: {
                image: true,
              },
            },
          },
        },
      },
    },
  },
} as const;

function toResortPayrollOutput(payrollRun: {
  id: string;
  code: string;
  name: string;
  payPeriod: string;
  periodStart: Date;
  periodEnd: Date;
  payDate: Date;
  payType: "REGULAR" | "FINAL";
  frequency: "MONTHLY" | "BI_WEEKLY";
  department: string | null;
  notes: string | null;
  status: "DRAFT" | "COMPLETED" | "VOIDED";
  totalEmployees: number;
  includedEmployees: number;
  excludedEmployees: number;
  totalBasicSalary: Prisma.Decimal | number;
  totalAllowances: Prisma.Decimal | number;
  totalIncentives: Prisma.Decimal | number;
  totalCommission: Prisma.Decimal | number;
  totalBonus: Prisma.Decimal | number;
  totalOvertimePay: Prisma.Decimal | number;
  totalGrossPay: Prisma.Decimal | number;
  totalLeaveDeductions: Prisma.Decimal | number;
  totalUndertimeDeductions: Prisma.Decimal | number;
  totalGovernmentDeductions: Prisma.Decimal | number;
  totalOtherDeductions: Prisma.Decimal | number;
  totalDeductions: Prisma.Decimal | number;
  totalNetPay: Prisma.Decimal | number;
  employerContributions: Prisma.Decimal | number;
  employerCost: Prisma.Decimal | number;
  options: Prisma.JsonValue | null;
  backupSnapshot: Prisma.JsonValue | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  finalizedAt: Date | null;
  finalizedBy: string | null;
  payslipNotifiedAt: Date | null;
  paymentStatus: "UNPAID" | "PAID";
  paidAt: Date | null;
  paidBy: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  journalEntryId: string | null;
  generatedBy: string | null;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    staffProfileId: string;
    employeeName: string;
    employeeCode: string;
    roleName: string | null;
    departmentName: string | null;
    employmentType: string | null;
    workLocation: string | null;
    daysWorked: number;
    lateCount: number;
    absentCount: number;
    leaveDays: number;
    regularHours: Prisma.Decimal | number;
    overtimeHours: Prisma.Decimal | number;
    undertimeHours: Prisma.Decimal | number;
    basicSalary: Prisma.Decimal | number;
    allowance: Prisma.Decimal | number;
    incentives: Prisma.Decimal | number;
    commission: Prisma.Decimal | number;
    bonus: Prisma.Decimal | number;
    overtimePay: Prisma.Decimal | number;
    grossPay: Prisma.Decimal | number;
    leaveDeduction: Prisma.Decimal | number;
    undertimeDeduction: Prisma.Decimal | number;
    governmentDeductions: Prisma.Decimal | number;
    otherDeductions: Prisma.Decimal | number;
    totalDeductions: Prisma.Decimal | number;
    netPay: Prisma.Decimal | number;
    included: boolean;
    staffProfile?: {
      appUser: {
        authUser: {
          image: string | null;
        };
      };
    };
  }>;
}) {
  return {
    code: payrollRun.code,
    createdAt: payrollRun.createdAt,
    department: payrollRun.department ?? "all",
    frequency: fromResortPayrollFrequency(payrollRun.frequency),
    generatedAt: payrollRun.generatedAt,
    generatedBy: payrollRun.generatedBy ?? "",
    finalizedAt: payrollRun.finalizedAt,
    finalizedBy: payrollRun.finalizedBy ?? "",
    journalEntryId: payrollRun.journalEntryId,
    id: payrollRun.id,
    items: (payrollRun.items ?? []).map((item) => ({
      absentCount: item.absentCount,
      allowances: decimalNumber(item.allowance),
      basicSalary: decimalNumber(item.basicSalary),
      bonus: decimalNumber(item.bonus),
      commission: decimalNumber(item.commission),
      deductions: decimalNumber(item.totalDeductions),
      daysWorked: item.daysWorked,
      department: item.departmentName ?? "Unassigned",
      employeeId: item.employeeCode,
      employmentType: item.employmentType ?? "Regular",
      governmentDeductions: decimalNumber(item.governmentDeductions),
      grossPay: decimalNumber(item.grossPay),
      id: item.staffProfileId,
      image: item.staffProfile?.appUser.authUser.image ?? null,
      included: item.included,
      incentives: decimalNumber(item.incentives),
      lateCount: item.lateCount,
      leaveDays: item.leaveDays,
      leaveDeduction: decimalNumber(item.leaveDeduction),
      location: item.workLocation ?? "Resort Office",
      name: item.employeeName,
      netPay: decimalNumber(item.netPay),
      otherDeductions: decimalNumber(item.otherDeductions),
      overtimeHours: decimalNumber(item.overtimeHours),
      overtimePay: decimalNumber(item.overtimePay),
      pagIbigContribution: 0,
      philHealthContribution: 0,
      position: item.roleName ?? "Staff",
      regularHours: decimalNumber(item.regularHours),
      sssContribution: 0,
      staffProfileId: item.staffProfileId,
      totalDeductions: decimalNumber(item.totalDeductions),
      totalEarnings: decimalNumber(item.grossPay),
      undertimeDeduction: decimalNumber(item.undertimeDeduction),
      undertimeHours: decimalNumber(item.undertimeHours),
      withholdingTax: 0,
    })),
    name: payrollRun.name,
    notes: payrollRun.notes ?? "",
    options: payrollRun.options,
    lockedAt: payrollRun.lockedAt,
    lockedBy: payrollRun.lockedBy ?? "",
    paidAt: payrollRun.paidAt,
    paidBy: payrollRun.paidBy ?? "",
    paymentMethod: payrollRun.paymentMethod ?? "",
    paymentReference: payrollRun.paymentReference ?? "",
    paymentStatus: payrollRun.paymentStatus === "PAID" ? "Paid" : "Unpaid",
    payslipNotifiedAt: payrollRun.payslipNotifiedAt,
    payDate: payrollRun.payDate,
    payPeriod: payrollRun.payPeriod,
    payType: fromResortPayrollPayType(payrollRun.payType),
    periodEnd: payrollRun.periodEnd,
    periodStart: payrollRun.periodStart,
    status:
      payrollRun.status === "COMPLETED"
        ? "Completed"
        : payrollRun.status === "VOIDED"
          ? "Voided"
          : "Draft",
    totals: {
      employerContributions: decimalNumber(payrollRun.employerContributions),
      employerCost: decimalNumber(payrollRun.employerCost),
      excludedEmployees: payrollRun.excludedEmployees,
      includedEmployees: payrollRun.includedEmployees,
      totalAllowances: decimalNumber(payrollRun.totalAllowances),
      totalBasicSalary: decimalNumber(payrollRun.totalBasicSalary),
      totalBonus: decimalNumber(payrollRun.totalBonus),
      totalCommission: decimalNumber(payrollRun.totalCommission),
      totalDeductions: decimalNumber(payrollRun.totalDeductions),
      totalEarnings: decimalNumber(payrollRun.totalGrossPay),
      totalEmployees: payrollRun.totalEmployees,
      totalGovernmentDeductions: decimalNumber(
        payrollRun.totalGovernmentDeductions,
      ),
      totalIncentives: decimalNumber(payrollRun.totalIncentives),
      totalLeaveDeductions: decimalNumber(payrollRun.totalLeaveDeductions),
      totalNetPay: decimalNumber(payrollRun.totalNetPay),
      totalOtherDeductions: decimalNumber(payrollRun.totalOtherDeductions),
      totalOvertimePay: decimalNumber(payrollRun.totalOvertimePay),
      totalUndertimeDeductions: decimalNumber(
        payrollRun.totalUndertimeDeductions,
      ),
    },
    updatedAt: payrollRun.updatedAt,
  };
}

function toResortPayrollHistoryOutput(item: {
  id: string;
  payrollRunId: string;
  staffProfileId: string;
  employeeName: string;
  employeeCode: string;
  roleName: string | null;
  departmentName: string | null;
  employmentType: string | null;
  workLocation: string | null;
  daysWorked: number;
  lateCount: number;
  absentCount: number;
  leaveDays: number;
  regularHours: Prisma.Decimal | number;
  overtimeHours: Prisma.Decimal | number;
  undertimeHours: Prisma.Decimal | number;
  basicSalary: Prisma.Decimal | number;
  allowance: Prisma.Decimal | number;
  incentives: Prisma.Decimal | number;
  commission: Prisma.Decimal | number;
  bonus: Prisma.Decimal | number;
  overtimePay: Prisma.Decimal | number;
  grossPay: Prisma.Decimal | number;
  leaveDeduction: Prisma.Decimal | number;
  undertimeDeduction: Prisma.Decimal | number;
  governmentDeductions: Prisma.Decimal | number;
  otherDeductions: Prisma.Decimal | number;
  totalDeductions: Prisma.Decimal | number;
  netPay: Prisma.Decimal | number;
  included: boolean;
  payrollRun: {
    id: string;
    code: string;
    name: string;
    payPeriod: string;
    periodStart: Date;
    periodEnd: Date;
    payDate: Date;
    payType: "REGULAR" | "FINAL";
    frequency: "MONTHLY" | "BI_WEEKLY";
    notes: string | null;
    status: "DRAFT" | "COMPLETED" | "VOIDED";
    generatedAt: Date | null;
    generatedBy: string | null;
    createdAt: Date;
  };
}) {
  return {
    id: item.id,
    payrollRunId: item.payrollRunId,
    runCode: item.payrollRun.code,
    runName: item.payrollRun.name,
    payPeriod: item.payrollRun.payPeriod,
    periodStart: item.payrollRun.periodStart,
    periodEnd: item.payrollRun.periodEnd,
    payDate: item.payrollRun.payDate,
    payType: fromResortPayrollPayType(item.payrollRun.payType),
    frequency: fromResortPayrollFrequency(item.payrollRun.frequency),
    status:
      item.payrollRun.status === "COMPLETED"
        ? "Completed"
        : item.payrollRun.status === "VOIDED"
          ? "Voided"
          : "Draft",
    generatedAt: item.payrollRun.generatedAt,
    generatedBy: item.payrollRun.generatedBy ?? "",
    notes: item.payrollRun.notes ?? "",
    item: {
      absentCount: item.absentCount,
      allowances: decimalNumber(item.allowance),
      basicSalary: decimalNumber(item.basicSalary),
      bonus: decimalNumber(item.bonus),
      commission: decimalNumber(item.commission),
      daysWorked: item.daysWorked,
      department: item.departmentName ?? "Unassigned",
      employeeId: item.employeeCode,
      employmentType: item.employmentType ?? "Regular",
      governmentDeductions: decimalNumber(item.governmentDeductions),
      grossPay: decimalNumber(item.grossPay),
      included: item.included,
      incentives: decimalNumber(item.incentives),
      lateCount: item.lateCount,
      leaveDays: item.leaveDays,
      leaveDeduction: decimalNumber(item.leaveDeduction),
      location: item.workLocation ?? "Resort Office",
      name: item.employeeName,
      netPay: decimalNumber(item.netPay),
      otherDeductions: decimalNumber(item.otherDeductions),
      overtimeHours: decimalNumber(item.overtimeHours),
      overtimePay: decimalNumber(item.overtimePay),
      position: item.roleName ?? "Staff",
      regularHours: decimalNumber(item.regularHours),
      staffProfileId: item.staffProfileId,
      totalDeductions: decimalNumber(item.totalDeductions),
      totalEarnings: decimalNumber(item.grossPay),
      undertimeDeduction: decimalNumber(item.undertimeDeduction),
      undertimeHours: decimalNumber(item.undertimeHours),
    },
  };
}

function toResortDepartmentOutput(department: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  email: string | null;
  notes: string | null;
  routing: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  headStaffProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  headStaffProfile: {
    appUser: {
      displayName: string;
    };
  } | null;
  staffProfiles: Array<{
    id: string;
  }>;
}) {
  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description ?? "",
    email: department.email ?? "",
    notes: department.notes ?? "",
    routing: department.routing ?? "",
    status: fromResortDepartmentStatus(department.status),
    head: department.headStaffProfile?.appUser.displayName ?? "",
    headStaffProfileId: department.headStaffProfileId ?? "",
    staffProfileIds: department.staffProfiles.map((staff) => staff.id),
    members: department.staffProfiles.length,
    openTasks: 0,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  };
}

function toResortAmenityOutput(amenity: {
  id: string;
  code: string;
  name: string;
  category: string;
  icon: string;
  description: string | null;
  appliesTo: "ROOM_LEVEL" | "PROPERTY_LEVEL";
  chargeable: boolean;
  feeAmount: string | null;
  feeUnit: "PER_STAY" | "PER_DAY" | "PER_USE";
  status: "ACTIVE" | "INACTIVE";
  showOnBookingPage: boolean;
  featured: boolean;
  sortOrder: number;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: amenity.id,
    code: amenity.code,
    name: amenity.name,
    category: amenity.category,
    icon: amenity.icon,
    description: amenity.description ?? "",
    appliesTo: fromResortAmenityScope(amenity.appliesTo),
    chargeable: amenity.chargeable,
    feeAmount: amenity.feeAmount ?? "",
    feeUnit: fromResortAmenityFeeUnit(amenity.feeUnit),
    status: fromResortAmenityStatus(amenity.status),
    showOnBookingPage: amenity.showOnBookingPage,
    featured: amenity.featured,
    sortOrder: amenity.sortOrder,
    internalNotes: amenity.internalNotes ?? "",
    createdAt: amenity.createdAt,
    updatedAt: amenity.updatedAt,
  };
}

function toResortRoomOutput(room: {
  id: string;
  code: string;
  name: string;
  type: string;
  building: string;
  floor: string;
  baseRate: string;
  peakRate: string | null;
  extraPersonCharge: string | null;
  maxAdults: number;
  childrenOccupancy: number;
  bedConfiguration: string;
  roomSize: string | null;
  viewType: string;
  smokingPolicy: "NON_SMOKING" | "SMOKING";
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  checkIn: string;
  checkOut: string;
  minNights: number;
  guestNote: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  amenities: Array<{
    id: string;
    name: string;
  }>;
  photos: Array<{
    id: string;
    key: string;
    name: string;
    size: number | null;
    sortOrder: number;
    url: string;
  }>;
}) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    type: room.type,
    building: room.building,
    floor: room.floor,
    baseRate: room.baseRate,
    peakRate: room.peakRate ?? "",
    extraPersonCharge: room.extraPersonCharge ?? "",
    maxAdults: room.maxAdults,
    childrenOccupancy: room.childrenOccupancy,
    bedConfiguration: room.bedConfiguration,
    roomSize: room.roomSize ?? "",
    viewType: room.viewType,
    smokingPolicy: fromResortRoomSmokingPolicy(room.smokingPolicy),
    status: fromResortRoomStatus(room.status),
    checkIn: room.checkIn,
    checkOut: room.checkOut,
    minNights: room.minNights,
    guestNote: room.guestNote ?? "",
    notes: room.notes ?? "",
    amenityIds: room.amenities.map((amenity) => amenity.id),
    amenities: room.amenities.map((amenity) => amenity.name),
    photos: room.photos
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        id: photo.id,
        key: photo.key,
        name: photo.name,
        size: photo.size ?? undefined,
        url: photo.url,
      })),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function toResortReservationOutput(reservation: {
  id: string;
  roomId: string | null;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: number;
  nights: number;
  rate: string;
  packageName?: string | null;
  packagePrice?: string | null;
  roomsIncluded?: number;
  deposit: string | null;
  totalAmount: string;
  paymentMethod: string | null;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  room: {
    code: string;
    name: string;
    type: string;
  } | null;
  invoices?: Array<{
    balanceDue: string;
    depositPaid: string;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
    totalAmount: string;
  }>;
}) {
  const activeInvoices = (reservation.invoices ?? []).filter(
    (invoice) => invoice.status !== "VOID",
  );
  const invoicedTotal = activeInvoices.reduce(
    (total, invoice) => total + parseMoneyAmount(invoice.totalAmount),
    0,
  );
  const invoiceBalanceAmount = activeInvoices.reduce(
    (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
    0,
  );
  const invoiceBalance = activeInvoices.length
    ? toMoneyString(invoiceBalanceAmount)
    : "";
  const amountPaid = activeInvoices.length
    ? toMoneyString(Math.max(invoicedTotal - invoiceBalanceAmount, 0))
    : reservation.deposit ?? "0";
  const invoiceStatus =
    activeInvoices.length === 0
      ? ""
      : invoiceBalanceAmount <= 0.009
        ? "PAID"
        : activeInvoices.some((invoice) => invoice.status === "OVERDUE")
          ? "OVERDUE"
          : activeInvoices.some((invoice) => invoice.status === "SENT")
            ? "SENT"
            : "DRAFT";

  return {
    id: reservation.id,
    roomId: reservation.roomId ?? "",
    roomCode: reservation.room?.code ?? "ALRIO",
    roomName: reservation.room?.name ?? "Whole Resort",
    roomType: reservation.room?.type ?? "Exclusive Private Resort",
    guestName: reservation.guestName,
    guestEmail: reservation.guestEmail ?? "",
    guestPhone: reservation.guestPhone ?? "",
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    adults: reservation.adults,
    children: reservation.children,
    nights: reservation.nights,
    rate: reservation.rate,
    packageName: reservation.packageName ?? "",
    packagePrice: reservation.packagePrice ?? "",
    roomsIncluded: reservation.roomsIncluded ?? 1,
    deposit: reservation.deposit ?? "",
    amountPaid,
    balanceDue: invoiceBalance,
    invoiceStatus,
    totalAmount: reservation.totalAmount,
    paymentMethod: reservation.paymentMethod ?? "",
    status: fromResortReservationStatus(reservation.status),
    notes: reservation.notes ?? "",
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

function fromResortReceptionRequestPriority(
  priority: "NORMAL" | "URGENT",
): "Normal" | "Urgent" {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toResortReceptionRequestPriority(
  priority: z.infer<typeof resortReceptionRequestPrioritySchema>,
): "NORMAL" | "URGENT" {
  return priority === "Urgent" ? "URGENT" : "NORMAL";
}

function fromResortMaintenancePriority(priority: "NORMAL" | "URGENT") {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toResortMaintenancePriority(
  priority: z.infer<typeof resortMaintenancePrioritySchema>,
): "NORMAL" | "URGENT" {
  return priority === "Urgent" ? "URGENT" : "NORMAL";
}

function fromResortMaintenanceStatus(status: "PENDING" | "COMPLETED") {
  return status === "COMPLETED" ? "Completed" : "Pending";
}

function fromResortLaundryStatus(
  status: "RECEIVED" | "WASHING" | "DRYING" | "READY" | "RETURNED",
) {
  const labels = {
    DRYING: "Drying",
    READY: "Ready",
    RECEIVED: "Received",
    RETURNED: "Returned",
    WASHING: "Washing",
  } as const;

  return labels[status];
}

function toResortLaundryStatus(
  status: z.infer<typeof resortLaundryStatusSchema>,
): "RECEIVED" | "WASHING" | "DRYING" | "READY" | "RETURNED" {
  const values = {
    Drying: "DRYING",
    Ready: "READY",
    Received: "RECEIVED",
    Returned: "RETURNED",
    Washing: "WASHING",
  } as const;

  return values[status];
}

function fromResortLaundryPriority(priority: "NORMAL" | "URGENT") {
  return priority === "URGENT" ? "Urgent" : "Normal";
}

function toResortLaundryPriority(
  priority: z.infer<typeof resortLaundryPrioritySchema>,
): "NORMAL" | "URGENT" {
  return priority === "Urgent" ? "URGENT" : "NORMAL";
}

function formatReceptionTime(time: string) {
  const [hourValue = "0", minuteValue = "0"] = time.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getReceptionQueueStatus(input: {
  checkOut: Date;
  frontDeskStatus:
    "ARRIVING" | "IN_HOUSE" | "CHECKING_OUT" | "COMPLETED" | null;
  reservationStatus:
    "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  todayEnd: Date;
}): "Arriving" | "In-house" | "Checking out" | "Completed" {
  if (input.frontDeskStatus === "ARRIVING") return "Arriving";
  if (input.frontDeskStatus === "IN_HOUSE") return "In-house";
  if (input.frontDeskStatus === "CHECKING_OUT") return "Checking out";
  if (input.frontDeskStatus === "COMPLETED") return "Completed";
  if (input.reservationStatus === "CHECKED_OUT") return "Completed";

  if (
    input.reservationStatus === "CHECKED_IN" &&
    input.checkOut.getTime() <= input.todayEnd.getTime()
  ) {
    return "Checking out";
  }

  if (input.reservationStatus === "CHECKED_IN") return "In-house";

  return "Arriving";
}

function toResortReceptionGuestOutput(
  reservation: {
    adults: number;
    checkIn: Date;
    checkOut: Date;
    children: number;
    createdAt: Date;
    frontDeskStatus:
      "ARRIVING" | "IN_HOUSE" | "CHECKING_OUT" | "COMPLETED" | null;
    guestName: string;
    guestPhone: string | null;
    id: string;
    notes: string | null;
    paymentMethod: string | null;
    status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
    totalAmount: string;
    updatedAt: Date;
    invoices: Array<{
      balanceDue: string;
      code?: string;
      id?: string;
      status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
      totalAmount?: string;
    }>;
    folioCharges?: Array<{
      amount: string;
      status: "UNBILLED" | "INVOICED" | "VOIDED" | "ADJUSTED";
    }>;
    paymentLogs?: Array<{
      amount: string;
      status: "RECORDED" | "VOIDED";
    }>;
    room: {
      checkIn: string;
      checkOut: string;
      code: string;
      name: string;
      type: string;
    } | null;
  },
  todayEnd: Date,
) {
  const billableCharges = reservation.folioCharges ?? [];
  const subFolioTotal = billableCharges
    .filter((charge) => !["VOIDED", "ADJUSTED"].includes(charge.status))
    .reduce((total, charge) => total + parseMoneyAmount(charge.amount), 0);
  const paymentTotal = (reservation.paymentLogs ?? [])
    .filter((payment) => payment.status === "RECORDED")
    .reduce((total, payment) => total + parseMoneyAmount(payment.amount), 0);
  const openInvoiceBalance = reservation.invoices
    .filter((invoice) => !["PAID", "VOID"].includes(invoice.status))
    .reduce(
      (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
      0,
    );
  const balance = Math.max(subFolioTotal - paymentTotal, openInvoiceBalance, 0);
  const unbilledTotal = billableCharges
    .filter((charge) => charge.status === "UNBILLED")
    .reduce((total, charge) => total + parseMoneyAmount(charge.amount), 0);
  const status = getReceptionQueueStatus({
    checkOut: reservation.checkOut,
    frontDeskStatus: reservation.frontDeskStatus,
    reservationStatus: reservation.status,
    todayEnd,
  });
  const priority = balance > 0 || reservation.notes ? "Attention" : "Normal";
  const time =
    status === "Arriving"
      ? formatReceptionTime(reservation.room?.checkIn ?? "14:00")
      : status === "Checking out"
        ? formatReceptionTime(reservation.room?.checkOut ?? "12:00")
        : status === "In-house"
          ? "Checked in"
          : "Completed";

  return {
    balance,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    createdAt: reservation.createdAt,
    guest: reservation.guestName,
    guestPhone: reservation.guestPhone ?? "",
    id: reservation.id,
    invoiceCodes: reservation.invoices
      .filter((invoice) => invoice.status !== "VOID")
      .map((invoice) => invoice.code ?? "")
      .filter(Boolean),
    note:
      reservation.notes ??
      (unbilledTotal > 0
        ? "Un-billed folio charges need invoice before checkout."
        : balance > 0
          ? "Review balance before guest handoff."
          : "No open notes."),
    pax: `${reservation.adults} adult${reservation.adults === 1 ? "" : "s"}${
      reservation.children > 0
        ? `, ${reservation.children} child${reservation.children === 1 ? "" : "ren"}`
        : ""
    }`,
    priority,
    room: reservation.room
      ? `${reservation.room.code} - ${reservation.room.name}`
      : "Alrio Private Resort - Whole Resort",
    roomCode: reservation.room?.code ?? "ALRIO",
    roomName: reservation.room?.name ?? "Whole Resort",
    roomType: reservation.room?.type ?? "Exclusive Private Resort",
    source: reservation.paymentMethod || "Reservation",
    status,
    subFolioTotal,
    time,
    totalAmount: reservation.totalAmount,
    updatedAt: reservation.updatedAt,
    unbilledTotal,
  };
}

function toResortReceptionRequestOutput(request: {
  createdAt: Date;
  department: string;
  id: string;
  note: string;
  priority: "NORMAL" | "URGENT";
  roomOrArea: string;
  status: "OPEN" | "SENT" | "RESOLVED";
  updatedAt: Date;
}) {
  return {
    createdAt: request.createdAt,
    department: request.department,
    id: request.id,
    note: request.note,
    priority: fromResortReceptionRequestPriority(request.priority),
    roomOrArea: request.roomOrArea,
    status:
      request.status === "RESOLVED"
        ? "Resolved"
        : request.status === "OPEN"
          ? "Open"
          : "Sent",
    updatedAt: request.updatedAt,
  };
}

function toResortReceptionShiftNoteOutput(note: {
  createdAt: Date;
  id: string;
  note: string;
  title: string;
  updatedAt: Date;
}) {
  return {
    createdAt: note.createdAt,
    id: note.id,
    note: note.note,
    title: note.title,
    updatedAt: note.updatedAt,
  };
}

function toResortMaintenanceRequestOutput(request: {
  area: string;
  code: string;
  completedAt: Date | null;
  createdAt: Date;
  forwardedBy: string;
  id: string;
  issue: string;
  notes: string | null;
  priority: "NORMAL" | "URGENT";
  resolution: string | null;
  roomId: string | null;
  status: "PENDING" | "COMPLETED";
  updatedAt: Date;
}) {
  return {
    area: request.area,
    code: request.code,
    completedAt: request.completedAt,
    createdAt: request.createdAt,
    forwardedBy: request.forwardedBy,
    id: request.id,
    issue: request.issue,
    notes: request.notes ?? "",
    priority: fromResortMaintenancePriority(request.priority),
    requestedAt: request.createdAt.toLocaleDateString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
    }),
    resolution: request.resolution ?? "",
    roomId: request.roomId ?? "",
    status: fromResortMaintenanceStatus(request.status),
    updatedAt: request.updatedAt,
  };
}

function toResortLaundryJobOutput(job: {
  category: string;
  code: string;
  createdAt: Date;
  dueTime: string;
  guestOrRoom: string;
  id: string;
  notes: string | null;
  pieces: number;
  priority: "NORMAL" | "URGENT";
  receivedAt: Date;
  status: "RECEIVED" | "WASHING" | "DRYING" | "READY" | "RETURNED";
  updatedAt: Date;
}) {
  return {
    category: job.category,
    code: job.code,
    createdAt: job.createdAt,
    dueTime: job.dueTime,
    guestOrRoom: job.guestOrRoom,
    id: job.id,
    notes: job.notes ?? "",
    pieces: job.pieces,
    priority: fromResortLaundryPriority(job.priority),
    receivedAt: job.receivedAt,
    status: fromResortLaundryStatus(job.status),
    updatedAt: job.updatedAt,
  };
}

function toResortInventoryItemOutput(item: {
  category: string;
  code: string;
  createdAt: Date;
  dashboardAlert: boolean;
  description: string | null;
  id: string;
  movements: Array<{
    quantity: number;
    reason: string;
    type: "IN" | "OUT";
  }>;
  name: string;
  notes: string | null;
  quantity: number;
  threshold: number;
  unit: string;
  updatedAt: Date;
}) {
  const lastMovement = item.movements[0];

  return {
    category: item.category,
    code: item.code,
    createdAt: item.createdAt,
    dashboardAlert: item.dashboardAlert,
    description: item.description ?? "",
    id: item.id,
    lastMovement: lastMovement
      ? `${lastMovement.type === "IN" ? "Stock in" : "Stock out"} · ${lastMovement.quantity} ${item.unit} · ${lastMovement.reason}`
      : "No movement yet",
    name: item.name,
    notes: item.notes ?? "",
    quantity: item.quantity,
    threshold: item.threshold,
    unit: item.unit,
    updatedAt: item.updatedAt,
  };
}

function toResortInventoryMovementOutput(movement: {
  code: string;
  createdAt: Date;
  id: string;
  item: {
    name: string;
  };
  quantity: number;
  reason: string;
  type: "IN" | "OUT";
}) {
  return {
    createdAt: movement.createdAt,
    id: movement.id,
    itemName: movement.item.name,
    code: movement.code,
    quantity: movement.quantity,
    reason: movement.reason,
    type: movement.type,
  };
}

function toResortHousekeepingRoomOutput(room: {
  id: string;
  code: string;
  name: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  housekeepingState: {
    attendantStaffProfileId: string | null;
    lastPhotoAt: Date | null;
    lastPhotoKey: string | null;
    lastPhotoName: string | null;
    lastPhotoNote: string | null;
    lastPhotoSize: number | null;
    lastPhotoUrl: string | null;
    status: "CLEAN" | "DIRTY" | "OCCUPIED" | "VACANT";
    attendantStaffProfile: {
      appUser: {
        displayName: string;
      };
    } | null;
  } | null;
  reservations: Array<{
    checkIn: Date;
    checkOut: Date;
    guestName: string;
    status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
  }>;
}) {
  const activeReservation =
    room.reservations.find(
      (reservation) => reservation.status === "CHECKED_IN",
    ) ??
    room.reservations[0] ??
    null;
  const nextGuest =
    activeReservation?.status === "CHECKED_IN"
      ? "Checkout today"
      : activeReservation
        ? `${activeReservation.guestName}, ${activeReservation.checkIn.toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
            },
          )}`
        : "No arrival";
  const housekeepingStatus = room.housekeepingState
    ? fromResortHousekeepingStatus(room.housekeepingState.status)
    : getHousekeepingStatusFromRoomStatus(room.status);

  return {
    attendant:
      room.housekeepingState?.attendantStaffProfile?.appUser.displayName ??
      "Unassigned",
    attendantStaffProfileId:
      room.housekeepingState?.attendantStaffProfileId ?? "",
    id: room.id,
    lastPhoto: room.housekeepingState?.lastPhotoAt
      ? room.housekeepingState.lastPhotoAt.toLocaleDateString("en-US", {
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          month: "short",
        })
      : "Needs new photo",
    lastPhotoFile: room.housekeepingState?.lastPhotoUrl
      ? {
          key: room.housekeepingState.lastPhotoKey ?? "",
          name: room.housekeepingState.lastPhotoName ?? "Room photo",
          size: room.housekeepingState.lastPhotoSize ?? undefined,
          url: room.housekeepingState.lastPhotoUrl,
        }
      : null,
    lastPhotoNote: room.housekeepingState?.lastPhotoNote ?? "",
    name: room.name,
    nextGuest,
    roomLabel: `${room.code} - ${room.name}`,
    status: housekeepingStatus,
  };
}

function toResortHousekeepingDamageOutput(report: {
  createdAt: Date;
  details: string;
  id: string;
  photoKey: string | null;
  photoName: string | null;
  photoNote: string | null;
  photoSize: number | null;
  photoUrl: string | null;
  status: "OPEN" | "RESOLVED";
  title: string;
  updatedAt: Date;
  room: {
    code: string;
    name: string;
  };
}) {
  return {
    createdAt: report.createdAt,
    details: report.details,
    id: report.id,
    photo: report.photoUrl
      ? {
          key: report.photoKey ?? "",
          name: report.photoName ?? "Damage photo",
          size: report.photoSize ?? undefined,
          url: report.photoUrl,
        }
      : null,
    photoNote: report.photoNote ?? "",
    roomLabel: `${report.room.code} - ${report.room.name}`,
    status: report.status === "RESOLVED" ? "Resolved" : "Open",
    title: report.title,
    updatedAt: report.updatedAt,
  };
}

function toResortServiceOutput(service: {
  id: string;
  baseCharge: string;
  billingType: "FIXED_PRICE" | "PER_HOUR" | "PER_GUEST" | "CUSTOM_QUOTE";
  bookingLeadTime: string | null;
  category: string;
  code: string;
  createdAt: Date;
  description: string | null;
  duration: string | null;
  feeNote: string | null;
  internalNotes: string | null;
  provider: string | null;
  showOnBookingPage: boolean;
  status: "ACTIVE" | "INACTIVE";
  title: string;
  updatedAt: Date;
}) {
  return {
    id: service.id,
    baseCharge: service.baseCharge,
    billingType: fromResortServiceBillingType(service.billingType),
    bookingLeadTime: service.bookingLeadTime ?? "",
    category: service.category,
    code: service.code,
    createdAt: service.createdAt,
    description: service.description ?? "",
    duration: service.duration ?? "",
    feeNote: service.feeNote ?? "",
    internalNotes: service.internalNotes ?? "",
    provider: service.provider ?? "",
    showOnBookingPage: service.showOnBookingPage,
    status: fromResortServiceStatus(service.status),
    title: service.title,
    updatedAt: service.updatedAt,
  };
}

function toResortPackageOutput(pack: {
  id: string;
  amenityIds?: string[];
  amenities: Array<{
    id: string;
    code: string;
    icon: string;
    name: string;
  }>;
  category: string;
  code: string;
  compareAtPrice: string | null;
  createdAt: Date;
  description: string | null;
  featured: boolean;
  inclusionsNote: string | null;
  maxGuests: number | null;
  minNights: number;
  name: string;
  price: string;
  roomIds?: string[];
  rooms: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }>;
  serviceIds?: string[];
  services: Array<{
    id: string;
    code: string;
    title: string;
  }>;
  showOnBookingPage: boolean;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  updatedAt: Date;
}) {
  return {
    id: pack.id,
    amenityIds: pack.amenityIds ?? pack.amenities.map((amenity) => amenity.id),
    amenities: pack.amenities,
    category: pack.category,
    code: pack.code,
    compareAtPrice: pack.compareAtPrice ?? "",
    createdAt: pack.createdAt,
    description: pack.description ?? "",
    featured: pack.featured,
    inclusionsNote: pack.inclusionsNote ?? "",
    maxGuests: pack.maxGuests ?? undefined,
    minNights: pack.minNights,
    name: pack.name,
    price: pack.price,
    roomIds: pack.roomIds ?? pack.rooms.map((room) => room.id),
    rooms: pack.rooms,
    serviceIds: pack.serviceIds ?? pack.services.map((service) => service.id),
    services: pack.services,
    showOnBookingPage: pack.showOnBookingPage,
    sortOrder: pack.sortOrder,
    status: fromResortPackageStatus(pack.status),
    updatedAt: pack.updatedAt,
  };
}

function toResortFinanceEntryOutput(entry: {
  id: string;
  amount: string;
  category: string;
  code: string;
  createdAt: Date;
  department: string | null;
  description: string;
  entryDate: Date;
  notes: string | null;
  receiptKey: string | null;
  receiptName: string | null;
  receiptSize: number | null;
  receiptType: string | null;
  receiptUrl: string | null;
  source: "MANUAL" | "AUTO_BOOKING" | "INVOICE_PAYMENT";
  status: "CLEARED" | "PENDING";
  type: "REVENUE" | "EXPENSE";
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    amount: entry.amount,
    category: entry.category,
    code: entry.code,
    createdAt: entry.createdAt,
    department: entry.department ?? "",
    description: entry.description,
    entryDate: entry.entryDate,
    notes: entry.notes ?? "",
    receiptKey: entry.receiptKey ?? "",
    receiptName: entry.receiptName ?? "",
    receiptSize: entry.receiptSize ?? 0,
    receiptType: entry.receiptType ?? "",
    receiptUrl: entry.receiptUrl ?? "",
    source: fromResortFinanceEntrySource(entry.source),
    status: fromResortFinanceEntryStatus(entry.status),
    type: fromResortFinanceEntryType(entry.type),
    updatedAt: entry.updatedAt,
  };
}

function toResortTransactionExportOutput(exportJob: {
  code: string;
  createdAt: Date;
  format: "CSV" | "PDF" | "TXT" | "XLSX";
  id: string;
  name: string;
  period: string;
  rowCount: number;
  size: string;
  status: "READY" | "SCHEDULED" | "FAILED";
  updatedAt: Date;
}) {
  return {
    createdAt: exportJob.createdAt,
    format: exportJob.format,
    id: exportJob.id,
    name: exportJob.name,
    period: exportJob.period,
    rowCount: exportJob.rowCount,
    size: exportJob.size,
    status:
      exportJob.status === "READY"
        ? "Ready"
        : exportJob.status === "SCHEDULED"
          ? "Scheduled"
          : "Failed",
    updatedAt: exportJob.updatedAt,
    code: exportJob.code,
  };
}

function toResortInvoiceOutput(invoice: {
  id: string;
  publicToken: string;
  balanceDue: string;
  code: string;
  createdAt: Date;
  depositPaid: string;
  discount: string;
  dueDate: Date;
  guestEmail: string | null;
  guestName: string;
  invoiceDate: Date;
  lastReminderSentAt: Date | null;
  notes: string | null;
  nextReminderAt: Date | null;
  paymentInstructions: string | null;
  paymentMethod: string | null;
  reminderCadence: "STANDARD" | "LIGHT" | "STRICT" | "PAUSED";
  reservationId: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
  subtotal: string;
  tax: string;
  totalAmount: string;
  updatedAt: Date;
  lineItems: Array<{
    amount: string;
    description: string;
    id: string;
    quantity: number;
    rate: string;
    sortOrder: number;
  }>;
  reservation?: {
    id: string;
    room: {
      code: string;
      name: string;
    } | null;
  } | null;
}) {
  return {
    id: invoice.id,
    publicToken: invoice.publicToken,
    balanceDue: invoice.balanceDue,
    bookingReference: invoice.reservation?.id ?? "",
    code: invoice.code,
    createdAt: invoice.createdAt,
    depositPaid: invoice.depositPaid,
    discount: invoice.discount,
    dueDate: invoice.dueDate,
    guestEmail: invoice.guestEmail ?? "",
    guestName: invoice.guestName,
    invoiceDate: invoice.invoiceDate,
    lastReminderSentAt: invoice.lastReminderSentAt,
    lineItems: invoice.lineItems
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        amount: item.amount,
        description: item.description,
        id: item.id,
        quantity: item.quantity,
        rate: item.rate,
      })),
    notes: invoice.notes ?? "",
    nextReminderAt: invoice.nextReminderAt,
    paymentInstructions: invoice.paymentInstructions ?? "",
    paymentMethod: invoice.paymentMethod ?? "",
    reminderCadence: fromResortInvoiceReminderCadence(invoice.reminderCadence),
    reservationId: invoice.reservationId ?? "",
    roomLabel: invoice.reservation
      ? invoice.reservation.room
        ? `${invoice.reservation.room.code} - ${invoice.reservation.room.name}`
        : "Alrio Private Resort - Whole Resort"
      : "",
    status: fromResortInvoiceStatus(invoice.status),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    totalAmount: invoice.totalAmount,
    updatedAt: invoice.updatedAt,
  };
}

function fromResortFolioChargeStatus(
  status: "UNBILLED" | "INVOICED" | "VOIDED" | "ADJUSTED",
) {
  const labels = {
    ADJUSTED: "Adjusted",
    INVOICED: "Invoiced",
    UNBILLED: "Un-billed",
    VOIDED: "Voided",
  } as const;

  return labels[status];
}

function toResortFolioChargeStatus(
  status: z.infer<typeof resortFolioChargeStatusSchema>,
): "UNBILLED" | "INVOICED" | "VOIDED" | "ADJUSTED" {
  const values = {
    Adjusted: "ADJUSTED",
    Invoiced: "INVOICED",
    "Un-billed": "UNBILLED",
    Voided: "VOIDED",
  } as const;

  return values[status];
}

function fromResortFolioChargeType(
  type: "STAY" | "ADDITIONAL" | "FEE" | "ADJUSTMENT",
) {
  const labels = {
    ADDITIONAL: "Additional",
    ADJUSTMENT: "Adjustment",
    FEE: "Fee",
    STAY: "Stay",
  } as const;

  return labels[type];
}

function toResortFolioChargeType(
  type: z.infer<typeof resortFolioChargeTypeSchema>,
): "STAY" | "ADDITIONAL" | "FEE" | "ADJUSTMENT" {
  const values = {
    Additional: "ADDITIONAL",
    Adjustment: "ADJUSTMENT",
    Fee: "FEE",
    Stay: "STAY",
  } as const;

  return values[type];
}

function toResortFolioChargeOutput(charge: {
  amount: string;
  code: string;
  createdAt: Date;
  description: string;
  id: string;
  invoice?: {
    code: string;
  } | null;
  invoiceId: string | null;
  quantity: number;
  rate: string;
  reservationId: string;
  status: "UNBILLED" | "INVOICED" | "VOIDED" | "ADJUSTED";
  type: "STAY" | "ADDITIONAL" | "FEE" | "ADJUSTMENT";
  updatedAt: Date;
}) {
  return {
    amount: charge.amount,
    code: charge.code,
    createdAt: charge.createdAt,
    description: charge.description,
    id: charge.id,
    invoiceCode: charge.invoice?.code ?? "",
    invoiceId: charge.invoiceId ?? "",
    quantity: charge.quantity,
    rate: charge.rate,
    reservationId: charge.reservationId,
    status: fromResortFolioChargeStatus(charge.status),
    type: fromResortFolioChargeType(charge.type),
    updatedAt: charge.updatedAt,
  };
}

function toResortPaymentLogOutput(payment: {
  amount: string;
  code: string;
  createdAt: Date;
  id: string;
  invoice?: {
    code: string;
  } | null;
  invoiceId: string | null;
  paidAt: Date;
  paymentMethod: string;
  proofNote: string | null;
  proofUrl: string | null;
  reservationId: string;
  status: "RECORDED" | "VOIDED";
}) {
  return {
    amount: payment.amount,
    code: payment.code,
    createdAt: payment.createdAt,
    id: payment.id,
    invoiceCode: payment.invoice?.code ?? "",
    invoiceId: payment.invoiceId ?? "",
    paidAt: payment.paidAt,
    paymentMethod: payment.paymentMethod,
    proofNote: payment.proofNote ?? "",
    proofUrl: payment.proofUrl ?? "",
    reservationId: payment.reservationId,
    status: payment.status === "RECORDED" ? "Recorded" : "Voided",
  };
}

function toResortStaffInvitationOutput(invitation: {
  id: string;
  email: string;
  roleName: string;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const displayName = invitation.email.split("@")[0] || invitation.email;

  return {
    recordType: "invitation" as const,
    id: invitation.id,
    authUserId: "",
    email: invitation.email,
    firstName: "",
    lastName: "",
    displayName,
    image: "",
    lastActiveAt: null,
    username: "",
    phoneNumber: "",
    roleName: invitation.roleName,
    status: "Invited" as const,
    permissions: [],
    notes: invitation.message ?? "",
    tags: [],
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export const appRouter = createTRPCRouter({
  geography: geographyRouter,
  public: createTRPCRouter({
    sendContactInquiry: baseProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(100),
          email: z
            .string()
            .trim()
            .email()
            .max(254)
            .transform((value) => value.toLowerCase()),
          phone: z.string().trim().max(30).default(""),
          subject: z.string().trim().min(2).max(120),
          message: z.string().trim().min(10).max(3000),
          consent: z.literal(true),
          website: z.string().max(0).default(""),
        }),
      )
      .mutation(async ({ input }) => {
        const resort = await prisma.resortProfile.findFirst({
          where: {
            resortName: { equals: "Alrio Private Resort", mode: "insensitive" },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (!resort)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Online enquiries are not available yet. Please try again later.",
          });
        const recent = await prisma.resortContactInquiry.findFirst({
          where: {
            resortProfileId: resort.id,
            email: input.email,
            createdAt: { gte: new Date(Date.now() - 60_000) },
          },
          select: { id: true },
        });
        if (recent)
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Please wait a minute before sending another enquiry.",
          });
        await prisma.resortContactInquiry.create({
          data: {
            resortProfileId: resort.id,
            name: input.name,
            email: input.email,
            phone: input.phone || null,
            subject: input.subject,
            message: input.message,
          },
        });
        return { success: true };
      }),
    contact: baseProcedure.query(async () => {
      return prisma.resortProfile.findFirst({
        where: {
          resortName: { equals: "Alrio Private Resort", mode: "insensitive" },
        },
        orderBy: { createdAt: "asc" },
        select: { phoneNumber: true, fullAddress: true },
      });
    }),
    landing: baseProcedure.query(async () => {
      const locations = await getPublicResortLocations();

      return { locations };
    }),
    branding: baseProcedure.query(async () => {
      const resort = await prisma.resortProfile.findFirst({
        where: { resortName: { equals: "Alrio Private Resort", mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
        select: { landingBranding: { select: { content: true } } },
      });
      return parseLandingBranding(resort?.landingBranding?.content ?? DEFAULT_LANDING_BRANDING);
    }),
  }),
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input.text}`,
      };
    }),
  auth: createTRPCRouter({
    account: baseProcedure.query(async ({ ctx }) => {
      const user = ctx.session?.user;
      if (!user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required.",
        });
      }
      const profile = await prisma.appUser.findUnique({
        where: { authUserId: user.id },
        select: { firstName: true, lastName: true, guestProfile: true },
      });
      const identity = await prisma.user.findUnique({
        where: { id: user.id },
        select: { image: true },
      });
      return {
        firstName: profile?.firstName ?? user.name?.split(" ")[0] ?? "",
        lastName:
          profile?.lastName ?? user.name?.split(" ").slice(1).join(" ") ?? "",
        email: user.email,
        image: identity?.image ?? null,
        guestProfile: guestProfileSchema.parse(profile?.guestProfile ?? {}),
      };
    }),
    updateAccount: baseProcedure
      .input(
        z.object({
          firstName: z
            .string()
            .trim()
            .min(1, "First name is required.")
            .max(100),
          lastName: z.string().trim().min(1, "Last name is required.").max(100),
          guestProfile: guestProfileSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = ctx.session?.user;
        if (!user?.id || !user.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }
        const displayName = `${input.firstName} ${input.lastName}`;
        const profileData = {
          firstName: input.firstName,
          lastName: input.lastName,
          displayName,
          ...(input.guestProfile ? { guestProfile: input.guestProfile } : {}),
        };
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { name: displayName },
          }),
          prisma.appUser.upsert({
            where: { authUserId: user.id },
            create: { authUserId: user.id, email: user.email, ...profileData },
            update: profileData,
          }),
        ]);
        await safelyRecordStaffActivityForAuthUser(user.id, {
          action: STAFF_ACTIVITY_ACTIONS.profileUpdated,
          title: "Profile updated",
          detail: "Updated their staff account profile information.",
          actorAuthUserId: user.id,
        });
        return { saved: true };
      }),
    registerGuest: baseProcedure
      .input(
        z.object({
          firstName: z.string().trim().min(1).max(100).optional(),
          lastName: z.string().trim().min(1).max(100).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = ctx.session?.user;
        if (!user?.id || !user.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in to finish creating your account.",
          });
        }
        const [fallbackFirst = "Guest", ...fallbackLast] = (
          user.name || user.email.split("@")[0]
        )
          .trim()
          .split(/\s+/);
        const firstName = input.firstName ?? fallbackFirst;
        const lastName = input.lastName ?? fallbackLast.join(" ");
        // Public registration creates a guest profile only. Staff access requires an invitation.
        await prisma.appUser.upsert({
          where: { authUserId: user.id },
          create: {
            authUserId: user.id,
            email: user.email,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim(),
          },
          update: {},
        });
        return { redirectTo: "/account" };
      }),
    signInRedirect: baseProcedure.query(async ({ ctx }) => ({
      redirectTo: await getSignInRedirect(ctx.session?.user?.id),
    })),
    removeAvatar: baseProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required.",
        });
      await prisma.user.update({
        where: { id: userId },
        data: { image: null },
      });
      await safelyRecordStaffActivityForAuthUser(userId, {
        action: STAFF_ACTIVITY_ACTIONS.avatarUpdated,
        title: "Profile photo removed",
        detail: "Removed their staff profile photo.",
        actorAuthUserId: userId,
      });
      return { image: null };
    }),
    session: baseProcedure.query(async ({ ctx }) => {
      if (!ctx.session?.user) return { user: null };
      const identity = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true, image: true },
      });
      return { user: identity ? { ...ctx.session.user, ...identity } : null };
    }),
    profile: baseProcedure.query(async ({ ctx }) => {
      const authUser = ctx.session?.user;

      if (!authUser?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required.",
        });
      }

      const appUser = await prisma.appUser.findUnique({
        where: {
          authUserId: authUser.id,
        },
        include: {
          resortProfile: { select: { id: true } },
          staffProfile: {
            include: {
              accessRole: true,
            },
          },
        },
      });

      return {
        permissions: appUser?.resortProfile
          ? [FULL_PERMISSION]
          : appUser?.staffProfile?.status === "ACTIVE"
            ? appUser.staffProfile.accessRole.permissions
            : [],
        role: appUser?.resortProfile
          ? "Administrator"
          : (appUser?.staffProfile?.accessRole.name ?? "Guest"),
      };
    }),
    validateInvitation: baseProcedure
      .input(
        z.object({
          token: z.string().trim().min(1, "Invitation token is required."),
        }),
      )
      .query(async ({ input }) => {
        const invitation = await prisma.resortStaffInvitation.findUnique({
          where: {
            tokenHash: hashInviteToken(input.token),
          },
          include: {
            resortProfile: true,
          },
        });

        if (!invitation) {
          return {
            valid: false as const,
            reason: "invalid" as const,
          };
        }

        if (invitation.status !== "PENDING") {
          return {
            valid: false as const,
            reason: invitation.status.toLowerCase(),
          };
        }

        if (invitation.expiresAt <= new Date()) {
          await prisma.resortStaffInvitation.update({
            where: {
              id: invitation.id,
            },
            data: {
              status: "EXPIRED",
            },
          });

          return {
            valid: false as const,
            reason: "expired" as const,
          };
        }

        return {
          valid: true as const,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          message: invitation.message,
          roleName: invitation.roleName,
          workspaceName:
            invitation.resortProfile.resortName || "Alrio Private Resort",
        };
      }),
    resolveSignInIdentifier: baseProcedure
      .input(
        z.object({
          identifier: z.string().trim().min(1),
        }),
      )
      .mutation(async ({ input }) => {
        const identifier = input.identifier.toLowerCase();

        if (identifier.includes("@")) {
          const account = await prisma.user.findUnique({
            where: { email: identifier },
            select: {
              id: true,
              appUser: {
                select: { guestDisabledAt: true },
              },
            },
          });
          if (!account) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "No account exists with this email address. Please create an account first.",
            });
          }
          if (account.appUser?.guestDisabledAt) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "This guest account is disabled. Please contact Alrio Private Resort for assistance.",
            });
          }
          return {
            email: identifier,
          };
        }

        const staffProfile = await prisma.resortStaffProfile.findFirst({
          where: {
            username: identifier,
          },
          include: {
            appUser: true,
            accessRole: true,
            department: true,
          },
        });

        if (!staffProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Username not found.",
          });
        }

        return {
          email: staffProfile.appUser.email,
        };
      }),
    resolveRedirect: baseProcedure.mutation(async ({ ctx }) => {
      const authUserId = ctx.session?.user?.id;
      if (!authUserId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Sign in required.",
        });
      }
      return {
        redirectTo: (await getSignInRedirect(authUserId)) ?? "/auth/sign-up",
      };
    }),
    acceptInvitation: baseProcedure
      .input(
        z.object({
          token: z.string().trim().min(1, "Invitation token is required."),
          firstName: optionalTrimmedString,
          lastName: optionalTrimmedString,
          username: optionalUsername,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id || !authUser.email) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign-up session missing.",
          });
        }

        const invitation = await prisma.resortStaffInvitation.findUnique({
          where: {
            tokenHash: hashInviteToken(input.token),
          },
          include: {
            resortProfile: true,
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation invalid.",
          });
        }

        if (invitation.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation already used.",
          });
        }

        if (invitation.expiresAt <= new Date()) {
          await prisma.resortStaffInvitation.update({
            where: {
              id: invitation.id,
            },
            data: {
              status: "EXPIRED",
            },
          });

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation expired.",
          });
        }

        if (authUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Use the email address this invitation was sent to.",
          });
        }

        const username = input.username?.toLowerCase() ?? null;
        const [duplicateUsername, accessRole] = await Promise.all([
          username
            ? prisma.resortStaffProfile.findFirst({
                where: {
                  username,
                },
              })
            : null,
          prisma.resortAccessRole.findFirst({
            where: {
              resortProfileId: invitation.resortProfileId,
              name: invitation.roleName,
            },
          }),
        ]);

        if (duplicateUsername) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Username already exists in this workspace.",
          });
        }

        const [fallbackFirstName = "User", ...fallbackLastNameParts] = (
          authUser.name ||
          authUser.email.split("@")[0] ||
          "User"
        )
          .trim()
          .split(/\s+/);
        const firstName = input.firstName?.trim() || fallbackFirstName;
        const lastName =
          input.lastName?.trim() || fallbackLastNameParts.join(" ") || "";
        const displayName =
          `${firstName} ${lastName}`.trim() || authUser.name || authUser.email;

        if (!accessRole) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This invitation's access role is no longer available. Contact the resort team.",
          });
        }

        await prisma.$transaction(async (tx) => {
          const claimed = await tx.resortStaffInvitation.updateMany({
            where: {
              id: invitation.id,
              status: "PENDING",
              expiresAt: { gt: new Date() },
            },
            data: { status: "ACCEPTED", acceptedAt: new Date() },
          });
          if (claimed.count !== 1) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Invitation expired or already used.",
            });
          }
          await tx.user.update({
            where: {
              id: authUser.id,
            },
            data: {
              email: authUser.email,
              name: displayName,
            },
          });

          await tx.appUser.upsert({
            where: {
              authUserId: authUser.id,
            },
            create: {
              authUserId: authUser.id,
              email: authUser.email,
              firstName,
              lastName,
              displayName,
            },
            update: {
              email: authUser.email,
              firstName,
              lastName,
              displayName,
            },
          });

          await tx.resortStaffProfile.upsert({
            where: {
              appUserId: authUser.id,
            },
            create: {
              resortProfileId: invitation.resortProfileId,
              appUserId: authUser.id,
              accessRoleId: accessRole.id,
              username,
              status: "ACTIVE",
            },
            update: {
              resortProfileId: invitation.resortProfileId,
              accessRoleId: accessRole.id,
              username,
              status: "ACTIVE",
            },
          });

          await tx.resortStaffInvitation.update({
            where: {
              id: invitation.id,
            },
            data: {
              acceptedAt: new Date(),
              status: "ACCEPTED",
            },
          });
        });

        await safelyRecordStaffActivityForAuthUser(authUser.id, {
          action: STAFF_ACTIVITY_ACTIONS.accountCreated,
          title: "Staff invitation accepted",
          detail: `Joined the Alrio staff workspace as ${accessRole.name}.`,
          actorAuthUserId: authUser.id,
        });

        return { redirectTo: (await getSignInRedirect(authUser.id)) ?? "/" };
      }),
  }),
  resort: createTRPCRouter({
    branding: createTRPCRouter({
      get: baseProcedure.query(async ({ ctx }) => {
        const authUserId = ctx.session?.user?.id;
        if (!authUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
        await requireResortPermission(authUserId, "settings.branding.manage");
        const resortProfile = await getResortProfileForSession(authUserId);
        const setting = await prisma.resortLandingBranding.findUnique({
          where: { resortProfileId: resortProfile.id }, select: { content: true, updatedAt: true },
        });
        return { content: parseLandingBranding(setting?.content ?? DEFAULT_LANDING_BRANDING), updatedAt: setting?.updatedAt ?? null };
      }),
      save: baseProcedure.input(landingBrandingSchema).mutation(async ({ ctx, input }) => {
        const authUserId = ctx.session?.user?.id;
        if (!authUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
        await requireResortPermission(authUserId, "settings.branding.manage");
        const resortProfile = await getResortProfileForSession(authUserId);
        const setting = await prisma.resortLandingBranding.upsert({
          where: { resortProfileId: resortProfile.id },
          create: { resortProfileId: resortProfile.id, content: input, updatedByAuthUserId: authUserId },
          update: { content: input, updatedByAuthUserId: authUserId },
          select: { updatedAt: true },
        });
        await safelyRecordStaffActivityForAuthUser(authUserId, {
          action: STAFF_ACTIVITY_ACTIONS.workspaceAction,
          title: "Updated landing page branding",
          detail: "Updated public landing-page copy, imagery, or guest feedback.",
          actorAuthUserId: authUserId,
        });
        return { updatedAt: setting.updatedAt };
      }),
    }),
    developerSettings: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUserId = ctx.session?.user?.id;
        if (!authUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
        const resortProfile = await getResortProfileForSession(authUserId);
        const saved = await prisma.resortDeveloperSetting.findMany({
          where: { resortProfileId: resortProfile.id },
          select: { key: true, updatedAt: true },
        });
        const savedByKey = new Map(saved.map((setting) => [setting.key, setting]));
        return RUNTIME_SETTING_DEFINITIONS.map((definition) => {
          const setting = savedByKey.get(definition.key);
          return {
            ...definition,
            configured: Boolean(setting || process.env[definition.fallbackEnv]),
            source: setting ? "database" : process.env[definition.fallbackEnv] ? "environment" : "missing",
            updatedAt: setting?.updatedAt ?? null,
          };
        });
      }),
      save: baseProcedure
        .input(z.object({ settings: z.array(z.object({ key: z.string(), value: z.string().max(10_000) })) }))
        .mutation(async ({ ctx, input }) => {
          const authUserId = ctx.session?.user?.id;
          if (!authUserId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          const resortProfile = await getResortProfileForSession(authUserId);
          for (const setting of input.settings) {
            if (!isRuntimeSettingKey(setting.key)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown developer setting: ${setting.key}.` });
            }
            if (setting.value.trim()) {
              await saveRuntimeSetting({ resortProfileId: resortProfile.id, key: setting.key, value: setting.value.trim(), updatedByAuthUserId: authUserId });
            } else {
              await clearRuntimeSetting(resortProfile.id, setting.key);
            }
          }
          return { updated: input.settings.length };
        }),
    }),
    notifications: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const nextWeek = new Date(todayStart);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const [
          reservations,
          invoices,
          housekeepingRooms,
          damageReports,
          maintenanceRequests,
          leads,
          leaveRequests,
          inventoryItems,
        ] = await Promise.all([
          prisma.resortReservation.findMany({
            where: {
              resortProfileId: resortProfile.id,
              OR: [
                { status: "PENDING" },
                {
                  checkIn: {
                    gte: todayStart,
                    lt: nextWeek,
                  },
                  status: {
                    in: ["CONFIRMED", "CHECKED_IN"],
                  },
                },
              ],
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 4,
          }),
          prisma.resortInvoice.findMany({
            where: {
              resortProfileId: resortProfile.id,
              status: {
                in: ["SENT", "OVERDUE"],
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 4,
          }),
          prisma.resortHousekeepingRoom.findMany({
            where: {
              resortProfileId: resortProfile.id,
              status: "DIRTY",
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
          prisma.resortHousekeepingDamageReport.findMany({
            where: {
              resortProfileId: resortProfile.id,
              status: "OPEN",
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
          prisma.resortMaintenanceRequest.findMany({
            where: {
              resortProfileId: resortProfile.id,
              status: "PENDING",
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 4,
          }),
          prisma.resortLead.findMany({
            where: {
              resortProfileId: resortProfile.id,
              stage: {
                in: ["INTAKE", "QUALIFIED"],
              },
            },
            orderBy: {
              lastMessageAt: "desc",
            },
            take: 3,
          }),
          prisma.resortLeaveRequest.findMany({
            where: {
              resortProfileId: resortProfile.id,
              status: "PENDING",
            },
            include: {
              staffProfile: {
                include: {
                  appUser: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 3,
          }),
          prisma.resortInventoryItem.findMany({
            where: {
              resortProfileId: resortProfile.id,
              dashboardAlert: true,
            },
            orderBy: {
              updatedAt: "desc",
            },
            take: 20,
          }),
        ]);

        const inventoryAlerts = inventoryItems
          .filter((item) => item.quantity <= item.threshold)
          .slice(0, 3);

        const alerts = [
          ...reservations.map((reservation) => ({
            id: `reservation-${reservation.id}`,
            kind: "reservation" as const,
            title:
              reservation.status === "PENDING"
                ? "Booking needs confirmation"
                : "Upcoming check-in",
            description: `${reservation.guestName} - ${
              reservation.room?.code ?? reservation.room?.name ?? "room"
            }`,
            href: "/resort/reservations/calendar",
            createdAt: reservation.updatedAt,
            unread: reservation.status === "PENDING",
          })),
          ...invoices.map((invoice) => ({
            id: `invoice-${invoice.id}`,
            kind: "invoice" as const,
            title:
              invoice.status === "OVERDUE"
                ? "Invoice overdue"
                : "Payment pending",
            description: `${invoice.code} - ${invoice.guestName} has balance ${invoice.balanceDue}.`,
            href: "/resort/finance/money-status",
            createdAt: invoice.updatedAt,
            unread: true,
          })),
          ...housekeepingRooms.map((roomState) => ({
            id: `housekeeping-${roomState.id}`,
            kind: "housekeeping" as const,
            title: "Room needs housekeeping",
            description: `${
              roomState.room.code || roomState.room.name
            } is marked dirty.`,
            href: "/resort/operations/housekeeping",
            createdAt: roomState.updatedAt,
            unread: true,
          })),
          ...damageReports.map((report) => ({
            id: `damage-${report.id}`,
            kind: "housekeeping" as const,
            title: "Damage report open",
            description: `${report.title} - ${
              report.room.code || report.room.name
            }`,
            href: "/resort/operations/housekeeping",
            createdAt: report.updatedAt,
            unread: true,
          })),
          ...maintenanceRequests.map((request) => ({
            id: `maintenance-${request.id}`,
            kind: "maintenance" as const,
            title: "Maintenance request open",
            description: `${request.code} - ${request.area}: ${request.issue}`,
            href: "/resort/operations/maintenance",
            createdAt: request.updatedAt,
            unread: true,
          })),
          ...leads.map((lead) => ({
            id: `lead-${lead.id}`,
            kind: "lead" as const,
            title: "Guest message waiting",
            description: `${lead.guestName}: ${
              lead.lastMessage ?? lead.inquiry ?? "New lead inquiry"
            }`,
            href: "/resort/leads",
            createdAt: lead.lastMessageAt ?? lead.updatedAt,
            unread: true,
          })),
          ...leaveRequests.map((leaveRequest) => ({
            id: `leave-${leaveRequest.id}`,
            kind: "hr" as const,
            title: "Leave request pending",
            description: `${leaveRequest.staffProfile.appUser.displayName} requested ${leaveRequest.leaveType}.`,
            href: "/resort/hr/leave-requests",
            createdAt: leaveRequest.updatedAt,
            unread: true,
          })),
          ...inventoryAlerts.map((item) => ({
            id: `inventory-${item.id}`,
            kind: "inventory" as const,
            title: "Inventory below threshold",
            description: `${item.name} has ${item.quantity} ${item.unit} left.`,
            href: "/resort/operations/inventory",
            createdAt: item.updatedAt,
            unread: true,
          })),
        ]
          .sort(
            (first, second) =>
              second.createdAt.getTime() - first.createdAt.getTime(),
          )
          .slice(0, 8);

        return {
          alerts,
          unreadCount: alerts.filter((alert) => alert.unread).length,
        };
      }),
    }),
    analytics: createTRPCRouter({
      summary: baseProcedure
        .input(
          z
            .object({
              period: z.enum(["week", "month", "quarter"]).default("month"),
            })
            .optional(),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const period = input?.period ?? "month";
          const { end, start } = getAnalyticsRange(period);
          const days = getAnalyticsDays(start, end);
          const monthStarts = getAnalyticsMonthStarts();
          const trendStart = monthStarts[0] ?? start;
          const trendEnd = new Date();
          trendEnd.setHours(23, 59, 59, 999);

          const [
            reservations,
            financeEntries,
            invoices,
            housekeepingRooms,
            maintenanceRequests,
            receptionRequests,
            laundryJobs,
            inventoryItems,
          ] = await Promise.all([
            prisma.resortReservation.findMany({
              where: {
                checkIn: { lte: end },
                checkOut: { gte: start },
                status: { not: "CANCELED" },
                resortProfileId: resortProfile.id,
              },
              select: {
                checkIn: true,
                checkOut: true,
              },
            }),
            prisma.resortFinanceEntry.findMany({
              where: {
                entryDate: { gte: trendStart, lte: trendEnd },
                status: "CLEARED",
                resortProfileId: resortProfile.id,
              },
              select: {
                amount: true,
                entryDate: true,
                type: true,
              },
            }),
            prisma.resortInvoice.findMany({
              where: {
                resortProfileId: resortProfile.id,
              },
              select: {
                balanceDue: true,
                status: true,
              },
            }),
            prisma.resortHousekeepingRoom.findMany({
              where: { resortProfileId: resortProfile.id },
              select: { status: true },
            }),
            prisma.resortMaintenanceRequest.findMany({
              where: {
                createdAt: { gte: start, lte: end },
                resortProfileId: resortProfile.id,
              },
              select: { status: true },
            }),
            prisma.resortReceptionRequest.findMany({
              where: {
                createdAt: { gte: start, lte: end },
                resortProfileId: resortProfile.id,
              },
              select: { status: true },
            }),
            prisma.resortLaundryJob.findMany({
              where: {
                receivedAt: { gte: start, lte: end },
                resortProfileId: resortProfile.id,
              },
              select: { status: true },
            }),
            prisma.resortInventoryItem.findMany({
              where: { resortProfileId: resortProfile.id },
              select: {
                quantity: true,
                threshold: true,
              },
            }),
          ]);

          const occupancyData = days.map((day) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            const occupied = reservations.some(
              (reservation) =>
                reservation.checkIn.getTime() <= dayEnd.getTime() &&
                reservation.checkOut.getTime() >= dayStart.getTime(),
            )
              ? 100
              : 0;

            return {
              available: Math.max(0, 100 - occupied),
              day: day.toLocaleDateString("en-US", { weekday: "short" }),
              occupied,
            };
          });

          const periodEntries = financeEntries.filter((entry) =>
            isDateInRange(entry.entryDate, start, end),
          );
          const revenueTotal = periodEntries
            .filter((entry) => entry.type === "REVENUE")
            .reduce(
              (total, entry) => total + parseMoneyAmount(entry.amount),
              0,
            );
          const expenseTotal = periodEntries
            .filter((entry) => entry.type === "EXPENSE")
            .reduce(
              (total, entry) => total + parseMoneyAmount(entry.amount),
              0,
            );
          const receivables = invoices
            .filter(
              (invoice) =>
                invoice.status !== "PAID" && invoice.status !== "VOID",
            )
            .reduce(
              (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
              0,
            );

          const revenueData = monthStarts.map((monthStart) => {
            const monthEnd = new Date(
              monthStart.getFullYear(),
              monthStart.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
            const monthEntries = financeEntries.filter((entry) =>
              isDateInRange(entry.entryDate, monthStart, monthEnd),
            );

            return {
              expenses: monthEntries
                .filter((entry) => entry.type === "EXPENSE")
                .reduce(
                  (total, entry) => total + parseMoneyAmount(entry.amount),
                  0,
                ),
              month: monthStart.toLocaleDateString("en-US", {
                month: "short",
              }),
              revenue: monthEntries
                .filter((entry) => entry.type === "REVENUE")
                .reduce(
                  (total, entry) => total + parseMoneyAmount(entry.amount),
                  0,
                ),
            };
          });

          const housekeepingCompleted = housekeepingRooms.filter(
            (room) => room.status === "CLEAN" || room.status === "VACANT",
          ).length;
          const maintenanceCompleted = maintenanceRequests.filter(
            (request) => request.status === "COMPLETED",
          ).length;
          const receptionCompleted = receptionRequests.filter(
            (request) => request.status === "RESOLVED",
          ).length;
          const laundryCompleted = laundryJobs.filter(
            (job) => job.status === "RETURNED",
          ).length;
          const inventoryCompleted = inventoryItems.filter(
            (item) => item.quantity > item.threshold,
          ).length;

          const taskData = [
            {
              completed: getAnalyticsPercent(
                housekeepingCompleted,
                housekeepingRooms.length,
              ),
              department: "Housekeeping",
            },
            {
              completed: getAnalyticsPercent(
                maintenanceCompleted,
                maintenanceRequests.length,
              ),
              department: "Maintenance",
            },
            {
              completed: getAnalyticsPercent(
                receptionCompleted,
                receptionRequests.length,
              ),
              department: "Reception",
            },
            {
              completed: getAnalyticsPercent(
                laundryCompleted,
                laundryJobs.length,
              ),
              department: "Laundry",
            },
            {
              completed: getAnalyticsPercent(
                inventoryCompleted,
                inventoryItems.length,
              ),
              department: "Inventory",
            },
          ];
          const taskTotal =
            housekeepingRooms.length +
            maintenanceRequests.length +
            receptionRequests.length +
            laundryJobs.length +
            inventoryItems.length;
          const taskCompleted =
            housekeepingCompleted +
            maintenanceCompleted +
            receptionCompleted +
            laundryCompleted +
            inventoryCompleted;
          const taskCompletion = getAnalyticsPercent(taskCompleted, taskTotal);
          const openTasks = Math.max(taskTotal - taskCompleted, 0);
          const blockedTasks =
            maintenanceRequests.filter(
              (request) => request.status === "PENDING",
            ).length +
            inventoryItems.filter((item) => item.quantity <= item.threshold)
              .length;
          const blockedPercent = getAnalyticsPercent(blockedTasks, taskTotal);
          const completedPercent = taskCompletion;
          const openPercent = Math.max(
            0,
            100 - completedPercent - blockedPercent,
          );
          const averageOccupancy = Math.round(
            occupancyData.reduce((total, item) => total + item.occupied, 0) /
              Math.max(occupancyData.length, 1),
          );
          const peakDay = occupancyData.reduce(
            (peak, item) => (item.occupied > peak.occupied ? item : peak),
            occupancyData[0] ?? { day: "--", occupied: 0 },
          );
          const availableResortNights = days.length;
          const soldResortNights = Math.round(
            (availableResortNights * averageOccupancy) / 100,
          );
          const updated = new Date().toLocaleString("en-US", {
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            month: "short",
            year: "numeric",
          });

          return {
            kpi: [
              {
                note: `${period === "week" ? "7-day" : period === "quarter" ? "Quarter" : "Month"} average`,
                title: "Occupancy",
                value: `${averageOccupancy}%`,
              },
              {
                note: "Selected period",
                title: "Revenue",
                value: formatAnalyticsMoney(revenueTotal),
              },
              {
                note: "Across departments",
                title: "Task completion",
                value: `${taskCompletion}%`,
              },
              {
                note: "Occupancy, revenue, tasks",
                title: "Exportable reports",
                value: "3",
              },
            ],
            occupancyData,
            reportRows: {
              occupancy: [
                ["Average occupancy", `${averageOccupancy}%`],
                ["Peak day", `${peakDay.day} · ${peakDay.occupied}%`],
                ["Available resort nights", String(availableResortNights)],
                ["Booked resort nights", String(soldResortNights)],
              ],
              revenue: [
                ["Period revenue", formatAnalyticsMoney(revenueTotal)],
                ["Expenses", formatAnalyticsMoney(expenseTotal)],
                ["Net", formatAnalyticsMoney(revenueTotal - expenseTotal)],
                ["Open receivables", formatAnalyticsMoney(receivables)],
              ],
              tasks: taskData.map((item) => [
                item.department,
                `${item.completed}% complete`,
              ]),
            },
            reports: [
              {
                format: "XLSX",
                scope:
                  "Daily whole-resort occupancy, arrivals, and departures",
                title: "Occupancy report",
                updated: `${updated}`,
              },
              {
                format: "PDF",
                scope: "Resort revenue, invoice payments, expenses, net result",
                title: "Revenue report",
                updated: `${updated}`,
              },
              {
                format: "CSV",
                scope:
                  "Housekeeping, maintenance, reception, laundry completion rate",
                title: "Department task completion",
                updated: `${updated}`,
              },
            ],
            revenueData,
            taskData,
            taskPieData: [
              { fill: "#000000", name: "Completed", value: completedPercent },
              { fill: "#71717a", name: "Open", value: openPercent },
              { fill: "#d4d4d8", name: "Blocked", value: blockedPercent },
            ],
            totals: {
              openTasks,
              receivables,
              revenue: revenueTotal,
              taskTotal,
            },
          };
        }),
    }),
    staffRecords: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);

        const staffProfiles = await prisma.resortStaffProfile.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            appUser: true,
            department: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return staffProfiles.map((staffProfile) => ({
          ...toResortStaffOutput(staffProfile),
          startDate: staffProfile.createdAt,
        }));
      }),
    }),
    timekeeping: createTRPCRouter({
      me: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
        });
        const isStaff = Boolean(appUser?.staffProfile);
        const today = getWorkdayStart();
        const activeLog = isStaff
          ? appUser?.staffProfile
            ? await prisma.resortTimeLog.findUnique({
                where: {
                  staffProfileId_date: {
                    staffProfileId: appUser.staffProfile.id,
                    date: today,
                  },
                },
                include: {
                  staffProfile: {
                    include: {
                      appUser: true,
                      department: true,
                    },
                  },
                },
              })
            : null
          : null;

        return {
          isStaff,
          resortProfileId: resortProfile.id,
          staffProfile: appUser?.staffProfile
            ? toResortStaffOutput(appUser.staffProfile)
            : null,
          todayLog: activeLog ? toResortTimeLogOutput(activeLog) : null,
        };
      }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });
        const canManageTimekeeping = hasResortPermission(
          await getResortPermissionsForSession(authUser.id),
          "hr.timekeeping.manage",
        );

        const logs = await prisma.resortTimeLog.findMany({
          where: {
            resortProfileId: resortProfile.id,
            ...(appUser?.staffProfile && !canManageTimekeeping
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
          orderBy: [
            {
              date: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return logs.map(toResortTimeLogOutput);
      }),
      clockIn: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        if (!appUser?.staffProfile) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only staff can clock in.",
          });
        }

        const staffProfile = appUser.staffProfile;

        const now = new Date();
        const today = getWorkdayStart(now);
        const existingLog = await prisma.resortTimeLog.findUnique({
          where: {
            staffProfileId_date: {
              staffProfileId: staffProfile.id,
              date: today,
            },
          },
        });

        if (existingLog?.clockIn) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already clocked in today.",
          });
        }

        const timeLog = await prisma.resortTimeLog.upsert({
          where: {
            staffProfileId_date: {
              staffProfileId: staffProfile.id,
              date: today,
            },
          },
          create: {
            resortProfileId: resortProfile.id,
            staffProfileId: staffProfile.id,
            date: today,
            clockIn: now,
            flag: getTimeLogFlag(now),
          },
          update: {
            clockIn: now,
            flag: getTimeLogFlag(now),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
        });

        return toResortTimeLogOutput(timeLog);
      }),
      clockOut: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        if (
          !appUser ||
          !appUser.staffProfile
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only staff can clock out.",
          });
        }

        const today = getWorkdayStart();
        const existingLog = await prisma.resortTimeLog.findUnique({
          where: {
            staffProfileId_date: {
              staffProfileId: appUser.staffProfile.id,
              date: today,
            },
          },
        });

        if (!existingLog?.clockIn) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Clock in before clocking out.",
          });
        }

        if (existingLog.clockOut) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already clocked out today.",
          });
        }

        const timeLog = await prisma.resortTimeLog.update({
          where: {
            id: existingLog.id,
          },
          data: {
            clockOut: new Date(),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
                department: true,
              },
            },
          },
        });

        return toResortTimeLogOutput(timeLog);
      }),
      updateFlag: baseProcedure
        .input(
          z.object({
            id: z.string(),
            flag: resortTimeLogFlagSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.timekeeping.manage");

          const existingLog = await prisma.resortTimeLog.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingLog) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Time log not found.",
            });
          }

          const timeLog = await prisma.resortTimeLog.update({
            where: {
              id: existingLog.id,
            },
            data: {
              flag: toResortTimeLogFlag(input.flag),
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                  department: true,
                },
              },
            },
          });

          return toResortTimeLogOutput(timeLog);
        }),
    }),
    scheduling: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });

        const shifts = await prisma.resortScheduleShift.findMany({
          where: {
            resortProfileId: resortProfile.id,
            ...(appUser?.staffProfile
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
              },
            },
          },
          orderBy: [
            {
              startAt: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return shifts.map(toResortScheduleShiftOutput);
      }),
      save: baseProcedure
        .input(
          z.object({
            id: z.string().optional(),
            staffProfileId: optionalTrimmedString,
            shift: z.string().trim().min(1, "Shift name is required."),
            role: z.string().trim().min(1, "Role is required."),
            department: optionalTrimmedString,
            startAt: z.coerce.date(),
            endAt: z.coerce.date(),
            status: resortScheduleShiftStatusSchema.default("Assigned"),
            notes: optionalTrimmedString,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.scheduling.manage");

          if (input.endAt <= input.startAt) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Shift end must be after shift start.",
            });
          }

          const staffProfile = input.staffProfileId
            ? await prisma.resortStaffProfile.findFirst({
                where: {
                  id: input.staffProfileId,
                  resortProfileId: resortProfile.id,
                },
                include: {
                  department: true,
                },
              })
            : null;

          if (input.staffProfileId && !staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff profile not found.",
            });
          }

          if (input.id) {
            const existingShift = await prisma.resortScheduleShift.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingShift) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shift not found.",
              });
            }
          }

          const status =
            input.status === "Assigned" && !input.staffProfileId
              ? "OPEN"
              : toResortScheduleShiftStatus(input.status);
          const shift = await prisma.resortScheduleShift.upsert({
            where: {
              id: input.id ?? "",
            },
            create: {
              resortProfileId: resortProfile.id,
              staffProfileId: staffProfile?.id,
              shift: input.shift,
              role: input.role,
              department: input.department ?? staffProfile?.department?.name,
              startAt: input.startAt,
              endAt: input.endAt,
              status,
              notes: input.notes,
            },
            update: {
              staffProfileId: staffProfile?.id,
              shift: input.shift,
              role: input.role,
              department: input.department ?? staffProfile?.department?.name,
              startAt: input.startAt,
              endAt: input.endAt,
              status,
              notes: input.notes,
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toResortScheduleShiftOutput(shift);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.scheduling.manage");

          const existingShift = await prisma.resortScheduleShift.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingShift) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shift not found.",
            });
          }

          await prisma.resortScheduleShift.delete({
            where: {
              id: existingShift.id,
            },
          });

          return {
            id: existingShift.id,
          };
        }),
    }),
    leaveBalances: createTRPCRouter({
      policies: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;
        if (!authUser?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });

        const resortProfile = await getResortProfileForSession(authUser.id);
        const canManage = hasResortPermission(
          await getResortPermissionsForSession(authUser.id),
          "hr.leaveRequests.manage",
        );
        const policies = await prisma.resortLeavePolicy.findMany({
          where: { resortProfileId: resortProfile.id, ...(canManage ? {} : { isActive: true }) },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });
        return policies;
      }),
      list: baseProcedure
        .input(z.object({ year: z.number().int().min(2020).max(2100).optional() }).optional())
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });

          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: { authUserId: authUser.id },
            include: { staffProfile: true },
          });
          const canManage = hasResortPermission(
            await getResortPermissionsForSession(authUser.id),
            "hr.leaveRequests.manage",
          );
          const balances = await prisma.resortLeaveBalance.findMany({
            where: {
              resortProfileId: resortProfile.id,
              year: input?.year ?? new Date().getFullYear(),
              ...(appUser?.staffProfile && !canManage ? { staffProfileId: appUser.staffProfile.id } : {}),
            },
            include: {
              leavePolicy: true,
              staffProfile: { include: { appUser: true } },
            },
            orderBy: [{ staffProfile: { appUser: { displayName: "asc" } } }, { leavePolicy: { name: "asc" } }],
          });
          return balances.map((balance) => ({
            id: balance.id,
            staffProfileId: balance.staffProfileId,
            staffName: balance.staffProfile.appUser.displayName,
            leavePolicyId: balance.leavePolicyId,
            policyName: balance.leavePolicy.name,
            year: balance.year,
            openingDays: balance.openingDays,
            allocatedDays: balance.allocatedDays,
            adjustmentDays: balance.adjustmentDays,
            usedDays: balance.usedDays,
            availableDays: getLeaveBalanceAvailable(balance),
            updatedAt: balance.updatedAt,
          }));
        }),
      savePolicy: baseProcedure
        .input(z.object({
          id: z.string().optional(),
          name: z.string().trim().min(2, "Policy name is required."),
          annualEntitlement: z.coerce.number().int().min(0).max(365),
          carryOverLimit: z.coerce.number().int().min(0).max(365).default(0),
          isActive: z.boolean().default(true),
        }))
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.leaveRequests.manage");

          const duplicate = await prisma.resortLeavePolicy.findFirst({
            where: { resortProfileId: resortProfile.id, name: input.name, ...(input.id ? { id: { not: input.id } } : {}) },
          });
          if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "A leave policy with this name already exists." });

          if (input.id) {
            const policy = await prisma.resortLeavePolicy.findFirst({ where: { id: input.id, resortProfileId: resortProfile.id } });
            if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "Leave policy not found." });
            return prisma.resortLeavePolicy.update({ where: { id: policy.id }, data: { name: input.name, annualEntitlement: input.annualEntitlement, carryOverLimit: input.carryOverLimit, isActive: input.isActive } });
          }
          return prisma.resortLeavePolicy.create({ data: { resortProfileId: resortProfile.id, name: input.name, annualEntitlement: input.annualEntitlement, carryOverLimit: input.carryOverLimit, isActive: input.isActive } });
        }),
      saveAllocation: baseProcedure
        .input(z.object({
          staffProfileId: z.string().min(1),
          leavePolicyId: z.string().min(1),
          year: z.coerce.number().int().min(2020).max(2100),
          openingDays: z.coerce.number().int().min(0).max(365).default(0),
          allocatedDays: z.coerce.number().int().min(0).max(365),
          adjustmentDays: z.coerce.number().int().min(-365).max(365).default(0),
        }))
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.leaveRequests.manage");
          const [staff, policy] = await Promise.all([
            prisma.resortStaffProfile.findFirst({ where: { id: input.staffProfileId, resortProfileId: resortProfile.id } }),
            prisma.resortLeavePolicy.findFirst({ where: { id: input.leavePolicyId, resortProfileId: resortProfile.id } }),
          ]);
          if (!staff || !policy) throw new TRPCError({ code: "NOT_FOUND", message: "Staff member or leave policy not found." });
          return prisma.resortLeaveBalance.upsert({
            where: { staffProfileId_leavePolicyId_year: { staffProfileId: staff.id, leavePolicyId: policy.id, year: input.year } },
            create: { resortProfileId: resortProfile.id, staffProfileId: staff.id, leavePolicyId: policy.id, year: input.year, openingDays: input.openingDays, allocatedDays: input.allocatedDays, adjustmentDays: input.adjustmentDays },
            update: { openingDays: input.openingDays, allocatedDays: input.allocatedDays, adjustmentDays: input.adjustmentDays },
          });
        }),
    }),
    leaveRequests: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });
        const canManageLeaveRequests = hasResortPermission(
          await getResortPermissionsForSession(authUser.id),
          "hr.leaveRequests.manage",
        );

        const requests = await prisma.resortLeaveRequest.findMany({
          where: {
            resortProfileId: resortProfile.id,
            ...(appUser?.staffProfile && !canManageLeaveRequests
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        });
        const balanceKeys = requests
          .filter((request) => request.leavePolicyId)
          .map((request) => ({
            staffProfileId: request.staffProfileId,
            leavePolicyId: request.leavePolicyId as string,
            year: request.startDate.getFullYear(),
          }));
        const balances = balanceKeys.length
          ? await prisma.resortLeaveBalance.findMany({
              where: {
                resortProfileId: resortProfile.id,
                OR: balanceKeys,
              },
            })
          : [];
        const balanceByKey = new Map(
          balances.map((balance) => [
            `${balance.staffProfileId}:${balance.leavePolicyId}:${balance.year}`,
            getLeaveBalanceAvailable(balance),
          ]),
        );

        return requests.map((request) =>
          toResortLeaveRequestOutput(
            request,
            request.leavePolicyId
              ? balanceByKey.get(
                  `${request.staffProfileId}:${request.leavePolicyId}:${request.startDate.getFullYear()}`,
                )
              : undefined,
          ),
        );
      }),
      save: baseProcedure
        .input(
          z.object({
            id: z.string().optional(),
            staffProfileId: optionalTrimmedString,
            type: z.string().trim().min(1, "Leave type is required."),
            leavePolicyId: optionalTrimmedString,
            startDate: z.coerce.date(),
            endDate: z.coerce.date(),
            reason: z.string().trim().min(1, "Reason is required."),
            balanceDays: z.coerce.number().int().min(0).default(0),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
            include: {
              staffProfile: true,
            },
          });
          const canManageLeaveRequests = hasResortPermission(
            await getResortPermissionsForSession(authUser.id),
            "hr.leaveRequests.manage",
          );

          if (input.endDate < input.startDate) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Leave end date must be after start date.",
            });
          }
          if (input.startDate.getFullYear() !== input.endDate.getFullYear()) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Leave requests must fall within one calendar year.",
            });
          }

          const staffProfileId = canManageLeaveRequests
            ? input.staffProfileId ?? appUser?.staffProfile?.id
            : appUser?.staffProfile?.id;

          if (!staffProfileId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Staff is required.",
            });
          }

          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: staffProfileId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff profile not found.",
            });
          }

          let policy: { id: string; name: string } | null = null;
          let balanceDays = input.balanceDays;
          if (input.leavePolicyId) {
            policy = await prisma.resortLeavePolicy.findFirst({
              where: {
                id: input.leavePolicyId,
                resortProfileId: resortProfile.id,
                isActive: true,
              },
              select: { id: true, name: true },
            });
            if (!policy) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Leave policy not found or inactive." });
            }
            const balance = await prisma.resortLeaveBalance.findUnique({
              where: {
                staffProfileId_leavePolicyId_year: {
                  staffProfileId: staffProfile.id,
                  leavePolicyId: policy.id,
                  year: input.startDate.getFullYear(),
                },
              },
            });
            if (!balance) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "No leave balance has been allocated for this staff member and policy.",
              });
            }
            balanceDays = getLeaveBalanceAvailable(balance);
            const requestedDays = getLeaveDays(input.startDate, input.endDate);
            if (requestedDays > balanceDays) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Only ${balanceDays} leave day${balanceDays === 1 ? "" : "s"} remain for this policy.`,
              });
            }
          }

          if (input.id) {
            const existingRequest = await prisma.resortLeaveRequest.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingRequest) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Leave request not found.",
              });
            }

            if (
              appUser?.staffProfile &&
              !canManageLeaveRequests &&
              existingRequest.staffProfileId !== appUser.staffProfile.id
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "You can only edit your own leave requests.",
              });
            }
            if (existingRequest.status === "APPROVED") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Approved leave cannot be edited. Change its status first to restore the balance.",
              });
            }
          }

          const request = await prisma.resortLeaveRequest.upsert({
            where: {
              id: input.id ?? "",
            },
            create: {
              resortProfileId: resortProfile.id,
              staffProfileId: staffProfile.id,
              leaveType: policy?.name ?? input.type,
              startDate: input.startDate,
              endDate: input.endDate,
              reason: input.reason,
              balanceDays,
              leavePolicyId: policy?.id ?? null,
            },
            update: {
              staffProfileId: staffProfile.id,
              leaveType: policy?.name ?? input.type,
              startDate: input.startDate,
              endDate: input.endDate,
              reason: input.reason,
              balanceDays,
              leavePolicyId: policy?.id ?? null,
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toResortLeaveRequestOutput(request);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortLeaveRequestStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.leaveRequests.manage");

          const existingRequest = await prisma.resortLeaveRequest.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Leave request not found.",
            });
          }

          const nextStatus = toResortLeaveRequestStatus(input.status);
          const request = await prisma.$transaction(async (transaction) => {
            if (
              existingRequest.leavePolicyId &&
              existingRequest.status !== nextStatus
            ) {
              const balance = await transaction.resortLeaveBalance.findUnique({
                where: {
                  staffProfileId_leavePolicyId_year: {
                    staffProfileId: existingRequest.staffProfileId,
                    leavePolicyId: existingRequest.leavePolicyId,
                    year: existingRequest.startDate.getFullYear(),
                  },
                },
              });
              if (!balance) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "No leave balance is available for this request.",
                });
              }
              const requestedDays = getLeaveDays(existingRequest.startDate, existingRequest.endDate);
              const shouldDeduct = nextStatus === "APPROVED" && existingRequest.status !== "APPROVED";
              const shouldRestore = existingRequest.status === "APPROVED" && nextStatus !== "APPROVED";
              if (shouldDeduct) {
                const available = getLeaveBalanceAvailable(balance);
                if (requestedDays > available) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Only ${available} leave day${available === 1 ? "" : "s"} remain for this request.`,
                  });
                }
                await transaction.resortLeaveBalance.update({
                  where: { id: balance.id },
                  data: { usedDays: { increment: requestedDays } },
                });
              }
              if (shouldRestore) {
                await transaction.resortLeaveBalance.update({
                  where: { id: balance.id },
                  data: { usedDays: { decrement: requestedDays } },
                });
              }
            }

            return transaction.resortLeaveRequest.update({
              where: { id: existingRequest.id },
              data: { reviewedAt: new Date(), status: nextStatus },
              include: { staffProfile: { include: { appUser: true } } },
            });
          });

          return toResortLeaveRequestOutput(request);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: { authUserId: authUser.id },
            include: { staffProfile: true },
          });
          const canManageLeaveRequests = hasResortPermission(
            await getResortPermissionsForSession(authUser.id),
            "hr.leaveRequests.manage",
          );
          const existingRequest = await prisma.resortLeaveRequest.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Leave request not found.",
            });
          }

          if (
            appUser?.staffProfile &&
            !canManageLeaveRequests &&
            existingRequest.staffProfileId !== appUser.staffProfile.id
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only delete your own leave requests.",
            });
          }

          await prisma.$transaction(async (transaction) => {
            if (
              existingRequest.status === "APPROVED" &&
              existingRequest.leavePolicyId
            ) {
              const balance = await transaction.resortLeaveBalance.findUnique({
                where: {
                  staffProfileId_leavePolicyId_year: {
                    staffProfileId: existingRequest.staffProfileId,
                    leavePolicyId: existingRequest.leavePolicyId,
                    year: existingRequest.startDate.getFullYear(),
                  },
                },
              });
              if (balance) {
                await transaction.resortLeaveBalance.update({
                  where: { id: balance.id },
                  data: { usedDays: { decrement: getLeaveDays(existingRequest.startDate, existingRequest.endDate) } },
                });
              }
            }
            await transaction.resortLeaveRequest.delete({ where: { id: existingRequest.id } });
          });

          return {
            id: existingRequest.id,
          };
        }),
    }),
    otUndertime: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });
        const canManageOtUndertime = hasResortPermission(
          await getResortPermissionsForSession(authUser.id),
          "hr.otUndertime.manage",
        );

        const entries = await prisma.resortOtUndertimeEntry.findMany({
          where: {
            resortProfileId: resortProfile.id,
            ...(appUser?.staffProfile && !canManageOtUndertime
              ? { staffProfileId: appUser.staffProfile.id }
              : {}),
          },
          include: {
            staffProfile: {
              include: {
                appUser: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
          ],
        });

        return entries.map(toResortOtUndertimeOutput);
      }),
      save: baseProcedure
        .input(
          z.object({
            id: z.string().optional(),
            staffProfileId: optionalTrimmedString,
            type: resortOtUndertimeTypeSchema,
            hours: z.string().trim().min(1, "Hours are required."),
            payPeriod: z.string().trim().min(1, "Pay period is required."),
            reason: z.string().trim().min(1, "Reason is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
            include: {
              staffProfile: true,
            },
          });
          const canManageOtUndertime = hasResortPermission(
            await getResortPermissionsForSession(authUser.id),
            "hr.otUndertime.manage",
          );
          const hoursValue = Number.parseFloat(input.hours);

          if (!Number.isFinite(hoursValue) || hoursValue <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Hours must be greater than zero.",
            });
          }

          const staffProfileId = canManageOtUndertime
            ? input.staffProfileId ?? appUser?.staffProfile?.id
            : appUser?.staffProfile?.id;

          if (!staffProfileId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Staff is required.",
            });
          }

          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: staffProfileId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff profile not found.",
            });
          }

          if (input.id) {
            const existingEntry = await prisma.resortOtUndertimeEntry.findFirst(
              {
                where: {
                  id: input.id,
                  resortProfileId: resortProfile.id,
                },
              },
            );

            if (!existingEntry) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "OT/undertime entry not found.",
              });
            }

            if (
              appUser?.staffProfile &&
              !canManageOtUndertime &&
              existingEntry.staffProfileId !== appUser.staffProfile.id
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "You can only edit your own OT or undertime entries.",
              });
            }
          }

          const entry = await prisma.resortOtUndertimeEntry.upsert({
            where: {
              id: input.id ?? "",
            },
            create: {
              resortProfileId: resortProfile.id,
              staffProfileId: staffProfile.id,
              type: toResortOtUndertimeType(input.type),
              hours: input.hours,
              payPeriod: input.payPeriod,
              reason: input.reason,
            },
            update: {
              staffProfileId: staffProfile.id,
              type: toResortOtUndertimeType(input.type),
              hours: input.hours,
              payPeriod: input.payPeriod,
              reason: input.reason,
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toResortOtUndertimeOutput(entry);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortOtUndertimeStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireResortPermission(authUser.id, "hr.otUndertime.manage");

          const existingEntry = await prisma.resortOtUndertimeEntry.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingEntry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "OT/undertime entry not found.",
            });
          }

          const entry = await prisma.resortOtUndertimeEntry.update({
            where: {
              id: existingEntry.id,
            },
            data: {
              reviewedAt: new Date(),
              status: toResortOtUndertimeStatus(input.status),
            },
            include: {
              staffProfile: {
                include: {
                  appUser: true,
                },
              },
            },
          });

          return toResortOtUndertimeOutput(entry);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: { authUserId: authUser.id },
            include: { staffProfile: true },
          });
          const canManageOtUndertime = hasResortPermission(
            await getResortPermissionsForSession(authUser.id),
            "hr.otUndertime.manage",
          );
          const existingEntry = await prisma.resortOtUndertimeEntry.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingEntry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "OT/undertime entry not found.",
            });
          }

          if (
            appUser?.staffProfile &&
            !canManageOtUndertime &&
            existingEntry.staffProfileId !== appUser.staffProfile.id
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only delete your own OT or undertime entries.",
            });
          }

          await prisma.resortOtUndertimeEntry.delete({
            where: {
              id: existingEntry.id,
            },
          });

          return {
            id: existingEntry.id,
          };
        }),
    }),
    payroll: createTRPCRouter({
      myHistory: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const appUser = await prisma.appUser.findUnique({
          where: {
            authUserId: authUser.id,
          },
          include: {
            staffProfile: true,
          },
        });
        const staffProfileId = appUser?.staffProfile?.id ?? null;

        if (!staffProfileId) {
          return [];
        }

        const payrollItems = await prisma.resortPayrollItem.findMany({
          where: {
            included: true,
            staffProfileId,
            resortProfileId: resortProfile.id,
            payrollRun: {
              status: "COMPLETED",
            },
          },
          include: {
            payrollRun: true,
          },
          orderBy: [
            {
              payrollRun: {
                payDate: "desc",
              },
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return payrollItems.map(toResortPayrollHistoryOutput);
      }),
      preview: baseProcedure
        .input(resortPayrollInputSchema)
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "payroll.manage");
          const resortProfile = await getResortProfileForSession(authUser.id);

          return buildResortPayrollPreview(resortProfile.id, input);
        }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "payroll.view");
          if (input.id === "create") return null;

          const resortProfile = await getResortProfileForSession(authUser.id);
          const payrollRun = await prisma.resortPayrollRun.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              items: payrollItemsWithProfileImage,
            },
          });

          if (!payrollRun) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Payroll run not found.",
            });
          }

          return toResortPayrollOutput(payrollRun);
        }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        await requireResortPermission(authUser.id, "payroll.view");
        const resortProfile = await getResortProfileForSession(authUser.id);
        const payrollRuns = await prisma.resortPayrollRun.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            items: payrollItemsWithProfileImage,
          },
          orderBy: [
            {
              generatedAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return payrollRuns.map(toResortPayrollOutput);
      }),
      save: baseProcedure
        .input(resortPayrollInputSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "payroll.manage");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({
            where: {
              authUserId: authUser.id,
            },
          });

          if (input.action === "update" && !input.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Payroll update requires an existing payroll run.",
            });
          }

          const existingPayrollRun = input.id
            ? await prisma.resortPayrollRun.findFirst({
                where: {
                  id: input.id,
                  resortProfileId: resortProfile.id,
                },
              })
            : null;

          if (input.id && !existingPayrollRun) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Payroll run not found.",
            });
          }

          if (existingPayrollRun?.lockedAt) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This payroll run is locked after finalization and can no longer be edited. Void it and create a corrected run instead.",
            });
          }

          const shouldFinalize = input.mode === "finalize";
          const now = new Date();

          const preview = await buildResortPayrollPreview(
            resortProfile.id,
            input,
          );
          if (!existingPayrollRun) {
            const duplicatePayrollRun = await prisma.resortPayrollRun.findFirst(
              {
                where: {
                  name: input.name,
                  periodEnd: preview.periodEnd,
                  periodStart: preview.periodStart,
                  resortProfileId: resortProfile.id,
                },
              },
            );

            if (duplicatePayrollRun) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Payroll run already exists for this name and period. Use Edit payroll to update it.",
              });
            }
          }

          const code =
            existingPayrollRun?.code ??
            (await getNextResortPayrollCode(
              resortProfile.id,
              preview.periodStart,
            ));
          const generatedBy =
            appUser?.displayName || appUser?.email || authUser.email || "Admin";
          const options = {
            backupPayrollData: input.backupPayrollData,
            createJournalEntry: input.createJournalEntry,
            includeAllowance: input.includeAllowance,
            includeBasicSalary: input.includeBasicSalary,
            includeBonus: input.includeBonus,
            includeCommission: input.includeCommission,
            includeGovernmentContributions:
              input.includeGovernmentContributions,
            includeIncentives: input.includeIncentives,
            includeLeaveDeduction: input.includeLeaveDeduction,
            includeLeaveEncashment: input.includeLeaveEncashment,
            includeOtPay: input.includeOtPay,
            lockPayrollAfterGeneration: input.lockPayrollAfterGeneration,
            roundingOption: input.roundingOption,
            sendPayslipNotification: input.sendPayslipNotification,
            mode: input.mode,
          };

          const payrollRun = await prisma.$transaction(async (tx) => {
            const savedRun = existingPayrollRun
              ? await tx.resortPayrollRun.update({
                  where: {
                    id: existingPayrollRun.id,
                  },
                  data: {
                    department:
                      input.department && input.department !== "all"
                        ? input.department
                        : null,
                    employerContributions: preview.totals.employerContributions,
                    employerCost: preview.totals.employerCost,
                    excludedEmployees: preview.totals.excludedEmployees,
                    frequency: toResortPayrollFrequency(input.frequency),
                    generatedAt: now,
                    generatedBy,
                    includedEmployees: preview.totals.includedEmployees,
                    name: input.name,
                    notes: input.notes,
                    options,
                    backupSnapshot:
                      shouldFinalize && input.backupPayrollData
                        ? JSON.parse(JSON.stringify(preview))
                        : null,
                    finalizedAt: shouldFinalize ? now : null,
                    finalizedBy: shouldFinalize ? generatedBy : null,
                    lockedAt:
                      shouldFinalize && input.lockPayrollAfterGeneration
                        ? now
                        : null,
                    lockedBy:
                      shouldFinalize && input.lockPayrollAfterGeneration
                        ? generatedBy
                        : null,
                    payDate: input.payDate,
                    payPeriod: preview.payPeriod,
                    payType: toResortPayrollPayType(input.payType),
                    periodEnd: preview.periodEnd,
                    periodStart: preview.periodStart,
                    status: shouldFinalize ? "COMPLETED" : "DRAFT",
                    totalAllowances: preview.totals.totalAllowances,
                    totalBasicSalary: preview.totals.totalBasicSalary,
                    totalBonus: preview.totals.totalBonus,
                    totalCommission: preview.totals.totalCommission,
                    totalDeductions: preview.totals.totalDeductions,
                    totalEmployees: preview.totals.totalEmployees,
                    totalGovernmentDeductions:
                      preview.totals.totalGovernmentDeductions,
                    totalGrossPay: preview.totals.totalEarnings,
                    totalIncentives: preview.totals.totalIncentives,
                    totalLeaveDeductions: preview.totals.totalLeaveDeductions,
                    totalNetPay: preview.totals.totalNetPay,
                    totalOtherDeductions: preview.totals.totalOtherDeductions,
                    totalOvertimePay: preview.totals.totalOvertimePay,
                    totalUndertimeDeductions:
                      preview.totals.totalUndertimeDeductions,
                  },
                })
              : await tx.resortPayrollRun.create({
                  data: {
                    code,
                    department:
                      input.department && input.department !== "all"
                        ? input.department
                        : null,
                    employerContributions: preview.totals.employerContributions,
                    employerCost: preview.totals.employerCost,
                    excludedEmployees: preview.totals.excludedEmployees,
                    frequency: toResortPayrollFrequency(input.frequency),
                    generatedAt: now,
                    generatedBy,
                    includedEmployees: preview.totals.includedEmployees,
                    name: input.name,
                    notes: input.notes,
                    options,
                    backupSnapshot:
                      shouldFinalize && input.backupPayrollData
                        ? JSON.parse(JSON.stringify(preview))
                        : null,
                    finalizedAt: shouldFinalize ? now : null,
                    finalizedBy: shouldFinalize ? generatedBy : null,
                    lockedAt:
                      shouldFinalize && input.lockPayrollAfterGeneration
                        ? now
                        : null,
                    lockedBy:
                      shouldFinalize && input.lockPayrollAfterGeneration
                        ? generatedBy
                        : null,
                    payDate: input.payDate,
                    payPeriod: preview.payPeriod,
                    payType: toResortPayrollPayType(input.payType),
                    periodEnd: preview.periodEnd,
                    periodStart: preview.periodStart,
                    status: shouldFinalize ? "COMPLETED" : "DRAFT",
                    resortProfileId: resortProfile.id,
                    totalAllowances: preview.totals.totalAllowances,
                    totalBasicSalary: preview.totals.totalBasicSalary,
                    totalBonus: preview.totals.totalBonus,
                    totalCommission: preview.totals.totalCommission,
                    totalDeductions: preview.totals.totalDeductions,
                    totalEmployees: preview.totals.totalEmployees,
                    totalGovernmentDeductions:
                      preview.totals.totalGovernmentDeductions,
                    totalGrossPay: preview.totals.totalEarnings,
                    totalIncentives: preview.totals.totalIncentives,
                    totalLeaveDeductions: preview.totals.totalLeaveDeductions,
                    totalNetPay: preview.totals.totalNetPay,
                    totalOtherDeductions: preview.totals.totalOtherDeductions,
                    totalOvertimePay: preview.totals.totalOvertimePay,
                    totalUndertimeDeductions:
                      preview.totals.totalUndertimeDeductions,
                  },
                });

            await tx.resortPayrollItem.deleteMany({
              where: {
                payrollRunId: savedRun.id,
              },
            });

            if (preview.employees.length > 0) {
              await tx.resortPayrollItem.createMany({
                data: preview.employees.map((employee) => ({
                  absentCount: employee.absentCount,
                  allowance: employee.allowances,
                  basicSalary: employee.basicSalary,
                  bonus: employee.bonus,
                  commission: employee.commission,
                  daysWorked: employee.daysWorked,
                  departmentName: employee.department,
                  employeeCode: employee.employeeId,
                  employeeName: employee.name,
                  employmentType: employee.employmentType,
                  governmentDeductions: employee.governmentDeductions,
                  grossPay: employee.grossPay,
                  incentives: employee.incentives,
                  included: employee.included,
                  lateCount: employee.lateCount,
                  leaveDays: employee.leaveDays,
                  leaveDeduction: employee.leaveDeduction,
                  netPay: employee.netPay,
                  otherDeductions: employee.otherDeductions,
                  overtimeHours: employee.overtimeHours,
                  overtimePay: employee.overtimePay,
                  payrollRunId: savedRun.id,
                  regularHours: employee.regularHours,
                  roleName: employee.position,
                  staffProfileId: employee.staffProfileId,
                  resortProfileId: resortProfile.id,
                  totalDeductions: employee.totalDeductions,
                  undertimeDeduction: employee.undertimeDeduction,
                  undertimeHours: employee.undertimeHours,
                  workLocation: employee.location,
                })),
              });
            }

            return tx.resortPayrollRun.findUniqueOrThrow({
              where: {
                id: savedRun.id,
              },
              include: {
                items: payrollItemsWithProfileImage,
              },
            });
          });

          if (shouldFinalize && input.createJournalEntry && !payrollRun.journalEntryId) {
            const financeEntry = await prisma.resortFinanceEntry.create({
              data: {
                resortProfileId: resortProfile.id,
                code: `PAY-${payrollRun.code}`,
                type: "EXPENSE",
                source: "MANUAL",
                status: "PENDING",
                description: `Payroll expense · ${payrollRun.name}`,
                category: "Payroll",
                department: payrollRun.department,
                amount: String(preview.totals.employerCost),
                entryDate: payrollRun.payDate,
                notes: `Automatically created from finalized payroll ${payrollRun.code}.`,
              },
            });
            await prisma.resortPayrollRun.update({
              where: { id: payrollRun.id },
              data: { journalEntryId: financeEntry.id },
            });
            payrollRun.journalEntryId = financeEntry.id;
          }

          if (shouldFinalize && input.sendPayslipNotification) {
            const recipients = await prisma.resortPayrollItem.findMany({
              where: { payrollRunId: payrollRun.id, included: true },
              include: { staffProfile: { include: { appUser: true } } },
            });
            const deliveries = await Promise.allSettled(
              recipients
                .filter((item) => Boolean(item.staffProfile.appUser.email))
                .map((item) =>
                  sendPayrollPayslipEmail({
                    resortProfileId: resortProfile.id,
                    resortName: resortProfile.resortName || "Alrio Private Resort",
                    recipientEmail: item.staffProfile.appUser.email,
                    recipientName: item.employeeName,
                    payrollName: payrollRun.name,
                    payPeriod: payrollRun.payPeriod,
                    payDate: payrollRun.payDate,
                    netPay: decimalNumber(item.netPay),
                  }),
                ),
            );
            if (deliveries.some((delivery) => delivery.status === "fulfilled")) {
              await prisma.resortPayrollRun.update({
                where: { id: payrollRun.id },
                data: { payslipNotifiedAt: now },
              });
              payrollRun.payslipNotifiedAt = now;
            }
          }

          if (shouldFinalize) {
            await safelyRecordStaffActivityForAuthUser(authUser.id, {
              action: STAFF_ACTIVITY_ACTIONS.workspaceAction,
              title: "Finalized payroll",
              detail: `Finalized ${payrollRun.name} for ${payrollRun.payPeriod}.`,
              actorAuthUserId: authUser.id,
              metadata: {
                payrollRunId: payrollRun.id,
                code: payrollRun.code,
                totalNetPay: preview.totals.totalNetPay,
              },
            });
          }

          return toResortPayrollOutput(payrollRun);
        }),
      recordPayment: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
            paymentMethod: z
              .enum(["Bank transfer", "Cash", "GCash", "Other"])
              .default("Bank transfer"),
            paymentReference: optionalString,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          }
          await requireResortPermission(authUser.id, "payroll.manage");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const appUser = await prisma.appUser.findUnique({ where: { authUserId: authUser.id } });
          const payrollRun = await prisma.resortPayrollRun.findFirst({
            where: { id: input.id, resortProfileId: resortProfile.id },
          });
          if (!payrollRun) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Payroll run not found." });
          }
          if (payrollRun.status !== "COMPLETED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Finalize payroll before recording its payout." });
          }
          if (payrollRun.paymentStatus === "PAID") {
            throw new TRPCError({ code: "CONFLICT", message: "This payroll payout has already been recorded." });
          }
          const paidBy = appUser?.displayName || appUser?.email || authUser.email || "Staff";
          const paidAt = new Date();
          const saved = await prisma.$transaction(async (tx) => {
            if (payrollRun.journalEntryId) {
              await tx.resortFinanceEntry.update({
                where: { id: payrollRun.journalEntryId },
                data: { status: "CLEARED", notes: `Payroll payout recorded ${paidAt.toISOString()} via ${input.paymentMethod}${input.paymentReference ? ` (${input.paymentReference})` : ""}.` },
              });
            }
            return tx.resortPayrollRun.update({
              where: { id: payrollRun.id },
              data: {
                paymentStatus: "PAID",
                paidAt,
                paidBy,
                paymentMethod: input.paymentMethod,
                paymentReference: input.paymentReference ?? null,
              },
              include: { items: payrollItemsWithProfileImage },
            });
          });
          await safelyRecordStaffActivityForAuthUser(authUser.id, {
            action: STAFF_ACTIVITY_ACTIONS.workspaceAction,
            title: "Recorded payroll payout",
            detail: `Recorded ${input.paymentMethod} payout for ${saved.name}.`,
            actorAuthUserId: authUser.id,
            metadata: { payrollRunId: saved.id, paymentReference: input.paymentReference ?? null },
          });
          return toResortPayrollOutput(saved);
        }),
      void: baseProcedure
        .input(z.object({ id: z.string().trim().min(1), reason: z.string().trim().min(3, "Enter a void reason.") }))
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          await requireResortPermission(authUser.id, "payroll.manage");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const payrollRun = await prisma.resortPayrollRun.findFirst({
            where: { id: input.id, resortProfileId: resortProfile.id },
            include: { items: payrollItemsWithProfileImage },
          });
          if (!payrollRun) throw new TRPCError({ code: "NOT_FOUND", message: "Payroll run not found." });
          if (payrollRun.paymentStatus === "PAID") {
            throw new TRPCError({ code: "CONFLICT", message: "A paid payroll cannot be voided. Record an adjustment in Finance instead." });
          }
          const saved = await prisma.$transaction(async (tx) => {
            if (payrollRun.journalEntryId) {
              await tx.resortFinanceEntry.update({ where: { id: payrollRun.journalEntryId }, data: { status: "CLEARED", notes: `Voided payroll ${payrollRun.code}: ${input.reason}` } });
            }
            return tx.resortPayrollRun.update({
              where: { id: payrollRun.id },
              data: { status: "VOIDED", lockedAt: new Date(), notes: `${payrollRun.notes ?? ""}${payrollRun.notes ? "\n\n" : ""}Voided: ${input.reason}` },
              include: { items: payrollItemsWithProfileImage },
            });
          });
          return toResortPayrollOutput(saved);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Payroll run is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "payroll.manage");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const payrollRun = await prisma.resortPayrollRun.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!payrollRun) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Payroll run not found.",
            });
          }

          if (payrollRun.status !== "DRAFT") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Only draft payroll runs can be deleted. Void finalized payroll instead to keep an audit trail.",
            });
          }

          await prisma.resortPayrollRun.delete({
            where: {
              id: payrollRun.id,
            },
          });

          return {
            id: payrollRun.id,
          };
        }),
    }),
    accessRoles: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        await requireAnyResortPermission(authUser.id, [
          "usersRoles.view",
          "usersRoles.permissions.manage",
        ]);
        const resortProfile = await getResortProfileForSession(authUser.id);
        const roles = await prisma.resortAccessRole.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            _count: {
              select: {
                staffProfiles: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        });

        return roles.map(toResortAccessRoleOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireAnyResortPermission(authUser.id, [
            "usersRoles.view",
            "usersRoles.permissions.manage",
          ]);
          const resortProfile = await getResortProfileForSession(authUser.id);
          const role = await prisma.resortAccessRole.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              _count: {
                select: {
                  staffProfiles: true,
                },
              },
            },
          });

          if (!role) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Role not found.",
            });
          }

          return toResortAccessRoleOutput(role);
        }),
      save: baseProcedure
        .input(resortAccessRoleSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(
            authUser.id,
            "usersRoles.permissions.manage",
          );
          const resortProfile = await getResortProfileForSession(authUser.id);
          if (input.id) {
            const existingRole = await prisma.resortAccessRole.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingRole) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Role not found.",
              });
            }
          }

          const duplicate = await prisma.resortAccessRole.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              name: input.name,
              ...(input.id
                ? {
                    id: {
                      not: input.id,
                    },
                  }
                : {}),
            },
          });

          if (duplicate) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Role already exists in this workspace.",
            });
          }

          const role = input.id
            ? await prisma.resortAccessRole.update({
                where: {
                  id: input.id,
                },
                data: {
                  name: input.name,
                  description: input.description,
                  permissions: input.permissions,
                },
                include: {
                  _count: {
                    select: {
                      staffProfiles: true,
                    },
                  },
                },
              })
            : await prisma.resortAccessRole.create({
                data: {
                  resortProfileId: resortProfile.id,
                  name: input.name,
                  description: input.description,
                  permissions: input.permissions,
                },
                include: {
                  _count: {
                    select: {
                      staffProfiles: true,
                    },
                  },
                },
              });

          return toResortAccessRoleOutput(role);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(
            authUser.id,
            "usersRoles.permissions.manage",
          );
          const resortProfile = await getResortProfileForSession(authUser.id);
          const role = await prisma.resortAccessRole.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              _count: {
                select: {
                  staffProfiles: true,
                },
              },
            },
          });

          if (!role) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Role not found.",
            });
          }

          if (role._count.staffProfiles > 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Role is assigned to users. Move users before deleting it.",
            });
          }

          await prisma.resortAccessRole.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    usersRoles: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const now = new Date();

        await prisma.resortStaffInvitation.updateMany({
          where: {
            resortProfileId: resortProfile.id,
            status: "PENDING",
            expiresAt: {
              lte: now,
            },
          },
          data: {
            status: "EXPIRED",
          },
        });

        const staffProfiles = await prisma.resortStaffProfile.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            appUser: {
              include: {
                authUser: {
                  select: {
                    image: true,
                    sessions: {
                      orderBy: {
                        updatedAt: "desc",
                      },
                      take: 1,
                      select: {
                        updatedAt: true,
                      },
                    },
                  },
                },
              },
            },
            accessRole: true,
            department: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
        const invitations = await prisma.resortStaffInvitation.findMany({
          where: {
            resortProfileId: resortProfile.id,
            status: "PENDING",
            expiresAt: {
              gt: now,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return [
          ...staffProfiles.map(toResortStaffOutput),
          ...invitations.map(toResortStaffInvitationOutput),
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }),
      activity: baseProcedure
        .input(
          z.object({
            staffProfileId: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.view");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: input.staffProfileId,
              resortProfileId: resortProfile.id,
            },
            select: { id: true },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          return prisma.resortStaffActivityLog.findMany({
            where: {
              staffProfileId: staffProfile.id,
              resortProfileId: resortProfile.id,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
              id: true,
              action: true,
              title: true,
              detail: true,
              ipAddress: true,
              userAgent: true,
              createdAt: true,
            },
          });
        }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.view");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              appUser: true,
              accessRole: true,
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          return toResortStaffOutput(staffProfile);
        }),
      save: baseProcedure
        .input(resortStaffProfileSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireAnyResortPermission(authUser.id, [
            input.id ? "usersRoles.update" : "usersRoles.create",
            "usersRoles.permissions.manage",
          ]);
          const resortProfile = await getResortProfileForSession(authUser.id);
          const firstName = input.firstName ?? "";
          const lastName = input.lastName ?? "";
          const username = input.username?.toLowerCase() ?? null;
          const departmentId = input.departmentId || null;
          const status = toResortStaffStatus(input.status);
          const accessRole = await resolveResortAccessRole({
            accessRoleId: input.accessRoleId,
            roleName: input.roleName,
            resortProfileId: resortProfile.id,
          });
          const payrollData = {
            employmentType: input.employmentType || "Regular",
            workLocation: input.workLocation || "Resort Office",
            basicSalary: input.basicSalary,
            allowance: input.allowance,
            incentives: input.incentives,
            commission: input.commission,
            bonus: input.bonus,
            leaveDeduction: input.leaveDeduction,
            sssContribution: input.sssContribution,
            philHealthContribution: input.philHealthContribution,
            pagIbigContribution: input.pagIbigContribution,
            withholdingTax: input.withholdingTax,
            otherDeductions: input.otherDeductions,
          };

          if (departmentId) {
            const department = await prisma.resortDepartment.findFirst({
              where: {
                id: departmentId,
                resortProfileId: resortProfile.id,
              },
            });

            if (!department) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Department not found.",
              });
            }
          }

          if (input.id) {
            const existingStaff = await prisma.resortStaffProfile.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingStaff) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff user not found.",
              });
            }

            const duplicateUsername = await prisma.resortStaffProfile.findFirst(
              {
                where: {
                  username: username ?? undefined,
                  id: {
                    not: input.id,
                  },
                },
              },
            );

            if (username && duplicateUsername) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Username already exists in this workspace.",
              });
            }

            const duplicateEmail = input.email
              ? await prisma.appUser.findFirst({
                  where: {
                    email: input.email.toLowerCase(),
                    authUserId: {
                      not: existingStaff.appUserId,
                    },
                  },
                })
              : null;

            if (duplicateEmail) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Email already belongs to another user.",
              });
            }

            const email =
              input.email?.toLowerCase() ??
              makeInternalStaffEmail(existingStaff.appUserId);
            const displayName =
              `${firstName} ${lastName}`.trim() ||
              username ||
              input.email ||
              "Staff user";

            const staffProfile = await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: {
                  id: existingStaff.appUserId,
                },
                data: {
                  email,
                  name: displayName,
                },
              });
              await tx.appUser.update({
                where: {
                  authUserId: existingStaff.appUserId,
                },
                data: {
                  email,
                  firstName,
                  lastName,
                  displayName,
                },
              });

              if (input.password) {
                const hashedPassword = await hashPassword(input.password);

                await tx.account.upsert({
                  where: {
                    id: `${existingStaff.appUserId}:credential`,
                  },
                  create: {
                    id: `${existingStaff.appUserId}:credential`,
                    accountId: existingStaff.appUserId,
                    providerId: "credential",
                    userId: existingStaff.appUserId,
                    password: hashedPassword,
                  },
                  update: {
                    password: hashedPassword,
                  },
                });
              }

              return tx.resortStaffProfile.update({
                where: {
                  id: input.id,
                },
                data: {
                  username,
                  phoneNumber: input.phoneNumber,
                  accessRoleId: accessRole.id,
                  departmentId,
                  status,
                  ...payrollData,
                  notes: input.notes,
                  tags: input.tags,
                },
                include: {
                  appUser: true,
                  department: true,
                  accessRole: true,
                },
              });
            });

            await recordStaffActivityForProfile({
              resortProfileId: resortProfile.id,
              staffProfileId: staffProfile.id,
              actorAuthUserId: authUser.id,
              action:
                existingStaff.accessRoleId !== accessRole.id
                  ? STAFF_ACTIVITY_ACTIONS.roleUpdated
                  : input.password
                    ? STAFF_ACTIVITY_ACTIONS.passwordChanged
                    : STAFF_ACTIVITY_ACTIONS.profileUpdated,
              title:
                existingStaff.accessRoleId !== accessRole.id
                  ? "Role updated"
                  : input.password
                    ? "Password changed"
                    : "Staff profile updated",
              detail:
                existingStaff.accessRoleId !== accessRole.id
                  ? `Assigned the ${accessRole.name} role.`
                  : input.password
                    ? "An administrator changed this staff account password."
                    : "An administrator updated this staff account.",
            });

            return toResortStaffOutput(staffProfile);
          }

          const authUserId = generateRandomString(32);
          const email =
            input.email?.toLowerCase() ?? makeInternalStaffEmail(authUserId);
          const displayName =
            `${firstName} ${lastName}`.trim() ||
            username ||
            input.email ||
            "Staff user";
          const [duplicateEmail, duplicateUsername] = await Promise.all([
            input.email
              ? prisma.appUser.findUnique({
                  where: {
                    email,
                  },
                })
              : null,
            username
              ? prisma.resortStaffProfile.findFirst({
                  where: {
                    username,
                  },
                })
              : null,
          ]);

          if (duplicateEmail) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Email already belongs to another user.",
            });
          }

          if (duplicateUsername) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Username already exists in this workspace.",
            });
          }

          if (!input.password) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Password is required for new staff users.",
            });
          }

          const hashedPassword = await hashPassword(input.password);
          const staffProfile = await prisma.$transaction(async (tx) => {
            await tx.user.create({
              data: {
                id: authUserId,
                email,
                name: displayName,
                emailVerified: false,
              },
            });
            await tx.account.create({
              data: {
                id: `${authUserId}:credential`,
                accountId: authUserId,
                providerId: "credential",
                userId: authUserId,
                password: hashedPassword,
              },
            });
            await tx.appUser.create({
              data: {
                authUserId,
                email,
                firstName,
                lastName,
                displayName,
              },
            });

            return tx.resortStaffProfile.create({
              data: {
                resortProfileId: resortProfile.id,
                appUserId: authUserId,
                username,
                phoneNumber: input.phoneNumber,
                accessRoleId: accessRole.id,
                departmentId,
                status,
                ...payrollData,
                notes: input.notes,
                tags: input.tags,
              },
              include: {
                appUser: true,
                department: true,
                accessRole: true,
              },
            });
          });

          await recordStaffActivityForProfile({
            resortProfileId: resortProfile.id,
            staffProfileId: staffProfile.id,
            actorAuthUserId: authUser.id,
            action: STAFF_ACTIVITY_ACTIONS.accountCreated,
            title: "Staff account created",
            detail: `Created with the ${accessRole.name} role.`,
          });

          return toResortStaffOutput(staffProfile);
        }),
      suspend: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.update");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              appUser: true,
              accessRole: true,
              department: true,
            },
          });

          if (!staffProfile) {
            const invitation = await prisma.resortStaffInvitation.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
                status: "PENDING",
              },
            });

            if (invitation) {
              await prisma.resortStaffInvitation.update({
                where: {
                  id: invitation.id,
                },
                data: {
                  status: "REVOKED",
                },
              });

              return {
                id: input.id,
              };
            }

            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          const suspendedStaff = await prisma.resortStaffProfile.update({
            where: {
              id: input.id,
            },
            data: {
              status: "SUSPENDED",
            },
            include: {
              appUser: true,
              accessRole: true,
              department: true,
            },
          });

          await recordStaffActivityForProfile({
            resortProfileId: resortProfile.id,
            staffProfileId: suspendedStaff.id,
            actorAuthUserId: authUser.id,
            action: STAFF_ACTIVITY_ACTIONS.statusUpdated,
            title: "Staff access suspended",
            detail: "An administrator suspended access to the staff workspace.",
          });

          return toResortStaffOutput(suspendedStaff);
        }),
      activate: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.update");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
              status: "SUSPENDED",
            },
          });

          if (!staffProfile) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Suspended staff account not found.",
            });
          }

          const activeStaff = await prisma.resortStaffProfile.update({
            where: {
              id: staffProfile.id,
            },
            data: {
              status: "ACTIVE",
            },
            include: {
              appUser: true,
              accessRole: true,
              department: true,
            },
          });

          await recordStaffActivityForProfile({
            resortProfileId: resortProfile.id,
            staffProfileId: activeStaff.id,
            actorAuthUserId: authUser.id,
            action: STAFF_ACTIVITY_ACTIONS.statusUpdated,
            title: "Staff access restored",
            detail:
              "An administrator reactivated access to the staff workspace.",
          });

          return toResortStaffOutput(activeStaff);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.delete");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const staffProfile = await prisma.resortStaffProfile.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!staffProfile) {
            const invitation = await prisma.resortStaffInvitation.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
                status: "PENDING",
              },
            });

            if (invitation) {
              await prisma.resortStaffInvitation.update({
                where: {
                  id: invitation.id,
                },
                data: {
                  status: "REVOKED",
                },
              });

              return {
                id: input.id,
              };
            }

            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Staff user not found.",
            });
          }

          await prisma.user.delete({
            where: {
              id: staffProfile.appUserId,
            },
          });

          return {
            id: input.id,
          };
        }),
      invite: baseProcedure
        .input(resortStaffInviteSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.create");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const normalizedEmail = input.email.toLowerCase();
          const now = new Date();
          const [pendingInvitation, existingStaff] = await Promise.all([
            prisma.resortStaffInvitation.findFirst({
              where: {
                resortProfileId: resortProfile.id,
                status: "PENDING",
                expiresAt: { gt: now },
                email: {
                  equals: normalizedEmail,
                  mode: "insensitive",
                },
              },
              select: { id: true },
            }),
            prisma.resortStaffProfile.findFirst({
              where: {
                resortProfileId: resortProfile.id,
                appUser: {
                  email: {
                    equals: normalizedEmail,
                    mode: "insensitive",
                  },
                },
              },
              select: { id: true },
            }),
          ]);

          if (pendingInvitation || existingStaff) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "A pending invitation or staff account already exists for this email.",
            });
          }

          const appUrl = await getConfiguredAppUrl(resortProfile.id);
          const workspaceName =
            resortProfile.resortName ??
            "Alrio Private Resort";
          const accessRole = await resolveResortAccessRole({
            accessRoleId: input.accessRoleId,
            roleName: input.roleName,
            resortProfileId: resortProfile.id,
          });
          const token = generateInviteToken();
          const invitation = await prisma.resortStaffInvitation.create({
            data: {
              email: normalizedEmail,
              expiresAt: getInviteExpiresAt(),
              message: input.message,
              roleName: accessRole.name,
              resortProfileId: resortProfile.id,
              tokenHash: hashInviteToken(token),
            },
          });

          try {
            await sendStaffInviteEmail({
              appUrl,
              email: input.email,
              message: input.message,
              role: accessRole.name,
              token,
              workspaceName,
            });
          } catch (error) {
            await prisma.resortStaffInvitation.delete({
              where: {
                id: invitation.id,
              },
            });

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to send invitation email.",
            });
          }

          return {
            invitationId: invitation.id,
            sent: true,
          };
        }),
      resendInvitation: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "usersRoles.create");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const invitation = await prisma.resortStaffInvitation.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
              status: "PENDING",
            },
          });

          if (!invitation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pending invitation not found.",
            });
          }

          const appUrl = await getConfiguredAppUrl(resortProfile.id);
          const workspaceName =
            resortProfile.resortName ?? "Alrio Private Resort";
          const token = generateInviteToken();
          const expiresAt = getInviteExpiresAt();

          await prisma.resortStaffInvitation.update({
            where: { id: invitation.id },
            data: {
              expiresAt,
              tokenHash: hashInviteToken(token),
            },
          });

          try {
            await sendStaffInviteEmail({
              appUrl,
              email: invitation.email,
              message: invitation.message ?? undefined,
              role: invitation.roleName,
              token,
              workspaceName,
            });
          } catch (error) {
            await prisma.resortStaffInvitation.update({
              where: { id: invitation.id },
              data: {
                expiresAt: invitation.expiresAt,
                tokenHash: invitation.tokenHash,
              },
            });

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to resend invitation email.",
            });
          }

          return {
            invitationId: invitation.id,
            sent: true,
          };
        }),
    }),
    guests: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        await requireResortPermission(
          authUser.id,
          "guestExperience.profiles.manage",
        );
        const resortProfile = await getResortProfileForSession(authUser.id);
        const registeredGuests = await prisma.appUser.findMany({
          where: {
            resortProfile: { is: null },
            staffProfile: { is: null },
          },
          include: {
            authUser: {
              select: {
                image: true,
                sessions: {
                  orderBy: { updatedAt: "desc" },
                  select: { updatedAt: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        const emails = registeredGuests.map((guest) => guest.email);
        const reservations = emails.length
          ? await prisma.resortReservation.findMany({
              where: {
                resortProfileId: resortProfile.id,
                guestEmail: {
                  in: emails,
                  mode: "insensitive",
                },
              },
              select: {
                checkIn: true,
                checkOut: true,
                guestEmail: true,
                guestPhone: true,
                status: true,
              },
              orderBy: { checkIn: "desc" },
            })
          : [];
        const reservationsByEmail = new Map<string, typeof reservations>();

        reservations.forEach((reservation) => {
          const email = reservation.guestEmail?.trim().toLowerCase();
          if (!email) return;
          const current = reservationsByEmail.get(email) ?? [];
          current.push(reservation);
          reservationsByEmail.set(email, current);
        });

        const now = new Date();

        return registeredGuests.map((guest) => {
          const parsedProfile = guestProfileSchema.safeParse(
            guest.guestProfile,
          );
          const profile = parsedProfile.success
            ? parsedProfile.data
            : guestProfileSchema.parse({});
          const guestReservations =
            reservationsByEmail.get(guest.email.trim().toLowerCase()) ?? [];
          const completedReservations = guestReservations
            .filter(
              (reservation) =>
                reservation.checkOut < now && reservation.status !== "CANCELED",
            )
            .sort((a, b) => b.checkOut.getTime() - a.checkOut.getTime());
          const upcomingReservations = guestReservations
            .filter(
              (reservation) =>
                reservation.checkIn >= now && reservation.status !== "CANCELED",
            )
            .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
          const profileValues = [
            profile.stayStyle,
            profile.visitOccasion,
            profile.groupType,
            profile.favoriteActivity,
            profile.preferredSchedule,
            profile.diningPreference,
            profile.celebrationStyle,
            profile.relaxationStyle,
            profile.musicPreference,
            profile.languages,
            profile.specialRequests,
            profile.location,
            profile.about,
            ...profile.interests,
          ];
          const completedProfileFields =
            profileValues.filter((value) => value.trim()).length +
            (profile.homeLocation ? 1 : 0);
          const profileStatus =
            completedProfileFields >= 5
              ? "Complete"
              : completedProfileFields > 0
                ? "Started"
                : "Basic";
          const homeLocation = profile.homeLocation
            ? [profile.homeLocation.cityName, profile.homeLocation.provinceName]
                .filter(Boolean)
                .join(", ")
            : profile.location;

          return {
            id: guest.authUserId,
            displayName: guest.displayName,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            image: guest.authUser.image,
            phone:
              guestReservations.find((reservation) => reservation.guestPhone)
                ?.guestPhone ?? null,
            location: homeLocation || "Not provided",
            bookingCount: guestReservations.length,
            lastVisit: completedReservations[0]?.checkOut ?? null,
            nextVisit: upcomingReservations[0]?.checkIn ?? null,
            createdAt: guest.createdAt,
            lastActive: guest.authUser.sessions[0]?.updatedAt ?? null,
            accountStatus: guest.guestDisabledAt
              ? ("Disabled" as const)
              : ("Active" as const),
            profileStatus,
            about: profile.about,
            interests: profile.interests,
            preferences: {
              stayStyle: profile.stayStyle,
              visitOccasion: profile.visitOccasion,
              groupType: profile.groupType,
              favoriteActivity: profile.favoriteActivity,
              preferredSchedule: profile.preferredSchedule,
              diningPreference: profile.diningPreference,
              specialRequests: profile.specialRequests,
            },
          };
        });
      }),
      setAccountStatus: baseProcedure
        .input(
          z.object({
            guestId: z.string().trim().min(1),
            status: z.enum(["Active", "Disabled"]),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(
            authUser.id,
            "guestExperience.profiles.manage",
          );

          const guest = await prisma.appUser.findFirst({
            where: {
              authUserId: input.guestId,
              resortProfile: { is: null },
              staffProfile: { is: null },
            },
            select: { authUserId: true },
          });

          if (!guest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Guest account not found.",
            });
          }

          await prisma.$transaction(async (transaction) => {
            await transaction.appUser.update({
              where: { authUserId: guest.authUserId },
              data: {
                guestDisabledAt:
                  input.status === "Disabled" ? new Date() : null,
              },
            });

            if (input.status === "Disabled") {
              await transaction.session.deleteMany({
                where: { userId: guest.authUserId },
              });
            }
          });

          return { id: guest.authUserId, status: input.status };
        }),
    }),
    departments: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        await requireResortPermission(authUser.id, "departments.view");
        const resortProfile = await getResortProfileForSession(authUser.id);
        const departments = await prisma.resortDepartment.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            headStaffProfile: {
              include: {
                appUser: true,
              },
            },
            staffProfiles: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return departments.map(toResortDepartmentOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "departments.view");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const department = await prisma.resortDepartment.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              headStaffProfile: {
                include: {
                  appUser: true,
                },
              },
              staffProfiles: {
                select: {
                  id: true,
                },
              },
            },
          });

          if (!department) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Department not found.",
            });
          }

          return toResortDepartmentOutput(department);
        }),
      save: baseProcedure
        .input(resortDepartmentSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const code = input.code.toUpperCase();
          const selectedStaffIds = Array.from(new Set(input.staffProfileIds));
          const headStaffProfileId =
            input.headStaffProfileId &&
            selectedStaffIds.includes(input.headStaffProfileId)
              ? input.headStaffProfileId
              : null;

          if (selectedStaffIds.length) {
            const staffCount = await prisma.resortStaffProfile.count({
              where: {
                id: {
                  in: selectedStaffIds,
                },
                resortProfileId: resortProfile.id,
              },
            });

            if (staffCount !== selectedStaffIds.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more staff users are invalid.",
              });
            }
          }

          if (input.id) {
            const existingDepartment = await prisma.resortDepartment.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingDepartment) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Department not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortDepartment.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Department code already exists.",
            });
          }

          const department = await prisma.$transaction(async (tx) => {
            const savedDepartment = input.id
              ? await tx.resortDepartment.update({
                  where: {
                    id: input.id,
                  },
                  data: {
                    name: input.name,
                    code,
                    description: input.description,
                    email: input.email,
                    notes: input.notes,
                    routing: input.routing,
                    status: toResortDepartmentStatus(input.status),
                    headStaffProfileId: null,
                  },
                })
              : await tx.resortDepartment.create({
                  data: {
                    resortProfileId: resortProfile.id,
                    name: input.name,
                    code,
                    description: input.description,
                    email: input.email,
                    notes: input.notes,
                    routing: input.routing,
                    status: toResortDepartmentStatus(input.status),
                    headStaffProfileId: null,
                  },
                });

            if (selectedStaffIds.length) {
              await tx.resortDepartment.updateMany({
                where: {
                  resortProfileId: resortProfile.id,
                  headStaffProfileId: {
                    in: selectedStaffIds,
                  },
                  id: {
                    not: savedDepartment.id,
                  },
                },
                data: {
                  headStaffProfileId: null,
                },
              });
            }

            if (headStaffProfileId) {
              await tx.resortDepartment.updateMany({
                where: {
                  resortProfileId: resortProfile.id,
                  headStaffProfileId,
                  id: {
                    not: savedDepartment.id,
                  },
                },
                data: {
                  headStaffProfileId: null,
                },
              });

              await tx.resortDepartment.update({
                where: {
                  id: savedDepartment.id,
                },
                data: {
                  headStaffProfileId,
                },
              });
            }

            await tx.resortStaffProfile.updateMany({
              where: {
                resortProfileId: resortProfile.id,
                departmentId: savedDepartment.id,
                id: {
                  notIn: selectedStaffIds,
                },
              },
              data: {
                departmentId: null,
                isDepartmentHead: false,
              },
            });

            if (selectedStaffIds.length) {
              await tx.resortStaffProfile.updateMany({
                where: {
                  resortProfileId: resortProfile.id,
                  id: {
                    in: selectedStaffIds,
                  },
                },
                data: {
                  departmentId: savedDepartment.id,
                  isDepartmentHead: false,
                },
              });
            }

            if (headStaffProfileId) {
              await tx.resortStaffProfile.update({
                where: {
                  id: headStaffProfileId,
                },
                data: {
                  isDepartmentHead: true,
                },
              });
            }

            return tx.resortDepartment.findUniqueOrThrow({
              where: {
                id: savedDepartment.id,
              },
              include: {
                headStaffProfile: {
                  include: {
                    appUser: true,
                  },
                },
                staffProfiles: {
                  select: {
                    id: true,
                  },
                },
              },
            });
          });

          return toResortDepartmentOutput(department);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortDepartmentStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const department = await prisma.resortDepartment.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!department) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Department not found.",
            });
          }

          await prisma.resortDepartment.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortDepartmentStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireResortPermission(authUser.id, "departments.manage");
          const resortProfile = await getResortProfileForSession(authUser.id);
          const department = await prisma.resortDepartment.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!department) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Department not found.",
            });
          }

          await prisma.resortDepartment.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    rooms: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const rooms = await prisma.resortRoom.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            amenities: {
              select: {
                id: true,
                name: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
            },
            photos: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return rooms.map(toResortRoomOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const room = await prisma.resortRoom.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              amenities: {
                select: {
                  id: true,
                  name: true,
                },
                orderBy: {
                  sortOrder: "asc",
                },
              },
              photos: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          return toResortRoomOutput(room);
        }),
      save: baseProcedure
        .input(resortRoomSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const code = input.code.toUpperCase();
          const amenityIds = Array.from(new Set(input.amenityIds));

          if (amenityIds.length) {
            const amenityCount = await prisma.resortAmenity.count({
              where: {
                id: {
                  in: amenityIds,
                },
                resortProfileId: resortProfile.id,
                status: "ACTIVE",
              },
            });

            if (amenityCount !== amenityIds.length) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One or more amenities are invalid.",
              });
            }
          }

          if (input.id) {
            const existingRoom = await prisma.resortRoom.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingRoom) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Room not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortRoom.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Room code already exists.",
            });
          }

          const data = {
            code,
            name: input.name,
            type: input.type,
            building: input.building,
            floor: input.floor,
            baseRate: input.baseRate,
            peakRate: input.peakRate ?? null,
            extraPersonCharge: input.extraPersonCharge ?? null,
            maxAdults: input.maxAdults,
            childrenOccupancy: input.childrenOccupancy,
            bedConfiguration: input.bedConfiguration,
            roomSize: input.roomSize ?? null,
            viewType: input.viewType,
            smokingPolicy: toResortRoomSmokingPolicy(input.smokingPolicy),
            status: toResortRoomStatus(input.status),
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            minNights: input.minNights,
            guestNote: input.guestNote ?? null,
            notes: input.notes ?? null,
          };

          const room = await prisma.$transaction(async (tx) => {
            const savedRoom = input.id
              ? await tx.resortRoom.update({
                  where: {
                    id: input.id,
                  },
                  data: {
                    ...data,
                    amenities: {
                      set: amenityIds.map((id) => ({ id })),
                    },
                  },
                })
              : await tx.resortRoom.create({
                  data: {
                    ...data,
                    resortProfileId: resortProfile.id,
                    amenities: {
                      connect: amenityIds.map((id) => ({ id })),
                    },
                  },
                });

            await tx.resortRoomPhoto.deleteMany({
              where: {
                roomId: savedRoom.id,
                key: {
                  notIn: input.photos.map((photo) => photo.key),
                },
              },
            });

            await Promise.all(
              input.photos.map((photo, index) =>
                tx.resortRoomPhoto.upsert({
                  where: {
                    key: photo.key,
                  },
                  create: {
                    key: photo.key,
                    name: photo.name,
                    roomId: savedRoom.id,
                    size: photo.size,
                    sortOrder: index,
                    url: photo.url,
                  },
                  update: {
                    name: photo.name,
                    roomId: savedRoom.id,
                    size: photo.size,
                    sortOrder: index,
                    url: photo.url,
                  },
                }),
              ),
            );

            return tx.resortRoom.findUniqueOrThrow({
              where: {
                id: savedRoom.id,
              },
              include: {
                amenities: {
                  select: {
                    id: true,
                    name: true,
                  },
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
                photos: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            });
          });

          return toResortRoomOutput(room);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortRoomStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const room = await prisma.resortRoom.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          await prisma.resortRoom.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortRoomStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const room = await prisma.resortRoom.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          await prisma.resortRoom.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    invoices: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const invoices = await prisma.resortInvoice.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            lineItems: {
              orderBy: {
                sortOrder: "asc",
              },
            },
            reservation: {
              select: {
                id: true,
                room: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return invoices.map(toResortInvoiceOutput);
      }),
      nextCode: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        return getNextInvoiceCode(resortProfile);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const invoice = await prisma.resortInvoice.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              lineItems: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
              reservation: {
                select: {
                  id: true,
                  room: {
                    select: {
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          return toResortInvoiceOutput(invoice);
        }),
      save: baseProcedure
        .input(resortInvoiceSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireInvoiceCreator(authUser.id);
          const code = input.code.toUpperCase();
          const subtotal = parseMoneyAmount(input.subtotal);
          const discount = parseMoneyAmount(input.discount);
          const tax = parseMoneyAmount(input.tax);
          const totalAmount = parseMoneyAmount(input.totalAmount);
          const depositPaid = parseMoneyAmount(input.depositPaid);
          const balanceDue = parseMoneyAmount(input.balanceDue);
          const lineTotal = input.lineItems.reduce(
            (total, item) => total + parseMoneyAmount(item.amount),
            0,
          );

          if (
            [
              subtotal,
              discount,
              tax,
              totalAmount,
              depositPaid,
              balanceDue,
            ].some((value) => value < 0)
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invoice amounts cannot be negative.",
            });
          }
          if (
            !input.lineItems.length ||
            input.lineItems.some(
              (item) =>
                parseMoneyAmount(item.rate) <= 0 ||
                parseMoneyAmount(item.amount) <= 0,
            )
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "At least one chargeable line item is required.",
            });
          }
          if (
            Math.abs(lineTotal - subtotal) > 0.01 ||
            Math.abs(totalAmount - (subtotal - discount + tax)) > 0.01 ||
            Math.abs(balanceDue - Math.max(totalAmount - depositPaid, 0)) > 0.01
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Invoice totals do not match the line items and payment amounts.",
            });
          }
          if (input.status === "Paid" && balanceDue > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Record the full payment before marking this invoice paid.",
            });
          }

          if (input.reservationId) {
            const reservation = await prisma.resortReservation.findFirst({
              where: {
                id: input.reservationId,
                resortProfileId: resortProfile.id,
              },
            });

            if (!reservation) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Reservation not found.",
              });
            }

            const duplicateBookingInvoice =
              await prisma.resortInvoice.findFirst({
                where: {
                  resortProfileId: resortProfile.id,
                  reservationId: input.reservationId,
                  id: input.id ? { not: input.id } : undefined,
                  status: { not: "VOID" },
                },
              });
            if (duplicateBookingInvoice) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "This booking already has an invoice.",
              });
            }
          }

          if (input.id) {
            const existingInvoice = await prisma.resortInvoice.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingInvoice) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Invoice not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortInvoice.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Invoice number already exists.",
            });
          }

          const invoiceDate = parseDateField(input.invoiceDate, "Invoice date");
          const dueDate = parseDateField(input.dueDate, "Due date");
          const data = {
            balanceDue: input.balanceDue,
            code,
            depositPaid: input.depositPaid,
            discount: input.discount,
            dueDate,
            guestEmail: input.guestEmail ?? null,
            guestName: input.guestName,
            invoiceDate,
            notes: input.notes ?? null,
            paymentInstructions: input.paymentInstructions ?? null,
            paymentMethod: input.paymentMethod ?? null,
            reminderCadence: toResortInvoiceReminderCadence(
              input.reminderCadence,
            ),
            reservationId: input.reservationId ?? null,
            paidAt: input.status === "Paid" ? new Date() : null,
            status: toResortInvoiceStatus(input.status),
            subtotal: input.subtotal,
            tax: input.tax,
            totalAmount: input.totalAmount,
          };
          const invoice = await prisma.$transaction(async (tx) => {
            const savedInvoice = input.id
              ? await tx.resortInvoice.update({
                  where: {
                    id: input.id,
                  },
                  data,
                })
              : await tx.resortInvoice.create({
                  data: {
                    ...data,
                    resortProfileId: resortProfile.id,
                  },
                });

            await tx.resortInvoiceLineItem.deleteMany({
              where: {
                invoiceId: savedInvoice.id,
              },
            });
            await tx.resortInvoiceLineItem.createMany({
              data: input.lineItems.map((item, index) => ({
                amount: item.amount,
                description: item.description,
                invoiceId: savedInvoice.id,
                quantity: item.quantity,
                rate: item.rate,
                sortOrder: index,
              })),
            });

            return tx.resortInvoice.findUniqueOrThrow({
              where: {
                id: savedInvoice.id,
              },
              include: {
                lineItems: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
                reservation: {
                  select: {
                    id: true,
                    room: {
                      select: {
                        code: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            });
          });

          return toResortInvoiceOutput(invoice);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortInvoiceStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const invoice = await prisma.resortInvoice.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          if (input.status === "Paid") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Record a payment transaction to mark invoices paid.",
            });
          }

          if (input.status === "Sent") {
            await requireInvoiceCreator(authUser.id);

            try {
              await sendInvoiceEmailNow(input.id);
            } catch (error) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  error instanceof Error
                    ? error.message
                    : "Unable to send invoice.",
              });
            }

            return {
              id: input.id,
            };
          }

          await prisma.resortInvoice.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortInvoiceStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      updateReminderCadence: baseProcedure
        .input(
          z.object({
            id: z.string(),
            reminderCadence: resortInvoiceReminderCadenceSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const invoice = await prisma.resortInvoice.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          await prisma.resortInvoice.update({
            where: {
              id: input.id,
            },
            data: {
              nextReminderAt:
                input.reminderCadence === "Paused"
                  ? null
                  : invoice.nextReminderAt,
              reminderCadence: toResortInvoiceReminderCadence(
                input.reminderCadence,
              ),
            },
          });

          return {
            id: input.id,
          };
        }),
      sendReminder: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const invoice = await prisma.resortInvoice.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          try {
            return await sendInvoiceReminderNow(input.id);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to send invoice reminder.",
            });
          }
        }),
      send: baseProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          }
          const resortProfile = await getResortProfileForSession(authUser.id);
          await requireInvoiceCreator(authUser.id);
          const invoice = await prisma.resortInvoice.findFirst({
            where: { id: input.id, resortProfileId: resortProfile.id },
          });
          if (!invoice) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found." });
          }
          try {
            return await sendInvoiceEmailNow(input.id);
          } catch (error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error instanceof Error ? error.message : "Unable to send invoice.",
            });
          }
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const invoice = await prisma.resortInvoice.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }

          await prisma.resortInvoice.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    financeEntries: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const entries = await prisma.resortFinanceEntry.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          orderBy: {
            entryDate: "desc",
          },
        });

        return entries.map(toResortFinanceEntryOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const entry = await prisma.resortFinanceEntry.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Finance entry not found.",
            });
          }

          return toResortFinanceEntryOutput(entry);
        }),
      save: baseProcedure
        .input(resortFinanceEntrySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const code = input.code?.trim()
            ? input.code.trim().toUpperCase()
            : await getNextFinanceEntryCode(resortProfile.id, input.type);

          if (input.id) {
            const existingEntry = await prisma.resortFinanceEntry.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingEntry) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Finance entry not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortFinanceEntry.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Finance entry code already exists.",
            });
          }

          const data = {
            amount: input.amount,
            category: input.category,
            code,
            department: input.department ?? null,
            description: input.description,
            entryDate: parseDateField(input.entryDate, "Entry date"),
            notes: input.notes ?? null,
            receiptKey: input.receiptKey ?? null,
            receiptName: input.receiptName ?? null,
            receiptSize: input.receiptSize ?? null,
            receiptType: input.receiptType ?? null,
            receiptUrl: input.receiptUrl ?? null,
            source: toResortFinanceEntrySource(input.source),
            status: toResortFinanceEntryStatus(input.status),
            type: toResortFinanceEntryType(input.type),
          };
          const entry = input.id
            ? await prisma.resortFinanceEntry.update({
                where: {
                  id: input.id,
                },
                data,
              })
            : await prisma.resortFinanceEntry.create({
                data: {
                  ...data,
                  resortProfileId: resortProfile.id,
                },
              });

          return toResortFinanceEntryOutput(entry);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortFinanceEntryStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const entry = await prisma.resortFinanceEntry.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Finance entry not found.",
            });
          }

          await prisma.resortFinanceEntry.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortFinanceEntryStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const entry = await prisma.resortFinanceEntry.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!entry) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Finance entry not found.",
            });
          }

          await prisma.resortFinanceEntry.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    transactionExports: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const exportJobs = await prisma.resortTransactionExport.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return exportJobs.map(toResortTransactionExportOutput);
      }),
      download: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const exportJob = await prisma.resortTransactionExport.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!exportJob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Export job not found.",
            });
          }

          if (exportJob.status !== "READY") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Export file is not ready.",
            });
          }

          return {
            code: exportJob.code,
            createdAt: exportJob.createdAt,
            format: exportJob.format,
            name: exportJob.name,
            payload: exportJob.payload ?? [],
            period: exportJob.period,
          };
        }),
      create: baseProcedure
        .input(resortTransactionExportSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const period = input.period ?? getDefaultExportPeriod(input.name);
          const payload = await buildTransactionExportPayload(
            resortProfile.id,
            input.name,
            period,
          );
          const payloadJson = JSON.stringify(payload);
          const code = await getNextTransactionExportCode(resortProfile.id);
          const exportJob = await prisma.resortTransactionExport.create({
            data: {
              code,
              format: input.format,
              name: input.name,
              payload,
              period,
              rowCount: payload.length,
              size: formatExportSize(Buffer.byteLength(payloadJson, "utf8")),
              status: "READY",
              resortProfileId: resortProfile.id,
            },
          });

          return toResortTransactionExportOutput(exportJob);
        }),
      retry: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const exportJob = await prisma.resortTransactionExport.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!exportJob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Export job not found.",
            });
          }

          const payload = await buildTransactionExportPayload(
            resortProfile.id,
            exportJob.name as z.infer<typeof resortTransactionExportNameSchema>,
            exportJob.period,
          );
          const payloadJson = JSON.stringify(payload);
          const updatedExport = await prisma.resortTransactionExport.update({
            where: {
              id: input.id,
            },
            data: {
              payload,
              rowCount: payload.length,
              size: formatExportSize(Buffer.byteLength(payloadJson, "utf8")),
              status: "READY",
            },
          });

          return toResortTransactionExportOutput(updatedExport);
        }),
    }),
    packages: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const packages = await prisma.resortPackage.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            amenities: {
              select: {
                code: true,
                icon: true,
                id: true,
                name: true,
              },
            },
            rooms: {
              select: {
                code: true,
                id: true,
                name: true,
                type: true,
              },
            },
            services: {
              select: {
                code: true,
                id: true,
                title: true,
              },
            },
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              updatedAt: "desc",
            },
          ],
        });

        return packages.map(toResortPackageOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const pack = await prisma.resortPackage.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              amenities: {
                select: {
                  code: true,
                  icon: true,
                  id: true,
                  name: true,
                },
              },
              rooms: {
                select: {
                  code: true,
                  id: true,
                  name: true,
                  type: true,
                },
              },
              services: {
                select: {
                  code: true,
                  id: true,
                  title: true,
                },
              },
            },
          });

          if (!pack) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Package not found.",
            });
          }

          return toResortPackageOutput(pack);
        }),
      save: baseProcedure
        .input(resortPackageSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const code = input.code.toUpperCase();

          if (input.id) {
            const existingPackage = await prisma.resortPackage.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingPackage) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Package not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortPackage.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Package code already exists.",
            });
          }

          const [roomCount, serviceCount, amenityCount] = await Promise.all([
            input.roomIds.length
              ? prisma.resortRoom.count({
                  where: {
                    id: {
                      in: input.roomIds,
                    },
                    resortProfileId: resortProfile.id,
                  },
                })
              : Promise.resolve(0),
            input.serviceIds.length
              ? prisma.resortService.count({
                  where: {
                    id: {
                      in: input.serviceIds,
                    },
                    resortProfileId: resortProfile.id,
                  },
                })
              : Promise.resolve(0),
            input.amenityIds.length
              ? prisma.resortAmenity.count({
                  where: {
                    id: {
                      in: input.amenityIds,
                    },
                    resortProfileId: resortProfile.id,
                  },
                })
              : Promise.resolve(0),
          ]);

          if (
            roomCount !== input.roomIds.length ||
            serviceCount !== input.serviceIds.length ||
            amenityCount !== input.amenityIds.length
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Package includes an item from another resort.",
            });
          }

          const data = {
            category: input.category,
            code,
            compareAtPrice: input.compareAtPrice ?? null,
            description: input.description ?? null,
            featured: input.featured,
            inclusionsNote: input.inclusionsNote ?? null,
            maxGuests: input.maxGuests ?? null,
            minNights: input.minNights,
            name: input.name,
            price: input.price,
            showOnBookingPage: input.showOnBookingPage,
            sortOrder: input.sortOrder,
            status: toResortPackageStatus(input.status),
          };
          const updateRelations = {
            amenities: {
              set: input.amenityIds.map((id) => ({ id })),
            },
            rooms: {
              set: input.roomIds.map((id) => ({ id })),
            },
            services: {
              set: input.serviceIds.map((id) => ({ id })),
            },
          };
          const createRelations = {
            amenities: {
              connect: input.amenityIds.map((id) => ({ id })),
            },
            rooms: {
              connect: input.roomIds.map((id) => ({ id })),
            },
            services: {
              connect: input.serviceIds.map((id) => ({ id })),
            },
          };

          const pack = input.id
            ? await prisma.resortPackage.update({
                where: {
                  id: input.id,
                },
                data: {
                  ...data,
                  ...updateRelations,
                },
                include: {
                  amenities: {
                    select: {
                      code: true,
                      icon: true,
                      id: true,
                      name: true,
                    },
                  },
                  rooms: {
                    select: {
                      code: true,
                      id: true,
                      name: true,
                      type: true,
                    },
                  },
                  services: {
                    select: {
                      code: true,
                      id: true,
                      title: true,
                    },
                  },
                },
              })
            : await prisma.resortPackage.create({
                data: {
                  ...data,
                  ...createRelations,
                  resortProfileId: resortProfile.id,
                },
                include: {
                  amenities: {
                    select: {
                      code: true,
                      icon: true,
                      id: true,
                      name: true,
                    },
                  },
                  rooms: {
                    select: {
                      code: true,
                      id: true,
                      name: true,
                      type: true,
                    },
                  },
                  services: {
                    select: {
                      code: true,
                      id: true,
                      title: true,
                    },
                  },
                },
              });

          return toResortPackageOutput(pack);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortPackageStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const pack = await prisma.resortPackage.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!pack) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Package not found.",
            });
          }

          await prisma.resortPackage.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortPackageStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const pack = await prisma.resortPackage.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!pack) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Package not found.",
            });
          }

          await prisma.resortPackage.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    services: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const services = await prisma.resortService.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        return services.map(toResortServiceOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const service = await prisma.resortService.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!service) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Service not found.",
            });
          }

          return toResortServiceOutput(service);
        }),
      save: baseProcedure
        .input(resortServiceSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const code = input.code.toUpperCase();

          if (input.id) {
            const existingService = await prisma.resortService.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingService) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Service not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortService.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Service code already exists.",
            });
          }

          const data = {
            baseCharge: input.baseCharge,
            billingType: toResortServiceBillingType(input.billingType),
            bookingLeadTime: input.bookingLeadTime ?? null,
            category: input.category,
            code,
            description: input.description ?? null,
            duration: input.duration ?? null,
            feeNote: input.feeNote ?? null,
            internalNotes: input.internalNotes ?? null,
            provider: input.provider ?? null,
            showOnBookingPage: input.showOnBookingPage,
            status: toResortServiceStatus(input.status),
            title: input.title,
          };
          const service = input.id
            ? await prisma.resortService.update({
                where: {
                  id: input.id,
                },
                data,
              })
            : await prisma.resortService.create({
                data: {
                  ...data,
                  resortProfileId: resortProfile.id,
                },
              });

          return toResortServiceOutput(service);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortServiceStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const service = await prisma.resortService.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!service) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Service not found.",
            });
          }

          await prisma.resortService.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortServiceStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const service = await prisma.resortService.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!service) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Service not found.",
            });
          }

          await prisma.resortService.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    reservations: createTRPCRouter({
      guestOptions: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const guests = await prisma.appUser.findMany({
          where: {
            guestDisabledAt: null,
            resortProfile: { is: null },
            staffProfile: { is: null },
          },
          select: {
            authUserId: true,
            displayName: true,
            email: true,
            firstName: true,
            lastName: true,
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });
        const guestIds = guests.map((guest) => guest.authUserId);
        const guestEmails = guests.map((guest) => guest.email);
        const previousReservations = guests.length
          ? await prisma.resortReservation.findMany({
              where: {
                resortProfileId: resortProfile.id,
                OR: [
                  { guestAccountId: { in: guestIds } },
                  { guestEmail: { in: guestEmails, mode: "insensitive" } },
                ],
              },
              select: {
                createdAt: true,
                guestAccountId: true,
                guestEmail: true,
                guestPhone: true,
              },
              orderBy: { createdAt: "desc" },
            })
          : [];

        return guests.map((guest) => {
          const previousReservation = previousReservations.find(
            (reservation) =>
              reservation.guestAccountId === guest.authUserId ||
              reservation.guestEmail?.trim().toLowerCase() ===
                guest.email.trim().toLowerCase(),
          );

          return {
            id: guest.authUserId,
            displayName: guest.displayName,
            email: guest.email,
            firstName: guest.firstName ?? "",
            lastName: guest.lastName ?? "",
            phone: previousReservation?.guestPhone ?? "",
          };
        });
      }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const reservations = await prisma.resortReservation.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            invoices: {
              orderBy: {
                createdAt: "desc",
              },
              select: {
                balanceDue: true,
                depositPaid: true,
                status: true,
                totalAmount: true,
              },
            },
            room: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            checkIn: "asc",
          },
        });

        return reservations.map(toResortReservationOutput);
      }),
      create: baseProcedure
        .input(resortReservationSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const registeredGuest = input.guestAccountId
            ? await prisma.appUser.findFirst({
                where: {
                  authUserId: input.guestAccountId,
                  guestDisabledAt: null,
                  resortProfile: { is: null },
                  staffProfile: { is: null },
                },
                select: {
                  authUserId: true,
                  displayName: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              })
            : null;

          if (input.guestAccountId && !registeredGuest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Registered guest account not found or unavailable.",
            });
          }

          const registeredGuestName = registeredGuest
            ? [registeredGuest.firstName, registeredGuest.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || registeredGuest.displayName
            : input.guestName;
          const reservationGuestEmail =
            registeredGuest?.email ?? input.guestEmail;

          const checkIn = parseReservationDate(input.checkIn, "Check-in");
          const checkOut = parseReservationDate(input.checkOut, "Check-out");
          const nights = getReservationNights(checkIn, checkOut);

          const overlappingReservation =
            await prisma.resortReservation.findFirst({
              where: {
                resortProfileId: resortProfile.id,
                status: {
                  notIn: ["CANCELED", "CHECKED_OUT"],
                },
                checkIn: {
                  lt: checkOut,
                },
                checkOut: {
                  gt: checkIn,
                },
              },
            });

          if (overlappingReservation) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Alrio Private Resort is already booked for the selected dates.",
            });
          }

          const includedRoomCount = await prisma.resortRoom.count({
            where: {
              resortProfileId: resortProfile.id,
              status: { not: "OUT_OF_SERVICE" },
            },
          });

          const appUrl = await getConfiguredAppUrl(resortProfile.id);
          const workspaceName =
            resortProfile.resortName ?? "Alrio Private Resort";
          const reservation = await prisma.resortReservation.create({
            data: {
              resortProfileId: resortProfile.id,
              roomId: null,
              guestAccountId: registeredGuest?.authUserId ?? null,
              guestName: registeredGuestName,
              guestEmail: reservationGuestEmail ?? null,
              guestPhone: input.guestPhone ?? null,
              checkIn,
              checkOut,
              adults: input.adults,
              children: input.children,
              nights,
              rate: input.rate,
              packageName: null,
              packagePrice: null,
              roomsIncluded: Math.max(includedRoomCount, 1),
              deposit: input.deposit ?? null,
              totalAmount: input.totalAmount,
              paymentMethod: input.paymentMethod ?? null,
              status: toResortReservationStatus(input.status),
              notes: input.notes ?? null,
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          });

          await createInvoiceForReservation({
            resortProfileId: resortProfile.id,
            reservation,
          });

          let emailNotificationSent = false;
          let emailNotificationError = "";

          if (reservationGuestEmail) {
            try {
              await sendReservationConfirmationEmail({
                appUrl,
                checkIn,
                checkOut,
                deposit: input.deposit,
                email: reservationGuestEmail,
                guestName: registeredGuestName,
                nights,
                reservationId: reservation.id,
                roomName: "Alrio Private Resort",
                roomType: "Exclusive whole-resort booking",
                totalAmount: input.totalAmount,
                workspaceName,
              });
              emailNotificationSent = true;
            } catch (error) {
              emailNotificationError =
                error instanceof Error
                  ? error.message
                  : "Confirmation email failed.";
              console.error("Booking confirmation email failed.", error);
            }
          }

          return {
            ...toResortReservationOutput(reservation),
            emailNotificationError,
            emailNotificationSent,
          };
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortReservationStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const reservation = await prisma.resortReservation.findFirst({
            where: { id: input.id, resortProfileId: resortProfile.id },
            include: {
              invoices: {
                where: { status: { not: "VOID" } },
                select: { balanceDue: true },
              },
            },
          });
          if (!reservation) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found." });
          }

          const outstandingBalance = reservation.invoices.reduce(
            (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
            0,
          );
          if (input.status === "Checked out" && outstandingBalance > 0.009) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Record the remaining payment before checking out this booking.",
            });
          }

          const updated = await prisma.resortReservation.update({
            where: { id: reservation.id },
            data: {
              frontDeskStatus:
                input.status === "Checked in"
                  ? "IN_HOUSE"
                  : input.status === "Checked out"
                    ? "COMPLETED"
                    : null,
              status: toResortReservationStatus(input.status),
            },
          });

          return { id: updated.id, status: fromResortReservationStatus(updated.status) };
        }),
      recordPayment: baseProcedure
        .input(
          z.object({
            amount: z.string().trim().min(1, "Payment amount is required."),
            note: z.string().trim().optional(),
            paymentMethod: z.string().trim().min(1, "Payment method is required."),
            reservationId: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;
          if (!authUser?.id) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const reservation = await prisma.resortReservation.findFirst({
            where: { id: input.reservationId, resortProfileId: resortProfile.id },
          });
          if (!reservation) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Reservation not found." });
          }

          const invoices = await prisma.resortInvoice.findMany({
            where: {
              reservationId: reservation.id,
              resortProfileId: resortProfile.id,
              status: { notIn: ["PAID", "VOID"] },
            },
            orderBy: { createdAt: "asc" },
          });
          const outstandingBalance = invoices.reduce(
            (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
            0,
          );
          const paymentAmount = parseMoneyAmount(input.amount);

          if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Enter a payment amount greater than zero.",
            });
          }
          if (!invoices.length || outstandingBalance <= 0.009) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "This booking has no outstanding balance.",
            });
          }
          if (paymentAmount - outstandingBalance > 0.009) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Payment cannot exceed the remaining balance.",
            });
          }

          let unallocatedAmount = paymentAmount;
          const allocations = invoices.flatMap((invoice) => {
            const invoiceBalance = parseMoneyAmount(invoice.balanceDue);
            const appliedAmount = Math.min(invoiceBalance, unallocatedAmount);
            unallocatedAmount -= appliedAmount;
            return appliedAmount > 0 ? [{ appliedAmount, invoice, invoiceBalance }] : [];
          });
          const financeCode = await getNextFinanceEntryCode(resortProfile.id, "Revenue");
          const firstPaymentCode = await getNextPaymentLogCode(resortProfile.id);
          const firstPaymentNumber = Number(firstPaymentCode.replace(/\D/g, ""));
          const paidAt = new Date();

          await prisma.$transaction(async (tx) => {
            for (const [index, allocation] of allocations.entries()) {
              const newBalance = Math.max(
                allocation.invoiceBalance - allocation.appliedAmount,
                0,
              );
              const previousPaid = parseMoneyAmount(allocation.invoice.depositPaid);

              await tx.resortPaymentLog.create({
                data: {
                  amount: toMoneyString(allocation.appliedAmount),
                  code: `PAY-${String(firstPaymentNumber + index).padStart(5, "0")}`,
                  invoiceId: allocation.invoice.id,
                  paidAt,
                  paymentMethod: input.paymentMethod,
                  proofNote: input.note || null,
                  reservationId: reservation.id,
                  status: "RECORDED",
                  resortProfileId: resortProfile.id,
                },
              });
              await tx.resortInvoice.update({
                where: { id: allocation.invoice.id },
                data: {
                  balanceDue: toMoneyString(newBalance),
                  depositPaid: toMoneyString(previousPaid + allocation.appliedAmount),
                  paidAt: newBalance <= 0.009 ? paidAt : null,
                  paymentMethod: input.paymentMethod,
                  status: newBalance <= 0.009 ? "PAID" : "SENT",
                },
              });
            }

            await tx.resortReservation.update({
              where: { id: reservation.id },
              data: { paymentMethod: input.paymentMethod },
            });
            await tx.resortFinanceEntry.create({
              data: {
                amount: toMoneyString(paymentAmount),
                category: "Reservation payment",
                code: financeCode,
                description: `Payment for booking ${reservation.id}`,
                entryDate: paidAt,
                notes: [input.paymentMethod, input.note].filter(Boolean).join(" · "),
                source: "INVOICE_PAYMENT",
                status: "CLEARED",
                resortProfileId: resortProfile.id,
                type: "REVENUE",
              },
            });
          });

          const balanceDue = Math.max(outstandingBalance - paymentAmount, 0);
          return {
            amount: toMoneyString(paymentAmount),
            balanceDue: toMoneyString(balanceDue),
            fullyPaid: balanceDue <= 0.009,
            id: reservation.id,
          };
        }),
    }),
    reception: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const upcomingEnd = new Date(todayStart);
        upcomingEnd.setDate(upcomingEnd.getDate() + 7);

        const [reservations, requests, shiftNotes] = await Promise.all([
          prisma.resortReservation.findMany({
            where: {
              resortProfileId: resortProfile.id,
              status: {
                notIn: ["CANCELED", "CHECKED_OUT"],
              },
              OR: [
                {
                  status: "CHECKED_IN",
                },
                {
                  checkIn: {
                    gte: todayStart,
                    lt: upcomingEnd,
                  },
                  status: {
                    in: ["PENDING", "CONFIRMED"],
                  },
                },
              ],
            },
            include: {
              invoices: {
                orderBy: {
                  createdAt: "desc",
                },
                select: {
                  balanceDue: true,
                  code: true,
                  id: true,
                  status: true,
                  totalAmount: true,
                },
              },
              folioCharges: {
                select: {
                  amount: true,
                  status: true,
                },
              },
              paymentLogs: {
                select: {
                  amount: true,
                  status: true,
                },
              },
              room: {
                select: {
                  checkIn: true,
                  checkOut: true,
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: [
              {
                checkIn: "asc",
              },
              {
                updatedAt: "desc",
              },
            ],
          }),
          prisma.resortReceptionRequest.findMany({
            where: {
              resortProfileId: resortProfile.id,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          }),
          prisma.resortReceptionShiftNote.findMany({
            where: {
              resortProfileId: resortProfile.id,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 6,
          }),
        ]);

        const guests = reservations.map((reservation) =>
          toResortReceptionGuestOutput(reservation, todayEnd),
        );

        return {
          guests,
          requests: requests.map(toResortReceptionRequestOutput),
          shiftNotes: shiftNotes.map(toResortReceptionShiftNoteOutput),
        };
      }),
      updateReservationStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortReceptionQueueStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const reservation = await prisma.resortReservation.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              folioCharges: true,
              invoices: true,
              paymentLogs: true,
              room: true,
            },
          });

          if (!reservation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Reservation not found.",
            });
          }

          if (input.status === "Completed") {
            const activeCharges = reservation.folioCharges.filter(
              (charge) => !["VOIDED", "ADJUSTED"].includes(charge.status),
            );
            const unbilledTotal = activeCharges
              .filter((charge) => charge.status === "UNBILLED")
              .reduce(
                (total, charge) => total + parseMoneyAmount(charge.amount),
                0,
              );
            const folioTotal = activeCharges.reduce(
              (total, charge) => total + parseMoneyAmount(charge.amount),
              0,
            );
            const invoiceTotal = reservation.invoices
              .filter((invoice) => invoice.status !== "VOID")
              .reduce(
                (total, invoice) =>
                  total + parseMoneyAmount(invoice.totalAmount),
                0,
              );
            const paymentTotal = reservation.paymentLogs
              .filter((payment) => payment.status === "RECORDED")
              .reduce(
                (total, payment) => total + parseMoneyAmount(payment.amount),
                0,
              );

            if (unbilledTotal > 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Cannot check out with un-billed folio charges. Generate invoice first.",
              });
            }

            if (Math.abs(folioTotal - invoiceTotal) > 0.01) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Cannot check out until folio total matches generated invoices.",
              });
            }

            if (Math.abs(invoiceTotal - paymentTotal) > 0.01) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Cannot check out until payment log matches generated invoices.",
              });
            }
          }

          const status =
            input.status === "Completed"
              ? "CHECKED_OUT"
              : input.status === "Checking out"
                ? "CHECKED_IN"
                : "CHECKED_IN";
          await prisma.resortReservation.update({
            where: {
              id: input.id,
            },
            data: {
              frontDeskStatus:
                input.status === "Completed"
                  ? "COMPLETED"
                  : input.status === "Checking out"
                    ? "CHECKING_OUT"
                    : "IN_HOUSE",
              status,
            },
          });

          return {
            id: input.id,
            status: fromResortReservationStatus(status),
          };
        }),
      getBilling: baseProcedure
        .input(
          z.object({
            reservationId: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const reservation = await prisma.resortReservation.findFirst({
            where: {
              id: input.reservationId,
              resortProfileId: resortProfile.id,
            },
            include: {
              folioCharges: {
                include: {
                  invoice: {
                    select: {
                      code: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
              invoices: {
                include: {
                  lineItems: {
                    orderBy: {
                      sortOrder: "asc",
                    },
                  },
                  reservation: {
                    select: {
                      id: true,
                      room: {
                        select: {
                          code: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
              paymentLogs: {
                include: {
                  invoice: {
                    select: {
                      code: true,
                    },
                  },
                },
                orderBy: {
                  paidAt: "desc",
                },
              },
              room: {
                select: {
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          });

          if (!reservation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Reservation not found.",
            });
          }

          const activeCharges = reservation.folioCharges.filter(
            (charge) => !["VOIDED", "ADJUSTED"].includes(charge.status),
          );
          const subFolioTotal = activeCharges.reduce(
            (total, charge) => total + parseMoneyAmount(charge.amount),
            0,
          );
          const invoiceTotal = reservation.invoices
            .filter((invoice) => invoice.status !== "VOID")
            .reduce(
              (total, invoice) => total + parseMoneyAmount(invoice.totalAmount),
              0,
            );
          const paymentTotal = reservation.paymentLogs
            .filter((payment) => payment.status === "RECORDED")
            .reduce(
              (total, payment) => total + parseMoneyAmount(payment.amount),
              0,
            );
          const unbilledTotal = activeCharges
            .filter((charge) => charge.status === "UNBILLED")
            .reduce(
              (total, charge) => total + parseMoneyAmount(charge.amount),
              0,
            );

          return {
            balanceDue: toMoneyString(
              Math.max(subFolioTotal - paymentTotal, 0),
            ),
            charges: reservation.folioCharges.map(toResortFolioChargeOutput),
            invoiceTotal: toMoneyString(invoiceTotal),
            invoices: reservation.invoices.map(toResortInvoiceOutput),
            paymentLogs: reservation.paymentLogs.map(toResortPaymentLogOutput),
            paymentTotal: toMoneyString(paymentTotal),
            reservation: {
              checkIn: reservation.checkIn,
              checkOut: reservation.checkOut,
              guestName: reservation.guestName,
              id: reservation.id,
              roomLabel: reservation.room
                ? `${reservation.room.code} - ${reservation.room.name}`
                : "Alrio Private Resort - Whole Resort",
              status: fromResortReservationStatus(reservation.status),
            },
            subFolioTotal: toMoneyString(subFolioTotal),
            unbilledTotal: toMoneyString(unbilledTotal),
          };
        }),
      createFolioCharge: baseProcedure
        .input(resortFolioChargeSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const reservation = await prisma.resortReservation.findFirst({
            where: {
              id: input.reservationId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!reservation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Reservation not found.",
            });
          }

          const charge = await prisma.resortFolioCharge.create({
            data: {
              amount: input.amount,
              code: await getNextFolioChargeCode(resortProfile.id),
              description: input.description,
              quantity: input.quantity,
              rate: input.rate,
              reservationId: input.reservationId,
              status: toResortFolioChargeStatus(input.status),
              resortProfileId: resortProfile.id,
              type: toResortFolioChargeType(input.type),
            },
            include: {
              invoice: {
                select: {
                  code: true,
                },
              },
            },
          });

          return toResortFolioChargeOutput(charge);
        }),
      generateInvoiceFromFolio: baseProcedure
        .input(
          z.object({
            reservationId: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          await requireInvoiceCreator(authUser.id);
          const resortProfile = await getResortProfileForSession(authUser.id);
          const charges = await prisma.resortFolioCharge.findMany({
            where: {
              reservationId: input.reservationId,
              status: "UNBILLED",
              resortProfileId: resortProfile.id,
            },
            select: {
              id: true,
            },
          });

          const invoice = await createInvoiceForFolioCharges({
            chargeIds: charges.map((charge) => charge.id),
            resortProfileId: resortProfile.id,
          });

          return {
            id: invoice.id,
          };
        }),
      recordPayment: baseProcedure
        .input(resortPaymentLogSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const reservation = await prisma.resortReservation.findFirst({
            where: {
              id: input.reservationId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!reservation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Reservation not found.",
            });
          }

          const invoices = await prisma.resortInvoice.findMany({
            where: {
              id: input.invoiceIds.length
                ? {
                    in: input.invoiceIds,
                  }
                : undefined,
              reservationId: input.reservationId,
              status: {
                notIn: ["PAID", "VOID"],
              },
              resortProfileId: resortProfile.id,
            },
            orderBy: {
              createdAt: "asc",
            },
          });

          if (!invoices.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No unpaid invoices found for payment.",
            });
          }

          const invoiceBalance = invoices.reduce(
            (total, invoice) => total + parseMoneyAmount(invoice.balanceDue),
            0,
          );
          const paymentAmount = parseMoneyAmount(input.amount);

          if (Math.abs(paymentAmount - invoiceBalance) > 0.01) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Payment amount must match selected invoice balance.",
            });
          }

          const financeCode = await getNextFinanceEntryCode(
            resortProfile.id,
            "Revenue",
          );
          const firstPaymentCode = await getNextPaymentLogCode(
            resortProfile.id,
          );
          const firstPaymentNumber = Number(
            firstPaymentCode.replace(/\D/g, ""),
          );
          await prisma.$transaction(async (tx) => {
            await tx.resortPaymentLog.createMany({
              data: invoices.map((invoice, index) => ({
                amount: invoice.balanceDue,
                code: `PAY-${String(firstPaymentNumber + index).padStart(5, "0")}`,
                invoiceId: invoice.id,
                paidAt: new Date(),
                paymentMethod: input.paymentMethod,
                proofNote: input.proofNote ?? null,
                proofUrl: input.proofUrl ?? null,
                reservationId: input.reservationId,
                status: "RECORDED",
                resortProfileId: resortProfile.id,
              })),
            });

            await tx.resortInvoice.updateMany({
              where: {
                id: {
                  in: invoices.map((invoice) => invoice.id),
                },
              },
              data: {
                balanceDue: "0",
                paidAt: new Date(),
                status: "PAID",
              },
            });

            await tx.resortFinanceEntry.create({
              data: {
                amount: input.amount,
                category: "Invoice payment",
                code: financeCode,
                description: `Payment for booking ${reservation.id}`,
                entryDate: new Date(),
                notes: [input.paymentMethod, input.proofNote]
                  .filter(Boolean)
                  .join(" · "),
                receiptUrl: input.proofUrl ?? null,
                source: "INVOICE_PAYMENT",
                status: "CLEARED",
                resortProfileId: resortProfile.id,
                type: "REVENUE",
              },
            });
          });

          return {
            id: input.reservationId,
          };
        }),
      createRequest: baseProcedure
        .input(resortReceptionRequestSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);

          if (input.reservationId) {
            const reservation = await prisma.resortReservation.findFirst({
              where: {
                id: input.reservationId,
                resortProfileId: resortProfile.id,
              },
            });

            if (!reservation) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Reservation not found.",
              });
            }
          }

          const request = await prisma.resortReceptionRequest.create({
            data: {
              department: input.department,
              note: input.note,
              priority: toResortReceptionRequestPriority(input.priority),
              reservationId: input.reservationId ?? null,
              roomOrArea: input.roomOrArea,
              status: "SENT",
              resortProfileId: resortProfile.id,
            },
          });

          if (input.department.toLowerCase().includes("maintenance")) {
            const maintenanceCount =
              await prisma.resortMaintenanceRequest.count({
                where: {
                  resortProfileId: resortProfile.id,
                },
              });

            await prisma.resortMaintenanceRequest.create({
              data: {
                area: input.roomOrArea,
                code: `MNT-${String(maintenanceCount + 1).padStart(4, "0")}`,
                forwardedBy: "Reception",
                issue: input.note.slice(0, 120),
                notes: input.note,
                priority: toResortMaintenancePriority(input.priority),
                resortProfileId: resortProfile.id,
              },
            });
          }

          return toResortReceptionRequestOutput(request);
        }),
      createShiftNote: baseProcedure
        .input(resortReceptionShiftNoteSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const note = await prisma.resortReceptionShiftNote.create({
            data: {
              note: input.note,
              resortProfileId: resortProfile.id,
              title: input.title,
            },
          });

          return toResortReceptionShiftNoteOutput(note);
        }),
      resolveRequest: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const request = await prisma.resortReceptionRequest.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!request) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Request not found.",
            });
          }

          await prisma.resortReceptionRequest.update({
            where: {
              id: input.id,
            },
            data: {
              status: "RESOLVED",
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    maintenance: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const requests = await prisma.resortMaintenanceRequest.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          orderBy: [
            {
              status: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return requests.map(toResortMaintenanceRequestOutput);
      }),
      create: baseProcedure
        .input(resortMaintenanceRequestSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const roomId = input.roomId?.trim() || null;

          if (roomId) {
            const room = await prisma.resortRoom.findFirst({
              where: {
                id: roomId,
                resortProfileId: resortProfile.id,
              },
            });

            if (!room) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Room not found.",
              });
            }
          }

          const requestCount = await prisma.resortMaintenanceRequest.count({
            where: {
              resortProfileId: resortProfile.id,
            },
          });
          const request = await prisma.resortMaintenanceRequest.create({
            data: {
              area: input.area,
              code: `MNT-${String(requestCount + 1).padStart(4, "0")}`,
              forwardedBy: "Reception",
              issue: input.issue,
              notes: input.notes?.trim() || null,
              priority: toResortMaintenancePriority(input.priority),
              roomId,
              resortProfileId: resortProfile.id,
            },
          });

          return toResortMaintenanceRequestOutput(request);
        }),
      complete: baseProcedure
        .input(resortMaintenanceCompleteSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const request = await prisma.resortMaintenanceRequest.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!request) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Maintenance request not found.",
            });
          }

          const updatedRequest = await prisma.resortMaintenanceRequest.update({
            where: {
              id: input.id,
            },
            data: {
              completedAt: new Date(),
              resolution: input.resolution,
              status: "COMPLETED",
            },
          });

          return toResortMaintenanceRequestOutput(updatedRequest);
        }),
    }),
    laundry: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const jobs = await prisma.resortLaundryJob.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          orderBy: [
            {
              status: "asc",
            },
            {
              receivedAt: "desc",
            },
          ],
        });

        return jobs.map(toResortLaundryJobOutput);
      }),
      create: baseProcedure
        .input(resortLaundryJobSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const jobCount = await prisma.resortLaundryJob.count({
            where: {
              resortProfileId: resortProfile.id,
            },
          });
          const job = await prisma.resortLaundryJob.create({
            data: {
              category: input.category,
              code: `LND-${String(jobCount + 1).padStart(4, "0")}`,
              dueTime: input.dueTime?.trim() || "Today",
              guestOrRoom: input.guestOrRoom,
              notes: input.notes?.trim() || null,
              pieces: input.pieces,
              priority: toResortLaundryPriority(input.priority),
              resortProfileId: resortProfile.id,
            },
          });

          return toResortLaundryJobOutput(job);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Laundry job is required."),
            status: resortLaundryStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const existingJob = await prisma.resortLaundryJob.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!existingJob) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Laundry job not found.",
            });
          }

          const job = await prisma.resortLaundryJob.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortLaundryStatus(input.status),
            },
          });

          return toResortLaundryJobOutput(job);
        }),
    }),
    inventory: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const [items, movements] = await Promise.all([
          prisma.resortInventoryItem.findMany({
            where: {
              resortProfileId: resortProfile.id,
            },
            include: {
              movements: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.resortInventoryMovement.findMany({
            where: {
              resortProfileId: resortProfile.id,
            },
            include: {
              item: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 8,
          }),
        ]);

        return {
          items: items.map(toResortInventoryItemOutput),
          movements: movements.map(toResortInventoryMovementOutput),
        };
      }),
      byId: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const item = await prisma.resortInventoryItem.findFirst({
            where: {
              OR: [
                {
                  id: input.id,
                },
                {
                  code: input.id,
                },
              ],
              resortProfileId: resortProfile.id,
            },
            include: {
              movements: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          return toResortInventoryItemOutput(item);
        }),
      upsert: baseProcedure
        .input(resortInventoryItemSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const existingItem = input.id
            ? await prisma.resortInventoryItem.findFirst({
                where: {
                  id: input.id,
                  resortProfileId: resortProfile.id,
                },
              })
            : null;

          if (input.id && !existingItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          const duplicate = await prisma.resortInventoryItem.findFirst({
            where: {
              code: input.code,
              resortProfileId: resortProfile.id,
              ...(input.id
                ? {
                    id: {
                      not: input.id,
                    },
                  }
                : {}),
            },
          });

          if (duplicate) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Item code already exists.",
            });
          }

          const item = input.id
            ? await prisma.resortInventoryItem.update({
                where: {
                  id: input.id,
                },
                data: {
                  category: input.category,
                  code: input.code,
                  dashboardAlert: input.dashboardAlert,
                  description: input.description?.trim() || null,
                  name: input.name,
                  notes: input.notes?.trim() || null,
                  quantity: input.quantity,
                  threshold: input.threshold,
                  unit: input.unit,
                },
                include: {
                  movements: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
              })
            : await prisma.resortInventoryItem.create({
                data: {
                  category: input.category,
                  code: input.code,
                  dashboardAlert: input.dashboardAlert,
                  description: input.description?.trim() || null,
                  name: input.name,
                  notes: input.notes?.trim() || null,
                  quantity: input.quantity,
                  resortProfileId: resortProfile.id,
                  threshold: input.threshold,
                  unit: input.unit,
                },
                include: {
                  movements: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
              });

          return toResortInventoryItemOutput(item);
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const item = await prisma.resortInventoryItem.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          await prisma.resortInventoryItem.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
      createMovement: baseProcedure
        .input(resortInventoryMovementSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const item = await prisma.resortInventoryItem.findFirst({
            where: {
              id: input.itemId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Inventory item not found.",
            });
          }

          const movementCount = await prisma.resortInventoryMovement.count({
            where: {
              resortProfileId: resortProfile.id,
            },
          });

          const movement = await prisma.$transaction(async (tx) => {
            const currentItem = await tx.resortInventoryItem.findFirst({
              where: {
                id: item.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!currentItem) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Inventory item not found.",
              });
            }

            if (input.type === "OUT" && input.quantity > currentItem.quantity) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient stock. Only ${currentItem.quantity} ${currentItem.unit} available.`,
              });
            }

            const nextQuantity =
              input.type === "IN"
                ? currentItem.quantity + input.quantity
                : currentItem.quantity - input.quantity;

            await tx.resortInventoryItem.update({
              where: { id: currentItem.id },
              data: {
                quantity: nextQuantity,
              },
            });

            return tx.resortInventoryMovement.create({
              data: {
                code: `MOV-${String(movementCount + 1).padStart(4, "0")}`,
                itemId: item.id,
                quantity: input.quantity,
                reason: input.reason,
                resortProfileId: resortProfile.id,
                type: input.type,
              },
              include: {
                item: {
                  select: {
                    name: true,
                  },
                },
              },
            });
          });

          return toResortInventoryMovementOutput(movement);
        }),
    }),
    housekeeping: createTRPCRouter({
      list: baseProcedure
        .input(
          z
            .object({
              date: z.string().optional(),
            })
            .optional(),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const selectedDate = input?.date ? new Date(input.date) : new Date();
          const dayStart = Number.isNaN(selectedDate.getTime())
            ? new Date()
            : selectedDate;
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          const upcomingEnd = new Date(dayStart);
          upcomingEnd.setDate(upcomingEnd.getDate() + 7);

          const [rooms, staffProfiles, damageReports] = await Promise.all([
            prisma.resortRoom.findMany({
              where: {
                resortProfileId: resortProfile.id,
              },
              include: {
                housekeepingState: {
                  include: {
                    attendantStaffProfile: {
                      include: {
                        appUser: true,
                      },
                    },
                  },
                },
                reservations: {
                  where: {
                    status: {
                      in: ["PENDING", "CONFIRMED", "CHECKED_IN"],
                    },
                    OR: [
                      {
                        status: "CHECKED_IN",
                        checkIn: {
                          lte: dayEnd,
                        },
                        checkOut: {
                          gte: dayStart,
                        },
                      },
                      {
                        checkIn: {
                          gte: dayStart,
                          lt: upcomingEnd,
                        },
                      },
                    ],
                  },
                  orderBy: {
                    checkIn: "asc",
                  },
                  take: 1,
                },
              },
              orderBy: [
                {
                  code: "asc",
                },
                {
                  name: "asc",
                },
              ],
            }),
            prisma.resortStaffProfile.findMany({
              where: {
                resortProfileId: resortProfile.id,
                status: "ACTIVE",
              },
              include: {
                appUser: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            }),
            prisma.resortHousekeepingDamageReport.findMany({
              where: {
                createdAt: {
                  gte: dayStart,
                  lt: dayEnd,
                },
                resortProfileId: resortProfile.id,
              },
              include: {
                room: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 8,
            }),
          ]);

          return {
            damageReports: damageReports.map(toResortHousekeepingDamageOutput),
            rooms: rooms.map(toResortHousekeepingRoomOutput),
            staff: staffProfiles.map((staffProfile) => ({
              id: staffProfile.id,
              name: staffProfile.appUser.displayName,
            })),
          };
        }),
      updateRoomStatus: baseProcedure
        .input(
          z.object({
            roomId: z.string().trim().min(1, "Room is required."),
            status: resortHousekeepingStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const room = await prisma.resortRoom.findFirst({
            where: {
              id: input.roomId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          await prisma.$transaction([
            prisma.resortHousekeepingRoom.upsert({
              where: {
                roomId: input.roomId,
              },
              create: {
                roomId: input.roomId,
                status: toResortHousekeepingStatus(input.status),
                resortProfileId: resortProfile.id,
              },
              update: {
                status: toResortHousekeepingStatus(input.status),
              },
            }),
            prisma.resortRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: getRoomStatusFromHousekeepingStatus(input.status),
              },
            }),
          ]);

          return {
            id: input.roomId,
            status: input.status,
          };
        }),
      markReady: baseProcedure
        .input(resortHousekeepingReadySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const room = await prisma.resortRoom.findFirst({
            where: {
              id: input.roomId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          const attendantStaffProfileId =
            input.attendantStaffProfileId &&
            input.attendantStaffProfileId !== "none"
              ? input.attendantStaffProfileId
              : null;

          if (attendantStaffProfileId) {
            const staffProfile = await prisma.resortStaffProfile.findFirst({
              where: {
                id: attendantStaffProfileId,
                resortProfileId: resortProfile.id,
              },
            });

            if (!staffProfile) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Staff not found.",
              });
            }
          }

          await prisma.$transaction([
            prisma.resortHousekeepingRoom.upsert({
              where: {
                roomId: input.roomId,
              },
              create: {
                attendantStaffProfileId,
                lastPhotoAt: new Date(),
                lastPhotoKey: input.photo?.key ?? null,
                lastPhotoName: input.photo?.name ?? null,
                lastPhotoNote: input.photoNote?.trim() || null,
                lastPhotoSize: input.photo?.size ?? null,
                lastPhotoUrl: input.photo?.url ?? null,
                roomId: input.roomId,
                status: "CLEAN",
                resortProfileId: resortProfile.id,
              },
              update: {
                attendantStaffProfileId,
                lastPhotoAt: new Date(),
                lastPhotoKey: input.photo?.key ?? null,
                lastPhotoName: input.photo?.name ?? null,
                lastPhotoNote: input.photoNote?.trim() || null,
                lastPhotoSize: input.photo?.size ?? null,
                lastPhotoUrl: input.photo?.url ?? null,
                status: "CLEAN",
              },
            }),
            prisma.resortRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: "AVAILABLE",
              },
            }),
          ]);

          return {
            id: input.roomId,
          };
        }),
      reportDamage: baseProcedure
        .input(resortHousekeepingDamageSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const room = await prisma.resortRoom.findFirst({
            where: {
              id: input.roomId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!room) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Room not found.",
            });
          }

          const maintenanceCount = await prisma.resortMaintenanceRequest.count({
            where: {
              resortProfileId: resortProfile.id,
            },
          });
          const maintenanceNotes = [
            input.details,
            input.photoNote?.trim()
              ? `Photo note: ${input.photoNote.trim()}`
              : null,
          ]
            .filter(Boolean)
            .join("\n\n");

          const [report] = await prisma.$transaction([
            prisma.resortHousekeepingDamageReport.create({
              data: {
                details: input.details,
                photoKey: input.photo?.key ?? null,
                photoName: input.photo?.name ?? null,
                photoNote: input.photoNote?.trim() || null,
                photoSize: input.photo?.size ?? null,
                photoUrl: input.photo?.url ?? null,
                roomId: input.roomId,
                resortProfileId: resortProfile.id,
                title: input.title,
              },
              include: {
                room: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            }),
            prisma.resortHousekeepingRoom.upsert({
              where: {
                roomId: input.roomId,
              },
              create: {
                roomId: input.roomId,
                status: "DIRTY",
                resortProfileId: resortProfile.id,
              },
              update: {
                status: "DIRTY",
              },
            }),
            prisma.resortRoom.update({
              where: {
                id: input.roomId,
              },
              data: {
                status: "MAINTENANCE",
              },
            }),
            prisma.resortMaintenanceRequest.create({
              data: {
                area: `${room.code} - ${room.name}`,
                code: `MNT-${String(maintenanceCount + 1).padStart(4, "0")}`,
                forwardedBy: "Housekeeping",
                issue: input.title,
                notes: maintenanceNotes,
                priority: "URGENT",
                roomId: input.roomId,
                resortProfileId: resortProfile.id,
              },
            }),
          ]);

          return toResortHousekeepingDamageOutput(report);
        }),
      resolveDamage: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Report is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const report = await prisma.resortHousekeepingDamageReport.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          });

          if (!report) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Damage report not found.",
            });
          }

          await prisma.resortHousekeepingDamageReport.update({
            where: { id: input.id },
            data: { status: "RESOLVED" },
          });

          await prisma.resortMaintenanceRequest.updateMany({
            where: {
              area: `${report.room.code} - ${report.room.name}`,
              issue: report.title,
              roomId: report.roomId,
              status: "PENDING",
              resortProfileId: resortProfile.id,
            },
            data: {
              completedAt: new Date(),
              resolution: `Resolved from damage report ${report.id}.`,
              status: "COMPLETED",
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
    leads: createTRPCRouter({
      integration: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const messengerSettings = await getMessengerSettings(resortProfile.id);
        const configuredPageId = messengerSettings.pageId ?? "";
        const integration = configuredPageId
          ? await prisma.resortMessengerIntegration.findUnique({
              where: {
                pageId: configuredPageId,
              },
            })
          : null;

        return {
          connected: Boolean(
            integration?.resortProfileId === resortProfile.id &&
            integration.isActive,
          ),
          integration: integration
            ? {
                id: integration.id,
                isActive: integration.isActive,
                pageId: integration.pageId,
                pageName: integration.pageName ?? "Alrio Private Resort",
                subscribedFields: integration.subscribedFields,
              }
            : null,
          pageCandidate: configuredPageId
            ? {
                pageId: configuredPageId,
                pageName: integration?.pageName ?? "Alrio Private Resort",
                webhookUrl: messengerSettings.webhookUrl ?? "",
              }
            : null,
        };
      }),
      diagnostics: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const messengerSettings = await getMessengerSettings(resortProfile.id);
        const pageId = messengerSettings.pageId ?? "";
        const pageAccessToken = messengerSettings.pageAccessToken ?? "";
        const graphVersion = messengerSettings.graphVersion;
        const webhookUrl = messengerSettings.webhookUrl ?? "";
        const issues: string[] = [];
        const warnings: string[] = [];
        const checks: string[] = [];

        if (!pageId) issues.push("META_PAGE_ID missing.");
        else checks.push(`Configured Page ID: ${pageId}.`);

        if (!pageAccessToken) issues.push("META_PAGE_ACCESS_TOKEN missing.");
        else checks.push("Page access token configured.");

        if (!messengerSettings.verifyToken) {
          issues.push("META_VERIFY_TOKEN missing.");
        }

        if (!messengerSettings.appSecret) {
          issues.push(
            "META_APP_SECRET missing. Webhook signature check may fail in production.",
          );
        }

        if (!webhookUrl) {
          issues.push("META_MESSENGER_WEBHOOK_URL missing.");
        } else if (!webhookUrl.includes("/api/webhooks/meta/messenger")) {
          issues.push(
            "Webhook URL must end with /api/webhooks/meta/messenger.",
          );
        } else {
          checks.push(`Webhook URL: ${webhookUrl}.`);
        }

        const integration = pageId
          ? await prisma.resortMessengerIntegration.findUnique({
              where: {
                pageId,
              },
            })
          : null;

        if (!integration) {
          issues.push(
            "Messenger page not connected to Alrio Private Resort. Click Connect Messenger.",
          );
        } else if (integration.resortProfileId !== resortProfile.id) {
          issues.push(
            "Messenger page is connected to another resort workspace.",
          );
        } else if (!integration.isActive) {
          issues.push("Messenger integration exists but is inactive.");
        } else {
          checks.push("Messenger integration active for Alrio Private Resort.");
        }

        const [leadCount, stageCounts, recentMessages] = await Promise.all([
          prisma.resortLead.count({
            where: {
              resortProfileId: resortProfile.id,
            },
          }),
          prisma.resortLead.groupBy({
            by: ["stage"],
            _count: {
              _all: true,
            },
            where: {
              resortProfileId: resortProfile.id,
            },
          }),
          prisma.resortLeadMessage.findMany({
            where: {
              lead: {
                resortProfileId: resortProfile.id,
              },
            },
            include: {
              lead: {
                select: {
                  guestName: true,
                  stage: true,
                },
              },
            },
            orderBy: {
              sentAt: "desc",
            },
            take: 8,
          }),
        ]);

        if (pageId && pageAccessToken) {
          type MetaPageProbeBody = {
            error?: { message?: string };
            id?: string;
            name?: string;
          };
          type MetaSubscriptionProbeBody = {
            data?: Array<{ subscribed_fields?: string[] }>;
            error?: { message?: string };
          };

          const pageProbe: { body: MetaPageProbeBody; ok: boolean } =
            await fetch(
              `https://graph.facebook.com/${graphVersion}/me?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`,
              {
                cache: "no-store",
              },
            )
              .then(async (response) => ({
                ok: response.ok,
                body: (await response.json()) as {
                  error?: { message?: string };
                  id?: string;
                  name?: string;
                },
              }))
              .catch((error: unknown) => ({
                ok: false,
                body: {
                  error: {
                    message:
                      error instanceof Error
                        ? error.message
                        : "Cannot reach Meta Graph API.",
                  },
                },
              }));

          if (!pageProbe.ok) {
            const message =
              pageProbe.body.error?.message ?? "Unknown Meta error.";

            if (
              message.includes("pages_read_engagement") ||
              message.includes("Page Public Content Access") ||
              message.includes("Page Public Metadata Access")
            ) {
              warnings.push(
                "Meta Page token read check blocked by extra Page read permission. Messenger webhook can still work if the Page is subscribed to messages and the token is a valid Page token.",
              );
            } else {
              issues.push(`Meta Page token check failed: ${message}`);
            }
          } else {
            checks.push(
              `Meta token belongs to: ${pageProbe.body.name ?? "Unknown Page"}.`,
            );

            if (pageProbe.body.id && pageProbe.body.id !== pageId) {
              issues.push(
                `META_PAGE_ID mismatch. Token page is ${pageProbe.body.id}, env page is ${pageId}.`,
              );
            }
          }

          const subscriptionProbe: {
            body: MetaSubscriptionProbeBody;
            ok: boolean;
          } = await fetch(
            `https://graph.facebook.com/${graphVersion}/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageAccessToken)}`,
            {
              cache: "no-store",
            },
          )
            .then(async (response) => ({
              ok: response.ok,
              body: (await response.json()) as {
                data?: Array<{ subscribed_fields?: string[] }>;
                error?: { message?: string };
              },
            }))
            .catch((error: unknown) => ({
              ok: false,
              body: {
                error: {
                  message:
                    error instanceof Error
                      ? error.message
                      : "Cannot check Page subscriptions.",
                },
              },
            }));

          if (!subscriptionProbe.ok) {
            warnings.push(
              `Meta subscription read check failed: ${subscriptionProbe.body.error?.message ?? "Unknown Meta error."}`,
            );
          } else {
            const subscribedFields =
              subscriptionProbe.body.data?.flatMap(
                (item) => item.subscribed_fields ?? [],
              ) ?? [];
            const requiredFields = ["messages", "messaging_postbacks"];
            const missingFields = requiredFields.filter(
              (field) => !subscribedFields.includes(field),
            );

            if (missingFields.length > 0) {
              warnings.push(
                `Meta API did not report subscribed fields: ${missingFields.join(", ")}. If Messenger API Settings shows them as Subscribed, use Meta test webhook or send a real message to confirm.`,
              );
            } else {
              checks.push(
                "Meta webhook subscribed to Messenger message fields.",
              );
            }
          }
        }

        return {
          checks,
          healthy: issues.length === 0,
          issues,
          leadCount,
          recentMessages: recentMessages.map((message) => ({
            direction: message.direction,
            guestName: message.lead.guestName,
            id: message.id,
            sentAt: message.sentAt.toISOString(),
            stage: message.lead.stage,
            text: message.text ?? "Attachment or postback",
          })),
          stageCounts: stageCounts.map((item) => ({
            count: item._count._all,
            stage: item.stage,
          })),
          warnings,
        };
      }),
      connectMessenger: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const messengerSettings = await getMessengerSettings(resortProfile.id);
        const pageId = messengerSettings.pageId;
        const pageAccessToken = messengerSettings.pageAccessToken;
        const verifyToken = messengerSettings.verifyToken;

        if (!pageId || !pageAccessToken || !verifyToken) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "META_PAGE_ID, META_PAGE_ACCESS_TOKEN, and META_VERIFY_TOKEN are required.",
          });
        }

        const integration = await prisma.resortMessengerIntegration.upsert({
          where: {
            pageId,
          },
          create: {
            pageAccessToken,
            pageId,
            pageName: "Alrio Private Resort",
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            resortProfileId: resortProfile.id,
            verifyToken,
          },
          update: {
            isActive: true,
            pageAccessToken,
            pageName: "Alrio Private Resort",
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            resortProfileId: resortProfile.id,
            verifyToken,
          },
        });

        return {
          id: integration.id,
          pageId: integration.pageId,
          pageName: integration.pageName ?? "Alrio Private Resort",
        };
      }),
      syncMessengerInbox: baseProcedure.mutation(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const messengerSettings = await getMessengerSettings(resortProfile.id);
        const pageId = messengerSettings.pageId;
        const pageAccessToken = messengerSettings.pageAccessToken;
        const graphVersion = messengerSettings.graphVersion;
        const verifyToken = messengerSettings.verifyToken;

        if (!pageId || !pageAccessToken || !verifyToken) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "META_PAGE_ID, META_PAGE_ACCESS_TOKEN, and META_VERIFY_TOKEN are required.",
          });
        }

        const integration = await prisma.resortMessengerIntegration.upsert({
          where: {
            pageId,
          },
          create: {
            pageAccessToken,
            pageId,
            pageName: "Alrio Private Resort",
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            resortProfileId: resortProfile.id,
            verifyToken,
          },
          update: {
            isActive: true,
            pageAccessToken,
            subscribedFields: [
              "messages",
              "messaging_postbacks",
              "messaging_referrals",
            ],
            resortProfileId: resortProfile.id,
            verifyToken,
          },
        });

        type MetaMessage = {
          attachments?: unknown;
          created_time?: string;
          from?: { id?: string; name?: string };
          id: string;
          message?: string;
          to?: { data?: Array<{ id?: string; name?: string }> };
        };
        type MetaGraphPage<T> = {
          data?: T[];
          error?: { message?: string };
          paging?: {
            next?: string;
          };
        };
        type MetaConversation = {
          id: string;
          participants?: {
            data?: Array<{ id?: string; name?: string }>;
          };
          updated_time?: string;
        };

        const withAccessToken = (url: string) => {
          const nextUrl = new URL(url);
          if (!nextUrl.searchParams.has("access_token")) {
            nextUrl.searchParams.set("access_token", pageAccessToken);
          }
          return nextUrl.toString();
        };

        const fetchMetaPage = async <T>(url: string) => {
          const response = await fetch(withAccessToken(url), {
            cache: "no-store",
          });
          const body = (await response.json()) as MetaGraphPage<T>;

          if (!response.ok) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Messenger inbox sync failed: ${body.error?.message ?? "Unknown Meta error."}`,
            });
          }

          return body;
        };

        const fetchAllMetaPages = async <T>(initialUrl: string) => {
          const records: T[] = [];
          const seenUrls = new Set<string>();
          let nextUrl: string | undefined = initialUrl;

          while (nextUrl && !seenUrls.has(nextUrl)) {
            seenUrls.add(nextUrl);
            const page: MetaGraphPage<T> = await fetchMetaPage<T>(nextUrl);
            records.push(...(page.data ?? []));
            nextUrl = page.paging?.next;
          }

          return records;
        };

        const fields = ["id", "updated_time", "participants{id,name}"].join(
          ",",
        );
        const conversations = await fetchAllMetaPages<MetaConversation>(
          `https://graph.facebook.com/${graphVersion}/${pageId}/conversations?platform=messenger&fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(pageAccessToken)}`,
        );

        let syncedMessages = 0;

        for (const conversation of conversations) {
          const guest = conversation.participants?.data?.find(
            (participant) => participant.id && participant.id !== pageId,
          );
          const psid = guest?.id ?? conversation.id;
          const messages = await fetchAllMetaPages<MetaMessage>(
            `https://graph.facebook.com/${graphVersion}/${conversation.id}/messages?fields=${encodeURIComponent("id,message,created_time,from{id,name},to{id,name},attachments")}&access_token=${encodeURIComponent(pageAccessToken)}`,
          );
          const newestMessage =
            [...messages].sort(
              (a, b) =>
                new Date(
                  b.created_time ?? conversation.updated_time ?? Date.now(),
                ).getTime() -
                new Date(
                  a.created_time ?? conversation.updated_time ?? Date.now(),
                ).getTime(),
            )[0] ?? null;
          const summary =
            newestMessage?.message?.trim() ||
            (newestMessage?.attachments
              ? "Messenger attachment"
              : "Messenger inquiry");
          const lastMessageAt = newestMessage?.created_time
            ? new Date(newestMessage.created_time)
            : conversation.updated_time
              ? new Date(conversation.updated_time)
              : new Date();
          const conversationText = messages
            .map((message) => message.message)
            .filter(Boolean)
            .join("\n");
          const profile = await fetchMessengerProfile({
            graphVersion,
            pageAccessToken,
            psid,
          });
          const existingLead = await prisma.resortLead.findUnique({
            where: {
              resortProfileId_psid: {
                psid,
                resortProfileId: resortProfile.id,
              },
            },
            select: {
              profilePictureUrl: true,
              stage: true,
              targetDate: true,
            },
          });
          const inferredStage = inferMessengerLeadStage(
            conversationText || summary,
          );
          const inferredTargetDate = extractMessengerTargetDate(
            conversationText || summary,
            lastMessageAt,
          );
          const shouldAutoStage =
            !existingLead || existingLead.stage === "INTAKE";

          const lead = await prisma.resortLead.upsert({
            where: {
              resortProfileId_psid: {
                psid,
                resortProfileId: resortProfile.id,
              },
            },
            create: {
              guestName: profile?.name ?? guest?.name ?? "Messenger guest",
              inquiry: summary,
              lastMessage: summary,
              lastMessageAt,
              messengerIntegrationId: integration.id,
              profilePictureUrl: profile?.profilePictureUrl,
              psid,
              source: "Messenger",
              stage: inferredStage,
              targetDate: inferredTargetDate,
              resortProfileId: resortProfile.id,
            },
            update: {
              guestName: profile?.name ?? guest?.name ?? undefined,
              inquiry: summary,
              lastMessage: summary,
              lastMessageAt,
              messengerIntegrationId: integration.id,
              profilePictureUrl:
                profile?.profilePictureUrl ??
                existingLead?.profilePictureUrl ??
                undefined,
              stage: shouldAutoStage ? inferredStage : undefined,
              targetDate:
                existingLead?.targetDate ?? inferredTargetDate ?? undefined,
            },
          });

          for (const message of messages) {
            const senderId = message.from?.id ?? psid;
            const recipientId =
              message.to?.data?.find((recipient) => recipient.id)?.id ?? pageId;
            const sentAt = message.created_time
              ? new Date(message.created_time)
              : lastMessageAt;

            await prisma.resortLeadMessage.upsert({
              where: {
                metaMessageId: message.id,
              },
              create: {
                attachments: message.attachments
                  ? (message.attachments as Prisma.InputJsonValue)
                  : undefined,
                direction: senderId === pageId ? "OUTBOUND" : "INBOUND",
                lead: {
                  connect: {
                    id: lead.id,
                  },
                },
                metaMessageId: message.id,
                raw: message as Prisma.InputJsonValue,
                recipientId,
                senderId,
                sentAt,
                text: message.message ?? null,
              },
              update: {
                attachments: message.attachments
                  ? (message.attachments as Prisma.InputJsonValue)
                  : undefined,
                direction: senderId === pageId ? "OUTBOUND" : "INBOUND",
                raw: message as Prisma.InputJsonValue,
                text: message.message ?? null,
              },
            });
            syncedMessages += 1;
          }
        }

        return {
          conversations: conversations.length,
          messages: syncedMessages,
        };
      }),
      save: baseProcedure
        .input(resortLeadSaveSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const targetDate = input.targetDate
            ? new Date(`${input.targetDate}T00:00:00`)
            : null;

          if (input.id) {
            const lead = await prisma.resortLead.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!lead) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Lead not found.",
              });
            }

            return prisma.resortLead.update({
              where: {
                id: input.id,
              },
              data: {
                guestName: input.guestName,
                inquiry: input.inquiry ?? null,
                lastMessage: input.lastMessage ?? lead.lastMessage,
                source: input.source,
                stage: input.stage,
                targetDate,
              },
            });
          }

          return prisma.resortLead.create({
            data: {
              guestName: input.guestName,
              inquiry: input.inquiry ?? null,
              lastMessage: input.lastMessage ?? input.inquiry ?? null,
              lastMessageAt:
                input.lastMessage || input.inquiry ? new Date() : null,
              psid: `manual:${Date.now()}:${generateRandomString(8)}`,
              source: input.source,
              stage: input.stage,
              targetDate,
              resortProfileId: resortProfile.id,
            },
          });
        }),
      updateStage: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Lead is required."),
            stage: resortLeadStageSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const lead = await prisma.resortLead.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          await prisma.resortLead.update({
            where: {
              id: input.id,
            },
            data: {
              stage: input.stage,
            },
          });

          return {
            id: input.id,
          };
        }),
      convertToReservation: baseProcedure
        .input(resortLeadConvertReservationSchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const lead = await prisma.resortLead.findFirst({
            where: {
              id: input.leadId,
              resortProfileId: resortProfile.id,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          if (lead.reservationId) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Lead already linked to a reservation.",
            });
          }

          const checkIn = parseReservationDate(input.checkIn, "Check-in");
          const checkOut = parseReservationDate(input.checkOut, "Check-out");
          const nights = getReservationNights(checkIn, checkOut);

          const overlappingReservation =
            await prisma.resortReservation.findFirst({
              where: {
                checkIn: {
                  lt: checkOut,
                },
                checkOut: {
                  gt: checkIn,
                },
                status: {
                  notIn: ["CANCELED", "CHECKED_OUT"],
                },
                resortProfileId: resortProfile.id,
              },
            });

          if (overlappingReservation) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Alrio Private Resort is already booked for the selected dates.",
            });
          }

          const includedRoomCount = await prisma.resortRoom.count({
            where: {
              resortProfileId: resortProfile.id,
              status: { not: "OUT_OF_SERVICE" },
            },
          });

          const reservation = await prisma.resortReservation.create({
            data: {
              adults: input.adults,
              checkIn,
              checkOut,
              children: input.children,
              deposit: input.deposit ?? null,
              guestName: lead.guestName,
              nights,
              notes:
                input.notes ??
                `Converted from lead ${lead.id}${lead.inquiry ? `: ${lead.inquiry}` : ""}`,
              packageName: null,
              packagePrice: null,
              paymentMethod: input.paymentMethod ?? null,
              rate: input.rate,
              roomId: null,
              roomsIncluded: Math.max(includedRoomCount, 1),
              status: toResortReservationStatus(input.status),
              resortProfileId: resortProfile.id,
              totalAmount: input.totalAmount,
            },
            include: {
              room: {
                select: {
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          });

          await createInvoiceForReservation({
            reservation,
            resortProfileId: resortProfile.id,
          });

          await prisma.resortLead.update({
            where: {
              id: input.leadId,
            },
            data: {
              reservationId: reservation.id,
              stage: "CONVERTED",
            },
          });

          return toResortReservationOutput(reservation);
        }),
      sendReply: baseProcedure
        .input(resortLeadReplySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const lead = await prisma.resortLead.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
            include: {
              messengerIntegration: true,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          const messengerSettings = await getMessengerSettings(resortProfile.id);
          const pageAccessToken =
            lead.messengerIntegration?.pageAccessToken ??
            messengerSettings.pageAccessToken;
          const pageId =
            lead.messengerIntegration?.pageId ?? messengerSettings.pageId;

          if (lead.psid.startsWith("manual:")) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Manual lead has no Messenger PSID.",
            });
          }

          if (!pageAccessToken || !pageId) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Messenger Page access token is required.",
            });
          }

          const graphVersion = messengerSettings.graphVersion;
          const response = await fetch(
            `https://graph.facebook.com/${graphVersion}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
            {
              body: JSON.stringify({
                messaging_type: "RESPONSE",
                message: {
                  text: input.text,
                },
                recipient: {
                  id: lead.psid,
                },
              }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            },
          );
          const body = (await response.json()) as {
            error?: { message?: string };
            message_id?: string;
          };

          if (!response.ok) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Messenger reply failed: ${body.error?.message ?? "Unknown Meta error."}`,
            });
          }

          const sentAt = new Date();

          await prisma.$transaction([
            prisma.resortLead.update({
              where: {
                id: input.id,
              },
              data: {
                lastMessage: input.text,
                lastMessageAt: sentAt,
              },
            }),
            prisma.resortLeadMessage.create({
              data: {
                direction: "OUTBOUND",
                lead: {
                  connect: {
                    id: input.id,
                  },
                },
                metaMessageId:
                  body.message_id ?? `outbound:${input.id}:${sentAt.getTime()}`,
                recipientId: lead.psid,
                senderId: pageId,
                sentAt,
                text: input.text,
              },
            }),
          ]);

          return {
            id: input.id,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string().trim().min(1, "Lead is required."),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const lead = await prisma.resortLead.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead not found.",
            });
          }

          await prisma.resortLead.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const leads = await prisma.resortLead.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          include: {
            messages: {
              orderBy: {
                sentAt: "asc",
              },
            },
            messengerIntegration: true,
            reservation: {
              select: {
                id: true,
                checkIn: true,
                checkOut: true,
                status: true,
                room: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            {
              lastMessageAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        return leads.map((lead) => ({
          channel: "Messenger" as const,
          createdAt: lead.createdAt.toISOString(),
          guestName: lead.guestName,
          id: lead.id,
          inquiry: lead.inquiry ?? "Messenger inquiry",
          lastMessage: lead.lastMessage ?? "--",
          lastMessageAt: lead.lastMessageAt?.toISOString() ?? null,
          messages: lead.messages.map((message) => ({
            attachments: message.attachments,
            direction: message.direction,
            id: message.id,
            postbackPayload: message.postbackPayload,
            sentAt: message.sentAt.toISOString(),
            text: message.text ?? "Attachment or postback",
          })),
          pageId: lead.messengerIntegration?.pageId ?? null,
          profilePictureUrl: lead.profilePictureUrl,
          psid: lead.psid,
          reservation: lead.reservation
            ? {
                checkIn: lead.reservation.checkIn.toISOString(),
                checkOut: lead.reservation.checkOut.toISOString(),
                id: lead.reservation.id,
                roomLabel: lead.reservation.room
                  ? `${lead.reservation.room.code} - ${lead.reservation.room.name}`
                  : "Alrio Private Resort - Whole Resort",
                status: fromResortReservationStatus(lead.reservation.status),
              }
            : null,
          reservationId: lead.reservationId,
          source: lead.source,
          stage: lead.stage,
          targetDate: lead.targetDate?.toISOString() ?? null,
        }));
      }),
    }),
    amenities: createTRPCRouter({
      list: baseProcedure.query(async ({ ctx }) => {
        const authUser = ctx.session?.user;

        if (!authUser?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in required.",
          });
        }

        const resortProfile = await getResortProfileForSession(authUser.id);
        const amenities = await prisma.resortAmenity.findMany({
          where: {
            resortProfileId: resortProfile.id,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              updatedAt: "desc",
            },
          ],
        });

        return amenities.map(toResortAmenityOutput);
      }),
      get: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .query(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const amenity = await prisma.resortAmenity.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!amenity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Amenity not found.",
            });
          }

          return toResortAmenityOutput(amenity);
        }),
      save: baseProcedure
        .input(resortAmenitySchema)
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const code = input.code.toUpperCase();

          if (input.id) {
            const existingAmenity = await prisma.resortAmenity.findFirst({
              where: {
                id: input.id,
                resortProfileId: resortProfile.id,
              },
            });

            if (!existingAmenity) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Amenity not found.",
              });
            }
          }

          const duplicateCode = await prisma.resortAmenity.findFirst({
            where: {
              resortProfileId: resortProfile.id,
              code,
              id: input.id
                ? {
                    not: input.id,
                  }
                : undefined,
            },
          });

          if (duplicateCode) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Amenity code already exists.",
            });
          }

          const data = {
            code,
            name: input.name,
            category: input.category,
            icon: input.icon,
            description: input.description ?? null,
            appliesTo: toResortAmenityScope(input.appliesTo),
            chargeable: input.chargeable,
            feeAmount: input.chargeable ? (input.feeAmount ?? null) : null,
            feeUnit: toResortAmenityFeeUnit(input.feeUnit),
            status: toResortAmenityStatus(input.status),
            showOnBookingPage: input.showOnBookingPage,
            featured: input.featured,
            sortOrder: input.sortOrder,
            internalNotes: input.internalNotes ?? null,
          };

          const amenity = input.id
            ? await prisma.resortAmenity.update({
                where: {
                  id: input.id,
                },
                data,
              })
            : await prisma.resortAmenity.create({
                data: {
                  ...data,
                  resortProfileId: resortProfile.id,
                },
              });

          return toResortAmenityOutput(amenity);
        }),
      updateStatus: baseProcedure
        .input(
          z.object({
            id: z.string(),
            status: resortAmenityStatusSchema,
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const amenity = await prisma.resortAmenity.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!amenity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Amenity not found.",
            });
          }

          await prisma.resortAmenity.update({
            where: {
              id: input.id,
            },
            data: {
              status: toResortAmenityStatus(input.status),
            },
          });

          return {
            id: input.id,
          };
        }),
      reorder: baseProcedure
        .input(
          z.object({
            items: z.array(
              z.object({
                id: z.string(),
                sortOrder: z.number().int().min(0),
              }),
            ),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const ids = input.items.map((item) => item.id);
          const amenityCount = await prisma.resortAmenity.count({
            where: {
              id: {
                in: ids,
              },
              resortProfileId: resortProfile.id,
            },
          });

          if (amenityCount !== ids.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more amenities are invalid.",
            });
          }

          await prisma.$transaction(
            input.items.map((item) =>
              prisma.resortAmenity.update({
                where: {
                  id: item.id,
                },
                data: {
                  sortOrder: item.sortOrder,
                },
              }),
            ),
          );

          return {
            updated: input.items.length,
          };
        }),
      delete: baseProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const authUser = ctx.session?.user;

          if (!authUser?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Sign in required.",
            });
          }

          const resortProfile = await getResortProfileForSession(authUser.id);
          const amenity = await prisma.resortAmenity.findFirst({
            where: {
              id: input.id,
              resortProfileId: resortProfile.id,
            },
          });

          if (!amenity) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Amenity not found.",
            });
          }

          await prisma.resortAmenity.delete({
            where: {
              id: input.id,
            },
          });

          return {
            id: input.id,
          };
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
