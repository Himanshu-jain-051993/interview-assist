import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function parseResume(text: string) {
  // gemini-2.5-flash is ideal for fast structured extraction
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are an expert ATS (Applicant Tracking System) parser. Extract the following information from the candidate's resume and return it as a structured JSON object.

    Required fields in JSON:
    - name: (string) Candidate's full name
    - email: (string) Candidate's email address
    - summary: (string) A short professional summary
    - experience: (array of objects) with fields: title, company, startDate, endDate, description
    - education: (array of objects) with fields: degree, institution, year, details

    Only output the raw JSON object, without markdown formatting like \`\`\`json.
    
    Resume Text (Cleaned & Truncated):
    ---
    ${text.replace(/\s+/g, ' ').trim().substring(0, 10000)}
    ---
  `;

  const result = await model.generateContent(prompt);
  let responseText = result.response.text().trim();
  
  if (responseText.startsWith('```json')) {
    responseText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (responseText.startsWith('```')) {
    responseText = responseText.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse Resume JSON:', responseText);
    throw new Error('Failed to parse Resume from Gemini');
  }
}
