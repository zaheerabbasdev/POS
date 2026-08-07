-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "is_cancelled" BOOLEAN NOT NULL DEFAULT false;
