async function testApi() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const models = ["models/text-embedding-004", "models/gemini-embedding-001"];
  
  for (const modelName of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:embedContent?key=${apiKey}`;
    try {
      console.log(`Testing: ${modelName}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: 'Hello world' }] } })
      });
      
      const data = await response.json();
      console.log("Status:", response.status);
      if (response.status === 200) {
        console.log("SUCCESS!");
        return;
      }
    } catch (err) {
      console.error("Fetch failed:", err.message);
    }
  }
}

testApi();
