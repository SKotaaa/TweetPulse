import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/analyze';

async function testQuery(keyword) {
  try {
    const response = await axios.post(API_BASE, { keyword }, {
      headers: { "Content-Type": "application/json" }
    });
    const parsed = response.data;
    console.log(`\nTEST: "${keyword}"`);
    console.log(`Sentiment: ${parsed.sentiment?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`Summary: ${parsed.summary}`);
  } catch (err) {
    console.error(`Failed on "${keyword}":`, err.message);
  }
}

async function runTests() {
  await testQuery("Amazing app but crashes");
  await testQuery("Good UI but very slow");
  await testQuery("Not bad");
  await testQuery("Could be better");
  await testQuery("I like it but has issues");
}

runTests();
