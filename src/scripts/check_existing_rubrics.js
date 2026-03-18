const { Client } = require('pg');

async function checkRubrics() {
  const client = new Client({
    connectionString: "postgresql://postgres.vhmevfybwousximpryks:16i11u%231083@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });

  try {
    await client.connect();
    
    const query = `
      SELECT DISTINCT category FROM "Rubric";
    `;
    
    const res = await client.query(query);
    console.log("Categories with rubrics:");
    res.rows.forEach(row => console.log(`- ${row.category}`));
    
  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await client.end();
  }
}

checkRubrics();
