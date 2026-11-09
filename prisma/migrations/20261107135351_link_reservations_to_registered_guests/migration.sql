-- AlterTable
ALTER TABLE "resort_reservation" ADD COLUMN     "guestAccountId" TEXT;

-- CreateIndex
CREATE INDEX "resort_reservation_guestAccountId_idx" ON "resort_reservation"("guestAccountId");

-- AddForeignKey
ALTER TABLE "resort_reservation" ADD CONSTRAINT "resort_reservation_guestAccountId_fkey" FOREIGN KEY ("guestAccountId") REFERENCES "app_user"("authUserId") ON DELETE SET NULL ON UPDATE CASCADE;
