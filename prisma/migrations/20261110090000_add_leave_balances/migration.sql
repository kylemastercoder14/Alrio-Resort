CREATE TABLE "resort_leave_policy" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "annualEntitlement" INTEGER NOT NULL DEFAULT 0,
    "carryOverLimit" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_leave_policy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resort_leave_balance" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "leavePolicyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "openingDays" INTEGER NOT NULL DEFAULT 0,
    "allocatedDays" INTEGER NOT NULL DEFAULT 0,
    "adjustmentDays" INTEGER NOT NULL DEFAULT 0,
    "usedDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_leave_balance_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "resort_leave_request" ADD COLUMN "leavePolicyId" TEXT;

CREATE UNIQUE INDEX "resort_leave_policy_resortProfileId_name_key" ON "resort_leave_policy"("resortProfileId", "name");
CREATE INDEX "resort_leave_policy_resortProfileId_isActive_idx" ON "resort_leave_policy"("resortProfileId", "isActive");
CREATE UNIQUE INDEX "resort_leave_balance_staffProfileId_leavePolicyId_year_key" ON "resort_leave_balance"("staffProfileId", "leavePolicyId", "year");
CREATE INDEX "resort_leave_balance_resortProfileId_year_idx" ON "resort_leave_balance"("resortProfileId", "year");
CREATE INDEX "resort_leave_balance_leavePolicyId_idx" ON "resort_leave_balance"("leavePolicyId");
CREATE INDEX "resort_leave_request_leavePolicyId_idx" ON "resort_leave_request"("leavePolicyId");

ALTER TABLE "resort_leave_policy"
  ADD CONSTRAINT "resort_leave_policy_resortProfileId_fkey"
  FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resort_leave_balance"
  ADD CONSTRAINT "resort_leave_balance_resortProfileId_fkey"
  FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "resort_leave_balance_staffProfileId_fkey"
  FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "resort_leave_balance_leavePolicyId_fkey"
  FOREIGN KEY ("leavePolicyId") REFERENCES "resort_leave_policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resort_leave_request"
  ADD CONSTRAINT "resort_leave_request_leavePolicyId_fkey"
  FOREIGN KEY ("leavePolicyId") REFERENCES "resort_leave_policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
