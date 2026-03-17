
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch roles
    const rolesData = await prisma.role.findMany({
      include: {
        candidates: {
          select: { stage: true }
        }
      },
      orderBy: { created_at: "desc" }
    });

    const mappedRoles: Role[] = rolesData.map((r) => {
      const candidates = r.candidates || [];
      const counts = {
        interviewing: 0,
        review: 0,
        rejected: 0
      };

      candidates.forEach(c => {
        const s = c.stage || "Applied";
        if (s === "Rejected") {
          counts.rejected++;
        } else if (["Screening", "Shortlisted", "Interview Scheduled"].includes(s)) {
          counts.interviewing++;
        } else {
          counts.review++;
        }
      });

      return {
        id: r.id,
        title: r.title,
        status: "Open",
        full_jd_text: r.full_jd_text,
        appliedCount: candidates.length,
        rejectedCount: counts.rejected,
        reviewCount: counts.review,
        interviewCount: counts.interviewing,
      };
    });

    return NextResponse.json(mappedRoles);
  } catch (error: any) {
    console.error("[GET /api/roles] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
