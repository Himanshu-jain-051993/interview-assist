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
  console.log("Connected!");

  // 1. Add profile_data column to Candidate if missing
  console.log("Checking for profile_data column in Candidate table...");
  const colCheck = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'Candidate' AND column_name = 'profile_data'
  `);
  
  if (colCheck.rows.length === 0) {
    console.log("Adding profile_data column...");
    await client.query('ALTER TABLE "Candidate" ADD COLUMN "profile_data" JSONB');
  } else {
    console.log("profile_data column already exists.");
  }

  // 2. Add unique constraint to email if missing
  console.log("Checking for unique constraint on email in Candidate table...");
  const constCheck = await client.query(`
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'Candidate' AND constraint_type = 'UNIQUE'
  `);
  
  if (!constCheck.rows.some(r => r.constraint_name.includes('email'))) {
    console.log("Adding unique constraint to email...");
    // We use a DO block to handle cases where it might already exist with a different name
    try {
      await client.query('ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_email_key" UNIQUE ("email")');
    } catch (e) {
      console.log("Could not add unique constraint (maybe it already exists?):", e.message);
    }
  } else {
    console.log("Unique email constraint already exists.");
  }

  console.log("Schema update for Candidate complete!");
  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
