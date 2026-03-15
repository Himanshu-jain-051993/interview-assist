import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
const url = process.env.DATABASE_URL;
const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@/);
const user = matches[1];
const pass = decodeURIComponent(matches[2]);

const client = new Client({
  user, password: pass,
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "InterviewerNote" (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      candidate_id  TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
      file_name     TEXT NOT NULL,
      raw_text      TEXT NOT NULL,
      uploaded_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("InterviewerNote table created (or already exists).");
  await client.end();
}

main().catch(console.error);
