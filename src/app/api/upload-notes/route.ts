import { NextResponse } from "next/server";
import pg from "pg";
import mammoth from "mammoth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file || !candidateId) {
      return NextResponse.json(
        { error: "Both 'file' and 'candidateId' are required." },
        { status: 400 }
      );
    }

    // Validate candidate exists
    const candidateRes = await pool.query(
      'SELECT id, name FROM "Candidate" WHERE id = $1',
      [candidateId]
    );
    if (candidateRes.rows.length === 0) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    // Extract raw text from file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rawText = "";

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (fileName.endsWith(".pdf")) {
      const result = await pdfParse(buffer);
      rawText = result.text;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a .pdf or .docx file." },
        { status: 415 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the uploaded file." },
        { status: 422 }
      );
    }

    // Persist to InterviewerNote table
    const insertRes = await pool.query(
      `INSERT INTO "InterviewerNote" (candidate_id, file_name, raw_text, uploaded_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, uploaded_at`,
      [candidateId, file.name, rawText]
    );
    const record = insertRes.rows[0];

    console.log(
      `[upload-notes] Saved note ${record.id} for candidate ${candidateId}`
    );

    return NextResponse.json({
      noteId: record.id,
      uploadedAt: record.uploaded_at,
      candidateId,
      fileName: file.name,
      charCount: rawText.length,
    });
  } catch (error: any) {
    console.error("[upload-notes] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
