import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;

const url = process.env.DATABASE_URL;
const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
const [_, user, pass, host, port, db] = matches;
const decodedPass = pass.includes('%') ? decodeURIComponent(pass) : pass;

const client = new Client({
  user,
  password: decodedPass,
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  
  const result = await client.query(`
    SELECT column_name, udt_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'Candidate'
    ORDER BY ordinal_position;
  `);
  
  console.log("Candidate table columns:");
  result.rows.forEach(r => console.log(r));

  // Also check the actual vector dimension
  const vecResult = await client.query(`
    SELECT attname, atttypmod 
    FROM pg_attribute 
    WHERE attrelid = '"Role"'::regclass 
    AND attname = 'content_embedding'
    AND attnum > 0;
  `);
  
  if (vecResult.rows.length > 0) {
    const mod = vecResult.rows[0].atttypmod;
    console.log(`\ncontent_embedding typmod: ${mod} => vector(${mod}) dimensions`);
  }
  
  await client.end();
}

main().catch(console.error);
