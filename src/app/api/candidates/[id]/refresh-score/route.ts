
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreResumeV2 } from "@/lib/resume-scorer";

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

    const scoringResult = await scoreResumeV2(
      candidate.role.job_description,
      candidate.raw_resume_text,
      candidate.role.category
    );

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        resume_score: scoringResult.scores.overall_fit_score,
        resume_review_data: scoringResult as any,
      },
    });

    return NextResponse.json({
      success: true,
      score: scoringResult.scores.overall_fit_score,
      reviewData: scoringResult,
    });
  } catch (error: any) {
    console.error("[Refresh-Score] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
