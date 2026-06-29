-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ninio" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "age" INTEGER NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Ninio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicacion" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "horarios" TEXT NOT NULL,
    "dias" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracker" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sleep" DOUBLE PRECISION NOT NULL,
    "wakeUps" INTEGER NOT NULL,
    "sleepQuality" TEXT NOT NULL,
    "moods" TEXT[],
    "energy" TEXT NOT NULL,
    "hasCrisis" BOOLEAN NOT NULL,
    "crisisTypes" TEXT[],
    "otherType" TEXT,
    "startTime" TEXT,
    "durationHrs" INTEGER,
    "durationMin" INTEGER,
    "durationSec" INTEGER,
    "triggers" TEXT,
    "feedQuality" TEXT NOT NULL,
    "hasRejection" BOOLEAN NOT NULL,
    "rejectedMeals" TEXT[],
    "mealNote" TEXT,
    "bowelCount" INTEGER NOT NULL,
    "bristolTypes" TEXT[],
    "tookAllMeds" BOOLEAN NOT NULL,
    "missedMedIds" TEXT[],
    "doseAltered" BOOLEAN NOT NULL,
    "alteredMedId" TEXT,
    "actualDose" TEXT,
    "hadTherapy" BOOLEAN NOT NULL,
    "therapyDetail" TEXT,
    "attention" TEXT NOT NULL,
    "achievements" TEXT,
    "hasBehaviorIssue" BOOLEAN NOT NULL,
    "behaviorDetail" TEXT,
    "regulation" TEXT,
    "notes" TEXT,

    CONSTRAINT "Tracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crisis" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "durationSec" INTEGER,

    CONSTRAINT "Crisis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_ninioId_date_key" ON "Tracker"("ninioId", "date");

-- AddForeignKey
ALTER TABLE "Ninio" ADD CONSTRAINT "Ninio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicacion" ADD CONSTRAINT "Medicacion_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crisis" ADD CONSTRAINT "Crisis_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
