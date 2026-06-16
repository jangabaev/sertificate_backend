-- DropIndex
DROP INDEX "Test_status_key";

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "rash" JSONB NOT NULL DEFAULT '{}';
