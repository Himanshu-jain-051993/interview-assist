import { getGeminiModel } from "@/lib/gemini-utils";

export async function parseJobDescription(text: string) {
  const model = getGeminiModel("gemini-2.5-flash");

  const prompt = `
    You are an expert HR parser. Extract the following information from the provided job description and return it as a structured JSON object.

    Required fields in JSON:
    - title: (string) The job title
    - category: (string) The granular job category/department (e.g., "Fullstack Engineering", "Frontend", "Product Management", "Category Management", "Data Science"). BE SPECIFIC. Do not just use "Engineering" or "Product" if a more specific domain exists.
    - level: (string) The seniority level (e.g., Junior, Mid, Senior, Lead, Manager)
    - industry: (string) The industry of the role/company
    - metadata: (object) Additional interesting metadata like required skills, location, etc.

    STYLE RULE: The "category" should reflect the specific domain of expertise. For example, a "Category Manager" in a restaurant context should have category "Category Management" or "Restaurant Operations", NOT just "Product".

    Only output the raw JSON object, without markdown formatting like \`\`\`json.

    Job Description:
    ${text}
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
    console.error('Failed to parse JD JSON:', responseText);
    throw new Error('Failed to parse JD from Gemini');
  }
}
