-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TUTOR', 'CUIDADOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'TUTOR';

