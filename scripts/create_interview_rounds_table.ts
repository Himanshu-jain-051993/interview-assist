import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InterviewRound" (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      candidate_id      TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
      role_id           TEXT NOT NULL REFERENCES "Role"(id) ON DELETE CASCADE,
      round_type        TEXT NOT NULL,
      transcript_text   TEXT,
      interviewer_notes TEXT,
      ai_feedback_json  JSONB,
      cumulative_score  DOUBLE PRECISION,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✅ InterviewRound table created/verified.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
