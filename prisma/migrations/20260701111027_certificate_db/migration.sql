-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "type" "TestType" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0;
