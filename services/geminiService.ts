
import { GoogleGenAI } from "@google/genai";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
export const analyzeImage = async (base64Image: string, mimeType: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = "حلل هذه الصورة وقدم وصفاً قصيراً جداً (جملة واحدة) باللغة العربية واقترح اسماً للملف يكون متوافقاً مع SEO باللغة الإنجليزية. أجب بصيغة JSON فقط: { \"description\": \"...\", \"suggestedName\": \"...\" }";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image.split(',')[1]
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    // Directly access the .text property from the GenerateContentResponse object.
    const resultText = response.text;
    return JSON.parse(resultText || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};
