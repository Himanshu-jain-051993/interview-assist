import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateInterviewRound } from "@/lib/agents/interview-feedback-architect";

// ─── GET /api/interview-rounds?candidateId=xxx ───────────────────────────────
export async function GET(req: NextRequest) {
  const candidateId = req.nextUrl.searchParams.get("candidateId");
  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  }

  try {
    const rounds = await prisma.$queryRaw<any[]>`
      SELECT * FROM "InterviewRound"
      WHERE candidate_id = ${candidateId}
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ rounds });
  } catch (err) {
    console.error("[interview-rounds GET]", err);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

import mammoth from "mammoth";
// Fix for DOMMatrix undefined error in pdf-parse on Next.js Serverless
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const runtime = "nodejs";

async function extractTextFromFile(file: File | null): Promise<string> {
  if (!file) return "";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } else if (fileName.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text || "";
  } else if (fileName.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  return "";
}

// ─── POST /api/interview-rounds ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const candidateId = formData.get("candidateId") as string | null;
    const roleId = formData.get("roleId") as string | null;
    const roundType = formData.get("roundType") as string | null;
    const transcriptFile = formData.get("transcriptFile") as File | null;
    const notesFile = formData.get("notesFile") as File | null;

    if (!candidateId || !roleId || !roundType) {
      return NextResponse.json(
        { error: "candidateId, roleId, and roundType are required" },
        { status: 400 }
      );
    }

    const transcriptText = await extractTextFromFile(transcriptFile);
    const interviewerNotes = await extractTextFromFile(notesFile);

    // 1. Fetch candidate + role + rubrics ──────────────────────────────────
    const candidate: any = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const role: any = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const rubrics = await prisma.$queryRaw<any[]>`SELECT * FROM "Rubric" WHERE category = ${role.category}`;

    // 2. Fetch ALL previous rounds for this candidate (ordered by time) ────
    const previousRounds = await prisma.$queryRaw<any[]>`
      SELECT round_type, cumulative_score, ai_feedback_json, created_at
      FROM "InterviewRound"
      WHERE candidate_id = ${candidateId}
      ORDER BY created_at ASC
    `;

    console.log(`[interview-rounds] Evaluating ${roundType} for ${candidate.name}, previous rounds: ${previousRounds.length}`);

    // 3. Call the AI agent ─────────────────────────────────────────────────
    const feedback = await evaluateInterviewRound(
      candidate,
      role,
      rubrics,
      { roundType, transcriptText, interviewerNotes },
      previousRounds.map((r) => ({
        roundType: r.round_type,
        cumulativeScore: r.cumulative_score,
        aiFeedbackJson: r.ai_feedback_json,
        createdAt: r.created_at,
      }))
    );

    const cumulativeScore: number = feedback.cumulativeScore ?? feedback.roundScore ?? null;

    // 4. Persist the round ─────────────────────────────────────────────────
    const roundId = `round_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await prisma.$executeRaw`
      INSERT INTO "InterviewRound"
        (id, candidate_id, role_id, round_type, transcript_text, interviewer_notes, ai_feedback_json, cumulative_score, created_at)
      VALUES
        (${roundId}, ${candidateId}, ${roleId}, ${roundType},
         ${transcriptText || null}, ${interviewerNotes || null},
         ${JSON.stringify(feedback)}::jsonb, ${cumulativeScore}, NOW())
    `;

    console.log(`[interview-rounds] Round saved: ${roundId}`);
    return NextResponse.json({ round: { id: roundId, roundType, cumulativeScore, aiFeedbackJson: feedback } });

  } catch (err) {
    console.error("[interview-rounds POST]", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
