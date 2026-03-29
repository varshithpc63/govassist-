import { loadEnv } from 'vite';
import { GoogleGenAI } from "@google/genai";

const env = loadEnv('development', process.cwd(), '');
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Where is the nearest MeeSeva center?",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: 17.3850, // Hyderabad
              longitude: 78.4867
            }
          }
        }
      }
    });
    console.log("TEXT:", response.text);
    console.log("CHUNKS:", JSON.stringify(response.candidates?.[0]?.groundingMetadata?.groundingChunks, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
