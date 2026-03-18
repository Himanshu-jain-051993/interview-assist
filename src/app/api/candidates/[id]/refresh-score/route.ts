
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { performMasterAudit } from "@/lib/agents/ultimate-auditor";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    if (!candidate.raw_resume_text) {
      return NextResponse.json(
        { error: "No raw resume text available to re-score." },
        { status: 400 }
      );
    }

    console.log(`[Refresh-Score] Re-scoring candidate ${candidate.name}...`);

    const auditResult = await performMasterAudit(
      candidate.role.job_description,
      candidate.raw_resume_text,
      candidate.role.category
    );

    let finalScore = auditResult.analysis?.scores?.overall_fit_score || 0;
    if (finalScore > 0 && finalScore <= 4.0) {
      finalScore = (finalScore / 4) * 100;
    }

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        resume_score: finalScore,
        resume_review_data: (auditResult.analysis || {}) as any,
        profile_data: (auditResult.profile || {}) as any,
      },
    });

    return NextResponse.json({
      success: true,
      score: finalScore,
      reviewData: auditResult.analysis,
    });
  } catch (error: any) {
    console.error("[Refresh-Score] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
