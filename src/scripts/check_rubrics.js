const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const roles = await prisma.role.findMany({
      select: { category: true, title: true }
    });
    
    const rubrics = await prisma.rubric.findMany({
      select: { category: true }
    });
    
    const rubricCategories = new Set(rubrics.map(r => r.category));
    
    const missing = roles.filter(role => !rubricCategories.has(role.category));
    
    if (missing.length === 0) {
      console.log("All Job Descriptions have associated rubrics.");
    } else {
      console.log("The following Job Descriptions are missing rubrics:");
      missing.forEach(m => console.log(`- ${m.title} (Category: ${m.category})`));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
