import handler from './api/analyze.js';
import dotenv from 'dotenv';
dotenv.config();

async function test(keyword: string) {
  const req = {
    method: 'POST',
    body: { keyword }
  };
  
  const res = {
    status: (code) => {
      // console.log('Status:', code);
      return {
        json: (data) => console.log(`[${keyword}] -> ${data.sentiment.toUpperCase()} | ${data.summary}`)
      };
    },
    json: (data) => console.log(`[${keyword}] -> ${data.sentiment.toUpperCase()} | ${data.summary}`),
    setHeader: () => {}
  };

  try {
    await handler(req as any, res as any);
  } catch (e) {
    console.error(`[${keyword}] Test Failed:`, e);
  }
}

async function run() {
  console.log('Testing Mixed Sentiment and Contradiction rules...\n');
  await test("Amazing app but crashes");
  await test("Works fine but slow");
  await test("Not bad");
  await test("Could be better");
  await test("I like it but has issues");
  await test("Great app it crashes"); // No explicit shift word, but crashes is strong negative
}

run();
