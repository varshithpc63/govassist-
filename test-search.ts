import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Where is the nearest MeeSeva center?",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("TEXT:", response.text);
  } catch (e) {
    console.error(e);
  }
}

test();
