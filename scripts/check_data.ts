import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const rolesCount = await prisma.role.count();
    const candidatesCount = await prisma.candidate.count();
    
    console.log(`Verification Results:`);
    console.log(`Total Roles: ${rolesCount}`);
    console.log(`Total Candidates: ${candidatesCount}`);
    
    if (rolesCount > 0) {
      const sampleRole = await prisma.role.findFirst({ select: { title: true } });
      console.log(`Sample Role: ${sampleRole?.title}`);
    }
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
