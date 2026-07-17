-- AlterTable
ALTER TABLE "Medicacion" ADD COLUMN     "stockQuantity" INTEGER,
ADD COLUMN     "stockUnit" TEXT;

-- AlterTable
ALTER TABLE "Tracker" ADD COLUMN     "achievementSpontaneous" BOOLEAN,
ADD COLUMN     "achievementStimulus" TEXT,
ADD COLUMN     "achievementTime" TEXT,
ADD COLUMN     "naps" JSONB,
ADD COLUMN     "sleepEnd" TEXT,
ADD COLUMN     "sleepStart" TEXT,
ADD COLUMN     "wakeUpTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
