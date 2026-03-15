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

  const roles = await client.query(`SELECT id, title, category, (content_embedding IS NOT NULL) as has_embedding FROM "Role" ORDER BY created_at DESC`);
  console.log(`\n📊 Role rows in DB: ${roles.rows.length}`);
  roles.rows.forEach(r => console.log(`  - ${r.title} | has_embedding=${r.has_embedding}`));

  const candidates = await client.query(`SELECT COUNT(*) as count FROM "Candidate"`);
  console.log(`\n📊 Candidate rows in DB: ${candidates.rows[0].count}`);

  const sampleCand = await client.query(`SELECT name, email, (content_embedding IS NOT NULL) as has_embedding FROM "Candidate" LIMIT 5`);
  console.log("Sample candidates:");
  sampleCand.rows.forEach(c => console.log(`  - ${c.name} (${c.email}) | has_embedding=${c.has_embedding}`));

  const rubrics = await client.query(`SELECT COUNT(*) as count FROM "Rubric"`);
  console.log(`\n📊 Rubric rows in DB: ${rubrics.rows[0].count}`);

  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
