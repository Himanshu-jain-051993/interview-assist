import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function main() {
  try {
    // There isn't a direct listModels in the standard SDK easily accessible this way,
    // but we can try to get a model and see if it fails.
    // Actually, let's just try the most robust one.
    const models = ["models/embedding-001", "embedding-001", "models/text-embedding-004", "text-embedding-004"];
    for (const m of models) {
      try {
        console.log(`Testing model: ${m}`);
        const model = genAI.getGenerativeModel({ model: m });
        await model.embedContent("test");
        console.log(`SUCCESS: ${m} is available!`);
        return;
      } catch (e) {
        console.log(`FAILED: ${m} - ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Discovery failed:", err);
  }
}

main();
