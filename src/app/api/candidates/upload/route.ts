import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/agents/resume-parser";
import { scoreResume } from "@/lib/agents/resume-scorer";
import mammoth from "mammoth";
import pg from "pg";

import { safePdfParse } from "@/lib/pdf-utils";


const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const roleId = formData.get("roleId") as string;

    if (!file || !roleId) {
      return NextResponse.json({ error: "Missing file or roleId" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const type = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    if (type === "application/pdf" || fileName.endsWith(".pdf")) {
      console.log("[upload-resume] Extracting PDF...");
      const data = await safePdfParse(buffer);
      extractedText = data.text;
    } else if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx") || fileName.endsWith(".doc")
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (err) {
        console.error("Mammoth extraction failed:", err);
        if (fileName.endsWith(".doc")) {
          return NextResponse.json({ 
            error: "Legacy .doc format not supported", 
            message: "Please save your document as .docx and try again." 
          }, { status: 400 });
        }
        throw err;
      }
    } else {
      return NextResponse.json({ error: "Unsupported file format. Please use PDF or DOCX." }, { status: 400 });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.warn("[upload-resume] No text extracted!");
      return NextResponse.json({ error: "Could not extract text from the file" }, { status: 400 });
    }

    console.log("[upload-resume] Extracted text length:", extractedText.length);

    // Call Gemini to parse Candidate details
    console.log("[upload-resume] Calling Gemini...");
    const parsedData = await parseResume(extractedText);
    console.log("[upload-resume] Gemini parsed data:", JSON.stringify(parsedData).substring(0, 100));

    // Provide default email if missing to avoid unique constraint errors
    const candidateEmail = parsedData.email || `unknown-${Date.now()}@example.com`;

    // Evaluative Autonomy: store work history as nested JSONB object within profile_data.
    const profile_data = {
      summary: parsedData.summary || "",
      experience: parsedData.experience || [],
      education: parsedData.education || [],
      raw_text: extractedText.substring(0, 5000), // optional
    };

    // Insert to database using pg
    const query = `
      INSERT INTO "Candidate" (
        id, 
        name, 
        email, 
        role_id, 
        stage, 
        profile_data, 
        created_at, 
        status_updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *;
    `;

    const id = "cand_" + Math.random().toString(36).substring(2, 11);

    const values = [
      id,
      parsedData.name || "Unknown Candidate",
      candidateEmail,
      roleId,
      "Applied", 
      profile_data
    ];

    console.log("[upload-resume] Inserting to DB...");
    const result = await pool.query(query, values);
    const candidate = result.rows[0];

    console.log("[upload-resume] Candidate created:", candidate.id);

    // --- AUTOMATIC TRIGGER: Resume Scoring ---
    try {
      // 1. Fetch JD and role details
      const roleRes = await pool.query('SELECT title, category, full_jd_text FROM "Role" WHERE id = $1', [roleId]);
      const role = roleRes.rows[0];
      
      if (role && role.full_jd_text) {
        console.log("[upload-resume] Triggering AI Scoring...");
        const scoringResult = await scoreResume(
          role.full_jd_text,
          extractedText,
          role.category || role.title
        );

        // Normalize score to percentage (0-100) if needed, 
        // prompt uses 1-4 scale. User request says "e.g., 3.2/4 or normalized to 80%".
        // I'll store the overall_fit_score directly and perhaps normalize it for the progress bar.
        // Let's normalize it to 100 for the 'resume_score' column which UI uses for progress.
        const normalizedScore = (scoringResult.scores.overall_fit_score / 4) * 100;

        await pool.query(
          'UPDATE "Candidate" SET resume_score = $1, resume_review_data = $2 WHERE id = $3',
          [normalizedScore, scoringResult, id]
        );
        console.log("[upload-resume] AI Scoring completed and saved.");
        
        // Return updated candidate data
        candidate.resume_score = normalizedScore;
        candidate.resume_review_data = scoringResult;
      }
    } catch (scoringError) {
      console.error("[upload-resume] Error during AI scoring:", scoringError);
      // We don't fail the whole request if scoring fails, but we log it.
    }

    return NextResponse.json({ candidate }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
       return NextResponse.json({ error: "Candidate with this email already exists." }, { status: 409 });
    }
    console.error("Error creating candidate from Resume:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

