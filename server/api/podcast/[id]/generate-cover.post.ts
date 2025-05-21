import { defineEventHandler, getRouterParam, createError } from 'h3';
// import { serverSupabaseClient } from '#supabase/server'; // No longer directly used for storage ops
import { Buffer } from 'buffer';
import { fetchPodcastByIdForServer, updatePodcastCoverForServer } from '~/server/utils/podcastDb';
import fs from 'fs/promises';
import path from 'path';
// import type { Database } from '~/types/supabase'; // No longer directly needed for Supabase client here
import { getStorageService } from '~/server/services/storageService'; // Import the factory

export default defineEventHandler(async (event) => {
  const podcastId = getRouterParam(event, 'id');
  if (!podcastId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Podcast ID is required',
    });
  }

  let podcast;
  try {
    podcast = await fetchPodcastByIdForServer(event, podcastId);
  } catch (error: any) {
    console.error(`Error fetching podcast ${podcastId}:`, error);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch podcast details: ${error.message}`,
    });
  }

  if (!podcast) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Podcast not found',
    });
  }

  const podcastTitle = podcast.title;
  let promptContent;
  try {
    // We might still want to log or partially use promptContent if needed for very specific dynamic elements
    // but it will not be part of the main AI image generation prompt directly.
    const promptFilePath = path.join(process.cwd(), 'public', 'prompts', 'podcast_cover_prompt.md');
    promptContent = await fs.readFile(promptFilePath, 'utf-8'); // Read for reference or future use
  } catch (error: any) {
    console.warn('[generate-cover.post.ts] Warning: Could not read podcast_cover_prompt.md. Proceeding with a generalized prompt. Error:', error.message);
    // Not throwing an error here, as the essential prompt can be constructed without it,
    // though style specifics might be less detailed.
    promptContent = ""; // Ensure promptContent is a string
  }

  const podcastThemeDescription = podcast.topic || "the main theme of this podcast related to its title";

  // Construct a more direct prompt for the image generation model
  const finalPrompt = `
  Generate an image now with a 3:4 portrait aspect ratio. This is a direct request to create an image based on the following specifications.
  
  **Theme for Image**: Create a visual representation inspired by "${podcastThemeDescription}". This is an artistic illustration about "${podcastThemeDescription}", expressed purely through imagery.
  
  **Style Requirements**:
  - Mood: Modern, engaging, professional, informative, with an artistic feel for a museum tour or cultural introduction.
  - Artistic Style: Highly artistic, hand-drawn or illustrative style, compelling and aesthetically pleasing.
  - Imagery: Clear, high-quality central image connected to the theme, with a complementary background adding depth without distraction.
  - Color Palette: Harmonious, professional colors enhancing the artistic style.
  - Composition: Balanced, uncluttered design, suitable as a background with space for potential overlays.
  
  **Watermark (Only Allowed Text)**:
  - Add a "Hugo Tour Guide" watermark exactly as follows:
    - Position: Bottom-right corner, 20 pixels from right and bottom edges.
    - Font: Simple sans-serif (like Helvetica or Arial).
  
  **Critical Rules**:
  - NO TEXT in the image except the specified watermark. Do not include any labels or written content.
  - Avoid cluttered designs, low-resolution imagery, or additional watermarks.
  
  Create the image immediately, focusing on a purely visual, artistic depiction of the described theme with only the "Hugo Tour Guide" watermark.
  `;
  
  
  
  // console.log("[generate-cover.post.ts] Constructed finalPrompt:", finalPrompt); // For debugging

  let imageUrlFromAIService: string;

  try {
    const imageResponse = await $fetch.raw('/api/ai/image/generate', {
      method: 'POST',
      body: {
        prompt: finalPrompt,
        numberOfImages: 1,
        aspectRatio: "3:4", // Changed from "2:3" to "9:16"
        temperature: 0, // 设置温度为 0，使生成结果更加确定性
      },
    });

    const responseBody = imageResponse._data;
    console.log('[generate-cover.post.ts] Raw responseBody from /api/ai/image/generate:', JSON.stringify(responseBody, null, 2));

    // Check for errors from the /api/ai/image/generate endpoint itself or unsuccessful generation
    if (imageResponse.status !== 200 || !responseBody || responseBody.error || !responseBody.imageUrl) {
      const serviceErrorMsg = responseBody?.error?.message || responseBody?.message || 'Invalid or error response from image generation API';
      console.error('[generate-cover.post.ts] Error or invalid response from /api/ai/image/generate. Status:', imageResponse.status, 'Body:', JSON.stringify(responseBody, null, 2));
      throw createError({
        statusCode: responseBody?.error?.statusCode || imageResponse.status || 500,
        statusMessage: serviceErrorMsg,
        data: responseBody?.error || responseBody
      });
    }
    imageUrlFromAIService = responseBody.imageUrl;

  } catch (error: any) {
    // This catches errors from $fetch itself (e.g., network issues) or the createError thrown above
    console.error('[generate-cover.post.ts] Error calling /api/ai/image/generate or processing its response:', error.message, error.data || error.stack);
    const statusCode = error.statusCode || 500;
    const message = error.statusMessage || error.message || 'Failed to generate image via AI service.';
    throw createError({ statusCode, statusMessage: message, data: error.data || error });
  }

  // Optional: Validate if the URL is absolute, though /api/ai/image/generate should provide a full URL.
  if (!imageUrlFromAIService || !imageUrlFromAIService.startsWith('http')) {
    console.error(`[generate-cover.post.ts] Received invalid or non-absolute URL from /api/ai/image/generate: ${imageUrlFromAIService}`);
    throw createError({
      statusCode: 500,
      statusMessage: `Image generation service returned an invalid URL: ${imageUrlFromAIService}`,
    });
  }

  try {
    const updatedPodcast = await updatePodcastCoverForServer(event, podcastId, imageUrlFromAIService);

    // Add detailed logging here
    console.log('[generate-cover.post.ts] Result from updatePodcastCoverForServer:', JSON.stringify(updatedPodcast, null, 2));
    console.log('[generate-cover.post.ts] typeof updatedPodcast:', typeof updatedPodcast);
    console.log('[generate-cover.post.ts] podcastId used for update:', podcastId);
    console.log('[generate-cover.post.ts] publicImageUrl used for update:', imageUrlFromAIService);

    if (!updatedPodcast) {
      // This means updatePodcastCoverForServer returned null or undefined
      console.error('[generate-cover.post.ts] Condition !updatedPodcast is true. updatePodcastCoverForServer likely returned null.');
      throw new Error('Failed to update podcast record with cover image URL or the update operation did not return the updated record.');
    }
    // If updatedPodcast is an empty object {} but not null/undefined, the check above passes.
    // Add a check for actual content if needed, e.g. if (Object.keys(updatedPodcast).length === 0)
    
  } catch (error: any) {
    console.error(`[generate-cover.post.ts] Error updating podcast ${podcastId} with cover image URL:`, error.message, error.stack);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update podcast record: ${error.message}`,
    });
  }

  return {
    success: true,
    message: 'Podcast cover generated and updated successfully.',
    cover_image_url: imageUrlFromAIService,
  };
});
