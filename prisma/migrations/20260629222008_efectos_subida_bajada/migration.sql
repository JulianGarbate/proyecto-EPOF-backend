/*
  Warnings:

  - You are about to drop the column `efectosAlteracion` on the `Medicacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Medicacion" DROP COLUMN "efectosAlteracion",
ADD COLUMN     "efectosBajada" TEXT,
ADD COLUMN     "efectosSubida" TEXT;

-- AlterTable
ALTER TABLE "Tracker" ADD COLUMN     "direccionAlteracion" TEXT;
