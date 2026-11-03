-- CreateTable
CREATE TABLE "polar_webhook_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tenantProfileId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polar_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "polar_webhook_event_tenantProfileId_idx" ON "polar_webhook_event"("tenantProfileId");

-- AddForeignKey
ALTER TABLE "polar_webhook_event" ADD CONSTRAINT "polar_webhook_event_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "tenant_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
