// import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified'; // Commented out due to empty playgroundUnified.ts
import { toast } from 'vue-sonner'; // Optional: for non-blocking notifications

export function usePodcastCoverGenerator() {
  // const unifiedStore = usePlaygroundUnifiedStore(); // Commented out: unifiedStore is not used in this composable

  const generateAndSavePodcastCover = async (
    podcastId: string,
    title: string,
    topic?: string
  ): Promise<void> => {
    console.log(`[CoverGenerator] Starting cover generation for podcast ID: ${podcastId}, Title: ${title}`);

    if (!podcastId || !title) {
      console.error('[CoverGenerator] Podcast ID and Title are required to generate a cover.');
      return;
    }

    const prompt = `Create a visually appealing podcast cover image for a podcast titled "${title}". The topic is "${topic || 'general discussion'}". The style should be modern and engaging.`;

    try {
      // Step 1: Generate image from DALL-E (or similar) API
      const dalleResponse = await fetch('/api/dalle/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!dalleResponse.ok) {
        try {
          const errorText = await dalleResponse.text();
          console.error(`[CoverGenerator] DALL-E API error (${dalleResponse.status}):`, errorText);
          // toast.error('Cover Generation Failed', { description: `DALL-E API: ${dalleResponse.statusText}`, duration: 2000 });
        } catch (parseError) {
          console.error(`[CoverGenerator] DALL-E API error (${dalleResponse.status}):`, dalleResponse.statusText);
          // toast.error('Cover Generation Failed', { description: `DALL-E API: ${dalleResponse.statusText}`, duration: 2000 });
        }
        return;
      }

      let imageUrl: string;
      try {
        const responseText = await dalleResponse.text();
        console.log(`[CoverGenerator] Raw API response:`, responseText);
        
        // 尝试解析 JSON
        try {
          const responseData = JSON.parse(responseText);
          imageUrl = responseData.imageUrl;
          if (!imageUrl) {
            console.error('[CoverGenerator] No imageUrl in response data:', responseData);
            return;
          }
        } catch (jsonError) {
          // 如果无法解析为 JSON，可能响应直接就是图片 URL
          if (responseText.trim().startsWith('http')) {
            imageUrl = responseText.trim();
          } else {
            console.error('[CoverGenerator] Failed to parse response as JSON and response is not a URL:', responseText);
            return;
          }
        }
      } catch (error) {
        console.error('[CoverGenerator] Failed to read response:', error);
        return;
      }

      if (!imageUrl) {
        console.error('[CoverGenerator] No imageUrl received from DALL-E API.');
        // toast.error('Cover Generation Failed', { description: 'No image URL received from generation service.', duration: 2000 });
        return;
      }
      console.log(`[CoverGenerator] Image generated: ${imageUrl}`);

      // Step 2: Save the imageUrl to the podcast in the database
      const updateCoverResponse = await fetch('/api/podcasts/update-cover', { // Assuming this endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ podcastId, coverImageUrl: imageUrl }),
      });

      if (!updateCoverResponse.ok) {
        const updateErrorData = await updateCoverResponse.json().catch(() => ({ error: 'Failed to parse update cover error response' }));
        console.error(`[CoverGenerator] Update cover API error (${updateCoverResponse.status}):`, updateErrorData.error || updateCoverResponse.statusText);
        // toast.error('Cover Update Failed', { description: `Update API: ${updateErrorData.error || updateCoverResponse.statusText}`, duration: 2000 });
        return;
      }

      console.log(`[CoverGenerator] Cover image URL successfully saved for podcast ID: ${podcastId}`);
      // toast.success('Cover Generated', { description: 'Podcast cover image updated in background.', duration: 2000 });

      // Optional: Update local state if the podcast list is displayed elsewhere
      // and needs to reactively show the new cover.
      // This might involve calling a method in unifiedStore or another relevant store.
      // For example: unifiedStore.updatePodcastCoverLocally(podcastId, imageUrl);
      // Or, if the user navigates to the podcast list, it should refetch and show the new cover.

    } catch (error) {
      console.error('[CoverGenerator] An unexpected error occurred:', error);
      // toast.error('Cover Generation Error', { description: 'An unexpected error occurred.', duration: 2000 });
    }
  };

  return {
    generateAndSavePodcastCover,
  };
}
