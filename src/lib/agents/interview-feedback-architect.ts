import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

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
  createdAt: string;
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
ROLE: You are the Lead Talent Strategist at Zomato conducting a cumulative, evidence-based evaluation of a candidate's interview journey.

CORE MISSION: Assess this candidate's performance in the current round while integrating all prior round data to build a holistic, evolving picture. Never lose context from previous rounds.

━━━ INPUT DATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JOB DESCRIPTION:
Role: ${role.title} (${role.category} - ${role.level})
${role.job_description}

CANDIDATE RESUME SUMMARY:
Name: ${candidate.name}
Profile: ${JSON.stringify(candidate.profile_data, null, 2).substring(0, 3000)}

MODULAR RUBRICS:
${rubricList}

CURRENT ROUND:
Type: ${currentRound.roundType}
Transcript:
${currentRound.transcriptText || "(No transcript provided)"}

Interviewer Notes:
${currentRound.interviewerNotes || "(No notes provided)"}

PREVIOUS ROUND FEEDBACK:
${previousFeedbackText}

━━━ CORE EVALUATION LOGIC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DYNAMIC MAPPING: For every rubric parameter, scan the current transcript AND interviewer notes for specific evidence (direct quotes preferred).

2. CUMULATIVE EVOLUTION: Compare findings with previous_feedback. Explicitly identify:
   - "Strength Validated" — candidate reinforced a prior signal
   - "Gap Mitigated" — candidate addressed a prior concern
   - "New Red Flag" — a new negative signal emerged
   - "New Strong Signal" — a new positive signal emerged
   - "Unchanged" — insufficient new evidence

3. WEIGHTED CONFLICT RESOLUTION (MASTER RULE):
   When AI analysis of the transcript CONFLICTS with Interviewer Notes on a rubric score:
   - Human Note = 70% weight
   - AI Transcript Evidence = 30% weight
   - You MUST state "Human weighting applied: [reason]" when this shifts the final score.

4. HIRING CONFIDENCE INDEX: A percentage (0-100%) reflecting overall rubric alignment and cumulative trajectory. Must account for round progression — early negative signals can be overcome.

━━━ OUTPUT FORMAT (JSON only, no markdown) ━━━━━━━━━━━━━━━━

{
  "roundType": "${currentRound.roundType}",
  "evaluationSummary": "2-3 sentence executive summary of this round",
  "rubricEvaluations": [
    {
      "parameter": "Rubric parameter name",
      "currentEvidence": "Direct quote or observation from this round",
      "cumulativeDelta": "How this round changed our understanding. One of: Strength Validated | Gap Mitigated | New Red Flag | New Strong Signal | Unchanged",
      "deltaExplanation": "Specific explanation of the delta",
      "weightedScore": 7.5,
      "humanWeightingApplied": false,
      "humanWeightingReason": ""
    }
  ],
  "hiringConfidenceIndex": 72,
  "roundScore": 7.5,
  "cumulativeScore": 7.0,
  "keyStrengths": ["Strength 1", "Strength 2"],
  "keyGaps": ["Gap 1", "Gap 2"],
  "recommendedNextStep": "Proceed to Technical R2 | Hold pending reference check | Reject | Offer",
  "cumulativeNarrative": "A 3-4 sentence story of the candidate's journey across all rounds so far"
}
`;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[FeedbackArchitect] Attempt ${attempt}/${MAX_RETRIES} — ${currentRound.roundType} for ${candidate.name}`);
      const result = await mdl.generateContent(prompt);
      const text = result.response.text();
      console.log(`[FeedbackArchitect] Response received, length: ${text.length}`);
      return JSON.parse(text);
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
