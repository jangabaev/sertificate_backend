-- CreateTable
CREATE TABLE "ExamResult" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "examId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamResult_userId_idx" ON "ExamResult"("userId");

-- CreateIndex
CREATE INDEX "ExamResult_examId_idx" ON "ExamResult"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamResult_userId_examId_key" ON "ExamResult"("userId", "examId");
