-- CreateTable
CREATE TABLE "SensoryLog" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT,
    "context" TEXT NOT NULL,
    "stimulus" TEXT[],
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospitalizacion" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "motivo" TEXT NOT NULL,
    "hospital" TEXT,
    "medicosInvolucrados" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospitalizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjetivoTerapeutico" (
    "id" TEXT NOT NULL,
    "ninioId" TEXT NOT NULL,
    "terapiaNombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fechaInicio" TEXT NOT NULL,
    "fechaLogro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjetivoTerapeutico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SensoryLog" ADD CONSTRAINT "SensoryLog_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalizacion" ADD CONSTRAINT "Hospitalizacion_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjetivoTerapeutico" ADD CONSTRAINT "ObjetivoTerapeutico_ninioId_fkey" FOREIGN KEY ("ninioId") REFERENCES "Ninio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
