import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

async function main() {
  const rolesPath = path.join(process.cwd(), "data", "roles.json");
  const rubricsPath = path.join(process.cwd(), "data", "rubrics.json");

  const roles = JSON.parse(fs.readFileSync(rolesPath, "utf-8"));
  const rubricsData = JSON.parse(fs.readFileSync(rubricsPath, "utf-8"));

  let sql = "-- Seed Data\n";

  console.log(`Generating SQL for ${roles.length} roles...`);
  for (const role of roles) {
    const embedding = await getEmbedding(role.full_text);
    const embeddingStr = `[${embedding.join(",")}]`;
    
    // Escape single quotes in text
    const escapedText = role.full_text.replace(/'/g, "''");
    const escapedTitle = role.title.replace(/'/g, "''");
    const escapedCategory = role.category.replace(/'/g, "''");

    sql += `
INSERT INTO "Role" (id, title, category, level, industry, job_description, full_jd_text, content_embedding, created_at)
VALUES (
  'role_${Math.random().toString(36).substr(2, 9)}',
  '${escapedTitle}',
  '${escapedCategory}',
  'Senior',
  'Technology',
  '${escapedText}',
  '${escapedText}',
  '${embeddingStr}'::vector,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  job_description = EXCLUDED.job_description,
  full_jd_text = EXCLUDED.full_jd_text,
  content_embedding = EXCLUDED.content_embedding;
`;
  }

  console.log(`Generating SQL for rubrics...`);
  const categories = Object.keys(rubricsData);
  for (const category of categories) {
    const params = rubricsData[category];
    for (const p of params) {
      const escapedCat = category.replace(/'/g, "''");
      const escapedParam = p.parameter.replace(/'/g, "''");
      const escapedPoor = p.poor.replace(/'/g, "''");
      const escapedBorderline = (p.borderline || "").replace(/'/g, "''");
      const escapedGood = p.good.replace(/'/g, "''");
      const escapedStrong = p.strong.replace(/'/g, "''");

      sql += `
INSERT INTO "Rubric" (id, category, parameter, poor, borderline, good, strong, created_at)
VALUES (
  'rubric_${Math.random().toString(36).substr(2, 9)}',
  '${escapedCat}',
  '${escapedParam}',
  '${escapedPoor}',
  '${escapedBorderline}',
  '${escapedGood}',
  '${escapedStrong}',
  NOW()
) ON CONFLICT (category, parameter) DO UPDATE SET
  poor = EXCLUDED.poor,
  borderline = EXCLUDED.borderline,
  good = EXCLUDED.good,
  strong = EXCLUDED.strong;
`;
    }
  }

  fs.writeFileSync(path.join(process.cwd(), "scripts", "seed.sql"), sql);
  console.log("SQL seed file generated: scripts/seed.sql");
}

main().catch(console.error);
