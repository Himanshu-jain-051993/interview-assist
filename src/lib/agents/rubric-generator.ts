import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface GeneratedRubric {
  parameter: string;
  poor: string;
  borderline: string;
  good: string;
  strong: string;
}

/**
 * Generates a set of 6-8 rubrics for a specific category based on the JD.
 */
export async function generateRubricsForCategory(category: string, jdText: string): Promise<GeneratedRubric[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `
    You are a Strategic Hiring Lead at a top-tier firm. We have a new role in the category: "${category}".
    I need you to generate a set of 6-7 distinct Hiring Rubrics that will be used for both Resume Screening and Interview Evaluation.

    For each rubric, you must provide:
    1. parameter: (e.g., "Stakeholder Management", "Technical Architecture", "Resource Planning")
    2. poor: Description of a failing candidate.
    3. borderline: Description of a candidate who just barely passes.
    4. good: Description of a solid hire.
    5. strong: Description of an 'out of this world' candidate.

    Important Requirements:
    - The style should be professional, dense, and evidence-based (similar to McKinsey or top tech firm bar-raiser standards).
    - Ensure at least 2 rubrics are "Behavioral/Culture" and the rest are "Technical/Category-Specific".

    Return ONLY a JSON array of objects.

    Example Schema:
    [
      {
        "parameter": "Strategic Prioritization",
        "poor": "Lacks ability to weight impact vs effort...",
        "borderline": "Can prioritize within defined frameworks...",
        "good": "Consistently makes data-driven tradeoffs...",
        "strong": "Anticipates future bottlenecks and pivots resources ahead of time..."
      }
    ]

    Job Description context:
    ${jdText.substring(0, 3000)}
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Clean JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?|```/g, "").trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error(`[rubric-generator] Failed for ${category}:`, error);
    // Return empty array on failure so system doesn't crash, but user will see warning
    return [];
  }
}
