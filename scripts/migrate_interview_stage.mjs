
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Migrating candidate stages from "Interview Scheduled" to "Interview" ---');
  
  const result = await prisma.candidate.updateMany({
    where: {
      stage: 'Interview Scheduled',
    },
    data: {
      stage: 'Interview',
    },
  });

  console.log(`Updated ${result.count} candidates.`);

  const roles = await prisma.role.findMany({
    include: {
      candidates: true,
    },
  });

  for (const role of roles) {
    const candidates = role.candidates || [];
    const interviewCount = candidates.filter(c => c.stage === 'Interview').length;
    console.log(`Role [${role.title}]: Candidate count in Interview stage: ${interviewCount}`);
  }

  console.log('--- Migration complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
