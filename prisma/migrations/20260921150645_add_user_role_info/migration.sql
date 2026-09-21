-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CEO', 'MEMBER', 'TEACHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "info" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER';
