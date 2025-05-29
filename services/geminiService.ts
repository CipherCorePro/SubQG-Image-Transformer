
import { GoogleGenAI } from "@google/genai";
import { GEMINI_IMAGE_MODEL } from '../constants';

const apiKeyFromEnv = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

const initializeGenAI = (): GoogleGenAI => {
  if (!apiKeyFromEnv) {
    console.error("Gemini API key not found in environment. Please ensure process.env.API_KEY is set during build.");
    // Throw an error or return a dummy client if preferred, but for now, allow execution to continue
    // to potentially show the error in the UI if the service is called.
    // The prompt requires using process.env.API_KEY.
    throw new Error("Gemini API key is not configured (process.env.API_KEY is missing). Cannot initialize Gemini service.");
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: apiKeyFromEnv });
  }
  return ai;
};

export const generateImageWithGemini = async (prompt: string): Promise<string | null> => {
  let genAI;
  try {
    genAI = initializeGenAI();
  } catch (initError) {
     console.error("Gemini service initialization failed:", initError);
     throw initError; // Re-throw to be caught by the caller in App.tsx
  }

  try {
    const response = await genAI.models.generateImages({
        model: GEMINI_IMAGE_MODEL, // Should be 'imagen-3.0-generate-002'
        prompt: prompt, 
        config: {numberOfImages: 1, outputMimeType: 'image/png'},
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      console.warn(`No image data found in Gemini response for model ${GEMINI_IMAGE_MODEL} using generateImages.`, response);
      throw new Error("Gemini did not return image data or the response format was unexpected.");
    }
  } catch (error) {
    console.error(`Error generating image with Gemini model ${GEMINI_IMAGE_MODEL} (using generateImages):`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("API key not valid")) {
         throw new Error("Invalid Gemini API Key. Please check your API_KEY.");
    }
    // The billing error message is specific and indicates the API was reached but access denied for billing reasons.
    if (errorMessage.toLowerCase().includes("billed user") || (errorMessage.toLowerCase().includes("billing") && errorMessage.includes("400"))) {
        throw new Error(`Image generation with ${GEMINI_IMAGE_MODEL} failed due to a billing issue. Please ensure your Google Cloud project has billing enabled for the Imagen API. Original error: ${errorMessage}`);
    }
    if (errorMessage.includes("404") && errorMessage.toLowerCase().includes("not found")){
        throw new Error(`Model ${GEMINI_IMAGE_MODEL} not found or not supported for image generation with generateImages. Please check model name and API capabilities. Original error: ${errorMessage}`);
    }
    // Fallback for other errors
    throw new Error(`Failed to generate image with ${GEMINI_IMAGE_MODEL}: ${errorMessage}`);
  }
};
