const { GoogleGenerativeAI } = require('@google/generative-ai');

async function estimateWithGemini(items, baseEstimate) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set. Returning base estimate.');
    return { estimatedPrice: baseEstimate, reasoning: 'API key not configured' };
  }

  const prompt = `You are GreenByte AI, a specialized e-waste valuation expert for the Indian recycling market.
I have a collection of e-waste items with the following details:
${JSON.stringify(items.map(i => ({ name: i.name, category: i.category, quantity: i.quantity, weightKg: i.weightKg, condition: i.condition })), null, 2)}

Baseline market estimate (based on weight/category): ₹${baseEstimate}

Your task is to provide a final scrap value estimation (in INR) considering:
1. Precious Metal Content: Old electronics, circuit boards, and connectors contain gold, silver, and high-grade copper.
2. Component Reuse: If items are "partially_working", they have a 25-40% higher value for spare parts.
3. Material Purity: Higher weights generally imply higher bulk recovery value for plastics and aluminum.

Respond ONLY with a valid JSON object:
{
  "estimatedPrice": <number>,
  "reasoning": "<brief 1-sentence explanation of the value added by scrap/reusable parts>"
}
Do not include any other text or formatting.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return {
      estimatedPrice: parsed.estimatedPrice || baseEstimate,
      reasoning: parsed.reasoning || 'Standard estimation'
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return { estimatedPrice: baseEstimate, reasoning: 'Fallback to base estimation due to API error' };
  }
}

module.exports = {
  estimateWithGemini
};
