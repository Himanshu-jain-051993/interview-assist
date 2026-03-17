
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const API_KEY = "AIzaSyDUokEbD4p0XasulmkkjeoTXlJeU1sRPn0";
const genAI = new GoogleGenerativeAI(API_KEY);

async function testExtraction() {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const buffer = fs.readFileSync(path.join(__dirname, "dummy_resume.pdf"));

  console.log("Testing PDF extraction via Gemini...");
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "application/pdf"
        }
      },
      "Extract raw text from this resume."
    ]);
    const text = await result.response.text();
    console.log("Success! Extracted Text (first 100 chars):", text.substring(0, 100));
  } catch (err) {
    console.error("Extraction Failed:", err.message);
  }
}

testExtraction();
