
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
// Using Gemini 2.5 Flash for state-of-the-art performance
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ScoringResult {
  resume_summary: string;
  hiring_thesis: string;
  universal_rubric_scores: {
    rubric: string;
    score: number;
    justification: string;
  }[];
  role_specific_rubric_scores: {
    rubric: string;
    score: number;
    justification: string;
  }[];
  scores: {
    universal_fit_score: number;
    role_specific_fit_score: number;
    overall_fit_score: number;
  };
}

export async function scoreResumeV2(
  jd: string,
  resumeText: string,
  roleCategory: string
): Promise<ScoringResult> {
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
  const roleRubricsData = rubricsData.role_specific_rubrics[roleKey] || [];
  const roleRubrics = JSON.stringify(roleRubricsData, null, 2);
  const weights = JSON.stringify(rubricsData.evaluation_weights, null, 2);

  const prompt = `
ROLE: You are the Ultimate Resume Auditor (v9.0).

TASK: Audit the Resume Text AGAINST the provided Rubrics.

JD: ${jd}
RESUME: ${resumeText.substring(0, 15000)}
UNIVERSAL RUBRICS: ${universalRubrics}
ROLE RUBRICS: ${roleRubrics}
EVALUATION WEIGHTS: ${weights}

STRICT SCORING RULES:
1. You MUST evaluate against EVERY rubric provided.
2. You MUST use the EXACT "name" from the rubric definitions for the "rubric" field.
3. Individual rubric scores MUST be integers 1-4.
4. "overall_fit_score" calculation:
   - Calculate Average Universal Score (1-4)
   - Calculate Average Role Score (1-4)
   - overall_fit_score = (AvgUniversal * 0.4) + (AvgRole * 0.6)
   - Return this overall_fit_score as a number 1.0-4.0.

OUTPUT JSON:
{
  "resume_summary": "High-density executive summary of 150-175 words describing the candidate's professional narrative, key competencies, and career trajectory signals.",
  "hiring_thesis": "...",
  "universal_rubric_scores": [{ "rubric": "Rubric Name", "score": 1-4, "justification": "msg" }],
  "role_specific_rubric_scores": [{ "rubric": "Rubric Name", "score": 1-4, "justification": "msg" }],
  "scores": { 
     "universal_fit_score": 1-4, 
     "role_specific_fit_score": 1-4, 
     "overall_fit_score": 1.0-4.0 
  }
}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text().trim();
  
  if (text.startsWith("```json")) text = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI output was not valid JSON");
    return JSON.parse(jsonMatch[0]);
  }
}
