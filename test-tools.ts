import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("No API key found in env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testSearch() {
  console.log("\nTesting Google Maps...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Find nearby MeeSeva centers",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: 17.3850,
              longitude: 78.4867
            }
          }
        }
      }
    });
    console.log("Search TEXT:", response.text);
    console.log("Search CHUNKS:", JSON.stringify(response.candidates?.[0]?.groundingMetadata?.groundingChunks, null, 2));
  } catch (e) {
    console.error("Search Error:", e);
  }
}

testSearch();
