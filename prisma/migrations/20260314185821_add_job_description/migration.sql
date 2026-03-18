-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "requirements_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);
