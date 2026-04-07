import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Robust PDF text extraction using Gemini's native document processing.
 * Bypasses pdf-parse entirely, avoiding all "fake worker" errors in Vercel/Next.js.
 */
export async function safePdfParse(buffer: Buffer): Promise<{ text: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set.");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  console.log("[pdf-utils] Using Gemini 1.5 Flash for PDF extraction...");

  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "application/pdf",
      },
    },
    "Extract all the text from this document verbatim. Output only the text content with no commentary.",
  ]);

  const text = result.response.text().trim();
  if (!text || text.length < 10) {
    throw new Error("Gemini returned empty text for this PDF.");
  }
  return { text };
}
