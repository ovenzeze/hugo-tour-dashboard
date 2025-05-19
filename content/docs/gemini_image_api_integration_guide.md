# Gemini Image Generation API Integration Guide

This document provides a guide for integrating Google's Gemini Image Generation capabilities into your project.

## 1. Introduction

The Gemini API offers powerful image generation features, allowing developers to create images from text prompts. This can be achieved either through Gemini's native multimodal capabilities or by using Imagen 3, Google's most advanced text-to-image model. All generated images include a [SynthID watermark](https://ai.google.dev/responsible/docs/safeguards/synthid) for responsible AI practices.

## 2. Choosing the Right Model

The Gemini API provides two primary ways to generate images:

*   **Gemini Models (e.g., `gemini-2.0-flash-preview-image-generation`)**:
    *   **Use Cases**: Best for generating contextually relevant images that leverage world knowledge and reasoning, seamlessly blending text and images, embedding accurate visuals within long text sequences, and conversational image editing while maintaining context.
    *   **Features**: Supports conversational image generation and editing. Can output text and images interleaved.
    *   **Configuration**: Requires `responseModalities: ["TEXT", "IMAGE"]` in the generation configuration, as image-only output is not supported with these models.

*   **Imagen 3 (e.g., `imagen-3.0-generate-002`)**:
    *   **Use Cases**: Google's highest quality text-to-image model. Choose Imagen 3 when image quality, photorealism, artistic detail, or specific styles (e.g., impressionism, anime) are top priorities. Also suitable for specialized editing tasks like product background updates or image upscaling, and for infusing branding, style, or generating logos and product designs.
    *   **Features**: Offers superior detail, richer lighting, and fewer artifacts. Understands natural language prompts and can render text effectively within images.
    *   **Tier**: Note that Imagen 3 is only available on the Paid Tier.

For most general use cases, starting with Gemini's built-in capabilities is recommended. Opt for Imagen 3 when specialized tasks demand the highest image quality.

## 3. API Key Setup

To use the Gemini API, you'll need an API key.
1.  Obtain your API key from [Google AI Studio](https://aistudio.google.com/).
2.  It's crucial to keep your API key secure. For this project, store it in your `.env` file:
    ```env
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
    Ensure `.env` is listed in your `.gitignore` file to prevent accidental exposure.

## 4. Integration Steps (Node.js/TypeScript)

Given the project is built with Nuxt.js (which uses Node.js and TypeScript), the following steps focus on the Google Gen AI SDK for Node.js.

### 4.1. Install the SDK

Add the `@google/generative-ai` package to your project:
```bash
npm install @google/generative-ai
# or
pnpm install @google/generative-ai
# or
yarn add @google/generative-ai
```

### 4.2. Using Imagen 3 for Image Generation

The following example demonstrates how to generate images using the Imagen 3 model.

```typescript
// Example: server/services/imageGenerationService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "node:fs"; // Or handle image data as needed

// Ensure your API key is loaded from environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

async function generateWithImagen3(prompt: string, numberOfImages: number = 1) {
  try {
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" }); // Check for the latest model version

    const response = await model.generateImages({
      prompt: prompt,
      config: {
        numberOfImages: numberOfImages, // 1 to 4
        // aspectRatio: "1:1", // "1:1", "3:4", "4:3", "9:16", "16:9"
        // personGeneration: "ALLOW_ADULT", // "DONT_ALLOW", "ALLOW_ADULT"
      },
    });

    const generatedImages = response.generatedImages;

    // Process generated images (e.g., save to file, return as base64)
    for (let i = 0; i < generatedImages.length; i++) {
      const image = generatedImages[i];
      const buffer = Buffer.from(image.image.imageBytes);
      // Example: Save to a temporary file or upload to storage
      // fs.writeFileSync(`imagen3-generated-${i}.png`, buffer);
      console.log(`Imagen 3: Image ${i + 1} generated (size: ${buffer.length} bytes)`);
      // You might want to return the image data (e.g., as base64) or a URL
    }
    return generatedImages; // Or processed image data

  } catch (error) {
    console.error("Error generating images with Imagen 3:", error);
    throw error;
  }
}

// Example usage:
// generateWithImagen3("A photorealistic image of a cat wearing a small wizard hat", 2)
//   .then(images => console.log(`${images.length} images generated.`))
//   .catch(err => console.error(err));
```

### 4.3. Using Gemini Model for Image Generation (Text-to-Image)

Gemini models can generate images as part of a multimodal response.

```typescript
// Example: server/services/imageGenerationService.ts (continued)
import { GoogleGenerativeAI, Modality } from "@google/generative-ai"; // Modality might be part of a different import path or type definition

// ... (genAI setup from above) ...

async function generateWithGemini(prompt: string) {
  try {
    // Ensure you use a model version that supports image generation, e.g., "gemini-2.0-flash-preview-image-generation"
    // Check the official documentation for the latest recommended model.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });

    const response = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { // Use generationConfig for Gemini models
        responseModalities: [Modality.TEXT, Modality.IMAGE], // Ensure Modality enum/type is correctly referenced
      },
    });

    const result = response.response;
    const parts = result.candidates?.[0]?.content?.parts || [];

    const generatedContent = {
      text: "",
      images: [] as Buffer[], // Store image data as Buffers or base64 strings
    };

    for (const part of parts) {
      if (part.text) {
        generatedContent.text += part.text;
      } else if (part.inlineData?.data && part.inlineData?.mimeType.startsWith("image/")) {
        const imageBuffer = Buffer.from(part.inlineData.data, "base64");
        generatedContent.images.push(imageBuffer);
        // Example: fs.writeFileSync(`gemini-generated-image.png`, imageBuffer);
        console.log(`Gemini: Image generated (MIME type: ${part.inlineData.mimeType})`);
      }
    }
    return generatedContent;

  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw error;
  }
}

// Example usage:
// generateWithGemini("Create an image of a futuristic cityscape at sunset, and describe it.")
//   .then(content => {
//     console.log("Text:", content.text);
//     console.log(`${content.images.length} images generated.`);
//   })
//   .catch(err => console.error(err));
```
**Note on `Modality`**: The exact import or usage of `Modality` might vary based on the SDK version. Refer to the latest SDK documentation if you encounter type errors. It might be a string array like `responseModalities: ["TEXT", "IMAGE"]`.

## 5. Key Parameters

### For Imagen 3 (`generateImages`):
*   `prompt` (string): The text prompt for the image.
*   `config.numberOfImages` (number, 1-4, default: 4): The number of images to generate.
*   `config.aspectRatio` (string, default: "1:1"): Supported values: `"1:1"`, `"3:4"`, `"4:3"`, `"9:16"`, `"16:9"`.
*   `config.personGeneration` (string, default: `"ALLOW_ADULT"`): Control generation of people. Supported: `"DONT_ALLOW"`, `"ALLOW_ADULT"`.
*   `config.safety_filter_level` (string): Adds a filter level to safety filtering (e.g., `"BLOCK_MEDIUM_AND_ABOVE"`). Note: For the initial GA launch of Imagen 3, safety filters might not be configurable via the Gemini API; check Vertex AI for more control.

### For Gemini Models (`generateContent` with image modality):
*   `contents` (array): The prompt, which can be text, images, or a combination.
*   `generationConfig.responseModalities` (array): Must include `"IMAGE"` (and typically `"TEXT"`). Example: `["TEXT", "IMAGE"]`.

## 6. Prompting Best Practices (Summary for Imagen 3)

Effective prompting is key to achieving desired image results.
*   **Be Descriptive and Clear**: Use meaningful keywords.
*   **Structure**: Think about:
    *   **Subject**: The main object, person, or scene.
    *   **Context/Background**: Where the subject is placed.
    *   **Style**: Artistic style (e.g., "photorealistic", "sketch", "impressionistic", "anime").
*   **Iterate**: Start with a core idea and refine by adding details.
*   **Text in Images**:
    *   Keep text short (ideally <25 characters).
    *   Specify general font styles if needed.
*   **Photography Modifiers**: Use terms like "close up", "aerial view", "natural lighting", "motion blur", "35mm lens", "black and white".
*   **Artistic Styles**: Reference art movements (e.g., "in the style of Art Nouveau") or techniques ("charcoal drawing").
*   **Quality Modifiers**: Add terms like "high-quality", "4K", "HDR", "detailed".

Refer to the [official Imagen prompt guide](https://ai.google.dev/gemini-api/docs/imagen-prompt-guide) for comprehensive details.

## 7. Project Integration Suggestions (`hugo-tour-dashboard`)

*   **Service Location**:
    *   Create a new service file, e.g., `server/services/imageGenerationService.ts`, to encapsulate all image generation logic. This keeps concerns separated.
    *   Alternatively, if image generation is closely tied to other LLM functionalities, you could extend the existing `server/utils/llmService.ts`. However, a dedicated service is often cleaner for distinct functionalities.
*   **API Endpoints**:
    *   If you need to expose this functionality to the frontend, create new API routes in `server/api/`. For example:
        ```
        server/api/generate-image.post.ts
        ```
        This endpoint would take a prompt (and other parameters) from the client, call the `imageGenerationService`, and return the image data (e.g., as a base64 string, or a URL if you store the image).
*   **API Key Management**:
    *   Continue using `.env` for `GEMINI_API_KEY` and access it via `process.env.GEMINI_API_KEY` on the server-side.
*   **Error Handling**: Implement robust error handling in your service and API endpoints to manage API errors, rate limits, etc.
*   **Configuration**: Consider making parameters like `numberOfImages` or `aspectRatio` configurable via API requests if needed by the frontend.
*   **Image Storage/Delivery**: Decide how generated images will be handled.
    *   Return as base64 data directly to the client (suitable for temporary display or small images).
    *   Store images in a cloud storage solution (like Supabase Storage, which seems to be in use: `server/services/supabaseStorageService.ts`) and return a URL. This is better for persistent images or larger files.

## 8. Important Considerations

*   **SynthID**: All images generated via the Gemini API (including Imagen 3) will have a non-visible SynthID watermark.
*   **Pricing**: Imagen 3 is on the Paid Tier. Gemini model usage for image generation will also have associated costs. Monitor your usage and billing.
*   **Rate Limits**: Be aware of API rate limits and implement retry mechanisms or queuing if necessary for high-volume applications.
*   **Safety Filters**: Safety filters are applied by default. For Imagen 3, these might not be configurable via the Gemini API initially.
*   **Supported Regions**: Check the [available regions](https://ai.google.dev/gemini-api/docs/available-regions) for model availability.
*   **Prompt Languages**: Imagen 3 currently supports English prompts primarily. Gemini models might support more languages for prompts leading to image generation, but English is generally recommended for best performance.

This guide should provide a solid foundation for integrating Gemini's image generation capabilities. Always refer to the [official Google AI for Developers documentation](https://ai.google.dev/gemini-api/docs) for the most up-to-date information.
