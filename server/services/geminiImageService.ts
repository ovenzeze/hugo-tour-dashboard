import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import type { GenerateImageOptions, GenerateImageResult, GeneratedImage, GeminiImageModelType } from "~/types/gemini";

let genAIInstance: GoogleGenerativeAI | null = null;

function getGenAIService() {
  if (genAIInstance) {
    return genAIInstance;
  }
  const config = useRuntimeConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey || typeof apiKey !== 'string') { // Ensure apiKey is a non-empty string
    console.error("GEMINI_API_KEY is missing or invalid in Nuxt runtimeConfig. Value found:", apiKey);
    throw new Error("GEMINI_API_KEY is not properly set in Nuxt runtimeConfig. Please check your .env file and nuxt.config.ts, and ensure the server is restarted after changes.");
  }

  genAIInstance = new GoogleGenerativeAI(apiKey);
  return genAIInstance;
}

// Default safety settings - consider making these configurable if needed
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const genAI = getGenAIService(); // Initialize or get existing instance here
  const { prompt, model: modelName, numberOfImages, aspectRatio } = options;

  if (!modelName) {
    // This case should ideally be handled by the API route using the default model
    // but as a safeguard in the service:
    throw new Error("Model name must be provided to generateImage function.");
  }
  
  try {
    if (modelName === "imagen-3.0-generate-002") {
      const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
      
      const imagenConfig: any = {
        numberOfImages: numberOfImages || 1, // Default to 1 image if not specified
      };
      if (aspectRatio) {
        imagenConfig.aspectRatio = aspectRatio;
      }
      // Add other Imagen 3 specific parameters from options if needed
      // e.g., if (options.personGeneration) imagenConfig.personGeneration = options.personGeneration;

      const response = await model.generateImages({
        prompt: prompt,
        config: imagenConfig,
      });

      const generatedImages: GeneratedImage[] = response.generatedImages.map(imgPart => {
        if (!imgPart.image?.imageBytes) {
          throw new Error("Imagen 3 API did not return imageBytes.");
        }
        const buffer = Buffer.from(imgPart.image.imageBytes);
        return {
          imageData: buffer.toString("base64"),
          mimeType: imgPart.image.mimeType || "image/png", // Default to png if not specified
        };
      });

      console.log('[geminiImageService.ts] Generated content for Imagen 3:', JSON.stringify({ images: generatedImages }, null, 2));
      return { images: generatedImages };

    } else if (modelName === "gemini-2.0-flash-preview-image-generation") {
      const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

      const generationConfigForApi: any = {
        responseModalities: ["IMAGE", "TEXT"], // Corrected: As per API error, model expects IMAGE and TEXT
      };

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: generationConfigForApi, // Use the config with explicit modality
      });

      const response = result.response;
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("Gemini API did not return any candidates.");
      }

      const content = candidates[0].content;
      if (!content || !content.parts || content.parts.length === 0) {
        throw new Error("Gemini API did not return any content parts.");
      }

      const generatedContent: GenerateImageResult = { images: [], text: "" };

      for (const part of content.parts) {
        if (part.text) {
          generatedContent.text += part.text;
        }
        else if (part.inlineData?.data && part.inlineData?.mimeType.startsWith("image/")) {
          generatedContent.images.push({
            imageData: part.inlineData.data, 
            mimeType: part.inlineData.mimeType,
          });
        }
      }
      console.log('[geminiImageService.ts] Generated content for Gemini Flash Image Gen:', JSON.stringify(generatedContent, null, 2));
      return generatedContent;
    } else {
      throw new Error(`Unsupported model type: ${modelName}`);
    }
  } catch (error) {
    console.error(`Error generating image with ${modelName}:`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image generation.");
  }
} 