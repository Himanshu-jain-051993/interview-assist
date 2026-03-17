require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    console.log('--- STARTING MIGRATION ---');
    
    // Add resume_score if not exists
    await pool.query(`
      ALTER TABLE "Candidate" 
      ADD COLUMN IF NOT EXISTS resume_score DOUBLE PRECISION;
    `);
    console.log('Added resume_score column');

    // Add resume_review_data if not exists
    await pool.query(`
      ALTER TABLE "Candidate" 
      ADD COLUMN IF NOT EXISTS resume_review_data JSONB;
    `);
    console.log('Added resume_review_data column');

    console.log('--- MIGRATION COMPLETED ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
