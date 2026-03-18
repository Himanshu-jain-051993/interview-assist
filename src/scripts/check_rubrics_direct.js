const { Client } = require('pg');

async function checkRubrics() {
  const client = new Client({
    connectionString: "postgresql://postgres.vhmevfybwousximpryks:16i11u%231083@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true" // Using Pooled URL
  });

  try {
    await client.connect();
    
    const query = `
      SELECT DISTINCT r.title, r.category 
      FROM "Role" r 
      LEFT JOIN "Rubric" rub ON r.category = rub.category 
      WHERE rub.id IS NULL;
    `;
    
    const res = await client.query(query);
    
    if (res.rows.length === 0) {
      console.log("SUCCESS: All Job Descriptions have associated rubrics.");
    } else {
      console.log("The following Job Descriptions are missing rubrics:");
      res.rows.forEach(row => {
        console.log(`- ${row.title} (Category: ${row.category})`);
      });
    }
  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await client.end();
  }
}

checkRubrics();
