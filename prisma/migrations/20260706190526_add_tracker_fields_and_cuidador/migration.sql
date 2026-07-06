-- AlterTable
ALTER TABLE "Tracker" ADD COLUMN     "activities" TEXT[],
ADD COLUMN     "intercurrencias" TEXT[],
ADD COLUMN     "intercurrenciasNote" TEXT,
ADD COLUMN     "therapyTypes" TEXT[];

-- CreateTable
CREATE TABLE "CuidadorNinio" (
    "id" TEXT NOT NULL,
    "cuidadorId" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "inviteToken" TEXT,
    "inviteEmail" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuidadorNinio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuidadorNinio_inviteToken_key" ON "CuidadorNinio"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "CuidadorNinio_cuidadorId_ninioId_key" ON "CuidadorNinio"("cuidadorId", "ninioId");

-- AddForeignKey
ALTER TABLE "CuidadorNinio" ADD CONSTRAINT "CuidadorNinio_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuidadorNinio" ADD CONSTRAINT "CuidadorNinio_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

