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

    // Fetch rubrics for this category
    const rubrics = await (prisma as any).rubric.findMany({
      where: { category: role.category }
    });

    return NextResponse.json({ role, rubrics });
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
