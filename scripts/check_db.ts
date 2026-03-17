
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const roles = await prisma.role.findMany({ take: 1 });
    console.log("DB Connection SUCCESS. Sample Role ID:", roles[0]?.id);
  } catch (err: any) {
    console.error("DB Connection FAILED:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
