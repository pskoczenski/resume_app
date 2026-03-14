-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "parsed_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);
