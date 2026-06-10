/*
  Warnings:

  - You are about to drop the column `test` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "test",
ADD COLUMN     "tests" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "last_name" SET DATA TYPE TEXT;
