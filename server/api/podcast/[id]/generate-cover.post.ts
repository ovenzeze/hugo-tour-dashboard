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

**Podcast Context (for understanding theme, not for direct text rendering on image):**
- Title: "${podcastTitle || 'Untitled Podcast'}"
- Core Theme to Visualize: "${podcastThemeDescription}"

**Style Guidelines for the Image:**
- Overall Mood: Modern, engaging, professional, informative, with a distinct artistic feel, suitable for a museum tour or cultural introduction.
- Artistic Style: Employ a highly artistic, hand-drawn or illustrative style for the imagery. The artwork should be compelling and aesthetically pleasing.
- Imagery: Feature a high-quality, clear central image directly related to the podcast's core theme. The background should be complementary, adding depth without distraction, and contributing to the overall artistic quality.
- Text Content: **No text, especially the podcast title, should be rendered on the image itself.** The image should be purely visual, conveying the theme without overlaid text.
- Color Palette: Use a harmonious, artistic, and professional color scheme that enhances the theme, suitable for a hand-drawn style.
- Composition: Create a balanced, uncluttered design. The composition should be aesthetically pleasing and suitable for use as a background image, meaning it might have areas of lower visual density or a focal point that doesn't occupy the entire canvas, allowing for potential future use where other elements might be overlaid by a user.
- Branding: Discreetly include a "Hugo Tour Guide" watermark, preferably in the bottom-right corner. This is the ONLY text permitted, and it's a watermark.
- Avoid: **Any programmatic or generated text (titles, subtitles, etc.) on the image.** Also avoid overly cluttered designs that would make it unsuitable as a background, low-resolution imagery, and any AI generator's own watermarks (only the "Hugo Tour Guide" watermark is allowed).

Please generate the image now based on these details, focusing on a purely visual, artistic representation of the theme suitable as a background, and without any title text on the cover itself.
`;
  
  // console.log("[generate-cover.post.ts] Constructed finalPrompt:", finalPrompt); // For debugging

  let imageDataFromAIService: string;
  let mimeTypeFromAIService: string;

  try {
    const imageResponse = await $fetch.raw('/api/ai/image/generate', {
      method: 'POST',
      body: {
        prompt: finalPrompt,
        numberOfImages: 1,
        aspectRatio: "2:3",
      },
    });

    const responseBody = imageResponse._data;
    console.log('[generate-cover.post.ts] Raw responseBody from /api/ai/image/generate:', JSON.stringify(responseBody, null, 2));

    // Check for errors from the /api/ai/image/generate endpoint itself or unsuccessful generation
    if (imageResponse.status !== 200 || !responseBody || responseBody.error || !responseBody.imageData || !responseBody.mimeType) {
      const serviceErrorMsg = responseBody?.error?.message || responseBody?.message || 'Invalid or error response from image generation API';
      console.error('[generate-cover.post.ts] Error or invalid response from /api/ai/image/generate. Status:', imageResponse.status, 'Body:', JSON.stringify(responseBody, null, 2));
      throw createError({
        statusCode: responseBody?.error?.statusCode || imageResponse.status || 500,
        statusMessage: serviceErrorMsg,
        data: responseBody?.error || responseBody
      });
    }
    imageDataFromAIService = responseBody.imageData;
    mimeTypeFromAIService = responseBody.mimeType;

  } catch (error: any) {
    // This catches errors from $fetch itself (e.g., network issues) or the createError thrown above
    console.error('[generate-cover.post.ts] Error calling /api/ai/image/generate or processing its response:', error.message, error.data || error.stack);
    const statusCode = error.statusCode || 500;
    const message = error.statusMessage || error.message || 'Failed to generate image via AI service.';
    throw createError({ statusCode, statusMessage: message, data: error.data || error });
  }

  const storageService = await getStorageService(event);
  // Use a more descriptive file path, e.g., within a folder for covers
  const coverFileName = `podcast_covers/${podcastId}.png`; 
  // It's better if the filename reflects the actual mimeType, but for simplicity, keeping .png
  // const fileExtension = mimeTypeFromAIService.split('/')[1] || 'png';
  // const coverFileName = `podcast_covers/${podcastId}.${fileExtension}`;


  const base64Data = imageDataFromAIService.includes(',') ? imageDataFromAIService.split(',')[1] : imageDataFromAIService;
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const uploadContentType = mimeTypeFromAIService || 'image/png';

  let publicImageUrl: string;

  try {
    console.log(`[generate-cover.post.ts] Attempting to upload to storage via StorageService. File: ${coverFileName}, ContentType: ${uploadContentType}`);
    await storageService.writeFile(
      coverFileName, 
      imageBuffer,
      { contentType: uploadContentType }
    );
    console.log(`[generate-cover.post.ts] Successfully uploaded ${coverFileName} via StorageService.`);

    publicImageUrl = storageService.getPublicUrl(coverFileName);
    
    // Validate the public URL from storageService
    // The SupabaseStorageService.getPublicUrl has a fallback that returns a relative path, e.g. /bucketName/filePath
    // We need a full, absolute URL.
    if (!publicImageUrl || !publicImageUrl.startsWith('http')) {
        console.warn(`[generate-cover.post.ts] getPublicUrl from storageService returned a non-absolute URL: ${publicImageUrl}. This might be a fallback or an issue.`);
        // Attempt to reconstruct if it looks like a Supabase fallback (and Supabase is the provider)
        const runtimeConfig = useRuntimeConfig(event);
        const storageProvider = runtimeConfig.public?.storageProvider || process.env.STORAGE_PROVIDER || "local";
        const supabaseUrl = runtimeConfig.public.supabase.url;
        const bucketFromConfig = runtimeConfig.public?.supabaseStorageBucketName || process.env.SUPABASE_STORAGE_BUCKET_NAME;

        if (storageProvider === 'supabase' && supabaseUrl && bucketFromConfig && publicImageUrl.startsWith(`/${bucketFromConfig}/`)) {
            publicImageUrl = `${supabaseUrl}/storage/v1/object/public${publicImageUrl}`;
            console.log(`[generate-cover.post.ts] Reconstructed Supabase public URL: ${publicImageUrl}`);
        } else {
            // If not a reconstructable Supabase URL or another provider, this URL is problematic.
            throw new Error(`StorageService returned an invalid or incomplete public URL: ${publicImageUrl}`);
        }
    }

  } catch (error: any) {
    console.error(`[generate-cover.post.ts] Error during StorageService operation for podcast ${podcastId}:`, error.message, error.data || error.stack);
    const statusCode = error.statusCode || 500;
    const message = error.statusMessage || error.message || 'Storage operation failed.';
    throw createError({ statusCode, statusMessage: message, data: error.data || error });
  }

  try {
    const updatedPodcast = await updatePodcastCoverForServer(event, podcastId, publicImageUrl);

    // Add detailed logging here
    console.log('[generate-cover.post.ts] Result from updatePodcastCoverForServer:', JSON.stringify(updatedPodcast, null, 2));
    console.log('[generate-cover.post.ts] typeof updatedPodcast:', typeof updatedPodcast);
    console.log('[generate-cover.post.ts] podcastId used for update:', podcastId);
    console.log('[generate-cover.post.ts] publicImageUrl used for update:', publicImageUrl);


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
    cover_image_url: publicImageUrl,
  };
});