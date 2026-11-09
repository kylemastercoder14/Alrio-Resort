-- CreateEnum
CREATE TYPE "ResortStaffStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ResortTimeLogFlag" AS ENUM ('ON_TIME', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "ResortScheduleShiftStatus" AS ENUM ('ASSIGNED', 'OPEN', 'CHANGED');

-- CreateEnum
CREATE TYPE "ResortLeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResortOtUndertimeType" AS ENUM ('OVERTIME', 'UNDERTIME');

-- CreateEnum
CREATE TYPE "ResortOtUndertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResortPayrollRunStatus" AS ENUM ('DRAFT', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ResortPayrollPayType" AS ENUM ('REGULAR', 'FINAL');

-- CreateEnum
CREATE TYPE "ResortPayrollFrequency" AS ENUM ('MONTHLY', 'BI_WEEKLY');

-- CreateEnum
CREATE TYPE "ResortStaffInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ResortDepartmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResortAmenityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ResortAmenityScope" AS ENUM ('ROOM_LEVEL', 'PROPERTY_LEVEL');

-- CreateEnum
CREATE TYPE "ResortAmenityFeeUnit" AS ENUM ('PER_STAY', 'PER_DAY', 'PER_USE');

-- CreateEnum
CREATE TYPE "ResortRoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "ResortHousekeepingStatus" AS ENUM ('CLEAN', 'DIRTY', 'OCCUPIED', 'VACANT');

-- CreateEnum
CREATE TYPE "ResortHousekeepingDamageStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ResortLaundryStatus" AS ENUM ('RECEIVED', 'WASHING', 'DRYING', 'READY', 'RETURNED');

-- CreateEnum
CREATE TYPE "ResortLaundryPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ResortRoomSmokingPolicy" AS ENUM ('NON_SMOKING', 'SMOKING');

-- CreateEnum
CREATE TYPE "ResortReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED');

-- CreateEnum
CREATE TYPE "ResortReceptionQueueStatus" AS ENUM ('ARRIVING', 'IN_HOUSE', 'CHECKING_OUT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ResortReceptionRequestPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ResortReceptionRequestStatus" AS ENUM ('OPEN', 'SENT', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ResortMaintenancePriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ResortMaintenanceRequestStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ResortInventoryMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ResortServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ResortPackageStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResortServiceBillingType" AS ENUM ('FIXED_PRICE', 'PER_HOUR', 'PER_GUEST', 'CUSTOM_QUOTE');

-- CreateEnum
CREATE TYPE "ResortInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "ResortFolioChargeStatus" AS ENUM ('UNBILLED', 'INVOICED', 'VOIDED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "ResortFolioChargeType" AS ENUM ('STAY', 'ADDITIONAL', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ResortPaymentLogStatus" AS ENUM ('RECORDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ResortInvoiceReminderCadence" AS ENUM ('STANDARD', 'LIGHT', 'STRICT', 'PAUSED');

-- CreateEnum
CREATE TYPE "ResortFinanceEntryType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ResortFinanceEntrySource" AS ENUM ('MANUAL', 'AUTO_BOOKING', 'INVOICE_PAYMENT');

-- CreateEnum
CREATE TYPE "ResortFinanceEntryStatus" AS ENUM ('CLEARED', 'PENDING');

-- CreateEnum
CREATE TYPE "ResortTransactionExportFormat" AS ENUM ('CSV', 'PDF', 'TXT', 'XLSX');

-- CreateEnum
CREATE TYPE "ResortTransactionExportStatus" AS ENUM ('READY', 'SCHEDULED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResortLeadStage" AS ENUM ('INTAKE', 'QUALIFIED', 'PAYMENT_DONE', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ResortLeadChannel" AS ENUM ('MESSENGER');

-- CreateEnum
CREATE TYPE "ResortLeadMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- DropForeignKey
ALTER TABLE "_TenantPackageAmenities" DROP CONSTRAINT "_TenantPackageAmenities_A_fkey";

-- DropForeignKey
ALTER TABLE "_TenantPackageAmenities" DROP CONSTRAINT "_TenantPackageAmenities_B_fkey";

-- DropForeignKey
ALTER TABLE "_TenantPackageRooms" DROP CONSTRAINT "_TenantPackageRooms_A_fkey";

-- DropForeignKey
ALTER TABLE "_TenantPackageRooms" DROP CONSTRAINT "_TenantPackageRooms_B_fkey";

-- DropForeignKey
ALTER TABLE "_TenantPackageServices" DROP CONSTRAINT "_TenantPackageServices_A_fkey";

-- DropForeignKey
ALTER TABLE "_TenantPackageServices" DROP CONSTRAINT "_TenantPackageServices_B_fkey";

-- DropForeignKey
ALTER TABLE "_TenantRoomAmenities" DROP CONSTRAINT "_TenantRoomAmenities_A_fkey";

-- DropForeignKey
ALTER TABLE "_TenantRoomAmenities" DROP CONSTRAINT "_TenantRoomAmenities_B_fkey";

-- DropForeignKey
ALTER TABLE "tenant_access_role" DROP CONSTRAINT "tenant_access_role_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_amenity" DROP CONSTRAINT "tenant_amenity_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_department" DROP CONSTRAINT "tenant_department_headStaffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_department" DROP CONSTRAINT "tenant_department_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_finance_entry" DROP CONSTRAINT "tenant_finance_entry_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_folio_charge" DROP CONSTRAINT "tenant_folio_charge_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_folio_charge" DROP CONSTRAINT "tenant_folio_charge_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_folio_charge" DROP CONSTRAINT "tenant_folio_charge_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_housekeeping_damage_report" DROP CONSTRAINT "tenant_housekeeping_damage_report_roomId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_housekeeping_damage_report" DROP CONSTRAINT "tenant_housekeeping_damage_report_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_housekeeping_room" DROP CONSTRAINT "tenant_housekeeping_room_attendantStaffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_housekeeping_room" DROP CONSTRAINT "tenant_housekeeping_room_roomId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_housekeeping_room" DROP CONSTRAINT "tenant_housekeeping_room_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_inventory_item" DROP CONSTRAINT "tenant_inventory_item_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_inventory_movement" DROP CONSTRAINT "tenant_inventory_movement_itemId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_inventory_movement" DROP CONSTRAINT "tenant_inventory_movement_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_invoice" DROP CONSTRAINT "tenant_invoice_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_invoice" DROP CONSTRAINT "tenant_invoice_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_invoice_line_item" DROP CONSTRAINT "tenant_invoice_line_item_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_laundry_job" DROP CONSTRAINT "tenant_laundry_job_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_lead" DROP CONSTRAINT "tenant_lead_messengerIntegrationId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_lead" DROP CONSTRAINT "tenant_lead_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_lead" DROP CONSTRAINT "tenant_lead_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_lead_message" DROP CONSTRAINT "tenant_lead_message_tenantLeadId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_leave_request" DROP CONSTRAINT "tenant_leave_request_staffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_leave_request" DROP CONSTRAINT "tenant_leave_request_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_maintenance_request" DROP CONSTRAINT "tenant_maintenance_request_roomId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_maintenance_request" DROP CONSTRAINT "tenant_maintenance_request_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_messenger_integration" DROP CONSTRAINT "tenant_messenger_integration_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_ot_undertime_entry" DROP CONSTRAINT "tenant_ot_undertime_entry_staffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_ot_undertime_entry" DROP CONSTRAINT "tenant_ot_undertime_entry_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_package" DROP CONSTRAINT "tenant_package_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payment_log" DROP CONSTRAINT "tenant_payment_log_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payment_log" DROP CONSTRAINT "tenant_payment_log_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payment_log" DROP CONSTRAINT "tenant_payment_log_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payroll_item" DROP CONSTRAINT "tenant_payroll_item_payrollRunId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payroll_item" DROP CONSTRAINT "tenant_payroll_item_staffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payroll_item" DROP CONSTRAINT "tenant_payroll_item_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_payroll_run" DROP CONSTRAINT "tenant_payroll_run_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_profile" DROP CONSTRAINT "tenant_profile_appUserId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_reception_request" DROP CONSTRAINT "tenant_reception_request_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_reception_request" DROP CONSTRAINT "tenant_reception_request_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_reception_shift_note" DROP CONSTRAINT "tenant_reception_shift_note_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_reservation" DROP CONSTRAINT "tenant_reservation_roomId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_reservation" DROP CONSTRAINT "tenant_reservation_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_room" DROP CONSTRAINT "tenant_room_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_room_photo" DROP CONSTRAINT "tenant_room_photo_roomId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_schedule_shift" DROP CONSTRAINT "tenant_schedule_shift_staffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_schedule_shift" DROP CONSTRAINT "tenant_schedule_shift_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_service" DROP CONSTRAINT "tenant_service_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_staff_invitation" DROP CONSTRAINT "tenant_staff_invitation_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_staff_profile" DROP CONSTRAINT "tenant_staff_profile_accessRoleId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_staff_profile" DROP CONSTRAINT "tenant_staff_profile_appUserId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_staff_profile" DROP CONSTRAINT "tenant_staff_profile_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_staff_profile" DROP CONSTRAINT "tenant_staff_profile_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_time_log" DROP CONSTRAINT "tenant_time_log_staffProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_time_log" DROP CONSTRAINT "tenant_time_log_tenantProfileId_fkey";

-- DropForeignKey
ALTER TABLE "tenant_transaction_export" DROP CONSTRAINT "tenant_transaction_export_tenantProfileId_fkey";

-- DropIndex
DROP INDEX "app_user_role_idx";

-- AlterTable
ALTER TABLE "app_user" DROP COLUMN "role";

-- DropTable
DROP TABLE "_TenantPackageAmenities";

-- DropTable
DROP TABLE "_TenantPackageRooms";

-- DropTable
DROP TABLE "_TenantPackageServices";

-- DropTable
DROP TABLE "_TenantRoomAmenities";

-- DropTable
DROP TABLE "tenant_access_role";

-- DropTable
DROP TABLE "tenant_amenity";

-- DropTable
DROP TABLE "tenant_department";

-- DropTable
DROP TABLE "tenant_finance_entry";

-- DropTable
DROP TABLE "tenant_folio_charge";

-- DropTable
DROP TABLE "tenant_housekeeping_damage_report";

-- DropTable
DROP TABLE "tenant_housekeeping_room";

-- DropTable
DROP TABLE "tenant_inventory_item";

-- DropTable
DROP TABLE "tenant_inventory_movement";

-- DropTable
DROP TABLE "tenant_invoice";

-- DropTable
DROP TABLE "tenant_invoice_line_item";

-- DropTable
DROP TABLE "tenant_laundry_job";

-- DropTable
DROP TABLE "tenant_lead";

-- DropTable
DROP TABLE "tenant_lead_message";

-- DropTable
DROP TABLE "tenant_leave_request";

-- DropTable
DROP TABLE "tenant_maintenance_request";

-- DropTable
DROP TABLE "tenant_messenger_integration";

-- DropTable
DROP TABLE "tenant_ot_undertime_entry";

-- DropTable
DROP TABLE "tenant_package";

-- DropTable
DROP TABLE "tenant_payment_log";

-- DropTable
DROP TABLE "tenant_payroll_item";

-- DropTable
DROP TABLE "tenant_payroll_run";

-- DropTable
DROP TABLE "tenant_profile";

-- DropTable
DROP TABLE "tenant_reception_request";

-- DropTable
DROP TABLE "tenant_reception_shift_note";

-- DropTable
DROP TABLE "tenant_reservation";

-- DropTable
DROP TABLE "tenant_room";

-- DropTable
DROP TABLE "tenant_room_photo";

-- DropTable
DROP TABLE "tenant_schedule_shift";

-- DropTable
DROP TABLE "tenant_service";

-- DropTable
DROP TABLE "tenant_staff_invitation";

-- DropTable
DROP TABLE "tenant_staff_profile";

-- DropTable
DROP TABLE "tenant_time_log";

-- DropTable
DROP TABLE "tenant_transaction_export";

-- DropEnum
DROP TYPE "TenantAmenityFeeUnit";

-- DropEnum
DROP TYPE "TenantAmenityScope";

-- DropEnum
DROP TYPE "TenantAmenityStatus";

-- DropEnum
DROP TYPE "TenantDepartmentStatus";

-- DropEnum
DROP TYPE "TenantFinanceEntrySource";

-- DropEnum
DROP TYPE "TenantFinanceEntryStatus";

-- DropEnum
DROP TYPE "TenantFinanceEntryType";

-- DropEnum
DROP TYPE "TenantFolioChargeStatus";

-- DropEnum
DROP TYPE "TenantFolioChargeType";

-- DropEnum
DROP TYPE "TenantHousekeepingDamageStatus";

-- DropEnum
DROP TYPE "TenantHousekeepingStatus";

-- DropEnum
DROP TYPE "TenantInventoryMovementType";

-- DropEnum
DROP TYPE "TenantInvoiceReminderCadence";

-- DropEnum
DROP TYPE "TenantInvoiceStatus";

-- DropEnum
DROP TYPE "TenantLaundryPriority";

-- DropEnum
DROP TYPE "TenantLaundryStatus";

-- DropEnum
DROP TYPE "TenantLeadChannel";

-- DropEnum
DROP TYPE "TenantLeadMessageDirection";

-- DropEnum
DROP TYPE "TenantLeadStage";

-- DropEnum
DROP TYPE "TenantLeaveRequestStatus";

-- DropEnum
DROP TYPE "TenantMaintenancePriority";

-- DropEnum
DROP TYPE "TenantMaintenanceRequestStatus";

-- DropEnum
DROP TYPE "TenantOtUndertimeStatus";

-- DropEnum
DROP TYPE "TenantOtUndertimeType";

-- DropEnum
DROP TYPE "TenantPackageStatus";

-- DropEnum
DROP TYPE "TenantPaymentLogStatus";

-- DropEnum
DROP TYPE "TenantPayrollFrequency";

-- DropEnum
DROP TYPE "TenantPayrollPayType";

-- DropEnum
DROP TYPE "TenantPayrollRunStatus";

-- DropEnum
DROP TYPE "TenantReceptionQueueStatus";

-- DropEnum
DROP TYPE "TenantReceptionRequestPriority";

-- DropEnum
DROP TYPE "TenantReceptionRequestStatus";

-- DropEnum
DROP TYPE "TenantReservationStatus";

-- DropEnum
DROP TYPE "TenantRoomSmokingPolicy";

-- DropEnum
DROP TYPE "TenantRoomStatus";

-- DropEnum
DROP TYPE "TenantScheduleShiftStatus";

-- DropEnum
DROP TYPE "TenantServiceBillingType";

-- DropEnum
DROP TYPE "TenantServiceStatus";

-- DropEnum
DROP TYPE "TenantStaffInvitationStatus";

-- DropEnum
DROP TYPE "TenantStaffStatus";

-- DropEnum
DROP TYPE "TenantTimeLogFlag";

-- DropEnum
DROP TYPE "TenantTransactionExportFormat";

-- DropEnum
DROP TYPE "TenantTransactionExportStatus";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "resort_profile" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "resortName" TEXT NOT NULL DEFAULT 'Alrio Private Resort',
    "propertyType" TEXT,
    "fullAddress" TEXT,
    "region" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "barangay" TEXT,
    "phoneNumber" TEXT,
    "website" TEXT,
    "shortDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_messenger_integration" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT,
    "pageAccessToken" TEXT,
    "verifyToken" TEXT,
    "subscribedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_messenger_integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_lead" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "messengerIntegrationId" TEXT,
    "reservationId" TEXT,
    "psid" TEXT NOT NULL,
    "channel" "ResortLeadChannel" NOT NULL DEFAULT 'MESSENGER',
    "guestName" TEXT NOT NULL DEFAULT 'Messenger guest',
    "profilePictureUrl" TEXT,
    "inquiry" TEXT,
    "lastMessage" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Organic',
    "stage" "ResortLeadStage" NOT NULL DEFAULT 'INTAKE',
    "targetDate" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_lead_message" (
    "id" TEXT NOT NULL,
    "resortLeadId" TEXT NOT NULL,
    "metaMessageId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "direction" "ResortLeadMessageDirection" NOT NULL DEFAULT 'INBOUND',
    "text" TEXT,
    "attachments" JSONB,
    "postbackPayload" TEXT,
    "raw" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resort_lead_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_staff_profile" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,
    "departmentId" TEXT,
    "username" TEXT,
    "phoneNumber" TEXT,
    "status" "ResortStaffStatus" NOT NULL DEFAULT 'INVITED',
    "isDepartmentHead" BOOLEAN NOT NULL DEFAULT false,
    "employmentType" TEXT NOT NULL DEFAULT 'Regular',
    "workLocation" TEXT NOT NULL DEFAULT 'Resort Office',
    "basicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "incentives" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leaveDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sssContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "philHealthContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pagIbigContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "withholdingTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_staff_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_access_role" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_access_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_time_log" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "flag" "ResortTimeLogFlag" NOT NULL DEFAULT 'ON_TIME',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_time_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_schedule_shift" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT,
    "shift" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ResortScheduleShiftStatus" NOT NULL DEFAULT 'ASSIGNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_schedule_shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_leave_request" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceDays" INTEGER NOT NULL DEFAULT 0,
    "status" "ResortLeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_leave_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_ot_undertime_entry" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "type" "ResortOtUndertimeType" NOT NULL,
    "hours" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ResortOtUndertimeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_ot_undertime_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_payroll_run" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payPeriod" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "payType" "ResortPayrollPayType" NOT NULL DEFAULT 'REGULAR',
    "frequency" "ResortPayrollFrequency" NOT NULL DEFAULT 'MONTHLY',
    "department" TEXT,
    "notes" TEXT,
    "status" "ResortPayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "includedEmployees" INTEGER NOT NULL DEFAULT 0,
    "excludedEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalBasicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAllowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalIncentives" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOvertimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalGrossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalLeaveDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalUndertimeDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalGovernmentDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalOtherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNetPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerContributions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "options" JSONB,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_payroll_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_payroll_item" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "roleName" TEXT,
    "departmentName" TEXT,
    "employmentType" TEXT,
    "workLocation" TEXT,
    "daysWorked" INTEGER NOT NULL DEFAULT 0,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "absentCount" INTEGER NOT NULL DEFAULT 0,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "regularHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "undertimeHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "basicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "incentives" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leaveDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "undertimeDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "governmentDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_payroll_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_department" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "routing" TEXT,
    "status" "ResortDepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "headStaffProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_staff_invitation" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "message" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "status" "ResortStaffInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_staff_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_amenity" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "description" TEXT,
    "appliesTo" "ResortAmenityScope" NOT NULL DEFAULT 'ROOM_LEVEL',
    "chargeable" BOOLEAN NOT NULL DEFAULT false,
    "feeAmount" TEXT,
    "feeUnit" "ResortAmenityFeeUnit" NOT NULL DEFAULT 'PER_STAY',
    "status" "ResortAmenityStatus" NOT NULL DEFAULT 'ACTIVE',
    "showOnBookingPage" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_room" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "baseRate" TEXT NOT NULL,
    "peakRate" TEXT,
    "extraPersonCharge" TEXT,
    "maxAdults" INTEGER NOT NULL DEFAULT 0,
    "childrenOccupancy" INTEGER NOT NULL DEFAULT 0,
    "bedConfiguration" TEXT NOT NULL,
    "roomSize" TEXT,
    "viewType" TEXT NOT NULL,
    "smokingPolicy" "ResortRoomSmokingPolicy" NOT NULL DEFAULT 'NON_SMOKING',
    "status" "ResortRoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "checkIn" TEXT NOT NULL DEFAULT '14:00:00',
    "checkOut" TEXT NOT NULL DEFAULT '12:00:00',
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "guestNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_room_photo" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resort_room_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_housekeeping_room" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "attendantStaffProfileId" TEXT,
    "status" "ResortHousekeepingStatus" NOT NULL DEFAULT 'VACANT',
    "lastPhotoKey" TEXT,
    "lastPhotoName" TEXT,
    "lastPhotoNote" TEXT,
    "lastPhotoSize" INTEGER,
    "lastPhotoUrl" TEXT,
    "lastPhotoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_housekeeping_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_housekeeping_damage_report" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "photoKey" TEXT,
    "photoName" TEXT,
    "photoNote" TEXT,
    "photoSize" INTEGER,
    "photoUrl" TEXT,
    "status" "ResortHousekeepingDamageStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_housekeeping_damage_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_laundry_job" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guestOrRoom" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "dueTime" TEXT NOT NULL,
    "notes" TEXT,
    "priority" "ResortLaundryPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ResortLaundryStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_laundry_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_reservation" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "rate" TEXT NOT NULL,
    "packageName" TEXT,
    "packagePrice" TEXT,
    "roomsIncluded" INTEGER NOT NULL DEFAULT 1,
    "deposit" TEXT,
    "totalAmount" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "status" "ResortReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "frontDeskStatus" "ResortReceptionQueueStatus",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_reception_request" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "reservationId" TEXT,
    "department" TEXT NOT NULL,
    "roomOrArea" TEXT NOT NULL,
    "priority" "ResortReceptionRequestPriority" NOT NULL DEFAULT 'NORMAL',
    "note" TEXT NOT NULL,
    "status" "ResortReceptionRequestStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_reception_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_reception_shift_note" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_reception_shift_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_maintenance_request" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "roomId" TEXT,
    "code" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "notes" TEXT,
    "forwardedBy" TEXT NOT NULL DEFAULT 'Reception',
    "priority" "ResortMaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ResortMaintenanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_maintenance_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_inventory_item" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "dashboardAlert" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_inventory_movement" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ResortInventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resort_inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_service" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT,
    "baseCharge" TEXT NOT NULL,
    "billingType" "ResortServiceBillingType" NOT NULL DEFAULT 'FIXED_PRICE',
    "duration" TEXT,
    "bookingLeadTime" TEXT,
    "feeNote" TEXT,
    "description" TEXT,
    "internalNotes" TEXT,
    "showOnBookingPage" BOOLEAN NOT NULL DEFAULT true,
    "status" "ResortServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_package" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "compareAtPrice" TEXT,
    "description" TEXT,
    "inclusionsNote" TEXT,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER,
    "showOnBookingPage" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ResortPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_invoice" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "reservationId" TEXT,
    "code" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ResortInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentMethod" TEXT,
    "reminderCadence" "ResortInvoiceReminderCadence" NOT NULL DEFAULT 'STANDARD',
    "paymentInstructions" TEXT,
    "notes" TEXT,
    "subtotal" TEXT NOT NULL,
    "discount" TEXT NOT NULL DEFAULT '0',
    "tax" TEXT NOT NULL DEFAULT '0',
    "depositPaid" TEXT NOT NULL DEFAULT '0',
    "totalAmount" TEXT NOT NULL,
    "balanceDue" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "nextReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_invoice_line_item" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "resort_invoice_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_folio_charge" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "code" TEXT NOT NULL,
    "type" "ResortFolioChargeType" NOT NULL DEFAULT 'ADDITIONAL',
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "ResortFolioChargeStatus" NOT NULL DEFAULT 'UNBILLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_folio_charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_payment_log" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "code" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "proofUrl" TEXT,
    "proofNote" TEXT,
    "status" "ResortPaymentLogStatus" NOT NULL DEFAULT 'RECORDED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resort_payment_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_finance_entry" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ResortFinanceEntryType" NOT NULL,
    "source" "ResortFinanceEntrySource" NOT NULL DEFAULT 'MANUAL',
    "status" "ResortFinanceEntryStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "amount" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "receiptKey" TEXT,
    "receiptName" TEXT,
    "receiptUrl" TEXT,
    "receiptSize" INTEGER,
    "receiptType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_finance_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resort_transaction_export" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "format" "ResortTransactionExportFormat" NOT NULL,
    "status" "ResortTransactionExportStatus" NOT NULL DEFAULT 'READY',
    "size" TEXT NOT NULL DEFAULT '--',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_transaction_export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ResortRoomAmenities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResortRoomAmenities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ResortPackageAmenities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResortPackageAmenities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ResortPackageRooms" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResortPackageRooms_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ResortPackageServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResortPackageServices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "resort_profile_appUserId_key" ON "resort_profile"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "resort_messenger_integration_pageId_key" ON "resort_messenger_integration"("pageId");

-- CreateIndex
CREATE INDEX "resort_messenger_integration_resortProfileId_idx" ON "resort_messenger_integration"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_messenger_integration_isActive_idx" ON "resort_messenger_integration"("isActive");

-- CreateIndex
CREATE INDEX "resort_lead_resortProfileId_idx" ON "resort_lead"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_lead_messengerIntegrationId_idx" ON "resort_lead"("messengerIntegrationId");

-- CreateIndex
CREATE INDEX "resort_lead_reservationId_idx" ON "resort_lead"("reservationId");

-- CreateIndex
CREATE INDEX "resort_lead_stage_idx" ON "resort_lead"("stage");

-- CreateIndex
CREATE INDEX "resort_lead_lastMessageAt_idx" ON "resort_lead"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_lead_resortProfileId_psid_key" ON "resort_lead"("resortProfileId", "psid");

-- CreateIndex
CREATE UNIQUE INDEX "resort_lead_message_metaMessageId_key" ON "resort_lead_message"("metaMessageId");

-- CreateIndex
CREATE INDEX "resort_lead_message_resortLeadId_idx" ON "resort_lead_message"("resortLeadId");

-- CreateIndex
CREATE INDEX "resort_lead_message_senderId_idx" ON "resort_lead_message"("senderId");

-- CreateIndex
CREATE INDEX "resort_lead_message_recipientId_idx" ON "resort_lead_message"("recipientId");

-- CreateIndex
CREATE INDEX "resort_lead_message_sentAt_idx" ON "resort_lead_message"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_staff_profile_appUserId_key" ON "resort_staff_profile"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "resort_staff_profile_username_key" ON "resort_staff_profile"("username");

-- CreateIndex
CREATE INDEX "resort_staff_profile_resortProfileId_idx" ON "resort_staff_profile"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_staff_profile_accessRoleId_idx" ON "resort_staff_profile"("accessRoleId");

-- CreateIndex
CREATE INDEX "resort_staff_profile_departmentId_idx" ON "resort_staff_profile"("departmentId");

-- CreateIndex
CREATE INDEX "resort_staff_profile_status_idx" ON "resort_staff_profile"("status");

-- CreateIndex
CREATE INDEX "resort_access_role_resortProfileId_idx" ON "resort_access_role"("resortProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "resort_access_role_resortProfileId_name_key" ON "resort_access_role"("resortProfileId", "name");

-- CreateIndex
CREATE INDEX "resort_time_log_resortProfileId_idx" ON "resort_time_log"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_time_log_staffProfileId_idx" ON "resort_time_log"("staffProfileId");

-- CreateIndex
CREATE INDEX "resort_time_log_date_idx" ON "resort_time_log"("date");

-- CreateIndex
CREATE INDEX "resort_time_log_flag_idx" ON "resort_time_log"("flag");

-- CreateIndex
CREATE UNIQUE INDEX "resort_time_log_staffProfileId_date_key" ON "resort_time_log"("staffProfileId", "date");

-- CreateIndex
CREATE INDEX "resort_schedule_shift_resortProfileId_idx" ON "resort_schedule_shift"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_schedule_shift_staffProfileId_idx" ON "resort_schedule_shift"("staffProfileId");

-- CreateIndex
CREATE INDEX "resort_schedule_shift_startAt_idx" ON "resort_schedule_shift"("startAt");

-- CreateIndex
CREATE INDEX "resort_schedule_shift_status_idx" ON "resort_schedule_shift"("status");

-- CreateIndex
CREATE INDEX "resort_leave_request_resortProfileId_idx" ON "resort_leave_request"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_leave_request_staffProfileId_idx" ON "resort_leave_request"("staffProfileId");

-- CreateIndex
CREATE INDEX "resort_leave_request_status_idx" ON "resort_leave_request"("status");

-- CreateIndex
CREATE INDEX "resort_leave_request_startDate_idx" ON "resort_leave_request"("startDate");

-- CreateIndex
CREATE INDEX "resort_ot_undertime_entry_resortProfileId_idx" ON "resort_ot_undertime_entry"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_ot_undertime_entry_staffProfileId_idx" ON "resort_ot_undertime_entry"("staffProfileId");

-- CreateIndex
CREATE INDEX "resort_ot_undertime_entry_type_idx" ON "resort_ot_undertime_entry"("type");

-- CreateIndex
CREATE INDEX "resort_ot_undertime_entry_status_idx" ON "resort_ot_undertime_entry"("status");

-- CreateIndex
CREATE INDEX "resort_payroll_run_resortProfileId_idx" ON "resort_payroll_run"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_payroll_run_periodStart_idx" ON "resort_payroll_run"("periodStart");

-- CreateIndex
CREATE INDEX "resort_payroll_run_status_idx" ON "resort_payroll_run"("status");

-- CreateIndex
CREATE UNIQUE INDEX "resort_payroll_run_resortProfileId_code_key" ON "resort_payroll_run"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_payroll_item_resortProfileId_idx" ON "resort_payroll_item"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_payroll_item_staffProfileId_idx" ON "resort_payroll_item"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "resort_payroll_item_payrollRunId_staffProfileId_key" ON "resort_payroll_item"("payrollRunId", "staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "resort_department_headStaffProfileId_key" ON "resort_department"("headStaffProfileId");

-- CreateIndex
CREATE INDEX "resort_department_resortProfileId_idx" ON "resort_department"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_department_status_idx" ON "resort_department"("status");

-- CreateIndex
CREATE UNIQUE INDEX "resort_department_resortProfileId_code_key" ON "resort_department"("resortProfileId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "resort_staff_invitation_tokenHash_key" ON "resort_staff_invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "resort_staff_invitation_resortProfileId_idx" ON "resort_staff_invitation"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_staff_invitation_email_idx" ON "resort_staff_invitation"("email");

-- CreateIndex
CREATE INDEX "resort_staff_invitation_status_idx" ON "resort_staff_invitation"("status");

-- CreateIndex
CREATE INDEX "resort_amenity_resortProfileId_idx" ON "resort_amenity"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_amenity_status_idx" ON "resort_amenity"("status");

-- CreateIndex
CREATE INDEX "resort_amenity_category_idx" ON "resort_amenity"("category");

-- CreateIndex
CREATE UNIQUE INDEX "resort_amenity_resortProfileId_code_key" ON "resort_amenity"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_room_resortProfileId_idx" ON "resort_room"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_room_status_idx" ON "resort_room"("status");

-- CreateIndex
CREATE INDEX "resort_room_type_idx" ON "resort_room"("type");

-- CreateIndex
CREATE UNIQUE INDEX "resort_room_resortProfileId_code_key" ON "resort_room"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_room_photo_roomId_idx" ON "resort_room_photo"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "resort_room_photo_key_key" ON "resort_room_photo"("key");

-- CreateIndex
CREATE UNIQUE INDEX "resort_housekeeping_room_roomId_key" ON "resort_housekeeping_room"("roomId");

-- CreateIndex
CREATE INDEX "resort_housekeeping_room_resortProfileId_idx" ON "resort_housekeeping_room"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_housekeeping_room_attendantStaffProfileId_idx" ON "resort_housekeeping_room"("attendantStaffProfileId");

-- CreateIndex
CREATE INDEX "resort_housekeeping_room_status_idx" ON "resort_housekeeping_room"("status");

-- CreateIndex
CREATE INDEX "resort_housekeeping_damage_report_resortProfileId_idx" ON "resort_housekeeping_damage_report"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_housekeeping_damage_report_roomId_idx" ON "resort_housekeeping_damage_report"("roomId");

-- CreateIndex
CREATE INDEX "resort_housekeeping_damage_report_status_idx" ON "resort_housekeeping_damage_report"("status");

-- CreateIndex
CREATE INDEX "resort_laundry_job_resortProfileId_idx" ON "resort_laundry_job"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_laundry_job_category_idx" ON "resort_laundry_job"("category");

-- CreateIndex
CREATE INDEX "resort_laundry_job_priority_idx" ON "resort_laundry_job"("priority");

-- CreateIndex
CREATE INDEX "resort_laundry_job_status_idx" ON "resort_laundry_job"("status");

-- CreateIndex
CREATE INDEX "resort_laundry_job_receivedAt_idx" ON "resort_laundry_job"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_laundry_job_resortProfileId_code_key" ON "resort_laundry_job"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_reservation_resortProfileId_idx" ON "resort_reservation"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_reservation_roomId_idx" ON "resort_reservation"("roomId");

-- CreateIndex
CREATE INDEX "resort_reservation_status_idx" ON "resort_reservation"("status");

-- CreateIndex
CREATE INDEX "resort_reservation_frontDeskStatus_idx" ON "resort_reservation"("frontDeskStatus");

-- CreateIndex
CREATE INDEX "resort_reservation_checkIn_checkOut_idx" ON "resort_reservation"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "resort_reception_request_resortProfileId_idx" ON "resort_reception_request"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_reception_request_reservationId_idx" ON "resort_reception_request"("reservationId");

-- CreateIndex
CREATE INDEX "resort_reception_request_department_idx" ON "resort_reception_request"("department");

-- CreateIndex
CREATE INDEX "resort_reception_request_status_idx" ON "resort_reception_request"("status");

-- CreateIndex
CREATE INDEX "resort_reception_shift_note_resortProfileId_idx" ON "resort_reception_shift_note"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_reception_shift_note_createdAt_idx" ON "resort_reception_shift_note"("createdAt");

-- CreateIndex
CREATE INDEX "resort_maintenance_request_resortProfileId_idx" ON "resort_maintenance_request"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_maintenance_request_roomId_idx" ON "resort_maintenance_request"("roomId");

-- CreateIndex
CREATE INDEX "resort_maintenance_request_priority_idx" ON "resort_maintenance_request"("priority");

-- CreateIndex
CREATE INDEX "resort_maintenance_request_status_idx" ON "resort_maintenance_request"("status");

-- CreateIndex
CREATE INDEX "resort_maintenance_request_createdAt_idx" ON "resort_maintenance_request"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_maintenance_request_resortProfileId_code_key" ON "resort_maintenance_request"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_inventory_item_resortProfileId_idx" ON "resort_inventory_item"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_inventory_item_category_idx" ON "resort_inventory_item"("category");

-- CreateIndex
CREATE INDEX "resort_inventory_item_name_idx" ON "resort_inventory_item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "resort_inventory_item_resortProfileId_code_key" ON "resort_inventory_item"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_inventory_movement_resortProfileId_idx" ON "resort_inventory_movement"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_inventory_movement_itemId_idx" ON "resort_inventory_movement"("itemId");

-- CreateIndex
CREATE INDEX "resort_inventory_movement_type_idx" ON "resort_inventory_movement"("type");

-- CreateIndex
CREATE INDEX "resort_inventory_movement_createdAt_idx" ON "resort_inventory_movement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_inventory_movement_resortProfileId_code_key" ON "resort_inventory_movement"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_service_resortProfileId_idx" ON "resort_service"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_service_status_idx" ON "resort_service"("status");

-- CreateIndex
CREATE INDEX "resort_service_category_idx" ON "resort_service"("category");

-- CreateIndex
CREATE UNIQUE INDEX "resort_service_resortProfileId_code_key" ON "resort_service"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_package_resortProfileId_idx" ON "resort_package"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_package_status_idx" ON "resort_package"("status");

-- CreateIndex
CREATE INDEX "resort_package_category_idx" ON "resort_package"("category");

-- CreateIndex
CREATE INDEX "resort_package_sortOrder_idx" ON "resort_package"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "resort_package_resortProfileId_code_key" ON "resort_package"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_invoice_resortProfileId_idx" ON "resort_invoice"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_invoice_reservationId_idx" ON "resort_invoice"("reservationId");

-- CreateIndex
CREATE INDEX "resort_invoice_status_idx" ON "resort_invoice"("status");

-- CreateIndex
CREATE INDEX "resort_invoice_dueDate_idx" ON "resort_invoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "resort_invoice_resortProfileId_code_key" ON "resort_invoice"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_invoice_line_item_invoiceId_idx" ON "resort_invoice_line_item"("invoiceId");

-- CreateIndex
CREATE INDEX "resort_folio_charge_resortProfileId_idx" ON "resort_folio_charge"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_folio_charge_reservationId_idx" ON "resort_folio_charge"("reservationId");

-- CreateIndex
CREATE INDEX "resort_folio_charge_invoiceId_idx" ON "resort_folio_charge"("invoiceId");

-- CreateIndex
CREATE INDEX "resort_folio_charge_status_idx" ON "resort_folio_charge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "resort_folio_charge_resortProfileId_code_key" ON "resort_folio_charge"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_payment_log_resortProfileId_idx" ON "resort_payment_log"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_payment_log_reservationId_idx" ON "resort_payment_log"("reservationId");

-- CreateIndex
CREATE INDEX "resort_payment_log_invoiceId_idx" ON "resort_payment_log"("invoiceId");

-- CreateIndex
CREATE INDEX "resort_payment_log_status_idx" ON "resort_payment_log"("status");

-- CreateIndex
CREATE INDEX "resort_payment_log_paidAt_idx" ON "resort_payment_log"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_payment_log_resortProfileId_code_key" ON "resort_payment_log"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_finance_entry_resortProfileId_idx" ON "resort_finance_entry"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_finance_entry_type_idx" ON "resort_finance_entry"("type");

-- CreateIndex
CREATE INDEX "resort_finance_entry_status_idx" ON "resort_finance_entry"("status");

-- CreateIndex
CREATE INDEX "resort_finance_entry_entryDate_idx" ON "resort_finance_entry"("entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "resort_finance_entry_resortProfileId_code_key" ON "resort_finance_entry"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "resort_transaction_export_resortProfileId_idx" ON "resort_transaction_export"("resortProfileId");

-- CreateIndex
CREATE INDEX "resort_transaction_export_status_idx" ON "resort_transaction_export"("status");

-- CreateIndex
CREATE INDEX "resort_transaction_export_createdAt_idx" ON "resort_transaction_export"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "resort_transaction_export_resortProfileId_code_key" ON "resort_transaction_export"("resortProfileId", "code");

-- CreateIndex
CREATE INDEX "_ResortRoomAmenities_B_index" ON "_ResortRoomAmenities"("B");

-- CreateIndex
CREATE INDEX "_ResortPackageAmenities_B_index" ON "_ResortPackageAmenities"("B");

-- CreateIndex
CREATE INDEX "_ResortPackageRooms_B_index" ON "_ResortPackageRooms"("B");

-- CreateIndex
CREATE INDEX "_ResortPackageServices_B_index" ON "_ResortPackageServices"("B");

-- AddForeignKey
ALTER TABLE "resort_profile" ADD CONSTRAINT "resort_profile_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_user"("authUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_messenger_integration" ADD CONSTRAINT "resort_messenger_integration_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_lead" ADD CONSTRAINT "resort_lead_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_lead" ADD CONSTRAINT "resort_lead_messengerIntegrationId_fkey" FOREIGN KEY ("messengerIntegrationId") REFERENCES "resort_messenger_integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_lead" ADD CONSTRAINT "resort_lead_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "resort_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_lead_message" ADD CONSTRAINT "resort_lead_message_resortLeadId_fkey" FOREIGN KEY ("resortLeadId") REFERENCES "resort_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_staff_profile" ADD CONSTRAINT "resort_staff_profile_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_staff_profile" ADD CONSTRAINT "resort_staff_profile_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "resort_access_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_staff_profile" ADD CONSTRAINT "resort_staff_profile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "resort_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_staff_profile" ADD CONSTRAINT "resort_staff_profile_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_user"("authUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_access_role" ADD CONSTRAINT "resort_access_role_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_time_log" ADD CONSTRAINT "resort_time_log_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_time_log" ADD CONSTRAINT "resort_time_log_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_schedule_shift" ADD CONSTRAINT "resort_schedule_shift_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_schedule_shift" ADD CONSTRAINT "resort_schedule_shift_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_leave_request" ADD CONSTRAINT "resort_leave_request_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_leave_request" ADD CONSTRAINT "resort_leave_request_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_ot_undertime_entry" ADD CONSTRAINT "resort_ot_undertime_entry_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_ot_undertime_entry" ADD CONSTRAINT "resort_ot_undertime_entry_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payroll_run" ADD CONSTRAINT "resort_payroll_run_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payroll_item" ADD CONSTRAINT "resort_payroll_item_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "resort_payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payroll_item" ADD CONSTRAINT "resort_payroll_item_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payroll_item" ADD CONSTRAINT "resort_payroll_item_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_department" ADD CONSTRAINT "resort_department_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_department" ADD CONSTRAINT "resort_department_headStaffProfileId_fkey" FOREIGN KEY ("headStaffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_staff_invitation" ADD CONSTRAINT "resort_staff_invitation_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_amenity" ADD CONSTRAINT "resort_amenity_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_room" ADD CONSTRAINT "resort_room_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_room_photo" ADD CONSTRAINT "resort_room_photo_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "resort_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_housekeeping_room" ADD CONSTRAINT "resort_housekeeping_room_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_housekeeping_room" ADD CONSTRAINT "resort_housekeeping_room_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "resort_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_housekeeping_room" ADD CONSTRAINT "resort_housekeeping_room_attendantStaffProfileId_fkey" FOREIGN KEY ("attendantStaffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_housekeeping_damage_report" ADD CONSTRAINT "resort_housekeeping_damage_report_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_housekeeping_damage_report" ADD CONSTRAINT "resort_housekeeping_damage_report_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "resort_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_laundry_job" ADD CONSTRAINT "resort_laundry_job_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_reservation" ADD CONSTRAINT "resort_reservation_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_reservation" ADD CONSTRAINT "resort_reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "resort_room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_reception_request" ADD CONSTRAINT "resort_reception_request_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_reception_request" ADD CONSTRAINT "resort_reception_request_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "resort_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_reception_shift_note" ADD CONSTRAINT "resort_reception_shift_note_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_maintenance_request" ADD CONSTRAINT "resort_maintenance_request_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_maintenance_request" ADD CONSTRAINT "resort_maintenance_request_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "resort_room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_inventory_item" ADD CONSTRAINT "resort_inventory_item_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_inventory_movement" ADD CONSTRAINT "resort_inventory_movement_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_inventory_movement" ADD CONSTRAINT "resort_inventory_movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "resort_inventory_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_service" ADD CONSTRAINT "resort_service_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_package" ADD CONSTRAINT "resort_package_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_invoice" ADD CONSTRAINT "resort_invoice_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_invoice" ADD CONSTRAINT "resort_invoice_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "resort_reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_invoice_line_item" ADD CONSTRAINT "resort_invoice_line_item_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "resort_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_folio_charge" ADD CONSTRAINT "resort_folio_charge_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_folio_charge" ADD CONSTRAINT "resort_folio_charge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "resort_reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_folio_charge" ADD CONSTRAINT "resort_folio_charge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "resort_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payment_log" ADD CONSTRAINT "resort_payment_log_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payment_log" ADD CONSTRAINT "resort_payment_log_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "resort_reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_payment_log" ADD CONSTRAINT "resort_payment_log_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "resort_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_finance_entry" ADD CONSTRAINT "resort_finance_entry_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_transaction_export" ADD CONSTRAINT "resort_transaction_export_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortRoomAmenities" ADD CONSTRAINT "_ResortRoomAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "resort_amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortRoomAmenities" ADD CONSTRAINT "_ResortRoomAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "resort_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortPackageAmenities" ADD CONSTRAINT "_ResortPackageAmenities_A_fkey" FOREIGN KEY ("A") REFERENCES "resort_amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortPackageAmenities" ADD CONSTRAINT "_ResortPackageAmenities_B_fkey" FOREIGN KEY ("B") REFERENCES "resort_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortPackageRooms" ADD CONSTRAINT "_ResortPackageRooms_A_fkey" FOREIGN KEY ("A") REFERENCES "resort_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortPackageRooms" ADD CONSTRAINT "_ResortPackageRooms_B_fkey" FOREIGN KEY ("B") REFERENCES "resort_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortPackageServices" ADD CONSTRAINT "_ResortPackageServices_A_fkey" FOREIGN KEY ("A") REFERENCES "resort_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResortPackageServices" ADD CONSTRAINT "_ResortPackageServices_B_fkey" FOREIGN KEY ("B") REFERENCES "resort_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
