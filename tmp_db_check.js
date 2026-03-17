
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.candidate.count();
  console.log('Candidate Count:', count);
  const latest = await prisma.candidate.findFirst({
    orderBy: { created_at: 'desc' },
    select: { id: true, name: true, email: true, role_id: true, resume_score: true }
  });
  console.log('Latest Candidate:', latest);
  await prisma.$disconnect();
}

main().catch(console.error);
