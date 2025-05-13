import { defineEventHandler, readBody, createError } from 'h3';
import { createMergedTimeline } from '../../../utils/timelineUtils';
import { LocalStorageService } from '../../../services/storageService'; // Assuming LocalStorageService for now
import type { IStorageService } from '../../../services/storageService';
import type { TimelineSegment } from '../../../utils/timelineUtils'; // Import if needed for response type

interface RequestBody {
  podcastId: string;
  // storageServiceType?: 'local' | 'supabase'; // Optional: to select storage service
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestBody;
    const { podcastId } = body;

    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "podcastId" is required.',
      });
    }
    
    // Initialize storage service
    const storageService: IStorageService = new LocalStorageService();
    
    // segmentsDir for createMergedTimeline is relative to public root, e.g., "podcasts/podcastId/segments"
    const segmentsDir = storageService.joinPath('podcasts', podcastId, 'segments');

    console.log(`API: Creating merged timeline for podcastId: ${podcastId} from segmentsDir: ${segmentsDir}`);
    const timelineData: TimelineSegment[] = await createMergedTimeline(segmentsDir, storageService);
    
    const timelinePublicPath = storageService.joinPath('podcasts', podcastId, 'merged_timeline.json');
    
    return {
      success: true,
      podcastId: podcastId,
      timelineUrl: storageService.getPublicUrl(timelinePublicPath),
      timelineData: timelineData, // Optionally return the timeline data itself
      message: `Merged timeline created for podcast ${podcastId}.`,
    };

  } catch (error: any) {
    console.error(`Error in /api/podcast/process/timeline.post.ts:`, error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to create timeline: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
});