export type GeminiImageModelType = 'imagen-3.0-generate-002' | 'gemini-2.0-flash-preview-image-generation';

export interface GenerateImageOptions {
  prompt: string;
  model?: GeminiImageModelType;
  numberOfImages?: number; // For Imagen 3: 1-4
  aspectRatio?: string; // For Imagen 3: "1:1", "3:4", "4:3", "9:16", "16:9"
  // Add other parameters as needed, e.g., personGeneration for Imagen
}

export interface GeneratedImage {
  imageData: string; // Base64 encoded image data
  mimeType: string; 
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  text?: string; // For Gemini model responses that might include text
} 