-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "refusalCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN "alertReturnRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "StoreSetting" ADD COLUMN "alertCancelRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "StoreSetting" ADD COLUMN "alertUnprocessedOrdersMin" INTEGER NOT NULL DEFAULT 25;

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('ADS', 'PURCHASE', 'SHIPPING', 'OTHER');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_storeId_idx" ON "Expense"("storeId");

-- CreateIndex
CREATE INDEX "Expense_storeId_createdAt_idx" ON "Expense"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
