import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini/OpenRouter API Endpoint
  app.post("/api/analyze", async (req, res) => {
    console.log("Analyze endpoint hit with keyword:", req.body.keyword);
    const { keyword } = req.body;
    
    // Prioritize GEMINI_API_KEY, fallback to API_KEY, then the provided OpenRouter key
    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    
    // Clean the key (remove potential quotes from .env files and whitespace)
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    }

    console.log(`Detected API Key from env: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NONE'}`);

    // If the key is missing or is the placeholder, use the hardcoded OpenRouter key
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "MY_API_KEY" || apiKey === "") {
      console.log("Using hardcoded OpenRouter key fallback");
      apiKey = "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";
    }

    if (!apiKey || apiKey === "") {
      console.error("API Key is still missing after fallback check!");
      return res.status(500).json({ 
        error: "API key is missing. Please add your key to the 'Secrets' panel in the AI Studio UI with the name GEMINI_API_KEY." 
      });
    }

    if (!keyword) {
      return res.status(400).json({ error: "Keyword is required." });
    }

    try {
      const sanitizedKeyword = JSON.stringify(keyword);
      console.log(`Calling OpenRouter for keyword: ${keyword.substring(0, 50)}${keyword.length > 50 ? '...' : ''}`);
      
      const prompt = `Analyze the sentiment of the keyword or topic: ${sanitizedKeyword}. 
      Provide a brief summary, confidence score, and percentage breakdown of positive, negative, and neutral sentiment. 
      Also provide 5 key topics or hashtags related to this.
      
      IMPORTANT: Your response MUST be valid JSON and follow this schema exactly:
      {
        "sentiment": "positive" | "negative" | "neutral",
        "summary": "string",
        "confidence": number (0.0 to 1.0),
        "stats": {
          "positive": number,
          "negative": number,
          "neutral": number
        },
        "topics": ["string", "string", "string", "string", "string"]
      }`;

      // Call OpenRouter API with a timeout
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: "You are a sentiment analysis expert. You must respond ONLY with a valid JSON object." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "TweetPulse Sentiment Analysis",
            "Content-Type": "application/json"
          },
          timeout: 25000 // 25 second timeout
        }
      );

      let content = response.data.choices[0].message.content;
      console.log("OpenRouter response received.");
      
      // Robust JSON parsing
      try {
        // Remove potential markdown code blocks if the model ignored the json_object format
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanedContent);
        res.json(parsedData);
      } catch (parseError) {
        console.error("JSON Parse Error:", content);
        res.status(500).json({ error: "The AI returned an invalid data format. Please try again." });
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        console.error("OpenRouter Timeout");
        return res.status(504).json({ error: "The analysis timed out. OpenRouter is taking too long to respond." });
      }
      
      console.error("API Error Details:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to analyze sentiment";
    }
  });

  // Pulse AI Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    
    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (apiKey) apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "" || apiKey === "undefined") {
      apiKey = "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";
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: "You are Pulse AI, a concise sentiment analysis assistant. Max 2-3 sentences. Help users with TweetPulse features." },
            ...messages
          ],
          temperature: 0.5,
          max_tokens: 200
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "Pulse AI Assistant",
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );

      res.json({ content: response.data.choices[0].message.content });
    } catch (error: any) {
      console.error("Chat API Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
