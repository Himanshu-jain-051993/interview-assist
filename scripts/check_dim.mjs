import * as fs from "fs";

const sql = fs.readFileSync("scripts/seed.sql", "utf8");

// Find first embedding vector
const match = sql.match(/'\[([^\]]+)\]'::vector/);
if (match) {
  const values = match[1].split(",");
  console.log(`Embedding dimension in seed.sql: ${values.length}`);
} else {
  console.log("Could not find embedding vector in seed.sql");
}
