
import { GoogleGenAI } from "@google/genai";
import { GEMINI_IMAGE_MODEL } from '../constants';

// IMPORTANT: API key is sourced from process.env.API_KEY.
// This requires the application to be built with a bundler (like Vite or Webpack)
// that can replace process.env.API_KEY with an actual key during the build process.
// Ensure process.env.API_KEY is defined in your build environment.
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("Gemini API key not found. Please set process.env.API_KEY.");
  // In a real app, you might want to disable AI features or show a warning.
}

const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY" }); // Fallback to avoid crash if key is missing during init

export const generateImageWithGemini = async (prompt: string): Promise<string | null> => {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Cannot generate image.");
  }
  try {
    const response = await ai.models.generateImages({
      model: GEMINI_IMAGE_MODEL,
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png' }, // Request PNG for easier canvas handling
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    // Try to get more specific error message if available
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("API key not valid")) {
         throw new Error("Invalid Gemini API Key. Please check your API_KEY.");
    }
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
};
