-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,
    "suggested_text" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "jd_mapping" JSONB,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_session_id_idx" ON "Suggestion"("session_id");

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "TailoringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

