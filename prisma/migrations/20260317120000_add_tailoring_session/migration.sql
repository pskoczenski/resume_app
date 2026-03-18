-- CreateTable
CREATE TABLE "TailoringSession" (
    "id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "job_description_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "analysis_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TailoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TailoringSession_resume_id_idx" ON "TailoringSession"("resume_id");

-- CreateIndex
CREATE INDEX "TailoringSession_job_description_id_idx" ON "TailoringSession"("job_description_id");

-- AddForeignKey
ALTER TABLE "TailoringSession" ADD CONSTRAINT "TailoringSession_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailoringSession" ADD CONSTRAINT "TailoringSession_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

