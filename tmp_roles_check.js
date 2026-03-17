
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    select: { id: true, title: true }
  });
  console.log('Roles in DB:', roles);
  await prisma.$disconnect();
}

main().catch(console.error);
