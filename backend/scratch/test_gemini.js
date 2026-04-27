const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const { estimateWithGemini } = require('../src/services/geminiService');
require('dotenv').config();

async function testService() {
  const items = [
    { name: "Old iPhone", condition: "working", quantity: 1, estimatedValue: 15 },
    { name: "Broken Microwave", condition: "scrap", quantity: 1, estimatedValue: 150 }
  ];
  const baseEstimate = 165;

  console.log("Testing estimateWithGemini with retries and fallbacks...");
  const result = await estimateWithGemini(items, baseEstimate);
  console.log("Result:", JSON.stringify(result, null, 2));
}

testService();
