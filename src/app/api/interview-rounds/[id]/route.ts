
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateInterviewRound } from "@/lib/agents/interview-feedback-architect";
import mammoth from "mammoth";

// Fix for DOMMatrix undefined error in pdf-parse on Next.js Serverless
if (typeof global.DOMMatrix === 'undefined') { (global as any).DOMMatrix = function() {}; }
if (typeof global.Path2D === 'undefined') { (global as any).Path2D = function() {}; }

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");

async function safePdfParse(buffer: Buffer): Promise<{ text: string }> {
  if (typeof pdf === 'function') return pdf(buffer);
  if (pdf.default) return pdf.default(buffer);
  return { text: "" };
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roundId } = await params;
    const formData = await request.formData();
    const transcriptFile = formData.get("transcriptFile") as File | null;
    const notesFile = formData.get("notesFile") as File | null;

    const existingRound = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { candidate: true, role: true }
    });

    if (!existingRound) {
        return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const transcriptText = await extractTextFromFile(transcriptFile);
    const interviewerNotes = await extractTextFromFile(notesFile);

    if (!transcriptText && !interviewerNotes && !existingRound.transcript_text && !existingRound.interviewer_notes) {
        return NextResponse.json({ error: "Transcript or notes are required for analysis" }, { status: 400 });
    }

    // Combine new with existing
    const finalTranscript = transcriptText || existingRound.transcript_text || "";
    const finalNotes = interviewerNotes || existingRound.interviewer_notes || "";

    // 1. Fetch rubrics
    const rubrics = await prisma.$queryRaw<any[]>`SELECT * FROM "Rubric" WHERE category = ${existingRound.role.category}`;

    // 2. Fetch ALL previous rounds for context (excluding this one)
    const previousRounds = await prisma.interviewRound.findMany({
      where: { candidate_id: existingRound.candidate_id, id: { not: roundId } },
      orderBy: { created_at: "asc" }
    });

    console.log(`[interview-rounds PATCH] Analyzing ${existingRound.round_type} for ${existingRound.candidate.name}...`);
    
    // 3. AI Agent
    const feedback = await evaluateInterviewRound(
      existingRound.candidate,
      existingRound.role,
      rubrics,
      { 
        roundType: existingRound.round_type, 
        transcriptText: finalTranscript, 
        interviewerNotes: finalNotes 
      },
      previousRounds.map((r) => ({
        roundType: r.round_type,
        cumulativeScore: r.cumulative_score,
        aiFeedbackJson: r.ai_feedback_json,
        createdAt: r.created_at,
      }))
    );

    const cumulativeScore = feedback.cumulativeScore ?? feedback.roundScore ?? null;

    // 4. Update
    const updated = await prisma.interviewRound.update({
      where: { id: roundId },
      data: {
        transcript_text: finalTranscript || null,
        interviewer_notes: finalNotes || null,
        ai_feedback_json: (feedback || {}) as any,
        cumulative_score: cumulativeScore,
      }
    });

    return NextResponse.json({ round: updated });

  } catch (error: any) {
    console.error("[PATCH /api/interview-rounds/[id]] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
