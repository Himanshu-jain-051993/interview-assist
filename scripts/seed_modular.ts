import { prisma } from "../src/lib/prisma";
import "dotenv/config";

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
// NOTE: gemini-embedding-001 outputs 3072-dimension vectors.
// The DB column content_embedding must be vector(3072) to match.
const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

async function getEmbedding(text: string) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function seedRoles() {
  const rolesPath = path.join(process.cwd(), "data", "roles.json");
  const roles = JSON.parse(fs.readFileSync(rolesPath, "utf-8"));

  console.log(`Seeding ${roles.length} roles...`);

  for (const roleData of roles) {
    console.log(`Processing role: ${roleData.title}`);
    console.log("  Generating JD embedding...");
    const embedding = await getEmbedding(roleData.full_text);
    console.log("  JD embedding generated.");

    const existingRole = await prisma.role.findFirst({
      where: { title: roleData.title },
    });

    let roleId: string;
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
    console.log(`  Role ${roleData.title} seeded successfully.`);
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

async function seedCandidates() {
  const candidatesPath = path.join(process.cwd(), "data", "candidates.json");
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, "utf-8"));

  console.log(`Seeding ${candidates.length} candidates...`);

  for (const candidate of candidates) {
    console.log(`Processing candidate: ${candidate.name}`);
    
    // Find the role ID based on the standardized_role
    const role = await prisma.role.findFirst({
      where: { title: candidate.standardized_role },
    });

    if (!role) {
      console.warn(`Warning: Role '${candidate.standardized_role}' not found for candidate ${candidate.name}. Skipping.`);
      continue;
    }

    // Generate embedding of summary + experience text
    const experienceText = candidate.experience
      .map((exp: any) => `${exp.role} at ${exp.company}: ${exp.achievements.join(" ")}`)
      .join("\n");
    const fullText = `${candidate.summary}\n${experienceText}`;
    
    const embedding = await getEmbedding(fullText);

    // Upsert the candidate
    const upsertedCandidate = await prisma.candidate.upsert({
      where: { email: candidate.contact.email },
      update: {
        name: candidate.name,
        role_id: role.id,
        stage: "Applied",
        profile_data: {
          contact: candidate.contact,
          summary: candidate.summary,
          skills: candidate.skills,
          experience: candidate.experience,
          education: candidate.education,
          title: candidate.title,
        } as any,
      },
      create: {
        name: candidate.name,
        email: candidate.contact.email,
        role_id: role.id,
        stage: "Applied",
        profile_data: {
          contact: candidate.contact,
          summary: candidate.summary,
          skills: candidate.skills,
          experience: candidate.experience,
          education: candidate.education,
          title: candidate.title,
        } as any,
      },
    });

    // We don't have a content_embedding column in Candidate, but if we did, we would update it here.
    // For now, we are just storing the metadata and linking to the role.
  }
}

async function main() {
  try {
    await seedRoles();
    await seedRubrics();
    await seedCandidates();
    console.log("Modular seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    process.exit(1);
  } finally {
    // No need to disconnect if using the global instance usually, 
    // but for a script it's fine.
    await prisma.$disconnect();
  }
}

main();
