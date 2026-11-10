CREATE TABLE "resort_developer_setting" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "initializationVector" TEXT NOT NULL,
    "authenticationTag" TEXT NOT NULL,
    "updatedByAuthUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resort_developer_setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resort_developer_setting_resortProfileId_key_key" ON "resort_developer_setting"("resortProfileId", "key");
CREATE INDEX "resort_developer_setting_resortProfileId_idx" ON "resort_developer_setting"("resortProfileId");

ALTER TABLE "resort_developer_setting"
  ADD CONSTRAINT "resort_developer_setting_resortProfileId_fkey"
  FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
