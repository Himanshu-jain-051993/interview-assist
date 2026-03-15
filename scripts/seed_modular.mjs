import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

console.log("DIRECT_URL from env:", process.env.DIRECT_URL ? "Exists" : "MISSING");
if (process.env.DIRECT_URL) {
  console.log("URL Protocol:", process.env.DIRECT_URL.split(":")[0]);
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function seedRoles() {
  const rolesPath = path.join(process.cwd(), "data", "roles.json");
  const roles = JSON.parse(fs.readFileSync(rolesPath, "utf-8"));

  console.log(`Seeding ${roles.length} roles...`);

  for (const roleData of roles) {
    console.log(`Processing role: ${roleData.title}`);
    const embedding = await getEmbedding(roleData.full_text);

    const existingRole = await prisma.role.findFirst({
      where: { title: roleData.title },
    });

    let roleId;
    if (existingRole) {
      roleId = existingRole.id;
      await prisma.role.update({
        where: { id: roleId },
        data: {
          category: roleData.category,
          full_jd_text: roleData.full_text,
          level: "Senior",
          industry: "Technology",
          job_description: roleData.full_text,
        },
      });
    } else {
      const newRole = await prisma.role.create({
        data: {
          title: roleData.title,
          category: roleData.category,
          level: "Senior",
          industry: "Technology",
          job_description: roleData.full_text,
          full_jd_text: roleData.full_text,
        },
      });
      roleId = newRole.id;
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "Role" SET content_embedding = $1::vector WHERE id = $2`,
      embeddingStr,
      roleId
    );
  }
}

async function seedRubrics() {
  const rubricsPath = path.join(process.cwd(), "data", "rubrics.json");
  const rubricsData = JSON.parse(fs.readFileSync(rubricsPath, "utf-8"));

  const categories = Object.keys(rubricsData);
  console.log(`Seeding rubrics for ${categories.length} categories...`);

  for (const category of categories) {
    const parameters = rubricsData[category];
    for (const p of parameters) {
      await prisma.rubric.upsert({
        where: {
          category_parameter: {
            category: category,
            parameter: p.parameter,
          },
        },
        update: {
          poor: p.poor,
          borderline: p.borderline,
          good: p.good,
          strong: p.strong,
        },
        create: {
          category: category,
          parameter: p.parameter,
          poor: p.poor,
          borderline: p.borderline,
          good: p.good,
          strong: p.strong,
        },
      });
    }
  }
}

async function main() {
  try {
    await seedRoles();
    await seedRubrics();
    console.log("Modular seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
