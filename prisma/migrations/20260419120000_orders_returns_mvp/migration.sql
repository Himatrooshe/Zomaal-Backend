-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN "duplicateOrderWindowMinutes" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "StoreSetting" ADD COLUMN "delayedOrderThresholdDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "Return" DROP CONSTRAINT "Return_orderId_fkey";
ALTER TABLE "Return" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "Return" ADD COLUMN "scanMetadata" JSONB;
ALTER TABLE "Return" ADD CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
