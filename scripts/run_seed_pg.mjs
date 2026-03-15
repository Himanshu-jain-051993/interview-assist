import pg from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function run() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    console.error("DIRECT_URL not found in .env");
    process.exit(1);
  }

  // postgresql://user:pass@host:port/db
  const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!matches) {
    console.error("Could not parse DIRECT_URL");
    process.exit(1);
  }

  const [_, user, pass, __, ___, db] = matches;
  const decodedPass = pass.includes('%') ? decodeURIComponent(pass) : pass;

  const host = "aws-1-ap-southeast-2.pooler.supabase.com";
  const port = 6543;

  console.log(`Connection parts: user=${user}, host=${host}, port=${port}, db=${db}`);

  const client = new Client({
    user,
    password: decodedPass,
    host,
    port,
    database: db,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully!");

    const sqlPath = path.join(process.cwd(), "scripts", "seed.sql");
    console.log(`Reading SQL from ${sqlPath}...`);
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Executing SQL script...");
    
    // Split on semicolons followed by newline to run each statement individually.
    // This avoids pgBouncer extended-query-protocol issues.
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      process.stdout.write(`  Statement ${i + 1}/${statements.length}...\r`);
      await client.query(stmt);
    }
    process.stdout.write('\n');
    
    console.log("SQL script executed successfully!");
    fs.writeFileSync("scripts/seed_success.txt", "Success at " + new Date().toISOString());
  } catch (err) {
    const errorMsg = `Error executing SQL:\n${err.message}\nDetail: ${err.detail || 'N/A'}\nWhere: ${err.where || 'N/A'}\nHint: ${err.hint || 'N/A'}`;
    console.error(errorMsg);
    fs.writeFileSync("scripts/seed_error.txt", errorMsg);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
