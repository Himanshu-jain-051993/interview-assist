import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Executes a Gemini model operation. 
 * Retries removed as per billing upgrade.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("[Gemini-API] Execution Error:", error.message);
    throw error;
  }
}

/**
 * Standard model getter for the Paid Tier.
 * Using gemini-2.5-flash for high performance and reliability.
 */
export function getGeminiModel(modelName = "gemini-2.5-flash") {
  const apiKey = process.env.GOOGLE_AI_API_KEY || "";
  if (!apiKey) {
    console.error("FATAL: GOOGLE_AI_API_KEY environment variable is MISSING on this server.");
  } else {
    console.log(`[Gemini-API] Initializing model with API key starting with: ${apiKey.substring(0, 5)}...`);
  }
  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  return dynamicGenAI.getGenerativeModel({ model: modelName });
}
