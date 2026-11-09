-- Remove ResortCloud subscription, billing, and tenant onboarding state.
-- This application is dedicated to Alrio Private Resort.
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'CUSTOMER');
ALTER TABLE "app_user" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

ALTER TABLE "polar_webhook_event" DROP CONSTRAINT "polar_webhook_event_tenantProfileId_fkey";

ALTER TABLE "tenant_profile"
  DROP COLUMN "billingAddress",
  DROP COLUMN "billingCity",
  DROP COLUMN "billingCountry",
  DROP COLUMN "billingCycle",
  DROP COLUMN "billingEmail",
  DROP COLUMN "billingPhoneCountryCode",
  DROP COLUMN "billingPhoneNumber",
  DROP COLUMN "billingPostalCode",
  DROP COLUMN "billingStateProvince",
  DROP COLUMN "businessName",
  DROP COLUMN "cardBrand",
  DROP COLUMN "cardExpiry",
  DROP COLUMN "cardLastFour",
  DROP COLUMN "cardholderName",
  DROP COLUMN "currentPeriodEnd",
  DROP COLUMN "onboardingCompletedAt",
  DROP COLUMN "onboardingCurrentStep",
  DROP COLUMN "onboardingStatus",
  DROP COLUMN "paymentAccountName",
  DROP COLUMN "paymentAccountNumber",
  DROP COLUMN "paymentMethod",
  DROP COLUMN "paymentProvider",
  DROP COLUMN "polarCustomerId",
  DROP COLUMN "polarProductId",
  DROP COLUMN "polarSubscriptionId",
  DROP COLUMN "stripeCustomerId",
  DROP COLUMN "stripeSubscriptionId",
  DROP COLUMN "subscriptionPlan",
  DROP COLUMN "subscriptionStatus",
  DROP COLUMN "suspendedAt",
  DROP COLUMN "trialEndsAt",
  DROP COLUMN "trialStartedAt",
  ALTER COLUMN "resortName" SET NOT NULL,
  ALTER COLUMN "resortName" SET DEFAULT 'Alrio Private Resort';

DROP TABLE "polar_webhook_event";
DROP TYPE "TenantBillingCycle";
DROP TYPE "TenantOnboardingStatus";
DROP TYPE "TenantPaymentAccountType";
DROP TYPE "TenantPaymentMethod";
DROP TYPE "TenantSubscriptionPlan";
DROP TYPE "TenantSubscriptionStatus";
