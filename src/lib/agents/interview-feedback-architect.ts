import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

function getModel() {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not defined");
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });
  }
  return model;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
  const mdl = getModel();

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
    .map((r) => `- ${r.parameter}: Poor="${r.poor}" | Good="${r.good}" | Strong="${r.strong}"`)
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
Example: If a note says "Candidate was rude," this heavily weights the Culture Fit or Execution & Stakeholder Orchestration rubric. It is FORBIDDEN to let this sentiment reduce the score for Analytical Rigor or System Architecture if the transcript shows technical mastery.

Rule 2: Conflict Audit (The 70/30 Threshold)
Apply the 70% human weightage ONLY if the human provides a specific technical or behavioral justification.
Edge Case (Vague Subjectivity): If an interviewer provides a subjective label (e.g., "proud," "not a fit," "bad vibes") without a supporting transcript example (e.g., interrupting the interviewer, dismissing feedback), the AI must:
- Assign the 70% weight to the human score.
- Flag a "Subjectivity Warning": Note that the score is human-skewed and lacks transcript-backed evidence.
- Maintain the AI's objective evidence-based score as a "Secondary Marker."

Rule 3: Technical Overrule
If an interviewer notes "Struggled with SQL," but the transcript shows the candidate correctly articulated and solved a complex JOIN or WINDOW FUNCTION, the AI should:
- Note the human's perception.
- Maintain a "Good/Strong" rating for the technical skill, citing the transcript as the Ground Truth.

Rule 4: Cumulative Re-Weighting
If one interviewer is an outlier (highly negative) while three other transcripts show consistent high performance, the AI must highlight the "Outlier Dissonance" in the final summary.

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
      "score": 1-4,
      "aiEvidence": "Specific quote or paraphrase from the transcript proving technical/strategic depth for this parameter.",
      "justification": "Explain EXACTLY why this score was given. State clearly: (1) what the candidate demonstrated that prevented a lower score, and (2) what was missing or insufficient that prevented a higher score. Be specific and reference the rubric criteria.",
      "interviewerInfluence": "How much the human notes shifted this specific grade.",
      "conflictAudit": "Mandatory if the AI evidence is 'Strong' but the Human note is 'Poor'. Explain why the final grade landed where it did.",
      "subjectivityWarning": true,
      "secondaryMarkerScore": 1-4
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
      const result = await mdl.generateContent(prompt);
      const text = result.response.text();
      console.log(`[FeedbackArchitect] Response received, length: ${text.length}`);
      // Clean markdown if present - be more aggressive with JSON extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text.replace(/```json\n?|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err: any) {
      const msg: string = err?.message ?? "Unknown error";
      const is429 = msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < MAX_RETRIES) {
        const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
        console.log(`[FeedbackArchitect] Rate limited. Waiting ${waitSec}s…`);
        await sleep(waitSec * 1000);
        continue;
      }
      throw new Error(`AI Evaluation failed: ${msg}`);
    }
  }
  throw new Error("Max retries exceeded.");
}

