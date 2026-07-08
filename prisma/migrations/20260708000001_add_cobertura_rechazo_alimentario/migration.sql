-- Add cobertura médica and nro asociado to Ninio profile
ALTER TABLE "Ninio" ADD COLUMN IF NOT EXISTS "coberturaMedica" TEXT;
ALTER TABLE "Ninio" ADD COLUMN IF NOT EXISTS "nroAsociado" TEXT;

-- Add rejection detail fields to Tracker
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "rejectedItems" TEXT;
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "managedToEat" TEXT;
