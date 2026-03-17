
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
// Switching to Flash for production throughput and faster response times
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
  const roleKey = roleCategory.toLowerCase().replace(/\s+/g, "_");
  const roleRubricsData = rubricsData.role_specific_rubrics[roleKey] || [];
  const roleRubrics = JSON.stringify(roleRubricsData, null, 2);

  const prompt = `
ROLE: You are the Ultimate Resume Auditor (v8.0).

TASK: Audit the Resume Text against the JD and Rubrics.

JD: ${jd}
RESUME: ${resumeText.substring(0, 15000)}
UNIVERSAL RUBRICS: ${universalRubrics}
ROLE RUBRICS: ${roleRubrics}

OUTPUT JSON:
{
  "resume_summary": "Pithy 50-70 word summary.",
  "hiring_thesis": "100-word justification.",
  "universal_rubric_scores": [{ "rubric": "string", "score": 1-4, "justification": "msg" }],
  "role_specific_rubric_scores": [{ "rubric": "string", "score": 1-4, "justification": "msg" }],
  "scores": { "universal_fit_score": 0-4, "role_specific_fit_score": 0-4, "overall_fit_score": 0-4 }
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
