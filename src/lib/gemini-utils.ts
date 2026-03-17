
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

/**
 * Executes a Gemini model operation. 
 * Retries removed as per billing upgrade.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  // Now just a pass-through to keep interface compatibility if needed, 
  // but logic is simplified for Paid Tier.
  try {
    return await fn();
  } catch (error: any) {
    console.error("[Gemini-API] Execution Error:", error.message);
    throw error;
  }
}

/**
 * Standard model getter for the Paid Tier.
 * Using gemini-2.0-flash for high performance and reliability.
 */
export function getGeminiModel(modelName = "gemini-flash-latest") {
  return genAI.getGenerativeModel({ model: modelName });
}
