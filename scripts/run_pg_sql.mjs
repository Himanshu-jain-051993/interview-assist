import pg from "pg";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

const url = process.env.DATABASE_URL;
const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@/);
const user = matches[1];
const pass = decodeURIComponent(matches[2]);

const client = new Client({
  user,
  password: pass,
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log("Connected!");

  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Usage: node run_pg_sql.mjs <file.sql>");
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, "utf8");

  // Split on semicolons at end-of-line
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  console.log(`Running ${statements.length} statement(s) from ${sqlFile}...`);
  for (let i = 0; i < statements.length; i++) {
    process.stdout.write(`  [${i + 1}/${statements.length}] `);
    await client.query(statements[i]);
    process.stdout.write(`done\n`);
  }

  console.log("All statements executed successfully!");
  await client.end();
}

main().catch(err => {
  console.error("Error:", err.message);
  if (err.detail) console.error("Detail:", err.detail);
  process.exit(1);
});
