-- CreateTable
CREATE TABLE "resort_staff_activity_log" (
    "id" TEXT NOT NULL,
    "resortProfileId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "actorAuthUserId" TEXT,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resort_staff_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resort_staff_activity_log_staffProfileId_createdAt_idx" ON "resort_staff_activity_log"("staffProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "resort_staff_activity_log_resortProfileId_createdAt_idx" ON "resort_staff_activity_log"("resortProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "resort_staff_activity_log" ADD CONSTRAINT "resort_staff_activity_log_resortProfileId_fkey" FOREIGN KEY ("resortProfileId") REFERENCES "resort_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resort_staff_activity_log" ADD CONSTRAINT "resort_staff_activity_log_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "resort_staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve currently available Better Auth session history as the first real
-- sign-in entries. Deleted sessions cannot be reconstructed and are not faked.
INSERT INTO "resort_staff_activity_log" (
    "id",
    "resortProfileId",
    "staffProfileId",
    "actorAuthUserId",
    "action",
    "title",
    "detail",
    "ipAddress",
    "userAgent",
    "metadata",
    "createdAt"
)
SELECT
    'session:' || session."id",
    staff."resortProfileId",
    staff."id",
    session."userId",
    'SIGNED_IN',
    'Signed in',
    'Signed in to the Alrio staff workspace.',
    session."ipAddress",
    session."userAgent",
    jsonb_build_object('sessionId', session."id", 'imported', true),
    session."createdAt"
FROM "session" AS session
INNER JOIN "resort_staff_profile" AS staff
    ON staff."appUserId" = session."userId"
ON CONFLICT ("id") DO NOTHING;
