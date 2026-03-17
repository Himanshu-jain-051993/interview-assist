import { NextRequest, NextResponse } from "next/server";
import { parseJobDescription } from "@/lib/agents/jd-parser";
import mammoth from "mammoth";
import pg from "pg";

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

    // Call Gemini to parse
    const parsedData = await parseJobDescription(extractedText);

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

    // generate cuid roughly
    const id = "role_" + Math.random().toString(36).substring(2, 11);

    const values = [
      id,
      parsedData.title || "Unknown Title",
      parsedData.category || "General",
      parsedData.level || "Mid",
      parsedData.industry || "Software",
      extractedText.substring(0, 500) + "...", // short description
      parsedData.metadata || {},
      extractedText
    ];

    const result = await pool.query(query, values);
    const role = result.rows[0];

    return NextResponse.json({ role }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating role from JD:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}


