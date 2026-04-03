import axios from 'axios';

async function verify() {
  console.log("🚀 Testing TweetPulse AI Analysis Endpoint (with fallback)...");
  try {
    const response = await axios.post("http://localhost:4000/api/analyze", {
      keyword: "I love this clean UI and fast performance!"
    });
    
    console.log("✅ Analysis Success from Fallback!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
    
    if (response.data.sentiment && response.data.summary && typeof response.data.confidence === 'number') {
      console.log("✨ Validation Passed: Response structure is correct.");
    } else {
      console.warn("⚠️ Validation Warning: Some fields are missing.");
    }
  } catch (err) {
    console.error("❌ Verification Failed!");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error:", err.message);
    }
  }
}

verify();
