import { PrismaClient } from "@prisma/client";
import "dotenv/config";

async function main() {
  console.log("Starting connection test...");
  console.log("DIRECT_URL exists:", !!process.env.DIRECT_URL);
  
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL,
  });

  try {
    const roles = await prisma.role.findMany({ take: 1 });
    console.log("Connection successful! Found roles:", roles.length);
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
