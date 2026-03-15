const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('ALTER TABLE "InterviewRound" ADD COLUMN "interview_date" TIMESTAMP(3)');
    console.log("Column added");
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log("Column already exists");
    } else {
      console.error(err);
    }
  } finally {
    pool.end();
  }
}
run();
