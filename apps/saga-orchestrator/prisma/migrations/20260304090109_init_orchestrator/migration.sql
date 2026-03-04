/*
  Warnings:

  - The primary key for the `ProcessedEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[eventId]` on the table `ProcessedEvent` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `ProcessedEvent` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "ProcessedEvent" DROP CONSTRAINT "ProcessedEvent_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEvent_eventId_key" ON "ProcessedEvent"("eventId");
