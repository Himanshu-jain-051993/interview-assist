import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();
const { Client } = pg;

const targets = [
  { name: "Direct 5432", host: "db.vhmevfybwousximpryks.supabase.co", port: 5432 },
  { name: "Pooler 5432", host: "aws-1-ap-southeast-2.pooler.supabase.com", port: 5432 },
  { name: "Pooler 6543", host: "aws-1-ap-southeast-2.pooler.supabase.com", port: 6543 },
];

async function test() {
  const url = process.env.DIRECT_URL;
  const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@/);
  const user = matches[1];
  const pass = decodeURIComponent(matches[2]);

  for (const t of targets) {
    const client = new Client({
      user,
      password: pass,
      host: t.host,
      port: t.port,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      console.log(`Testing ${t.name}...`);
      await client.connect();
      console.log(`SUCCESS: ${t.name} connected!`);
      await client.end();
    } catch (err) {
      console.log(`FAILED: ${t.name} - ${err.message}`);
    }
  }
}

test();
