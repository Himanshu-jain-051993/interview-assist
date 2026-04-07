import { NextRequest, NextResponse } from "next/server";
import { parseJobDescription } from "@/lib/agents/jd-parser";
import { generateRubricsForCategory } from "@/lib/agents/rubric-generator";
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

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const type = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    console.log(`[POST /api/roles/upload] Processing: ${fileName} (${type})`);

    if (type === "application/pdf" || fileName.endsWith(".pdf")) {
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
      return NextResponse.json({ error: "Could not extract text from the file" }, { status: 400 });
    }

    console.log(`[POST /api/roles/upload] Extracted ${extractedText.length} chars. Moving to AI Parse...`);

    // Call Gemini to parse
    const parsedData = await parseJobDescription(extractedText);
    console.log(`[POST /api/roles/upload] AI Parse Success: ${parsedData.title} | ${parsedData.category}`);

    // Insert to database using pg
    const query = `
      INSERT INTO "Role" (
        id, 
        title, 
        category, 
        level, 
        industry, 
        job_description, 
        metadata, 
        full_jd_text, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *;
    `;

    const id = "role_" + Math.random().toString(36).substring(2, 11);
    const roleCategory = parsedData.category || "General";

    // ──────────────────────────────────────────────────────────────────────────
    // 🔍 AUTOMATIC RUBRIC GENERATION
    // Ensure we have both RESUME and INTERVIEW rubrics for this role.
    // ──────────────────────────────────────────────────────────────────────────
    try {
      // Normalize category for rubric check
      const baseCategory = (parsedData.category || "General").trim();
      
      // If the category is very broad (Product, Engineering) but title is specific, 
      // we might want a more specific category for rubrics to avoid overlap.
      // For now, we'll keep the AI's category but ensure we have enough diversity.
      const normalizedCategory = baseCategory;

      const resumeCheck = await pool.query('SELECT count(*) FROM "Rubric" WHERE category = $1 AND type = $2', [normalizedCategory, 'RESUME']);
      const interviewCheck = await pool.query('SELECT count(*) FROM "Rubric" WHERE category = $1 AND type = $2', [normalizedCategory, 'INTERVIEW']);
      
      const resCount = parseInt(resumeCheck.rows[0].count);
      const intCount = parseInt(interviewCheck.rows[0].count);
      
      console.log(`[POST /api/roles/upload] Rubric audit for "${normalizedCategory}": Resume=${resCount}, Interview=${intCount}`);

      // Always generate rubrics for this JD - ensures fresh, role-specific standards every time
      console.log(`[POST /api/roles/upload] Generating rubrics via Gemini 2.5 Pro...`);
      const { resume_screening_rubrics, interview_evaluation_rubrics } = await generateRubricsForCategory(normalizedCategory, extractedText);
      
      const allNewRubrics = [
        ...resume_screening_rubrics.map(r => ({ ...r, type: 'RESUME' })),
        ...interview_evaluation_rubrics.map(r => ({ ...r, type: 'INTERVIEW' }))
      ];

      if (allNewRubrics.length > 0) {
        console.log(`[POST /api/roles/upload] Upserting ${allNewRubrics.length} rubrics for "${normalizedCategory}"`);
        for (const rub of allNewRubrics) {
          try {
            await pool.query(
              `INSERT INTO "Rubric" (id, category, type, parameter, poor, borderline, good, strong, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
               ON CONFLICT (category, type, parameter) 
               DO UPDATE SET 
                poor = EXCLUDED.poor,
                borderline = EXCLUDED.borderline,
                good = EXCLUDED.good,
                strong = EXCLUDED.strong`,
              [
                "rub_" + Math.random().toString(36).substring(2, 11),
                normalizedCategory,
                rub.type,
                rub.parameter,
                rub.poor,
                rub.borderline || "Meets basic requirements",
                rub.good,
                rub.strong,
              ]
            );
          } catch (err) {
             console.error(`[POST /api/roles/upload] Failed to upsert rubric: ${rub.parameter}`, err);
          }
        }
        console.log(`[POST /api/roles/upload] Rubric generation complete: ${resume_screening_rubrics.length} resume + ${interview_evaluation_rubrics.length} interview rubrics.`);
      } else {
        console.warn(`[POST /api/roles/upload] AI returned 0 rubrics for "${normalizedCategory}". Check Gemini response.`);
      }
    } catch (rubricErr) {
      console.error("[POST /api/roles/upload] Rubric Generation Pipeline Error:", rubricErr);
    }

    const values = [
      id,
      parsedData.title || "Unknown Title",
      roleCategory,
      parsedData.level || "Mid",
      parsedData.industry || "Software",
      extractedText.substring(0, 500) + "...", // short description
      parsedData.metadata || {},
      extractedText
    ];

    const result = await pool.query(query, values);
    const role = result.rows[0];

    console.log(`[POST /api/roles/upload] Role created successfully with ID: ${role.id}`);
    return NextResponse.json({ role }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating role from JD:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}


