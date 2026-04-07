
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CandidateStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      console.warn("[GET /api/candidates] Missing roleId in query");
      return NextResponse.json({ error: "roleId is required" }, { status: 400 });
    }

    console.log(`[GET /api/candidates] Fetching for role: ${roleId}`);

    const candidates = await prisma.candidate.findMany({
      where: { role_id: roleId },
      orderBy: { created_at: "desc" },
    });

    console.log(`[GET /api/candidates] Found ${candidates.length} candidates`);

    const mapped = candidates.map((c: any) => ({
      id: c.id,
      roleId: c.role_id,
      name: c.name || "Unknown Candidate",
      email: c.email || "",
      stage: (c.stage || "Applied") as CandidateStatus,
      resume_score: c.resume_score,
      interview_score: c.interview_score,
      resume_review_data: c.resume_review_data,
      raw_resume_text: c.raw_resume_text,
      profile_data: c.profile_data || {},
      created_at: c.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("[GET /api/candidates] Fatal Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
