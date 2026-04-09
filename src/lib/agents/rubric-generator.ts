import { getGeminiModel } from "@/lib/gemini-utils";

export interface GeneratedRubric {
  parameter: string;
  poor: string;
  borderline: string;
  good: string;
  strong: string;
}

/**
 * Generates two distinct sets of rubrics for a specific category based on the JD.
 * Uses Gemini 2.5 Pro for maximum reasoning quality.
 */
export async function generateRubricsForCategory(category: string, jdText: string): Promise<{
  resume_screening_rubrics: GeneratedRubric[];
  interview_evaluation_rubrics: GeneratedRubric[];
}> {
  // Use gemini-2.5-pro for top-quality interview evaluation
  const model = getGeminiModel("gemini-2.5-pro");
  // Apply specific config to the model instance if needed, 
  // or pass it through getGeminiModel. For now, we use standard.
  (model as any).generationConfig = { responseMimeType: "application/json", temperature: 0 };

  const prompt = `
    You are a Strategic Hiring Lead at a top-tier company (e.g., Google, Meta, McKinsey Digital).
    We are hiring for a role in the category: "${category}".

    Your task is to generate TWO DISTINCT SETS of hiring rubrics:
    1) Resume Screening Rubrics
    2) Interview Evaluation Rubrics

    ---------------------------------------
    CRITICAL REQUIREMENT — ROLE-SPECIFICITY (MANDATORY)
    ALL rubrics MUST be deeply tailored to the given role category.
    - DO NOT generate generic rubrics (e.g., "communication", "problem solving") unless they are explicitly contextualized to the role.
    - Each rubric must reflect what success looks like in THIS specific role.

    Examples:
    For Software Engineer: "Distributed System Design", "Backend Performance Optimization" (NOT just "Technical Skills")
    For Product Manager: "Product Strategy & Roadmap Ownership", "Customer Problem Discovery" (NOT just "Product Skills")
    For AI Product Manager: "ML Product Lifecycle Understanding", "Model-to-Product Translation" (NOT just "AI Knowledge")

    ---------------------------------------
    PART 1 — RESUME SCREENING RUBRICS
    Purpose: Evaluate candidates based ONLY on resume evidence.
    Focus on: observable signals (metrics, ownership, scale), company context (scale, domain, execution speed), role-relevant experience.
    Constraints: MUST be directly inferable from resume; MUST reflect role-specific expectations; MUST NOT rely on inferred traits (e.g., "leadership presence").

    ---------------------------------------
    PART 2 — INTERVIEW EVALUATION RUBRICS
    Purpose: Evaluate candidates based on interview performance.
    Focus on: depth of thinking, role-specific problem solving ability, structured reasoning within the domain, behavioral and leadership signals.
    Constraints: MUST assess qualities NOT reliably visible in resume; MUST include role-specific thinking dimensions.

    Examples for Interview:
    Software Engineer: "System Design Tradeoff Thinking", "Debugging Approach"
    Product Manager: "Product Sense & Tradeoff Reasoning", "Prioritization Under Constraints"

    ---------------------------------------
    BEHAVIORAL REQUIREMENT
    Each section MUST include at least 2 Behavioral/Culture rubrics, but MUST be contextualized to the role.
    Good Example: "Technical Leadership in Cross-Functional Teams" (Engineer), "Influence Without Authority in Product Decisions" (PM)

    ---------------------------------------
    RUBRIC STRUCTURE (For EACH rubric):
    1. parameter (specific and role-contextualized)
    2. poor (clear failure signals)
    3. borderline (bare minimum acceptable)
    4. good (solid hire signal)
    5. strong (top 5–10% candidate signal)

    ---------------------------------------
    QUALITY BAR: Use precise, evidence-based, non-generic language; Each level must be clearly distinguishable; Strong = rare, exceptional signals.
    ANTI-GENERIC CONSTRAINT: If the rubric can apply equally to ALL roles, REWRITE it to be role-specific.

    ---------------------------------------
    Return ONLY valid JSON:
    {
      "resume_screening_rubrics": [
        { "parameter": "", "poor": "", "borderline": "", "good": "", "strong": "" }
      ],
      "interview_evaluation_rubrics": [
        { "parameter": "", "poor": "", "borderline": "", "good": "", "strong": "" }
      ]
    }

    Job Description context:
    ${jdText.substring(0, 3000)}
  `;

  try {
    const model = getGeminiModel(modelName);
    console.log(`[rubric-generator] Using ${modelName}...`);
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Clean JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?|```/g, "").trim();
    
    const parsed = JSON.parse(cleanJson);
    return {
      resume_screening_rubrics: parsed.resume_screening_rubrics || [],
      interview_evaluation_rubrics: parsed.interview_evaluation_rubrics || []
    };
  } catch (error: any) {
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('Service Unavailable');
    console.error(`[rubric-generator] Failed with ${modelName}:`, error?.message);
    lastError = error;
    if (!is503) break; // Only retry on 503, not other errors
  }
}

  // All models failed
  console.error(`[rubric-generator] All models failed for ${category}.`);
  return { resume_screening_rubrics: [], interview_evaluation_rubrics: [] };
}
