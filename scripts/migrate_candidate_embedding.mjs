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

  console.log("Adding content_embedding column to Candidate table...");
  try {
    await client.query('ALTER TABLE "Candidate" ADD COLUMN "content_embedding" vector(3072)');
    console.log("  Done.");
  } catch (e) {
    console.log("  Column might already exist:", e.message);
  }

  console.log("Schema update complete!");
  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
