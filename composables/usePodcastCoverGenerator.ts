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

    try {
      // 使用正确的API端点：/api/podcast/[id]/generate-cover
      const coverResponse = await $fetch(`/api/podcast/${podcastId}/generate-cover`, {
        method: 'POST',
        body: {
          // API会自动从数据库获取podcast信息，不需要传递title和topic
          // title, topic等信息API会从数据库中获取
        },
      });

      console.log(`[CoverGenerator] Cover generation response:`, coverResponse);

      if (coverResponse.success) {
        console.log(`[CoverGenerator] Cover image successfully generated and saved for podcast ID: ${podcastId}`);
        console.log(`[CoverGenerator] Cover image URL: ${coverResponse.cover_image_url}`);
        // toast.success('Cover Generated', { description: 'Podcast cover image updated successfully.', duration: 2000 });
      } else {
        console.error('[CoverGenerator] Cover generation failed:', coverResponse.message || 'Unknown error');
        // toast.error('Cover Generation Failed', { description: coverResponse.message || 'Unknown error', duration: 2000 });
      }

    } catch (error: any) {
      console.error('[CoverGenerator] An unexpected error occurred:', error);
      // toast.error('Cover Generation Error', { description: error.message || 'An unexpected error occurred.', duration: 2000 });
    }
  };

  return {
    generateAndSavePodcastCover,
  };
}
