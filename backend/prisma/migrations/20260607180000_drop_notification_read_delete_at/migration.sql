-- DropIndex
DROP INDEX "Notification_receiverId_readAt_idx";

-- DropIndex
DROP INDEX "Notification_deleteAt_idx";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "readAt",
DROP COLUMN "deleteAt";
