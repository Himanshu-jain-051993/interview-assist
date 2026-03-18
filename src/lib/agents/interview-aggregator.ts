
import { getGeminiModel, withRetry } from "@/lib/gemini-utils";

export async function summarizeInterviewHistory(candidateName: string, roleTitle: string, rounds: any[]) {
  const model = getGeminiModel();

  const historyText = rounds.map((r, i) => {
    const feedback = r.ai_feedback_json || {};
    return `Round ${i + 1} (${r.round_type}):
Summary: ${feedback.evaluationSummary || feedback.summary || "No summary"}
Verdict: ${r.verdict || "None"}
Score: ${Math.round(r.cumulative_score || 0)}%
Hiring Thesis: ${feedback.hiringThesis || "None"}
Strengths: ${(feedback.strengths || []).join(", ")}
Weaknesses: ${(feedback.weaknesses || []).join(", ")}
`;
  }).join("\n---\n");

  const prompt = `
    You are a Senior Hiring Committee Lead. Summarize the interview performance of ${candidateName} for the role of ${roleTitle}.
    
    TRANSCRIPT HISTORIES:
    ${historyText}

    TASK:
    Generate a HIGH-DENSITY, 150-200 WORD summary that synthesizes the candidate's journey across all rounds.
    - Be objective and specific.
    - Highlight the most important findings and signals (both positive and negative).
    - Mention technical mastery, problem-solving depth, and cultural alignment.
    - Do not use bullet points or lists. 
    - Use a single, professional narrative flow.
    - Output ONLY the 150-200 word summary text.
  `;

  return withRetry(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });
}
