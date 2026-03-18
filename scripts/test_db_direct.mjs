import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

const url = process.env.DATABASE_URL;
const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  
  console.log("Fetching roles from DB...");
  const roles = await client.query('SELECT * FROM "Role" LIMIT 5');
  console.log("Roles found:", roles.rows.length);
  roles.rows.forEach(r => console.log(`- ${r.title} (ID: ${r.id})`));

  console.log("\nFetching candidates from DB...");
  const candidates = await client.query('SELECT * FROM "Candidate" LIMIT 5');
  console.log("Candidates found:", candidates.rows.length);
  candidates.rows.forEach(c => console.log(`- ${c.name} (Role ID: ${c.role_id})`));

  await client.end();
}

main().catch(console.error);
