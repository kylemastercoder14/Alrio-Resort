CREATE TABLE "resort_landing_branding" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedByAuthUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_landing_branding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resort_landing_branding_resortProfileId_key" ON "resort_landing_branding"("resortProfileId");

ALTER TABLE "resort_landing_branding"
  ADD CONSTRAINT "resort_landing_branding_resortProfileId_fkey"
  FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "resort_access_role"
SET "permissions" = array_append("permissions", 'settings.branding.manage')
WHERE NOT ('settings.branding.manage' = ANY("permissions"))
  AND ('settings.developer.manage' = ANY("permissions") OR '*' = ANY("permissions"));
