import { getGeminiModel } from "@/lib/gemini-utils";
import fs from "fs";
import path from "path";

export interface ScoringResult {
  resume_summary: string;
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

export async function scoreResume(
  jd: string,
  resumeText: string,
  roleCategory: string
): Promise<ScoringResult> {
  const model = getGeminiModel("gemini-2.5-pro");
  // Load rubrics from data file
  const rubricsPath = path.join(process.cwd(), "data", "resume_rubrics.json");
  const rubricsData = JSON.parse(fs.readFileSync(rubricsPath, "utf-8"));

  const universalRubrics = JSON.stringify(rubricsData.universal_rubrics, null, 2);
  
  // Normalize roleCategory to match keys in resume_rubrics.json (e.g., "Product Manager" -> "product_manager")
  const roleKey = roleCategory.toLowerCase().replace(/\s+/g, "_");
  const roleRubricsData = rubricsData.role_specific_rubrics[roleKey] || [];
  const roleRubrics = JSON.stringify(roleRubricsData, null, 2);

  const prompt = `
You are an expert hiring analyst evaluating how well a candidate’s resume matches a job description.

Your evaluation must be objective, evidence-based, and grounded in the provided rubrics.

Inputs you will receive:
1. Job Description (JD):
${jd}

2. Candidate Resume:
${resumeText.replace(/\s+/g, ' ').trim().substring(0, 10000)}

3. Universal Resume Fit Rubrics:
${universalRubrics}

4. Role-Specific Rubrics:
${roleRubrics}

You may use external knowledge sources when needed to understand:
- company scale
- industry domain
- company type (startup, enterprise, consulting, product company)
- execution environment

However, do NOT infer candidate skills or experience not explicitly stated in the resume.

--------------------------------------------------

EVALUATION PROCESS

Step 1 — Understand the JD
Identify key requirements from the job description including:
- required skills
- preferred skills
- role seniority
- industry/domain
- expected product or system scale
- execution environment

Step 2 — Analyze Resume Evidence
Extract evidence from the resume including:
- years of experience
- roles and responsibilities
- companies worked at
- industries/domains
- product/system scale indicators
- technical or product skills
- measurable impact metrics
- leadership or collaboration signals

Step 3 — Context Enrichment
When company names appear in the resume, you may use web knowledge to determine:
- company scale (startup / mid-size / large tech / enterprise)
- industry domain
- product complexity
- speed of execution environment

Step 4 — Score Universal Fit Rubrics
Evaluate the candidate against each Universal rubric.
For each rubric:
- Assign a score from 1–4
- Provide justification referencing resume evidence
- Mention mismatches relative to the JD when relevant

Step 5 — Score Role-Specific Rubrics
Evaluate the candidate against the role-specific rubrics relevant to the role in the JD.
For each rubric:
- Assign a score from 1–4
- Provide justification referencing resume evidence
- Highlight alignment or gaps relative to the JD

Step 6 — Compute Scores
Compute the following:
Universal Fit Score = average of universal rubric scores
Role-Specific Fit Score = average of role-specific rubric scores
Overall Fit Score = (0.4 × Universal Fit Score) + (0.6 × Role-Specific Fit Score)

If evidence is weak or missing, prefer a lower score.

--------------------------------------------------

OUTPUT FORMAT
Return results ONLY in the following JSON format. Please ensure no prose outside the JSON block.

{
  "resume_summary": "Approximately 100 word summary describing candidate background, experience, and impact signals",
  "universal_rubric_scores": [
    {
      "rubric": "company_scale_similarity",
      "score": 1-4,
      "justification": "Evidence-based explanation referencing resume signals"
    },
    {
      "rubric": "industry_domain_alignment",
      "score": 1-4,
      "justification": "Evidence-based explanation referencing resume signals"
    },
    {
      "rubric": "execution_environment_fit",
      "score": 1-4,
      "justification": "Evidence-based explanation referencing resume signals"
    },
    {
      "rubric": "culture_fit_signals",
      "score": 1-4,
      "justification": "Evidence-based explanation referencing resume signals"
    },
    {
      "rubric": "career_trajectory_alignment",
      "score": 1-4,
      "justification": "Evidence-based explanation referencing resume signals"
    }
  ],
  "role_specific_rubric_scores": [
    {
      "rubric": "rubric_name",
      "score": 1-4,
      "justification": "Evidence-based explanation referencing resume signals"
    }
  ],
  "scores": {
    "universal_fit_score": "numeric value",
    "role_specific_fit_score": "numeric value",
    "overall_fit_score": "numeric value"
  }
}

--------------------------------------------------

IMPORTANT RULES
1. Only use evidence present in the resume.
2. Do not infer missing experience.
3. Penalize lack of measurable impact.
4. When unsure between two scores, choose the lower one.
5. Keep justifications concise but evidence-based.
6. Before assigning a score for a rubric, explicitly identify the resume evidence that supports the score.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from Gemini response");
  }
  return JSON.parse(jsonMatch[0]);
}


