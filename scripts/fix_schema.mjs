import pg from "pg";
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

  // Step 1: Drop and re-add the column with correct type
  console.log("Dropping old content_embedding column...");
  await client.query('ALTER TABLE "Role" DROP COLUMN IF EXISTS "content_embedding"');
  console.log("  Done.");

  console.log("Adding content_embedding as vector(3072)...");
  await client.query('ALTER TABLE "Role" ADD COLUMN "content_embedding" vector(3072)');
  console.log("  Done.");

  // Step 2: Re-create the match_roles function for 3072 dims
  console.log("Recreating match_roles function for 3072 dimensions...");
  await client.query(`
    CREATE OR REPLACE FUNCTION match_roles (
      query_embedding vector(3072),
      match_threshold float,
      match_count int
    )
    RETURNS TABLE (
      id text,
      title text,
      metadata jsonb,
      full_jd_text text,
      similarity float
    )
    LANGUAGE sql STABLE
    AS $$
      SELECT
        roles.id,
        roles.title,
        roles.metadata,
        roles.full_jd_text,
        1 - (roles.content_embedding <=> query_embedding) as similarity
      FROM "Role" as roles
      WHERE 1 - (roles.content_embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    $$;
  `);
  console.log("  Done.");

  // Step 3: Verify
  const res = await client.query(`
    SELECT atttypmod FROM pg_attribute 
    WHERE attrelid = '"Role"'::regclass 
    AND attname = 'content_embedding'
  `);
  const dim = res.rows[0]?.atttypmod;
  console.log(`\n✅ content_embedding is now vector(${dim}) dimensions.`);

  await client.end();
}

main().catch(err => {
  console.error("Error:", err.message, err.detail || "");
  process.exit(1);
});
