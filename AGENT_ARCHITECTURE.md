# Interview Assist: Agentic Architecture

This document outlines the multi-agent system powering the Interview Assist application, defining the orchestrator, specific sub-agents, their exact responsibilities, and the diverse data environments they interact with.

---

## 🏗️ The Orchestrator (Next.js API Layer)
Rather than an LLM autonomously wandering through your system, **Next.js API Routes** act as the deterministically coded Orchestrator. 

**What it does:**
1. **Routing & Triggering:** It listens to human interactions in the frontend UI (e.g., clicking "Generate Guide" or "Generate AI Feedback").
2. **Data Fetching:** It queries the Supabase database (via Prisma) to gather necessary context before calling any LLMs.
3. **Delegation:** It constructs highly specific prompts by injecting the fetched data and delegates the execution to one of the specialized sub-agents below.
4. **Tool Access:** It possesses file parsing tools (`mammoth` for DOCX, `pdf-parse` for PDF) and feeds the extracted flat text into the agents.

---

## 🤖 Specialized Sub-Agents

The system uses three primary sub-agents. Each one is a heavily context-scoped prompt powered by the **Gemini 2.5 Flash** model. They are strictly designed to output enforced schemas (typically JSON) rather than chitchat.

### 1. The Interview Architect (`interview-architect.ts`)
**Use Case:** Pre-interview preparation. Generates highly customized interview questions and scoring guides tailored to a specific candidate's resume and the company's job description.
**How it behaves:** 
- It maps the candidate’s past projects directly to the required rubrics (e.g., asking how a candidate's specific "SQL Migration" project scales to prove their "Analytical Rigor").
**Data Receptors:**
- Structured DB Data: `Candidate` (resume JSON), `Role` (JD text), `Rubric` (definitions).

### 2. The Transcript Synthesizer (`transcript-synthesizer.ts`)
**Use Case:** Post-interview data ingestion. Cleans up messy, uploaded interview transcripts into a structured "Dialogue Map".
**How it behaves:**
- Acts as a high-fidelity analyst. It reads Raw Text and extracts questions, answers, and explicit data/metric points without hallucinating or rounding numbers.
**Data Receptors:**
- Unstructured Data: Raw text extracted from `.docx` or `.pdf` files.
- Configuration: Job context (Role Title/Level) to anchor extraction logic.

### 3. The Hiring Committee Lead / Feedback Architect (`interview-feedback-architect.ts`)
**Use Case:** Evaluation and decision science. Analyzes the interviewer's notes alongside the actual transcript to grade the candidate and produce a hiring recommendation.
**How it behaves:**
- **Attribute Isolation:** It scores candidates on specific rubrics (e.g., "Architecture").
- **Conflict Audit:** It applies a 70/30 weight logic. It gives heavier weight to Human Notes, but if the human note is wildly subjective ("bad vibes") and conflicts with objective transcript data ("answered the caching question perfectly"), the AI flags a "Skew Alert" or "Subjectivity Warning".
- **Cumulative Tracking:** It reads the results of *Previous Rounds* to note if a candidate mitigated a gap or validated a strength over time.
**Data Receptors:**
- Unstructured Data: Current Round Interviewer Notes (Text), Current Round Transcript (Text).
- Structured DB Data: Previous `InterviewRound` Feedback JSON history, `Rubric` grading definitions.

---

## 🗄️ Data Flow & Storage

Our ecosystem runs on a hybridized data approach, querying SQL tables and processing unstructured data as required:

1. **Relational Data (Supabase / PostgreSQL via Prisma):**
   - **`Role`:** Source of truth for Job Descriptions and hiring parameters.
   - **`Candidate`:** Source of truth for applicant profiles.
   - **`Rubric`:** The grading yardstick.
   - **`InterviewRound`:** Stores the final AI-generated JSON so it can be queried easily by the frontend without re-generating logic.

2. **Unstructured File Parsing (Memory):**
   - Transcripts (`.pdf`, `.docx`) and Notes (`.txt`) are not stored perpetually in cloud storage right now. They are uploaded, rapidly parsed into string text in memory by the Orchestrator, fed into the context window of standard LLM requests, and the resulting insights are stored in the DB.

3. **Retrieval-Augmented Generation (RAG):**
   - *Current State:* The system is currently relying on **Direct Context Injection** rather than a Vector Database for standard RAG. Because a standard JD, Resume, and Interview Transcript fit easily within Gemini's context window (up to millions of tokens), we inject the exact full-text variables directly into the prompt templates without chunking or vectorizing them.
   - *Future State:* If we begin parsing thousands of historical interviews to find "similar candidates", the Supabase `vector` extension exists in the Prisma schema to support pgvector nearest-neighbor RAG later!
