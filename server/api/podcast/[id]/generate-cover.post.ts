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
Generate a podcast cover image with a 2:3 portrait aspect ratio.

**IMPORTANT: DO NOT INCLUDE ANY TEXT IN THE IMAGE EXCEPT FOR THE WATERMARK SPECIFIED BELOW.**

**Podcast Context (for understanding theme ONLY, DO NOT RENDER ANY OF THIS TEXT IN THE IMAGE):**
- Title: "${podcastTitle || 'Untitled Podcast'}" (DO NOT INCLUDE THIS TITLE IN THE IMAGE)
- Core Theme to Visualize: "${podcastThemeDescription}" (DO NOT INCLUDE THIS TEXT IN THE IMAGE)

**Style Guidelines for the Image:**
- Overall Mood: Modern, engaging, professional, informative, with a distinct artistic feel, suitable for a museum tour or cultural introduction.
- Artistic Style: Employ a highly artistic, hand-drawn or illustrative style for the imagery. The artwork should be compelling and aesthetically pleasing.
- Imagery: Feature a high-quality, clear central image directly related to the podcast's core theme. The background should be complementary, adding depth without distraction, and contributing to the overall artistic quality.
- Text Content: **ABSOLUTELY NO TEXT should be rendered on the image itself, except for the watermark specified below.** The image must be purely visual, conveying the theme without any overlaid text, titles, subtitles, or descriptions.
- Color Palette: Use a harmonious, artistic, and professional color scheme that enhances the theme, suitable for a hand-drawn style.
- Composition: Create a balanced, uncluttered design. The composition should be aesthetically pleasing and suitable for use as a background image, meaning it might have areas of lower visual density or a focal point that doesn't occupy the entire canvas, allowing for potential future use where other elements might be overlaid by a user.
- Watermark: Include ONLY a "Hugo Tour Guide" watermark with these EXACT specifications:
  * Position: Bottom-right corner, 20 pixels from the right edge and 20 pixels from the bottom edge
  * Font: Simple sans-serif font (like Helvetica or Arial)
  * Size: Small and discreet, approximately 14pt
  * Color: White with 50% opacity or semi-transparent
  * Style: Simple text, no fancy styling or effects
  * Text: "Hugo Tour Guide" - exactly this text, no variations
  * This is the ONLY text that should appear anywhere in the image

- Avoid: 
  * ANY text other than the specified watermark (NO titles, subtitles, descriptions, etc.)
  * DO NOT include the podcast title or theme anywhere in the image
  * DO NOT include any text that describes the content
  * Overly cluttered designs that would make it unsuitable as a background
  * Low-resolution imagery
  * Any AI generator's own watermarks or signatures

Please generate the image now based on these details, focusing on a purely visual, artistic representation of the theme suitable as a background, with ABSOLUTELY NO TEXT except for the "Hugo Tour Guide" watermark in the bottom-right corner exactly as specified.
`;
  
  // console.log("[generate-cover.post.ts] Constructed finalPrompt:", finalPrompt); // For debugging

  let imageUrlFromAIService: string;

  try {
    const imageResponse = await $fetch.raw('/api/ai/image/generate', {
      method: 'POST',
      body: {
        prompt: finalPrompt,
        numberOfImages: 1,
        aspectRatio: "9:16", // Changed from "2:3" to "9:16"
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
