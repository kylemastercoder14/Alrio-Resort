-- Persist the operational effects of a payroll finalization instead of only
-- storing the selected generation options in JSON.
CREATE TYPE "ResortPayrollPaymentStatus" AS ENUM ('UNPAID', 'PAID');

ALTER TABLE "resort_payroll_run"
  ADD COLUMN "backupSnapshot" JSONB,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "finalizedBy" TEXT,
  ADD COLUMN "payslipNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "paymentStatus" "ResortPayrollPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "paidBy" TEXT,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "journalEntryId" TEXT;

CREATE INDEX "resort_payroll_run_paymentStatus_idx" ON "resort_payroll_run"("paymentStatus");
