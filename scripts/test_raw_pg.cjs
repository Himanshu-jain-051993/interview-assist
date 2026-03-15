const { Client } = require('pg');
require('dotenv').config();

async function main() {
  console.log("Testing connection to:", process.env.DIRECT_URL);
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
  });

  try {
    await client.connect();
    console.log("Connected successfully to PostgreSQL!");
    const res = await client.query('SELECT NOW()');
    console.log("Current Time:", res.rows[0]);
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await client.end();
  }
}

main();
