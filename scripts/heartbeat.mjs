import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
const url = process.env.DATABASE_URL;

async function heartbeat() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 as heartbeat');
    console.log("Heartbeat success:", res.rows[0].heartbeat);
  } catch (err) {
    console.error("Heartbeat failed:", err.message);
  } finally {
    await client.end();
  }
}

heartbeat();
