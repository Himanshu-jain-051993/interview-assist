-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN "content_embedding" vector(3072),
ADD COLUMN "full_jd_text" TEXT,
ADD COLUMN "metadata" JSONB;
