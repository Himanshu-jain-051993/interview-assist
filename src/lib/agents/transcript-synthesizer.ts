import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

const GEMINI_MODEL = "gemini-2.5-flash";

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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DialogueTurn {
  speakerRole: "Interviewer" | "Candidate";
  mainQuestion?: string;
  answerSummary?: string;
  followUps: Array<{ question: string; response: string }>;
}

export interface SynthesizedTranscript {
  roleContext: string;
  candidateName: string;
  interviewDate?: string;
  totalTurns: number;
  dialogueMap: DialogueTurn[];
  keyMetrics: string[];
  overallSignals: {
    strengths: string[];
    concerns: string[];
  };
}

export async function synthesizeTranscript(
  rawText: string,
  candidateName: string
): Promise<SynthesizedTranscript> {
  const activeModel = getModel();

  const systemPrompt = `
ROLE: You are a High-Fidelity Transcript Analyst specializing in technical interview assessment.

CORE OBJECTIVE: Convert raw interview transcript text into a structured JSON "Dialogue Map" that preserves all quantitative evidence and speaker intent.

STRICT RULES:
1. You are FORBIDDEN from rounding or omitting specific metrics — preserve exact numbers for latency, revenue, team sizes, percentages, time durations, and all other quantitative data.
2. Never use abbreviations. Always write Product Manager and Software Engineer in full.
3. Maintain all speaker labels: distinguish "Interviewer" from "Candidate" statements.
4. If a speaker label is ambiguous, infer it from context (questions → Interviewer, answers → Candidate).

EXTRACTION SCHEMA:
- roleContext: Determine if this is for a Senior Product Manager, Staff Software Engineer, or other role. State it in full.
- candidateName: Extract or use provided name: "${candidateName}".
- interviewDate: Extract if mentioned in transcript, otherwise null.
- totalTurns: Count of distinct question→answer exchanges.
- dialogueMap: For every question-answer exchange, extract:
  * speakerRole: "Interviewer" or "Candidate"
  * mainQuestion: The exact query posed (Interviewer's turn)
  * answerSummary: Dense, evidence-rich summary of the Candidate's response — preserve ALL specific metrics (e.g., "reduced P99 latency from 340ms to 28ms", "managed team of 47 engineers")
  * followUps: Array of any subsequent "Why"/"How" probing questions and the Candidate's resulting defense
- keyMetrics: A flat list of every quantitative data point mentioned (e.g., "50M daily requests", "23% revenue uplift", "team of 12")
- overallSignals: 
  * strengths: Bullet list of distinct competency signals the Candidate demonstrated
  * concerns: Bullet list of gaps, vague answers, or missing depth

INPUT TRANSCRIPT:
---
${rawText}
---

Return ONLY valid JSON matching this exact structure:
{
  "roleContext": "string",
  "candidateName": "string",
  "interviewDate": "string or null",
  "totalTurns": number,
  "dialogueMap": [
    {
      "speakerRole": "Interviewer",
      "mainQuestion": "string",
      "answerSummary": "string",
      "followUps": [
        { "question": "string", "response": "string" }
      ]
    }
  ],
  "keyMetrics": ["string"],
  "overallSignals": {
    "strengths": ["string"],
    "concerns": ["string"]
  }
}
`;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[TranscriptSynthesizer] Attempt ${attempt}/${MAX_RETRIES}...`);
      const result = await activeModel.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      console.log(`[TranscriptSynthesizer] Response received, length: ${text.length}`);
      return JSON.parse(text) as SynthesizedTranscript;
    } catch (error: any) {
      const msg: string = error?.message || "Unknown error";
      const isRateLimit =
        msg.includes("429") ||
        msg.includes("Too Many Requests") ||
        msg.includes("RESOURCE_EXHAUSTED");

      console.error(`[TranscriptSynthesizer] Attempt ${attempt} failed: ${msg}`);

      if (isRateLimit && attempt < MAX_RETRIES) {
        const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
        console.log(`[TranscriptSynthesizer] Rate limited. Waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
        continue;
      }
      throw new Error(`[TranscriptSynthesizer] Generation failed: ${msg}`);
    }
  }
  throw new Error("[TranscriptSynthesizer] Max retries exceeded.");
}
