
import { getGeminiModel, withRetry } from "@/lib/gemini-utils";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export interface MasterAuditResult {
  profile: {
    name: string;
    email: string;
    summary: string;
    experience: any[];
    education: any[];
  };
  analysis: {
    resume_summary: string;
    hiring_thesis: string;
    universal_rubric_scores: any[];
    role_specific_rubric_scores: any[];
    scores: {
      universal_fit_score: number;
      role_specific_fit_score: number;
      overall_fit_score: number;
    };
  };
}

export async function performMasterAudit(
  jd: string,
  resumeText: string,
  roleCategory: string
): Promise<MasterAuditResult> {
  const model = getGeminiModel();
  
  const rubricsPath = path.join(process.cwd(), "data", "resume_rubrics.json");
  const rubricsData = JSON.parse(fs.readFileSync(rubricsPath, "utf-8"));
  const universalRubrics = JSON.stringify(rubricsData.universal_rubrics, null, 2);
  const mapping: Record<string, string> = {
    "product_management": "product_manager",
    "software_engineering": "software_engineer",
    "data_analytics": "data_analyst",
    "program_management": "technical_program_manager",
    "ai_product_management": "ai_product_manager",
  };

  const rawKey = roleCategory.toLowerCase().replace(/\s+/g, "_");
  const roleKey = mapping[rawKey] || rawKey;
  
  // 🔍 DYNAMIC RUBRIC FETCH
  // We first try to get rubrics from the database (for dynamic roles like Category Manager)
  // If not found, we fallback to the static JSON file
  const dbRubrics = await (prisma as any).rubric.findMany({
    where: { category: roleCategory }
  });

  let roleRubricsData = [];
  if (dbRubrics && dbRubrics.length > 0) {
    console.log(`[Auditor] Using ${dbRubrics.length} database rubrics for category: ${roleCategory}`);
    roleRubricsData = dbRubrics;
  } else {
    console.log(`[Auditor] Category "${roleCategory}" not in DB. Falling back to static JSON...`);
    roleRubricsData = rubricsData.role_specific_rubrics[roleKey] || [];
  }

  const roleRubrics = JSON.stringify(roleRubricsData, null, 2);
  const weights = JSON.stringify(rubricsData.evaluation_weights, null, 2);

  const prompt = `
ROLE: You are the Ultimate Talent Auditor (v11.0). Perform a PARSING and SCORING of the provided Resume.

INPUTS:
1. Job Description: ${jd}
2. Resume Text: ${resumeText.substring(0, 15000)}
3. Universal Rubrics: ${universalRubrics}
4. Role Rubrics: ${roleRubrics}
5. Evaluation Weights: ${weights}

STRICT SCORING RULES:
1. You MUST evaluate against EVERY rubric provided in "Universal Rubrics" and "Role Rubrics".
2. You MUST use the EXACT "name" of the rubric from the JSON for the "rubric" field.
3. Every score MUST be an integer between 1 and 4.
4. "overall_fit_score" calculation: 
   - Calculate Average Universal Score (1-4)
   - Calculate Average Role Score (1-4)
   - overall_fit_score = (AvgUniversal * 0.4) + (AvgRole * 0.6)
   - Return this overall_fit_score as a number between 1.0 and 4.0.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "profile": {
    "name": "Full Name",
    "email": "extracted@email.com",
    "summary": "Short 2-line summary for profile",
    "experience": [],
    "education": []
  },
  "analysis": {
    "resume_summary": "High-density executive summary of 150-175 words describing the candidate's professional narrative, key competencies, and career trajectory signals.",
    "hiring_thesis": "...",
    "universal_rubric_scores": [
       { "rubric": "Rubric Name from JSON", "score": 1-4, "justification": "msg" }
    ],
    "role_specific_rubric_scores": [
       { "rubric": "Rubric Name from JSON", "score": 1-4, "justification": "msg" }
    ],
    "scores": {
      "universal_fit_score": 1-4,
      "role_specific_fit_score": 1-4,
      "overall_fit_score": 1.0-4.0
    }
  }
}

STRICT RULE: Only return valid JSON. No markdown fences. No preamble.
`;

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Clean markdown
    if (text.includes("```")) {
      text = text.replace(/```json|```/g, "").trim();
    }
    
    try {
      const parsed = JSON.parse(text);
      // Ensure the scores key exists even if AI missed it
      if (!parsed.analysis) parsed.analysis = {};
      if (!parsed.analysis.scores) parsed.analysis.scores = { overall_fit_score: 50 };
      return parsed;
    } catch (err) {
      console.error("[Auditor] JSON Parse Error:", text.substring(0, 500));
      // Fallback object to prevent pipeline crash
      return {
        profile: { name: "Extracted Candidate", email: `fallback-${Date.now()}@example.com`, summary: "", experience: [], education: [] },
        analysis: { resume_summary: "Parsing failed", hiring_thesis: "", universal_rubric_scores: [], role_specific_rubric_scores: [], scores: { overall_fit_score: 1.0 } }
      } as any;
    }
  });
}
