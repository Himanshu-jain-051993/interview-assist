
import { getGeminiModel, withRetry } from "@/lib/gemini-utils";
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
  const roleKey = roleCategory.toLowerCase().replace(/\s+/g, "_");
  const roleRubricsData = rubricsData.role_specific_rubrics[roleKey] || [];
  const roleRubrics = JSON.stringify(roleRubricsData, null, 2);

  const prompt = `
ROLE: You are the Ultimate Talent Auditor (v10.0). Perform a PARSING and SCORING of the provided Resume.

INPUTS:
1. Job Description: ${jd}
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

SCORING RULES:
- "overall_fit_score" MUST be a NUMBER between 0 and 100.
- "universal_rubric_scores" and "role_specific_rubric_scores" MUST be arrays of objects:
  { "rubric": "Name", "score": 1-4, "justification": "Why?" }
- If the candidate is a perfect fit, return 100.
- Never return 0 unless the resume is completely blank or unrelated.

STRICT RULE: Only return valid JSON. Do not include markdown fences.
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
