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
    const rounds = await (prisma as any).interviewRound.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: "asc" }
    });
    return NextResponse.json({ rounds });
  } catch (err) {
    console.error("[interview-rounds GET]", err);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

import mammoth from "mammoth";
// Fix for DOMMatrix undefined error in pdf-parse on Next.js Serverless
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = function() {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = function() {};
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");

async function safePdfParse(buffer: Buffer): Promise<{ text: string }> {
  if (typeof pdf === 'function') return pdf(buffer);
  if (pdf.PDFParse) {
    const instance = new pdf.PDFParse({ data: buffer });
    const data = await instance.getText();
    await instance.destroy();
    return data || { text: "" };
  }
  if (pdf.default) return pdf.default(buffer);
  throw new Error("pdf-parse library error: No valid parsing function found.");
}

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
    const result = await safePdfParse(buffer);
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
    const interviewDate = formData.get("interviewDate") as string | null;
    const transcriptFile = formData.get("transcriptFile") as File | null;
    const notesFile = formData.get("notesFile") as File | null;

    if (!candidateId || !roleId || !roundType) {
      return NextResponse.json(
        { error: "candidateId, roleId, and roundType are required" },
        { status: 400 }
      );
    }

    const isPlaceholder = !transcriptFile && !notesFile;

    const transcriptText = await extractTextFromFile(transcriptFile);
    const interviewerNotes = await extractTextFromFile(notesFile);

    // 1. Fetch candidate + role + rubrics ──────────────────────────────────
    const candidate: any = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const role: any = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const rubrics = await (prisma as any).rubric.findMany({
      where: { category: role.category }
    });

    // 2. Fetch ALL previous rounds for this candidate (ordered by time) ────
    const previousRounds = await (prisma as any).interviewRound.findMany({
      where: { candidate_id: candidateId },
      select: {
        round_type: true,
        cumulative_score: true,
        ai_feedback_json: true,
        created_at: true
      },
      orderBy: { created_at: "asc" }
    });

    console.log(`[interview-rounds] Evaluating ${roundType} for ${candidate.name}, previous rounds: ${previousRounds.length}`);

    // 3. Call the AI agent if files are present ────────────────────────────
    let feedback: any = null;
    let cumulativeScore: number | null = null;
    
    if (transcriptText || interviewerNotes) {
      feedback = await evaluateInterviewRound(
        candidate,
        role,
        rubrics,
        { roundType, transcriptText, interviewerNotes },
        previousRounds.map((r: any) => ({
          roundType: r.round_type,
          cumulativeScore: r.cumulative_score,
          aiFeedbackJson: r.ai_feedback_json,
          createdAt: r.created_at,
        }))
      );
      cumulativeScore = feedback.cumulativeScore ?? feedback.roundScore ?? null;
      
      // AI now returns 0-100 directly. 
    }

    // 4. Persist the round ────────────────────────────────────────────────────
    // Only overwrite a prior round of the same type if we have actual transcript data.
    // Placeholder rounds (no transcript) are always addended as new slots.
    if (!isPlaceholder) {
      await (prisma as any).interviewRound.deleteMany({
        where: { candidate_id: candidateId, round_type: roundType }
      });
    }

    const roundId = `round_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const parsedDate = interviewDate ? new Date(interviewDate) : new Date();
    
    // Fallback Verdict Mapping
    let verdict = feedback?.verdict || null;
    if (!verdict && cumulativeScore !== null) {
      if (cumulativeScore >= 85) verdict = "Strong hire";
      else if (cumulativeScore >= 70) verdict = "Hire";
      else if (cumulativeScore >= 55) verdict = "Lean hire";
      else if (cumulativeScore >= 40) verdict = "Lean no hire";
      else verdict = "No hire";
    }
    
    await (prisma as any).interviewRound.create({
      data: {
        id: roundId,
        candidate_id: candidateId,
        role_id: roleId,
        round_type: roundType,
        transcript_text: transcriptText || null,
        interviewer_notes: interviewerNotes || null,
        ai_feedback_json: feedback ? (feedback as any) : null,
        cumulative_score: cumulativeScore,
        verdict: verdict,
        interview_date: parsedDate
      }
    });

    // 5. Update Candidate overall interview score (Already normalized to 100) ─
    if (cumulativeScore !== null) {
      await (prisma as any).candidate.update({
        where: { id: candidateId },
        data: { interview_score: cumulativeScore }
      });
    }

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


// ─── PATCH /api/interview-rounds (Rename Round) ──────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { roundId, newRoundType } = await req.json();
    if (!roundId || !newRoundType) {
      return NextResponse.json({ error: "roundId and newRoundType are required" }, { status: 400 });
    }

    await (prisma as any).interviewRound.update({
      where: { id: roundId },
      data: { round_type: newRoundType }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[interview-rounds PATCH]", err);
    return NextResponse.json({ error: "Failed to update round name" }, { status: 500 });
  }
}
