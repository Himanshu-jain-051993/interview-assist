import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL not found in .env");
  process.exit(1);
}

const sqlPath = path.join(process.cwd(), "scripts", "seed.sql");

// Log redacted URL for safety
const redactedUrl = url.replace(/:([^@]+)@/, ":****@");
console.log(`Executing SQL using URL: ${redactedUrl}`);

try {
  // Let Prisma CLI read from schema.prisma (it will use directUrl or DATABASE_URL)
  const cmd = `npx prisma db execute --file scripts/seed.sql`;
  console.log("Running command...");
  const output = execSync(cmd, { stdio: "inherit" });
  console.log("SQL execution completed successfully.");
} catch (err) {
  console.error("Error executing SQL:", err.message);
  process.exit(1);
}
