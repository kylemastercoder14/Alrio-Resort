-- DropForeignKey
ALTER TABLE "resort_reservation" DROP CONSTRAINT "resort_reservation_roomId_fkey";

-- AlterTable
ALTER TABLE "resort_reservation" ALTER COLUMN "roomId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "resort_reservation" ADD CONSTRAINT "resort_reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "resort_room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
