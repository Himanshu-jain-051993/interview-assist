require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkColumns() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Candidate'");
  console.log('--- COLUMNS START ---');
  res.rows.forEach(r => console.log(r.column_name));
  console.log('--- COLUMNS END ---');
  await pool.end();
}
checkColumns();
