import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize genAI lazily to ensure environment variables are loaded
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

// Use gemini-2.5-flash (gemini-1.5-flash was deprecated, 2.0-flash free tier exhausted)
const GEMINI_MODEL = "gemini-2.5-flash";

function getModel() {
    if (!genAI) {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_AI_API_KEY is not defined in environment variables");
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ 
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });
    }
    return model;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateInterviewGuide(candidate: any, role: any, rubrics: any[]) {
    const model = getModel();

    // Summarize profile data if it's potentially too large (though Gemini 1.5 Flash handles 1M tokens)
    const profileJson = JSON.stringify(candidate.profile_data);
    const profileSummary = profileJson.length > 5000 
        ? profileJson.substring(0, 5000) + "... [Profile Truncated for token optimization]" 
        : profileJson;

    console.log("DEBUG: Agent Payload:", {
        candidateId: candidate.id,
        roleId: role.id,
        rubricsCount: rubrics.length,
        profileDataPreview: profileSummary.substring(0, 50)
    });

    const systemPrompt = `
ROLE: You are the Lead Interview Architect for Zomato. Your task is to generate a high-stakes, evidence-based interview guide.

CORE OBJECTIVE: Generate questions that probe the "Marrow" of a candidate's experience by cross-referencing their Resume against the Job Description and the Modular Rubrics.

STRICT TERMINOLOGY: Never use abbreviations. Always use Product Manager and Software Engineer in full.

EVALUATION DIMENSIONS:
1. Product Management Dimensions
- Analytical Rigor: Move beyond basic A/B testing into Counter-Metric Analysis (the negative impact on unrelated metrics) and Cohort Longitudinality (how behavior changes over 6 months, not just 6 days).
- Strategy: Focus on Competitive Moats (network effects, switching costs) and Inversion Thinking (identifying why a seemingly great idea will absolutely fail).
- Execution: Probe for Trade-off Philosophy—how they decide what not to build when two "Strong" priority features conflict.

2. Software Engineering Dimensions
- Architecture: Focus on Elasticity (scaling down as well as up) and Blast Radius Management (ensuring a failure in one microservice cannot cascade).
- Concurrency: Probe for Idempotency (ensuring a retried request doesn't double-charge a user) and State Consistency across distributed caches.
- Operations: Evaluate Mean Time to Recovery (MTTR) and the ability to conduct a Blameless Post-mortem that results in code-level fixes, not just process changes.

INSTRUCTIONAL BLUEPRINT:
For every category (Screening, Technical R1/R2, Culture), you must apply the following Dimension Filters:
- The Behavioral Anchor: Start every technical probe with: "In your time at [Company], you mentioned [Metric/Project]."
- The Success/Failure Inversion: If they discuss a success, ask: "What was the most significant trade-off or 'hidden cost' of that success?" If they discuss a failure, ask: "How did your root cause analysis change the way you designed your next system?"
- The Rubric Stress Test:
    * For Product Manager: Probe for Simpson’s Paradox—ask if a positive top-line metric was actually masking a negative trend in a sub-segment.
    * For Software Engineer: Probe for P99 Latency—ask about the specific database or network constraints that prevented them from reaching the next order of magnitude in scale.

SPECIFIC ROUND INSTRUCTIONS:
- Category 1: Screening Round: Identify the "Delta" between their previous domain and Zomato. Ask: "How does your experience with [Previous Domain]'s constraints prepare you for the high-concurrency, low-latency environment of Zomato?"
- Category 2: Technical Assessments (Rounds 1 & 2): 
    * Product Manager: Focus on Decision Science. Give them a scenario where data is conflicting and ask them to defend a "High-Conviction" bet using the Problem Decomposition rubric.
    * Software Engineer: Focus on Concurrency and Observability. Ask: "Describe a 'Silent Failure' you encountered where all dashboards were green but users were failing. How did you improve your OpenTelemetry tracing to catch that?"
- Category 3: Culture & Behavioral: Probe for controversial pivots. Ask: "Describe a time you had to kill a project that a senior stakeholder was emotionally attached to. What specific data or collaborative framework did you use to win buy-in for that decision?"

CONTEXT:
- Role: ${role.title} (Category: ${role.category})
- JD: ${role.job_description}
- Candidate: ${candidate.name}
- Profile: ${profileSummary}
- Available Rubrics: ${rubrics.map(r => r.parameter).join(", ")}

OUTPUT FORMAT REQUIREMENTS:
- You MUST generate EXACTLY 3 questions for EACH category: Screening, Technical R1, Technical R2, and Culture.
- Total of 12 questions minimum across all 4 categories.
- Each question must reference the candidate's specific experience from their profile.
- Return ONLY valid JSON. No markdown, no code fences.

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
        },
        { "question": "...", "rubricParameter": "...", "lookFor": { "strong": "...", "poor": "..." } },
        { "question": "...", "rubricParameter": "...", "lookFor": { "strong": "...", "poor": "..." } }
      ]
    },
    {
      "category": "Technical R1",
      "questions": [ {}, {}, {} ]
    },
    {
      "category": "Technical R2",
      "questions": [ {}, {}, {} ]
    },
    {
      "category": "Culture",
      "questions": [ {}, {}, {} ]
    }
  ]
}
`;

    console.log("DEBUG: Sending prompt to Gemini for candidate:", candidate.name);
    
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`DEBUG: Attempt ${attempt}/${MAX_RETRIES} using model ${GEMINI_MODEL}`);
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const text = response.text();
            console.log("DEBUG: Model response received, length:", text.length, " preview:", text.substring(0, 100));
            
            try {
                return JSON.parse(text);
            } catch (parseError) {
                console.error("DEBUG: Failed to parse model response as JSON:", text.substring(0, 500));
                throw new Error("Model generated invalid JSON");
            }
        } catch (modelError: any) {
            const errorMessage: string = modelError?.message || "Unknown model error";
            console.error(`DEBUG: Attempt ${attempt} failed:`, errorMessage);

            // Check for 429 rate limit — extract retry delay
            const is429 = errorMessage.includes("429") || errorMessage.includes("Too Many Requests") || errorMessage.includes("RESOURCE_EXHAUSTED");
            if (is429 && attempt < MAX_RETRIES) {
                const retryMatch = errorMessage.match(/retry in (\d+(?:\.\d+)?)s/i);
                const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
                console.log(`DEBUG: Rate limited. Waiting ${waitSeconds}s before retry...`);
                await sleep(waitSeconds * 1000);
                continue;
            }

            // Provide specific error details
            if (is429) {
                throw new Error(`Rate limit exceeded for model ${GEMINI_MODEL}. Please wait a minute and try again. (${errorMessage.substring(0, 200)})`);
            }
            throw new Error(`AI Generation failed: ${errorMessage}`);
        }
    }
    throw new Error("Max retries exceeded. Please try again later.");
}
