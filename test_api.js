import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

async function test() {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: "Say hello" }]
      },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 }
    );
    console.log("Success:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Error Status:", err.response?.status);
    console.error("Error Data:", JSON.stringify(err.response?.data, null, 2));
    console.error("Error Message:", err.message);
  }
}
test();
