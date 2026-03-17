
console.log('API Key Present:', !!process.env.GOOGLE_AI_API_KEY);
if (process.env.GOOGLE_AI_API_KEY) {
  console.log('API Key Length:', process.env.GOOGLE_AI_API_KEY.length);
  console.log('API Key Prefix:', process.env.GOOGLE_AI_API_KEY.substring(0, 5));
} else {
  console.log('GOOGLE_AI_API_KEY IS MISSING!');
}
