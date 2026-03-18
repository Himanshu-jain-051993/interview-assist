import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function parseJobDescription(text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const prompt = `
    You are an expert HR parser. Extract the following information from the provided job description and return it as a structured JSON object.

    Required fields in JSON:
    - title: (string) The job title
    - category: (string) The job category/department (e.g., Engineering, Design, Product)
    - level: (string) The seniority level (e.g., Junior, Mid, Senior, Lead, Manager)
    - industry: (string) The industry of the role/company
    - metadata: (object) Additional interesting metadata like required skills, location, etc.

    Only output the raw JSON object, without markdown formatting like \`\`\`json.

    Job Description:
    ${text}
  `;

  const result = await model.generateContent(prompt);
  let responseText = result.response.text().trim();
  
  if (responseText.startsWith('\`\`\`json')) {
    responseText = responseText.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse JD JSON:', responseText);
    throw new Error('Failed to parse JD from Gemini');
  }
}

