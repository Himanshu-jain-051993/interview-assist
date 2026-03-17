
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTextFromFile } from "@/lib/file-extractor";
import { performMasterAudit } from "@/lib/agents/ultimate-auditor";
import { revalidatePath } from "next/cache";

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const roleId = formData.get("roleId") as string;
    let manualName = formData.get("name") as string | null;
    let manualEmail = formData.get("email") as string | null;

    if (!file || !roleId) {
      return NextResponse.json({ error: "Missing file or roleId" }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromFile(buffer, file.name, file.type);
    
    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json({ error: "Extraction Failed", message: "Resume content is too short." }, { status: 422 });
    }

    // 2. AUDIT
    let auditResult;
    try {
      console.log(`[Upload-V2] Starting Master Audit for ${file.name}...`);
      auditResult = await performMasterAudit(role.job_description, extractedText, role.category);
      console.log(`[Upload-V2] Audit Complete for ${file.name}.`);
    } catch (auditErr: any) {
      console.error("[Upload-V2] Audit Failed:", auditErr);
      throw new Error(`Audit Step Failed: ${auditErr.message}`);
    }
    
    // 3. PERSISTENCE
    try {
      const candidateName = manualName || auditResult.profile?.name || "Refracted Candidate";
      const candidateEmail = manualEmail || auditResult.profile?.email || `candidate-${Date.now()}@automated.com`;

      let rawScore: number = 0;
      const aiScore = auditResult.analysis?.scores?.overall_fit_score;
      if (typeof aiScore === "number") {
        rawScore = aiScore;
      } else if (typeof aiScore === "string") {
        rawScore = parseFloat((aiScore as string).replace(/[^0-9.]/g, ""));
      }
      
      if (rawScore > 0 && rawScore <= 4.0) {
        rawScore = (rawScore / 4) * 100;
      }

      console.log(`[Upload-V2] Upserting candidate ${candidateEmail}...`);
      const candidate = await prisma.candidate.upsert({
        where: { email: candidateEmail },
        update: {
          name: candidateName,
          raw_resume_text: extractedText,
          role_id: roleId,
          profile_data: (auditResult.profile || {}) as any,
          resume_score: rawScore,
          resume_review_data: (auditResult.analysis || {}) as any,
          stage: "Applied",
          status_updated_at: new Date(),
        },
        create: {
          name: candidateName,
          email: candidateEmail,
          role_id: roleId,
          stage: "Applied",
          raw_resume_text: extractedText,
          profile_data: (auditResult.profile || {}) as any,
          resume_score: rawScore,
          resume_review_data: (auditResult.analysis || {}) as any,
        },
      });

      console.log(`[Upload-V2] SUCCESS: Candidate ${candidate.id} saved.`);

      return NextResponse.json({
        success: true,
        candidateId: candidate.id,
        score: rawScore,
      });
    } catch (dbErr: any) {
      console.error("[Upload-V2] DB Persistence Failed:", dbErr);
      throw new Error(`Database Step Failed: ${dbErr.message}`);
    }

  } catch (error: any) {
    console.error("[Upload-V2] Pipeline Failure:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
