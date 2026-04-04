// Local unit test for resolveContradiction — no AI call needed

// Inline the resolver patterns from analyze.ts
const SHIFT_WORDS_RE = /\b(but|however|although|though|except|yet|despite|still|whereas|nevertheless|unfortunately)\b/;
const POSITIVE_SIGNALS_RE = /\b(amazing|great|good|excellent|love|awesome|fantastic|wonderful|brilliant|nice|fine|like|best|perfect|outstanding|superb|impressive|phenomenal|wow|incredible|works)\b/;
const NEGATIVE_SIGNALS_RE = /\b(crash|crashes|bug|bugs|error|errors|fail|fails|failure|broken|slow|issues|problem|problems|terrible|awful|worst|bad|pain|struggle|horrible|unusable|disappointing|disappoint|frustrating|frustration|useless)\b/;
const SARCASM_OPENER_RE = /^(wow|oh wow|great|amazing|fantastic|brilliant)[,!\s]/i;
const ELLIPSIS_RE = /\.\.\.|…/;
const SOFT_NEG_RE = /\b(slow|bland|basic|meh|okay|ok|average|mediocre|limited|lacking|weak|simple|plain)\b/;

function resolveContradiction(keyword, parsed) {
  const text = keyword.toLowerCase().trim();
  const result = { ...parsed };

  const hasShift = SHIFT_WORDS_RE.test(text);
  const hasPositive = POSITIVE_SIGNALS_RE.test(text);
  const hasNegative = NEGATIVE_SIGNALS_RE.test(text);
  const hasSarcasmOpener = SARCASM_OPENER_RE.test(keyword);
  const hasEllipsis = ELLIPSIS_RE.test(text);

  if (/\bnot bad\b/.test(text)) {
    return { ...result, sentiment: 'neutral', rule: 'EDGE: not bad' };
  }
  if (/\bcould be better\b/.test(text)) {
    return { ...result, sentiment: 'negative', rule: 'EDGE: could be better' };
  }
  if (hasSarcasmOpener && hasNegative) {
    return { ...result, sentiment: 'negative', rule: 'SARCASM: opener + negative' };
  }
  if (hasEllipsis && hasPositive && hasNegative) {
    return { ...result, sentiment: 'negative', rule: 'ELLIPSIS: rhetorical pivot' };
  }
  if (hasShift && hasPositive && hasNegative) {
    const shiftMatch = text.match(SHIFT_WORDS_RE);
    const shiftWord = shiftMatch ? shiftMatch[0] : 'but';
    const parts = text.split(new RegExp(`\\b${shiftWord}\\b`));
    const laterClause = parts[parts.length - 1] || '';
    const hasNegInLater = NEGATIVE_SIGNALS_RE.test(laterClause);
    if (hasNegInLater || hasNegative) {
      return { ...result, sentiment: 'negative', rule: `SHIFT+BOTH: "${shiftWord}" clause dominates` };
    }
  }
  if (hasShift && hasPositive && !hasNegative) {
    const shiftMatch = text.match(SHIFT_WORDS_RE);
    const shiftWord = shiftMatch ? shiftMatch[0] : 'but';
    const afterShift = text.split(new RegExp(`\\b${shiftWord}\\b`))[1] || '';
    if (SOFT_NEG_RE.test(afterShift)) {
      return { ...result, sentiment: 'negative', rule: `SHIFT+SOFT: "${shiftWord}" + soft negative` };
    }
  }
  if (result.sentiment === 'positive' && hasNegative) {
    return { ...result, sentiment: 'negative', rule: 'SAFETY: AI positive overridden by hard negative' };
  }
  return { ...result, rule: 'PASS: no override' };
}

// TEST CASES
const tests = [
  { input: "Wow, this app is amazing... it crashes every time", expectSentiment: 'negative' },
  { input: "Amazing app but crashes",                          expectSentiment: 'negative' },
  { input: "Great job... it broke everything",                 expectSentiment: 'negative' },
  { input: "Amazing app, crashes constantly",                  expectSentiment: 'negative' },
  { input: "Works fine but slow",                              expectSentiment: 'negative' },
  { input: "I like it but has issues",                         expectSentiment: 'negative' },
  { input: "Good UI but very slow",                            expectSentiment: 'negative' },
  { input: "Not bad",                                          expectSentiment: 'neutral'  },
  { input: "Could be better",                                  expectSentiment: 'negative' },
  { input: "Great app it crashes",                             expectSentiment: 'negative' },  // no shift word
  { input: "Absolutely love it",                               expectSentiment: 'positive' },  // pure positive
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  // Simulate AI returning 'positive' so overrides are exercised properly
  const fakeAI = { sentiment: 'positive', confidence: 80, stats: { positive: 80, negative: 10, neutral: 10 }, topics: [] };
  const result = resolveContradiction(test.input, fakeAI);
  const ok = result.sentiment === test.expectSentiment;
  const icon = ok ? '✅' : '❌';
  if (ok) passed++; else failed++;
  console.log(`${icon} [${result.sentiment.toUpperCase().padEnd(8)}] expected=${test.expectSentiment.padEnd(8)} | rule=${result.rule}`);
  console.log(`   Input: "${test.input}"`);
}

console.log(`\nResults: ${passed}/${tests.length} passed, ${failed} failed`);
