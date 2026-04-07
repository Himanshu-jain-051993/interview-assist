import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Delete in dependency order (Candidate has ON DELETE RESTRICT so must clear its children first)
    // 1. Get all candidate IDs for this role
    const candidates = await prisma.candidate.findMany({
      where: { role_id: id },
      select: { id: true }
    });
    const candidateIds = candidates.map((c) => c.id);

    if (candidateIds.length > 0) {
      // 2. Delete Interview children (InterviewFeedback cascades from Interview)
      const interviews = await prisma.interview.findMany({
        where: { candidate_id: { in: candidateIds } },
        select: { id: true }
      });
      const interviewIds = interviews.map((i) => i.id);
      if (interviewIds.length > 0) {
        await prisma.interviewFeedback.deleteMany({ where: { interview_id: { in: interviewIds } } });
        await prisma.interview.deleteMany({ where: { id: { in: interviewIds } } });
      }

      // 3. Delete other candidate-linked records that don't auto-cascade
      await prisma.interviewTranscript.deleteMany({ where: { candidate_id: { in: candidateIds } } });
      await prisma.interviewGuide.deleteMany({ where: { candidate_id: { in: candidateIds } } });
      await (prisma as any).interviewRound.deleteMany({ where: { candidate_id: { in: candidateIds } } });

      // 4. Delete candidates themselves
      await prisma.candidate.deleteMany({ where: { id: { in: candidateIds } } });
    }

    // 5. Finally delete the role (InterviewGuide and InterviewRound on Role cascade, but we cleared them above)
    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const role = await prisma.role.findUnique({
      where: { id }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Use raw SQL with ILIKE for case-insensitive category match
    // This prevents mismatches between Role.category and Rubric.category casing
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const rubricResult = await pool.query(
      `SELECT * FROM "Rubric" WHERE category ILIKE $1 ORDER BY type, parameter`,
      [role.category.trim()]
    );
    await pool.end();
    const dbRubrics = rubricResult.rows;

    let resumeRubrics = dbRubrics.filter((r: any) => r.type?.toUpperCase() === 'RESUME').map((r: any) => ({
      ...r,
      poor: r.poor_level || r.poor,
      borderline: r.borderline_level || r.borderline,
      good: r.good_level || r.good,
      strong: r.strong_level || r.strong,
    }));
    let interviewRubrics = dbRubrics.filter((r: any) => r.type?.toUpperCase() === 'INTERVIEW').map((r: any) => ({
      ...r,
      poor: r.poor_level || r.poor,
      borderline: r.borderline_level || r.borderline,
      good: r.good_level || r.good,
      strong: r.strong_level || r.strong,
    }));

    // Fallback to static JSON if DB rubrics are missing
    const fs = require('fs');
    const path = require('path');
    const rubricsPath = path.join(process.cwd(), 'data', 'resume_rubrics.json');
    let rubricsData: any = {};
    try {
      rubricsData = JSON.parse(fs.readFileSync(rubricsPath, 'utf8'));
    } catch (err) {
      console.error("Failed to read rubrics JSON", err);
    }

    const mapping: Record<string, string> = {
      "product_management": "product_manager",
      "software_engineering": "software_engineer",
      "data_analytics": "data_analyst",
      "program_management": "technical_program_manager",
      "ai_product_management": "ai_product_manager",
    };
    const rawKey = role.category.toLowerCase().replace(/\s+/g, "_");
    const roleKey = mapping[rawKey] || rawKey;
    const staticRubrics = rubricsData.role_specific_rubrics?.[roleKey];

    if (resumeRubrics.length === 0 && staticRubrics?.resume) {
      resumeRubrics = staticRubrics.resume.map((r: any) => ({ ...r, type: 'RESUME', parameter: r.name || r.parameter, poor: r.levels?.poor, borderline: r.levels?.borderline, good: r.levels?.good, strong: r.levels?.strong }));
    }
    if (interviewRubrics.length === 0 && staticRubrics?.interview) {
      interviewRubrics = staticRubrics.interview.map((r: any) => ({ ...r, type: 'INTERVIEW', parameter: r.name || r.parameter, poor: r.levels?.poor, borderline: r.levels?.borderline, good: r.levels?.good, strong: r.levels?.strong }));
    }

    // Load universal rubrics from JSON and normalize for display
    let universalRubrics = [];
    if (rubricsData.universal_rubrics) {
      universalRubrics = rubricsData.universal_rubrics.map((r: any) => ({
        parameter: r.name,
        poor: r.levels?.poor || "",
        borderline: r.levels?.borderline || "",
        good: r.levels?.good || "",
        strong: r.levels?.strong || ""
      }));
    }

    return NextResponse.json({ 
      role, 
      resumeRubrics,
      interviewRubrics,
      universalRubrics 
    });
  } catch (error: any) {
    console.error("Error fetching role details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title } = await req.json();
    
    if (!title) {
       return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: { title }
    });

    return NextResponse.json({ role: updated });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
