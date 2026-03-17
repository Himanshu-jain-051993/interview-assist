
import { getGeminiModel } from "@/lib/gemini-utils";

/**
 * Generates an interview guide tailored to the candidate's gaps and the job description.
 * Rebuilt for Paid Tier: Direct execution, no custom retry loops.
 */
export async function generateInterviewGuide(candidate: any, role: any, rubrics: any[]) {
    const model = getGeminiModel();

    const profileJson = JSON.stringify(candidate.profile_data);
    const profileSummary = profileJson.length > 10000 
        ? profileJson.substring(0, 10000) + "... [Profile Truncated]" 
        : profileJson;

    const systemPrompt = `
ROLE: You are the Lead Interview Architect for Zomato. Your task is to generate a high-stakes, conversational, and evidence-based interview guide.

CORE OBJECTIVE: Generate original, open-ended questions that uncover the "Marrow" of a candidate's experience. Use their resume to anchor the conversation.

CONTEXT:
- Role: ${role.title} (Category: ${role.category})
- JD: ${role.job_description}
- Candidate: ${candidate.name}
- Profile: ${profileSummary}
- Available Rubrics: ${rubrics.map(r => r.parameter).join(", ")}

OUTPUT FORMAT REQUIREMENTS:
Generate EXACTLY 3 questions for EACH category (Screening, Technical R1, Technical R2, Culture).
Total of 12 questions minimum.
Return ONLY valid JSON. No markdown, no code fences.

OUTPUT FORMAT (JSON):
{
  "guide": [
    {
      "category": "Screening",
      "questions": [
        {
          "question": "The question text",
          "rubricParameter": "The parameter name from the rubrics",
          "lookFor": {
            "strong": "Strong signal signs",
            "poor": "Poor signal signs"
          }
        }
      ]
    },
    { "category": "Technical R1", "questions": [...] },
    { "category": "Technical R2", "questions": [...] },
    { "category": "Culture", "questions": [...] }
  ]
}
`;

    try {
        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();
        
        // Clean up markdown fences if AI included them
        let cleanJson = text.trim();
        if (cleanJson.startsWith("```json")) cleanJson = cleanJson.replace(/```json|```/g, "").trim();
        
        return JSON.parse(cleanJson);
    } catch (error: any) {
        console.error("DEBUG: Guide Generation Failed:", error.message);
        throw new Error(`AI Guide Generation failed: ${error.message}`);
    }
}
