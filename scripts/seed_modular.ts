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
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error: any) {
    console.warn("  [Embedding Failed]", error.message);
    return null;
  }
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

    if (embedding) {
      const embeddingStr = `[${embedding.join(",")}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "Role" SET content_embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        roleId
      );
      console.log(`  Role ${roleData.title} seeded with embedding.`);
    } else {
      console.log(`  Role ${roleData.title} seeded WITHOUT embedding.`);
    }
  }
}

async function seedRubrics() {
  // 1. Seed Interview Rubrics from rubrics.json
  const interviewRubricsPath = path.join(process.cwd(), "data", "rubrics.json");
  const interviewRubricsData = JSON.parse(fs.readFileSync(interviewRubricsPath, "utf-8"));

  const interviewCategories = Object.keys(interviewRubricsData);
  console.log(`Seeding INTERVIEW rubrics for ${interviewCategories.length} categories...`);

  for (const category of interviewCategories) {
    const parameters = interviewRubricsData[category];
    for (const p of parameters) {
      await (prisma as any).rubric.upsert({
        where: {
          category_type_parameter: {
            category: category,
            type: 'INTERVIEW',
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
          type: 'INTERVIEW',
          parameter: p.parameter,
          poor: p.poor,
          borderline: p.borderline,
          good: p.good,
          strong: p.strong,
        },
      });
    }
  }

  // 2. Seed Resume Rubrics from resume_rubrics.json
  const resumeRubricsPath = path.join(process.cwd(), "data", "resume_rubrics.json");
  const resumeRubricsData = JSON.parse(fs.readFileSync(resumeRubricsPath, "utf-8"));

  const mapping: Record<string, string> = {
    "product_manager": "Product Management",
    "software_engineer": "Software Engineering",
    "data_analyst": "Data Analytics",
    "technical_program_manager": "Program Management",
    "ai_product_manager": "AI Product Management",
  };

  const resumeCategories = Object.keys(resumeRubricsData.role_specific_rubrics);
  console.log(`Seeding RESUME rubrics for ${resumeCategories.length} categories...`);

  for (const rawKey of resumeCategories) {
    const category = mapping[rawKey] || rawKey;
    const parameters = resumeRubricsData.role_specific_rubrics[rawKey];
    for (const p of parameters) {
      await (prisma as any).rubric.upsert({
        where: {
          category_type_parameter: {
            category: category,
            type: 'RESUME',
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
          type: 'RESUME',
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

    // Construct a readable resume text from the JSON structure
    const rawResumeText = `
${candidate.name}
${candidate.title}

SUMMARY
${candidate.summary}

EXPERIENCE
${candidate.experience.map((exp: any) => `
${exp.role} | ${exp.company} | ${exp.duration}
${exp.achievements.map((a: string) => `- ${a}`).join("\n")}
`).join("\n")}

SKILLS
Product: ${candidate.skills.product_management?.join(", ") || ""}
Technical: ${candidate.skills.technical_skills?.join(", ") || ""}

EDUCATION
${candidate.education.map((edu: any) => `${edu.degree} from ${edu.school}`).join("\n")}
`.trim();

    const profileData = {
      contact: candidate.contact,
      summary: candidate.summary,
      skills: candidate.skills,
      experience: candidate.experience,
      education: candidate.education,
      title: candidate.title,
    };

    // Upsert the candidate
    const upsertedCandidate = await prisma.candidate.upsert({
      where: { email: candidate.contact.email },
      update: {
        name: candidate.name,
        role_id: role.id,
        stage: "Applied",
        raw_resume_text: rawResumeText,
        profile_data: profileData as any,
        // Also pre-populate a basic resume_review_data if it's currently null
        // this gives the user something to see immediately
        resume_review_data: {
          resume_summary: candidate.summary,
          universal_rubric_scores: [],
          role_specific_rubric_scores: []
        } as any,
      },
      create: {
        name: candidate.name,
        email: candidate.contact.email,
        role_id: role.id,
        stage: "Applied",
        raw_resume_text: rawResumeText,
        profile_data: profileData as any,
        resume_review_data: {
          resume_summary: candidate.summary,
          universal_rubric_scores: [],
          role_specific_rubric_scores: []
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
