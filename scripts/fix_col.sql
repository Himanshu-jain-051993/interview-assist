-- Step 1: Drop old column and add with correct dimension
ALTER TABLE "Role" DROP COLUMN IF EXISTS "content_embedding";
ALTER TABLE "Role" ADD COLUMN "content_embedding" vector(3072);
