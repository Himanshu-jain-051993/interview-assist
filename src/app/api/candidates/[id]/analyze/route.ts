
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { performMasterAudit } from "@/lib/agents/ultimate-auditor";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!candidate || !candidate.role) {
      return NextResponse.json({ error: "Candidate or Role not found" }, { status: 404 });
    }

    if (!candidate.raw_resume_text) {
        return NextResponse.json({ error: "No resume text available to analyze" }, { status: 400 });
    }

    console.log(`[Analyze] Refreshing Resume Analyzer for ${candidate.name}...`);
    
    const auditResult = await performMasterAudit(
      candidate.role.job_description,
      candidate.raw_resume_text,
      candidate.role.category
    );

    // Robust Score Parsing
    let rawScore: number = 0;
    const aiScore = auditResult.analysis?.scores?.overall_fit_score;
    if (typeof aiScore === "number") {
      rawScore = aiScore;
    } else if (typeof aiScore === "string") {
      rawScore = parseFloat((aiScore as string).replace(/[^0-9.]/g, ""));
    }
    
    // Scale 1-4 to 0-100 if detected
    if (rawScore > 0 && rawScore <= 4.0) {
      rawScore = (rawScore / 4) * 100;
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: {
        name: auditResult.profile?.name || candidate.name,
        profile_data: (auditResult.profile || {}) as any,
        resume_score: rawScore,
        resume_review_data: (auditResult.analysis || {}) as any,
        status_updated_at: new Date(),
      },
    });

    revalidatePath(`/dashboard/role/${candidate.role_id}`);

    return NextResponse.json({
      success: true,
      candidate: updatedCandidate,
    });

  } catch (error: any) {
    console.error("[POST /api/candidates/:id/analyze] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
