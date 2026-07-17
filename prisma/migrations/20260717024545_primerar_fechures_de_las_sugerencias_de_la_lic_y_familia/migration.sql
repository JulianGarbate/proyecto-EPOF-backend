/*
  Warnings:

  - You are about to drop the column `diagnostico` on the `Ninio` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[shareToken]` on the table `Ninio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Medicacion" ADD COLUMN     "efectosMantenida" TEXT;

-- AlterTable
ALTER TABLE "Ninio" DROP COLUMN "diagnostico",
ADD COLUMN     "alertMinutes" INTEGER,
ADD COLUMN     "ambulanceMinutes" INTEGER,
ADD COLUMN     "diagnosticos" TEXT[],
ADD COLUMN     "emergencyPhone" TEXT,
ADD COLUMN     "rescueDose" TEXT,
ADD COLUMN     "rescueMed" TEXT,
ADD COLUMN     "shareToken" TEXT;

-- AlterTable
ALTER TABLE "Tracker" ADD COLUMN     "crises" JSONB,
ADD COLUMN     "crisisSeverity" TEXT,
ADD COLUMN     "requiredER" BOOLEAN,
ADD COLUMN     "requiredRescue" BOOLEAN;

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "doctor" TEXT NOT NULL,
    "specialty" TEXT,
    "summary" TEXT NOT NULL,
    "indications" TEXT,
    "nextDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ninio_shareToken_key" ON "Ninio"("shareToken");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
