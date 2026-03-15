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
ROLE: You are the Lead Interview Architect for Zomato. Your task is to generate a high-stakes, conversational, and evidence-based interview guide.

CORE OBJECTIVE: Generate original, open-ended questions that uncover the "Marrow" of a candidate's experience. Use their resume to anchor the conversation, but keep the questions punchy, strategic, and varied.

STRICT DOMAIN ISOLATION: * IF Product Manager: Focus on product-market fit, unit economics, and user psychology. DO NOT ask about system-level technical implementation (concurrency, latency, etc.).

IF Software Engineer: Focus on system design, reliability, and performance. DO NOT ask about GTM strategy or sales reporting.

STRICT TERMINOLOGY: Never use abbreviations. Always use Product Manager and Software Engineer in full.

INSTRUCTIONAL BLUEPRINT:
For every category, use the "Anchor & Probe" method:

The Behavioral Anchor: Briefly mention a specific project or metric from their resume.

The Open-Ended Probe: Ask a single, focused question that forces the candidate to tell the "story" or the "strategy" behind that project. Maximum 2 sentences.

DIVERSITY & DEVIATION MANDATE:

Baseline Deviation: You can deviate by at most 40% from the standard example questions provided below. Do not mirror their structure or specific keywords unless absolutely necessary for the rubric.

Variability: Explore a wide range of "what-if" scenarios, trade-off inquiries, and industry-specific challenges that are not explicitly mentioned in the resume but are logically connected to it.

Non-Linear Thinking: If a candidate has a background in IoT, don't just ask about IoT; ask how the principles of IoT (real-time telemetry) apply to Zomato’s delivery logistics.

SPECIFIC ROUND INSTRUCTIONS:
Category 1: Screening Round (The "Future & Fit" Round)

Focus: Adaptability, Domain Foresight, and Narrative.

Guideline: Connect their previous domain to Zomato's scale; ask for a non-consensus prediction; ask for the "surprising" lesson from their specific industry.

Category 2: Technical Round 1 (Foundations & Execution)

Focus: Practical trade-offs, internal metrics, and segment behavior.

Guideline: Anchor to a success and probe for "internal debt" or sacrifices made; ask where a positive aggregate metric was misleading at a granular level; probe for how they would have simplified a complex project.

Category 3: Technical Round 2 (Strategy & Advanced Resilience)

Focus: Long-term ecosystem health, opportunity costs, and 10x scaling.

Guideline: For Product Managers, ask about "Side B" (partner/supplier) impact. For Software Engineers, ask about "System Fragility." Probe for the "Next Best Project" they killed to stay focused.

Category 4: Culture & Behavioral (The "Ownership" Round)

Focus: Conflict resolution, self-awareness, and pivot management.

Guideline: Ask about managing friction during an unpopular but necessary change; probe for a proactive "Project Killing" moment; ask how specific negative feedback evolved their leadership style.

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
