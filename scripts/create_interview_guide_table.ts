import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InterviewGuide" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      candidate_id TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
      guide_data JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(candidate_id, role_id)
    )
  `);
  console.log("InterviewGuide table created/verified.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
