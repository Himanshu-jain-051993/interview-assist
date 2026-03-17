import { NextResponse } from "next/server";
import pg from "pg";
import { synthesizeTranscript } from "@/lib/agents/transcript-synthesizer";
import mammoth from "mammoth";
// Fix for DOMMatrix undefined error in pdf-parse on Next.js Serverless
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = function() {};
}
if (typeof global.Path2D === 'undefined') {
  (global as any).Path2D = function() {};
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");

async function safePdfParse(buffer: Buffer): Promise<{ text: string }> {
  if (typeof pdf === 'function') return pdf(buffer);
  if (pdf.PDFParse) {
    const instance = new pdf.PDFParse({ data: buffer });
    const data = await instance.getText();
    await instance.destroy();
    return data || { text: "" };
  }
  if (pdf.default) return pdf.default(buffer);
  throw new Error("pdf-parse library error: No valid parsing function found.");
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Next.js App Router config — disable body parser so we can read the raw FormData
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

    // ── 1. Validate candidate exists ──────────────────────────────────────
    const candidateRes = await pool.query(
      'SELECT id, name FROM "Candidate" WHERE id = $1',
      [candidateId]
    );
    if (candidateRes.rows.length === 0) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }
    const candidate = candidateRes.rows[0];

    // ── 2. Extract raw text from the uploaded file ────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let rawText = "";

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (fileName.endsWith(".pdf")) {
      const result = await safePdfParse(buffer);
      rawText = result.text;
    } else if (fileName.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a .docx, .pdf, or .txt file." },
        { status: 415 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the uploaded file." },
        { status: 422 }
      );
    }

    // ── 3. Run the Transcript Synthesizer Agent ───────────────────────────
    console.log(
      `[process-transcript] Running synthesizer for candidate: ${candidate.name} (${candidateId})`
    );
    const synthesized = await synthesizeTranscript(rawText, candidate.name);

    // ── 4. Persist to InterviewTranscript table ───────────────────────────
    const insertRes = await pool.query(
      `INSERT INTO "InterviewTranscript" (id, candidate_id, raw_text, synthesized_json, processed_at)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3::jsonb, NOW())
       RETURNING id, processed_at`,
      [candidateId, rawText, JSON.stringify(synthesized)]
    );
    const record = insertRes.rows[0];

    console.log(
      `[process-transcript] Saved transcript ${record.id} for candidate ${candidateId}`
    );

    // ── 5. Return synthesized JSON to the frontend ────────────────────────
    return NextResponse.json({
      transcriptId: record.id,
      processedAt: record.processed_at,
      candidateId,
      candidateName: candidate.name,
      synthesized,
    });
  } catch (error: any) {
    console.error("[process-transcript] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

