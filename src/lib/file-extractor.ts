
import { getGeminiModel, withRetry } from "@/lib/gemini-utils";

export async function extractTextFromFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Clean MIME type if necessary
  let effectiveMimeType = mimeType;
  if (extension === 'pdf') effectiveMimeType = 'application/pdf';
  if (extension === 'docx') effectiveMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const model = getGeminiModel();

  try {
    console.log(`[File-Extractor] Cloud-Extracting ${extension} via Gemini Cloud...`);
    
    return await withRetry(async () => {
      const result = await model.generateContent([
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: effectiveMimeType
          }
        },
        "Extract raw text from this resume. Output only the content of the resume with no headers or extra text."
      ]);
      
      const text = await result.response.text();
      if (!text || text.trim().length < 10) {
        throw new Error("Gemini returned empty text.");
      }
      return cleanText(text);
    });
  } catch (err: any) {
    console.error(`[File-Extractor] Extraction failed after retries:`, err.message);
    
    if (extension === 'docx') {
      try {
        console.log("[File-Extractor] Fallback: Using Mammoth...");
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return cleanText(result.value);
      } catch (mammothErr: any) {
        console.error("[File-Extractor] Mammoth fallback failed:", mammothErr.message);
      }
    }
    
    throw new Error(`Extraction failed: ${err.message}`);
  }
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
