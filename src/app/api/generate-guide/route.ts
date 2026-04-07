import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInterviewGuide } from "@/lib/agents/interview-architect";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const candidateId = url.searchParams.get("candidateId");
    const roleId = url.searchParams.get("roleId");

    if (!candidateId || !roleId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const existing = await prisma.interviewGuide.findUnique({
      where: { candidate_id_role_id: { candidate_id: candidateId, role_id: roleId } }
    });

    if (existing) {
      return NextResponse.json(existing.guide_data);
    }
    
    return NextResponse.json({ exists: false }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, roleId, force = false } = await req.json();

    if (!candidateId || !roleId) {
      return NextResponse.json(
        { error: "Candidate ID and Role ID are required" },
        { status: 400 }
      );
    }

    // ── 1. Check for a cached guide (unless forced regeneration) ──────────
    if (!force) {
      const existing = await prisma.interviewGuide.findUnique({
        where: {
          candidate_id_role_id: { candidate_id: candidateId, role_id: roleId }
        }
      });

      if (existing) {
        console.log("CACHE HIT: Returning existing interview guide for", candidateId);
        return NextResponse.json(existing.guide_data);
      }
    }

    // ── 2. Fetch candidate, role, rubrics ─────────────────────────────────
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const rubrics = await prisma.rubric.findMany({ where: { category: role.category } });

    console.log("GENERATING: New guide for", candidate.name, "—", role.title, "(force:", force, ")");

    // ── 3. Call the AI agent ──────────────────────────────────────────────
    const guide = await generateInterviewGuide(candidate, role, rubrics);
    
    console.log("GENERATED GUIDE STRUCTURE:", { 
      hasGuide: !!guide?.guide, 
      isObject: typeof guide === 'object',
      isArray: Array.isArray(guide?.guide) 
    });

    // ── 4. Upsert into cache ──────────────────────────────────────────────
    await prisma.interviewGuide.upsert({
      where: {
        candidate_id_role_id: { candidate_id: candidateId, role_id: roleId }
      },
      update: {
        guide_data: guide as any,
        updated_at: new Date()
      },
      create: {
        candidate_id: candidateId,
        role_id: roleId,
        guide_data: guide as any
      }
    });

    console.log("CACHE SET: Interview guide stored for", candidateId);
    return NextResponse.json(guide);

  } catch (error) {
    console.error("ERROR in generate-guide API:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

