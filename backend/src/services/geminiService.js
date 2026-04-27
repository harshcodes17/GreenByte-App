const { GoogleGenAI } = require("@google/genai");

/**
 * Models to try (working ones only)
 */
const MODEL_FALLBACK_CHAIN = [
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Smart fallback (when Gemini fails)
 */
function smartFallback(items, baseEstimate) {
  let bonus = 0;

  items.forEach(item => {
    const name = (item.name || "").toLowerCase();
    const category = (item.category || "").toLowerCase();

    if (name.includes("laptop") || category.includes("cpu")) {
      bonus += 0.1;
    }

    if (item.condition === "working") bonus += 0.2;
    if (item.condition === "partially_working") bonus += 0.1;
  });

  const multiplier = Math.min(1.3, 1 + bonus);
  return Math.round(baseEstimate * multiplier);
}

/**
 * Main function
 */
async function estimateWithGemini(items, baseEstimate) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set.");
    return {
      estimatedPrice: smartFallback(items, baseEstimate),
      reasoning: "API key not configured, used fallback logic"
    };
  }

  const prompt = `
You are GreenByte AI, an expert e-waste valuation engine for the Indian scrap market.

STRICT RULES:
- Anchor all calculations to BASELINE estimate
- Final price must stay between 0.8x and 1.6x baseline
- Be realistic like a scrap dealer

REFERENCE RATES (₹):
Phones: 15
Laptops: 250
Tablets: 100
Smartwatches: 10
Microwaves: 150
Mixers: 50
Kettles: 15
Irons: 15
Fans: 50
Refrigerators: 500
Washing Machines: 250
ACs: 1000
LED TVs: 100
CRT TVs: 50
Monitors: 25
Printers: 50
Scanners: 25
CPUs: 250
UPS: 150
Cables: 50/kg
Remotes: 10/kg
Keyboards: 5
Toys: 15/kg

ITEMS:
${JSON.stringify(items, null, 2)}

BASELINE: ₹${baseEstimate}

ADJUSTMENTS:
- working → +30%
- partially_working → +20%
- scrap → -10%
- old (>6 yrs) → -20%
- bulk (>20kg) → +10%
- valuable metals → +5–15%

OUTPUT STRICT JSON:
{
  "estimatedPrice": number,
  "reasoning": "short explanation"
}
`;

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
          console.log(`Retry ${attempt} for ${modelName} after ${delay}ms`);
          await sleep(delay);
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        let text = response.text;

        // Clean markdown if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(text);

        console.log(`✅ Gemini success with ${modelName}`);

        return {
          estimatedPrice: parsed.estimatedPrice || baseEstimate,
          reasoning: parsed.reasoning || "AI estimation"
        };

      } catch (error) {
        const status = error.status || error.code;

        if (status === 429 || status === 503) {
          console.warn(`⚠️ Temporary error (${status}) on ${modelName}`);
          continue;
        }

        if (status === 404) {
          console.warn(`❌ Model ${modelName} not available`);
          break;
        }

        console.error(`❌ Unexpected error on ${modelName}:`, error.message);
        break;
      }
    }
  }

  console.error("🚨 All Gemini models failed. Using fallback.");

  return {
    estimatedPrice: smartFallback(items, baseEstimate),
    reasoning: "AI unavailable, used fallback estimation"
  };
}

module.exports = {
  estimateWithGemini
};