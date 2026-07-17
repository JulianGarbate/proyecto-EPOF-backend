-- AlterTable
ALTER TABLE "Ninio" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bowelAlertDays" INTEGER,
ADD COLUMN     "emergencyToken" TEXT;

-- AlterTable
ALTER TABLE "Tracker" ADD COLUMN     "therapyNotes" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Ninio_emergencyToken_key" ON "Ninio"("emergencyToken");
