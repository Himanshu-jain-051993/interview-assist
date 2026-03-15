import pg from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

const url = process.env.DATABASE_URL;
const matches = url.match(/postgresql:\/\/([^:]+):([^@]+)@/);
const user = matches[1];
const pass = decodeURIComponent(matches[2]);

const client = new Client({
  user, password: pass,
  host: "aws-1-ap-southeast-2.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log("Connected to database!");

  const candidatesPath = path.join(process.cwd(), "data", "candidates.json");
  const candidates = JSON.parse(fs.readFileSync(candidatesPath, "utf-8"));

  console.log(`Seeding ${candidates.length} candidates...`);

  for (const candidate of candidates) {
    console.log(`\nProcessing candidate: ${candidate.name} (Senior Product Manager)`);
    
    // Find the role ID
    const roleRes = await client.query('SELECT id FROM "Role" WHERE title = $1', [candidate.standardized_role]);
    if (roleRes.rows.length === 0) {
      console.warn(`!! Role '${candidate.standardized_role}' not found. Skipping.`);
      continue;
    }
    const roleId = roleRes.rows[0].id;

    // Experience text for embedding
    const experienceText = candidate.experience
      .map(exp => `${exp.role} at ${exp.company}: ${exp.achievements.join(" ")}`)
      .join("\n");
    const fullText = `${candidate.summary}\n${experienceText}`;
    
    console.log("  Generating embedding...");
    const embedding = await getEmbedding(fullText);
    const embeddingStr = `[${embedding.join(",")}]`;

    const profile_data = {
      contact: candidate.contact,
      summary: candidate.summary,
      skills: candidate.skills,
      experience: candidate.experience,
      education: candidate.education,
      title: candidate.title,
    };

    console.log(`  Upserting ${candidate.name}...`);
    await client.query(`
      INSERT INTO "Candidate" (id, name, email, role_id, stage, profile_data, content_embedding, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::vector, NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role_id = EXCLUDED.role_id,
        profile_data = EXCLUDED.profile_data,
        content_embedding = EXCLUDED.content_embedding
    `, [
      `cand_${Math.random().toString(36).substr(2, 9)}`,
      candidate.name,
      candidate.contact.email,
      roleId,
      "Applied",
      JSON.stringify(profile_data),
      embeddingStr
    ]);
  }

  console.log("\n✅ All candidates seeded successfully!");
  await client.end();
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
