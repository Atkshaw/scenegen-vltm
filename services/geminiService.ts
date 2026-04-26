
import { GoogleGenAI } from "@google/genai";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const urlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateStimulus = async (
  sourceFile: File,
  prompt: string,
  referenceImageUrl?: string | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const sourceBase64 = await fileToBase64(sourceFile);
  
  const parts: any[] = [];

  if (referenceImageUrl) {
    // VARIANT MODE: Image B generation
    const refBase64 = await urlToBase64(referenceImageUrl);
    
    // Explicitly label the parts for the model to prevent confusion
    parts.push({ text: "REFERENCE IMAGE (Image A):" });
    parts.push({
      inlineData: {
        data: refBase64,
        mimeType: 'image/png',
      },
    });
    
    parts.push({ text: "NEW SOURCE OBJECT (Image B):" });
    parts.push({
      inlineData: {
        data: sourceBase64,
        mimeType: sourceFile.type,
      },
    });
    
    // Add the user's prompt at the end as the primary instruction
    parts.push({ text: `INSTRUCTION: ${prompt}` });
  } else {
    // BASELINE MODE: Image A generation
    parts.push({
      inlineData: {
        data: sourceBase64,
        mimeType: sourceFile.type,
      },
    });
    parts.push({ text: prompt });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("Invalid response from Gemini: No parts found.");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in Gemini response.");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found.")) {
      throw new Error("Model or API Key error. Please re-select your API key in the settings.");
    }
    throw error;
  }
};
