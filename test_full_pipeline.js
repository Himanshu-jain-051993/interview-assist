
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const API_KEY = "AIzaSyDUokEbD4p0XasulmkkjeoTXlJeU1sRPn0";
const genAI = new GoogleGenerativeAI(API_KEY);
const prisma = new PrismaClient();

async function fullPipelineTest() {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const roleId = "role_6tgvloa76";
  const filePath = path.join(__dirname, "dummy_resume.pdf");

  console.log("1. Fetching Role...");
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    console.error("Role not found:", roleId);
    return;
  }

  console.log("2. Extracting Text...");
  const buffer = fs.readFileSync(filePath);
  const resultExt = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    },
    "Extract raw text from this resume."
  ]);
  const resumeText = await resultExt.response.text();
  console.log("Extracted text length:", resumeText.length);

  console.log("3. Performing Audit...");
  const rubricsPath = path.join(process.cwd(), "data", "resume_rubrics.json");
  const rubricsData = JSON.parse(fs.readFileSync(rubricsPath, "utf-8"));
  const universalRubrics = JSON.stringify(rubricsData.universal_rubrics, null, 2);
  const roleKey = role.category.toLowerCase().replace(/\s+/g, "_");
  const roleRubricsData = rubricsData.role_specific_rubrics[roleKey] || [];
  const roleRubrics = JSON.stringify(roleRubricsData, null, 2);

  const prompt = `
ROLE: You are the Ultimate Talent Auditor (v10.0). Perform a PARSING and SCORING of the provided Resume.

INPUTS:
1. Job Description: ${role.job_description}
2. Resume Text: ${resumeText.substring(0, 15000)}
3. Universal Rubrics: ${universalRubrics}
4. Role Rubrics: ${roleRubrics}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "profile": {
    "name": "Full Name",
    "email": "extracted@email.com",
    "summary": "...",
    "experience": [],
    "education": []
  },
  "analysis": {
    "resume_summary": "...",
    "hiring_thesis": "...",
    "universal_rubric_scores": [],
    "role_specific_rubric_scores": [],
    "scores": {
      "overall_fit_score": 85.5
    }
  }
}
`;

  const resultAudit = await model.generateContent(prompt);
  let auditText = resultAudit.response.text().trim();
  if (auditText.includes("```")) {
    auditText = auditText.replace(/```json|```/g, "").trim();
  }
  const auditResult = JSON.parse(auditText);
  console.log("Audit complete. Score:", auditResult.analysis?.scores?.overall_fit_score);

  console.log("4. Persisting to DB...");
  const candidate = await prisma.candidate.upsert({
    where: { email: auditResult.profile.email },
    update: {
      name: auditResult.profile.name,
      raw_resume_text: resumeText,
      role_id: roleId,
      profile_data: auditResult.profile,
      resume_score: auditResult.analysis.scores.overall_fit_score,
      resume_review_data: auditResult.analysis,
      stage: "Applied",
    },
    create: {
      name: auditResult.profile.name,
      email: auditResult.profile.email,
      role_id: roleId,
      stage: "Applied",
      raw_resume_text: resumeText,
      profile_data: auditResult.profile,
      resume_score: auditResult.analysis.scores.overall_fit_score,
      resume_review_data: auditResult.analysis,
    },
  });

  console.log("SUCCESS! Candidate record ID:", candidate.id);
  await prisma.$disconnect();
}

fullPipelineTest().catch(async err => {
  console.error("PIPELINE CRASHED:", err);
  await prisma.$disconnect();
});
