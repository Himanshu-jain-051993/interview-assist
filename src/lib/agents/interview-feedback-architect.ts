import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface RoundInput {
  roundType: string;
  transcriptText: string;
  interviewerNotes: string;
}

export interface PreviousRoundFeedback {
  roundType: string;
  cumulativeScore: number | null;
  aiFeedbackJson: any;
  createdAt: Date | string;
}

export async function evaluateInterviewRound(
  candidate: any,
  role: any,
  rubrics: any[],
  currentRound: RoundInput,
  previousRounds: PreviousRoundFeedback[]
): Promise<any> {
  // Use gemini-2.5-pro for top-quality interview evaluation
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  });

  const previousFeedbackText =
    previousRounds.length === 0
      ? "No previous rounds. This is the first evaluation."
      : previousRounds
          .map(
            (r, i) =>
              `Round ${i + 1} — ${r.roundType} (Score: ${r.cumulativeScore ?? "N/A"}):\n${JSON.stringify(r.aiFeedbackJson, null, 2)}`
          )
          .join("\n\n---\n\n");

  const rubricList = rubrics
    .map((r) => `- ${r.parameter}: Poor="${r.poor_level || r.poor || 'N/A'}" | Good="${r.good_level || r.good || 'N/A'}" | Strong="${r.strong_level || r.strong || 'N/A'}"`)
    .join("\n");

  const prompt = `
ROLE: You are the Hiring Committee Lead. Your goal is to produce a high-fidelity, balanced evaluation by auditing AI evidence against human sentiment.

DATA SOURCES:

ROLE RUBRICS:
${rubricList}

CANDIDATE INFO:
Name: ${candidate.name}
Role: ${role.title} (${role.category} - ${role.level})
${role.job_description}

ALL PREVIOUS ROUND FEEDBACK:
${previousFeedbackText}

CURRENT ROUND (${currentRound.roundType}) TRANSCRIPT:
${currentRound.transcriptText || "(No transcript provided)"}

CURRENT ROUND (${currentRound.roundType}) INTERVIEWER NOTES:
${currentRound.interviewerNotes || "(No notes provided)"}

GOVERNANCE RULES & EDGE-CASE HANDLING:

Rule 1: Attribute-Specific Isolation (Anti-Skewing)
Human notes MUST only influence the specific rubric parameter they explicitly reference.

Rule 2: Conflict Audit (The 70/30 Threshold)
Apply the 70% human weightage ONLY if the human provides a specific technical or behavioral justification.

Rule 3: Technical Overrule
If transcript evidence contradicts interviewer perception, cite transcript as Ground Truth.

Rule 4: Cumulative Re-Weighting
Highlight outlier interviewers vs. consistent feedback across rounds.

OUTPUT SPECIFICATION (JSON ONLY, NO MARKDOWN, NO CODE BLOCKS):
{
  "roundScore": 85,
  "cumulativeScore": 82,
  "hiringThesis": "A 3-sentence summary of the Hiring Thesis.",
  "verdict": "Strong hire | Hire | Lean hire | Lean no hire | No hire",
  "skewAlert": "Explicitly list any parameters where the score was significantly lowered by human subjectivity despite technical competence.",
  "evaluationSummary": "2-3 sentence executive summary of this round",
  "hiringConfidenceIndex": 85,
  "recommendedNextStep": "Proceed to Final | Reject | Make Offer",
  "strengths": ["Strength 1"],
  "weaknesses": ["Gap 1"],
  "rubricEvaluations": [
    {
      "parameter": "Fetched from ROLE RUBRICS",
      "grade": "Poor | Borderline | Good | Strong",
      "score": 1, // MUST BE AN INTEGER 1 TO 4 (1=Poor, 2=Borderline, 3=Good, 4=Strong)
      "aiEvidence": "Specific quote or paraphrase from the transcript.",
      "justification": "Explain EXACTLY why this score was given.",
      "interviewerInfluence": "How much the human notes shifted this specific grade.",
      "conflictAudit": "Mandatory if AI evidence is Strong but Human note is Poor.",
      "subjectivityWarning": true,
      "secondaryMarkerScore": 1 // MUST BE AN INTEGER 1 TO 4
    }
  ]
}

STRICT RULE: roundScore and cumulativeScore MUST be on a 0 to 100 scale.
VERDICT MAPPING RULE:
- Score >= 85: "Strong hire"
- Score >= 70: "Hire"
- Score >= 55: "Lean hire"
- Score >= 40: "Lean no hire"
- Score < 40: "No hire"
Choose the verdict that EXACTLY matches the cumulativeScore.
`;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FeedbackArchitect] Attempt ${attempt}/${MAX_RETRIES} — ${currentRound.roundType} for ${candidate.name}`);
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[FeedbackArchitect] Response received, length: ${text.length}`);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err: any) {
      const msg: string = err?.message ?? "Unknown error";
      const isRateLimit = msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("RESOURCE_EXHAUSTED");
      if (isRateLimit && attempt < MAX_RETRIES) {
        const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
        console.log(`[FeedbackArchitect] Rate limited. Waiting ${waitSec}s…`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw new Error(`AI Evaluation failed: ${msg}`);
    }
  }
  throw new Error("Max retries exceeded.");
}
