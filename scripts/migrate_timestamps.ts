import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "status_updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);
  console.log("✅ Tables altered directly in Supabase.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
