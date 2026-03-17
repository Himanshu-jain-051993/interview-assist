import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
import { evaluateInterviewRound } from "@/lib/agents/interview-feedback-architect";

if (typeof global.DOMMatrix === "undefined") {
  (global as any).DOMMatrix = function() {};
}
if (typeof global.Path2D === "undefined") {
  (global as any).Path2D = function() {};
}

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

// ─── POST /api/interview-rounds/[id]/refresh ─────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roundId } = await params;
    const formData = await req.formData();
    const candidateId = formData.get("candidateId") as string | null;
    const roleId = formData.get("roleId") as string | null;
    const roundType = formData.get("roundType") as string | null;
    const transcriptFile = formData.get("transcriptFile") as File | null;
    const notesFile = formData.get("notesFile") as File | null;

    if (!candidateId || !roleId || !roundType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transcriptText = await extractTextFromFile(transcriptFile);
    const interviewerNotes = await extractTextFromFile(notesFile);

    if (!transcriptText && !interviewerNotes) {
      return NextResponse.json({ error: "Provide transcript or notes to evaluate" }, { status: 400 });
    }

    const candidate: any = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    const role: any = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const rubrics = await prisma.$queryRaw<any[]>`SELECT * FROM "Rubric" WHERE category = ${role.category}`;

    const previousRounds = await prisma.$queryRaw<any[]>`
      SELECT round_type, cumulative_score, ai_feedback_json, created_at
      FROM "InterviewRound"
      WHERE candidate_id = ${candidateId} AND id != ${roundId}
      ORDER BY created_at ASC
    `;

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

    await prisma.$executeRaw`
      UPDATE "InterviewRound"
      SET transcript_text = COALESCE(${transcriptText || null}, transcript_text),
          interviewer_notes = COALESCE(${interviewerNotes || null}, interviewer_notes),
          ai_feedback_json = ${JSON.stringify(feedback)}::jsonb,
          cumulative_score = ${cumulativeScore}
      WHERE id = ${roundId}
    `;

    const updatedRound = await prisma.$queryRaw<any[]>`SELECT * FROM "InterviewRound" WHERE id = ${roundId}`;

    return NextResponse.json({ round: updatedRound[0] });

  } catch (err) {
    console.error("[interview-rounds refresh]", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
