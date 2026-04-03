import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await axios.get("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const freeModels = response.data.data.filter(m => m.id.endsWith(':free'));
    console.log("Free Models:", freeModels.map(m => m.id).join(", "));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
listModels();
