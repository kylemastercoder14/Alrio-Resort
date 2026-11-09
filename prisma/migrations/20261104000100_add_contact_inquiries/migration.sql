CREATE TABLE "resort_contact_inquiry" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resort_contact_inquiry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "resort_contact_inquiry_resortProfileId_createdAt_idx" ON "resort_contact_inquiry"("resortProfileId", "createdAt");
CREATE INDEX "resort_contact_inquiry_email_createdAt_idx" ON "resort_contact_inquiry"("email", "createdAt");
ALTER TABLE "resort_contact_inquiry" ADD CONSTRAINT "resort_contact_inquiry_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
