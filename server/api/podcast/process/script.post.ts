import { defineEventHandler, readBody, createError } from 'h3';
import { processPodcastScript } from '../../../utils/podcastScriptProcessor';
import { LocalStorageService } from '../../../services/storageService'; // Assuming LocalStorageService for now
import type { IStorageService } from '../../../services/storageService';

// Interfaces from podcastScriptProcessor.ts - consider moving to a shared types file
interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface ScriptSegment {
  speaker: string;
  text: string;
}

interface RequestBody {
  podcastTitle: string; // Used to generate podcastId
  script: ScriptSegment[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
    // Potentially add ttsProviderId here if it can vary per request
  };
  // storageServiceType?: 'local' | 'supabase'; // Optional: to select storage service if multiple are available
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestBody;
    const { podcastTitle, script, personas } = body;

    if (!podcastTitle || !script || !Array.isArray(script) || script.length === 0 || !personas) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "podcastTitle", "script" array, and "personas" object are required.',
      });
    }

    // Generate a podcastId from the title
    const podcastId = podcastTitle.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '');
    if (!podcastId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid podcastTitle, resulted in empty podcastId.',
          });
    }
    
    // Initialize storage service (this could be more dynamic if needed)
    const storageService: IStorageService = new LocalStorageService();

    console.log(`API: Processing script for podcastId: ${podcastId}`);
    const processedSegments = await processPodcastScript(podcastId, script, personas, storageService);
    
    return {
      success: true,
      podcastId: podcastId,
      segments: processedSegments,
      message: `Script processed for podcast ${podcastId}. Segments generated.`,
    };

  } catch (error: any) {
    console.error(`Error in /api/podcast/process/script.post.ts:`, error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to process script: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
});