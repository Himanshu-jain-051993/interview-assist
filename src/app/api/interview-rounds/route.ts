import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateInterviewRound } from "@/lib/agents/interview-feedback-architect";
import { summarizeInterviewHistory } from "@/lib/agents/interview-aggregator";

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
  try {
    const pdfLib = require("pdf-parse");
    // Handle the specific export of pdf-parse v2.4.5+ (Mehmet Kozan version)
    const ParserClass = pdfLib.PDFParse || (pdfLib.default && pdfLib.default.PDFParse);
    
    if (ParserClass) {
      console.log("[safePdfParse] Using PDFParse class");
      const instance = new ParserClass({ data: buffer });
      const data = await instance.getText();
      await instance.destroy();
      return data || { text: "" };
    }
    
    // Fallback to legacy functional style if it exists
    if (typeof pdfLib === 'function') {
      console.log("[safePdfParse] Using legacy function style");
      return pdfLib(buffer);
    }
    
    if (typeof pdfLib.default === 'function') {
      console.log("[safePdfParse] Using legacy default function style");
      return pdfLib.default(buffer);
    }

    throw new Error("pdf-parse library error: No valid parsing method found in " + Object.keys(pdfLib).join(", "));
  } catch (err) {
    console.error("[safePdfParse] Error:", err);
    throw err;
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;

async function extractTextFromFile(file: File | null): Promise<string> {
  if (!file) return "";
  try {
    const fileName = file.name.toLowerCase();
    console.log(`[extractTextFromFile] Start: ${fileName} (${file.size} bytes)`);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (fileName.endsWith(".docx")) {
      console.log("[extractTextFromFile] Branch: DOCX (mammoth)");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } else if (fileName.endsWith(".pdf")) {
      console.log("[extractTextFromFile] Branch: PDF (safePdfParse)");
      const result = await safePdfParse(buffer);
      return result.text || "";
    } else if (fileName.endsWith(".txt")) {
      console.log("[extractTextFromFile] Branch: TXT (toString)");
      return buffer.toString("utf-8");
    }
    console.warn(`[extractTextFromFile] Unsupported extension: ${fileName}`);
    return "";
  } catch (err) {
    console.error(`[extractTextFromFile] Fatal Error for ${file?.name}:`, err);
    throw new Error(`Text extract failed for ${file?.name}: ${err instanceof Error ? err.message : String(err)}`);
  }
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
    
    console.log(`[interview-rounds] Content check: Transcript=${transcriptText.length} chars, Notes=${interviewerNotes.length} chars`);

    // 1. Fetch candidate + role + rubrics ──────────────────────────────────
    console.log(`[interview-rounds] Fetching data for Candidate: ${candidateId}, Role: ${roleId}`);
    const candidate: any = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      console.error("[interview-rounds] Candidate not found:", candidateId);
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const role: any = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      console.error("[interview-rounds] Role not found:", roleId);
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    console.log(`[interview-rounds] Fetching rubrics for category: ${role.category}`);
    const rubrics = await (prisma as any).rubric.findMany({
      where: { category: role.category }
    });
    
    if (rubrics.length === 0) {
      console.warn(`[interview-rounds] Missing Rubrics: category ${role.category}`);
      return NextResponse.json({ error: `No rubrics found for category "${role.category}". Ensure data is seeded.` }, { status: 400 });
    }

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

    console.log(`[interview-rounds] Starting AI Evaluation for ${candidate.name} (${roundType}), previous rounds: ${previousRounds.length}`);

    // 3. Call the AI agent if files are present ────────────────────────────
    let feedback: any = null;
    let cumulativeScore: number | null = null;
    
    if (transcriptText.trim() || interviewerNotes.trim()) {
      try {
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
        console.log(`[interview-rounds] AI Evaluation SUCCESS for ${candidate.name}`);
      } catch (aiErr) {
        console.error("[interview-rounds] AI AGENT FAILED:", aiErr);
        return NextResponse.json({ error: `AI Agent Error: ${aiErr instanceof Error ? aiErr.message : String(aiErr)}` }, { status: 502 });
      }
      
      // Strict Mathematical Scoring Logic
      if (feedback.rubricEvaluations && Array.isArray(feedback.rubricEvaluations) && feedback.rubricEvaluations.length > 0) {
        const scores = feedback.rubricEvaluations.map((e: any) => e.score || 0);
        const validScoresCount = scores.length;
        const avg = validScoresCount > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / validScoresCount) : 0;
        
        // Normalize 1-4 scale to 0-100.
        // We use Math.floor(avg/4 * 100) to be safe or Math.round
        const calculatedScore = Math.round((avg / 4) * 100);
        
        console.log(`[interview-rounds] AI Score Audit: AI=${feedback.roundScore}, Calc=${calculatedScore} (from ${validScoresCount} rubrics)`);
        feedback.roundScore = calculatedScore;
        feedback.cumulativeScore = calculatedScore;
        cumulativeScore = calculatedScore;
      } else {
        console.warn("[interview-rounds] No rubric evaluations found in AI response. Using fallback scores.");
        cumulativeScore = feedback.cumulativeScore ?? feedback.roundScore ?? 0;
      }
    }

    // 4. Persist the round ────────────────────────────────────────────────────
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

    // 5. Update Candidate overall average interview score & summary
    const allRoundsAfter = await (prisma as any).interviewRound.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: "asc" }
    });

    const validScores = allRoundsAfter
      .map((r: any) => r.cumulative_score)
      .filter((s: any) => s !== null);

    const overallAvg = validScores.length > 0
      ? Math.round(validScores.reduce((a: any, b: any) => a + b, 0) / validScores.length)
      : null;

    let summaryText = candidate.interview_summary;
    if (allRoundsAfter.length > 0) {
      try {
        console.log(`[interview-rounds] Regenerating cumulative summary for ${candidate.name}...`);
        summaryText = await summarizeInterviewHistory(candidate.name, role.title, allRoundsAfter);
      } catch (sumErr) {
        console.error("[interview-rounds] Summary Aggregation Failed:", sumErr);
      }
    }

    const currentProfileData = (candidate.profile_data || {}) as any;

    await (prisma as any).candidate.update({
      where: { id: candidateId },
      data: { 
        interview_score: overallAvg,
        profile_data: {
          ...currentProfileData,
          interview_summary: summaryText
        }
      }
    });

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


// ─── DELETE /api/interview-rounds?roundId=xxx ──────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const roundId = req.nextUrl.searchParams.get("roundId");
    if (!roundId) {
      return NextResponse.json({ error: "roundId is required" }, { status: 400 });
    }

    const round = await (prisma as any).interviewRound.findUnique({
      where: { id: roundId },
      select: { candidate_id: true }
    });

    if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

    await (prisma as any).interviewRound.delete({ where: { id: roundId } });

    // Recalculate candidate avg & summary
    const allRoundsRem = await (prisma as any).interviewRound.findMany({
      where: { candidate_id: round.candidate_id },
      orderBy: { created_at: "asc" }
    });

    const validScoresRem = allRoundsRem
      .map((r: any) => r.cumulative_score)
      .filter((s: any) => s !== null);

    const overallAvgRem = validScoresRem.length > 0
      ? Math.round(validScoresRem.reduce((a: any, b: any) => a + b, 0) / validScoresRem.length)
      : null;

    // Fetch candidate so we have role title
    const candObj: any = await prisma.candidate.findUnique({ 
      where: { id: round.candidate_id },
      include: { role: true }
    });

    let summaryTextRem = null;
    if (allRoundsRem.length > 0 && candObj) {
      try {
        summaryTextRem = await summarizeInterviewHistory(candObj.name, candObj.role.title, allRoundsRem);
      } catch (sumErr) {
        console.error("[interview-rounds DELETE] Summary FAILED:", sumErr);
      }
    }

    const currentProfileDataRem = (candObj.profile_data || {}) as any;

    await (prisma as any).candidate.update({
      where: { id: round.candidate_id },
      data: { 
        interview_score: overallAvgRem,
        profile_data: {
          ...currentProfileDataRem,
          interview_summary: summaryTextRem
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[interview-rounds DELETE]", err);
    return NextResponse.json({ error: "Failed to delete round" }, { status: 500 });
  }
}
