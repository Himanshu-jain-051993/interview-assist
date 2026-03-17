
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyDUokEbD4p0XasulmkkjeoTXlJeU1sRPn0";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    console.log("Available Models:", JSON.stringify(data.models?.map(m => m.name), null, 2));
  } catch (err) {
    console.error("ListModels Failed:", err.message);
  }
}

listModels();
