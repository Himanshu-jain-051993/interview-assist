# Interview Assist: Agentic Architecture

This document outlines the multi-agent system powering the Interview Assist application, defining the orchestrator, specific sub-agents, their exact responsibilities, and the diverse data environments they interact with.

---

## 🏗️ The Orchestrator (Next.js & Prisma)
The system is built on a deterministic **Next.js API layer** which acts as the central orchestrator, managing data flow between the UI, the PostgreSQL database, and the AI Agents.

**Core Responsibilities:**
1. **Context Assembly:** Fetches Job Descriptions, Candidate Resumes, and Historical Round data via Prisma to build a complete "Hiring Context."
2. **File Processing:** Real-time extraction of structured text from uploaded `.pdf` and `.docx` transcripts using `mammoth` and `pdf-parse`.
3. **Agent Delegation:** Routes requests to specialized agents based on the user's current workflow (Sourcing vs. Interviewing).
4. **Scoring Governance:** Directly calculates normalized 0-100 scores based on raw 1-4 rubric inputs from the AI to prevent "score hallucination."

---

## 🤖 Specialized Sub-Agents
The system leverages **Gemini 1.5 Flash** for its reasoning tasks, utilizing high-context windows to process entire transcripts without chunking.

### 1. The Resume Fit Architect
**Use Case:** Initial sourcing and screening.
**Logic:** Audits the candidate's resume against the role's performance rubrics. It produces an "Executive Summary" and a "Universal Fit Score" to help recruiters prioritize the pipeline.

### 2. The Interview Guide Architect
**Use Case:** Synchronous interview preparation.
**Logic:** Synthesizes the gaps identified during resume screening with the requirements of the job description. It generates a "Behavioral & Technical Guide" featuring tailored questions and "What to look for" (Good vs. Poor) signals.

### 3. The Hiring Committee Lead (`interview-feedback-architect.ts`)
**Use Case:** Post-interview evaluation and round synthesis.
**Logic:**
- **Sentiment Precedence (70/30 Rule):** The agent applies a heavy 70% weight to human interviewer notes. If a human identifies a cultural red flag, the AI prioritizes this over general transcript sentiment.
- **Conflict Audit:** If human observations ("candidate was vague") conflict with transcript evidence ("candidate gave a detailed 5-step answer"), the AI flags a **"Subjectivity Warning"** for the hiring manager.
- **Cumulative Synthesis:** Every new round evaluation reads the history of **all previous rounds**, allowing the AI to track if a candidate's "Weaknesses" from R1 were mitigated in R2.

---

## 🗄️ Data Flow & Storage

1. **Relational Database (PostgreSQL via Prisma):**
   - **`Role`**: Stores master Job Descriptions and categories.
   - **`Candidate`**: Tracks progress, current status, and average scores.
   - **`InterviewRound`**: Stores structured JSON feedback for every interaction, enabling the "Pipeline Timeline" view.
   - **`Rubric`**: Acts as the objective yardstick for all evaluations.

2. **In-Memory File Parsing:**
   - Transcripts and notes are processed as temporary buffers. Text is extracted, analyzed, and then discarded. Only the **AI-generated insights** (Evidence, Justification, Scores) are persisted for long-term review.

3. **Cumulative decision logic:**
   - The application maintains a "Portfolio Summary" for every candidate. This is a real-time synthesis that updates every time a new interview round is processed, giving the recruiter a single "Hiring Thesis" for the candidate's entire journey.
