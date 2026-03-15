import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInterviewGuide } from "@/lib/agents/interview-architect";

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
      const existing = await prisma.$queryRaw<{ guide_data: any }[]>`
        SELECT guide_data FROM "InterviewGuide"
        WHERE candidate_id = ${candidateId} AND role_id = ${roleId}
        LIMIT 1
      `;

      if (existing.length > 0) {
        console.log("CACHE HIT: Returning existing interview guide for", candidateId);
        return NextResponse.json(existing[0].guide_data);
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

    // ── 4. Upsert into cache ──────────────────────────────────────────────
    await prisma.$executeRaw`
      INSERT INTO "InterviewGuide" (id, candidate_id, role_id, guide_data, generated_at, updated_at)
      VALUES (gen_random_uuid()::text, ${candidateId}, ${roleId}, ${JSON.stringify(guide)}::jsonb, NOW(), NOW())
      ON CONFLICT (candidate_id, role_id)
      DO UPDATE SET guide_data = ${JSON.stringify(guide)}::jsonb, updated_at = NOW()
    `;

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
