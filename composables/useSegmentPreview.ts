import { ref, reactive, watch } from 'vue';
import { toast } from 'vue-sonner';
// Import new stores
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
// Import the updated segment type from useVoiceManagement or a shared type
// Assuming ProcessedScriptSegmentForVoiceManagement is exported from useVoiceManagement and uses `speaker`
import type { ProcessedScriptSegmentForVoiceManagement as ParsedScriptSegment, Voice } from './useVoiceManagement';

export interface SegmentState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  error?: string;
}

export interface SegmentPreviewData {
  audioUrl: string | null;
  timestamps?: any[]; // Define more specific type if structure is known
}

// Enhanced segment type that the preview composable will work with
// This combines the parsed script segment with voice assignment and potentially persona details
export interface PreviewableSegment extends ParsedScriptSegment {
    id: string; // Unique ID for the segment row, e.g., segment-0, segment-1
    originalText: string;
    currentText: string;
    speaker: string; // Changed from speakerTag, ensure ParsedScriptSegment also uses speaker
    voiceId: string | null; // This will be the voice_model_identifier (effectively assignedVoiceId)
    audioUrl: string | null;
    isLoading: boolean;
    isEditing: boolean;
    ttsProvider: string | undefined; // Each segment can have its own provider (effectively assignedVoiceProvider)
    assignedVoiceName?: string; // For display purposes
    // Ensure all fields from ParsedScriptSegment are implicitly here (speaker, text)
    roleType: 'host' | 'guest'; // Made required
    personaId: string | undefined; // Added personaId
    personaLanguage?: string; // Added for language display
    personaAvatarUrl?: string; // Added for avatar display
}

export function useSegmentPreview(
    parsedScriptSegments: globalThis.Ref<PreviewableSegment[]>, // This ref now contains segments with .speaker
    speakerAssignments: globalThis.Ref<Record<string, { voiceId: string, provider: string }>>
) {
  // const unifiedStore = usePlaygroundUnifiedStore(); // Removed
  const settingsStore = usePlaygroundSettingsStore();
  const processStore = usePlaygroundProcessStore();

  const isPreviewingSegment = ref<number | null>(null); // Index of the segment being previewed
  const segmentPreviews = ref<Record<number, SegmentPreviewData>>({}); // Index -> { audioUrl, timestamps }
  const segmentStates = ref<Record<number, SegmentState>>({}); // Index -> SegmentState
  const combinedPreviewUrl = ref<string | null>(null);

  // Audio player management
  const audioRefs = ref<Record<number, HTMLAudioElement | null>>({}); // Stores <audio> element references
  const audioPlayingState = ref<Record<number, boolean>>({}); // Tracks if audio for a segment index is playing

  const initializeSegmentStates = () => {
    parsedScriptSegments.value.forEach((_, index) => {
      if (segmentStates.value[index] === undefined) {
        segmentStates.value[index] = { status: 'idle', message: 'Ready to preview' };
      }
      if (segmentPreviews.value[index] === undefined) {
        segmentPreviews.value[index] = { audioUrl: null, timestamps: [] };
      }
    });
  };
  
  watch(parsedScriptSegments, (newSegments, oldSegments) => {
    const newSegmentStates: Record<number, SegmentState> = {};
    const newSegmentPreviewsData: Record<number, SegmentPreviewData> = {};

    newSegments.forEach((segment, index) => {
      // Preserve existing state if segment ID matches, otherwise initialize
      // This simple index-based preservation might need refinement if segments are reordered/deleted by ID
      newSegmentStates[index] = segmentStates.value[index] || { status: 'idle', message: 'Ready to preview' };
      newSegmentPreviewsData[index] = segmentPreviews.value[index] || { audioUrl: null, timestamps: [] };
      
      // Ensure audioUrl is null if it was somehow undefined
      if (newSegmentPreviewsData[index].audioUrl === undefined) {
        newSegmentPreviewsData[index].audioUrl = null;
      }
    });

    segmentStates.value = newSegmentStates;
    segmentPreviews.value = newSegmentPreviewsData;
    
    // If script changes significantly (e.g., length differs, or content implies reset)
    // consider clearing combinedPreviewUrl
    if (newSegments.length !== (oldSegments?.length || 0) || JSON.stringify(newSegments) !== JSON.stringify(oldSegments)){
        combinedPreviewUrl.value = null;
    }
    // Initial call if needed, though immediate: true on watcher handles this.
    // initializeSegmentStates(); // Call the refined logic if separated.
  }, { deep: true, immediate: true });

  async function previewSegment(segment: PreviewableSegment, index: number) {
    // Use segment.speaker instead of segment.speakerTag
    const assignment = speakerAssignments.value[segment.speaker] as ({ voiceId: string, provider: string } | undefined);

    if (!segment.text) {
      toast.error('Missing text for segment preview.');
      segmentStates.value[index] = { status: 'error', message: 'Missing text for segment.', error: 'No text.' };
      if (segmentPreviews.value[index]) segmentPreviews.value[index].audioUrl = null; else segmentPreviews.value[index] = { audioUrl: null, timestamps: [] };
      return;
    }

    if (!assignment || !assignment.voiceId || !assignment.provider) {
      const missingFields = [];
      if (!assignment) missingFields.push("assignment object");
      else {
        if (!assignment.voiceId) missingFields.push("'voiceId' in assignment");
        if (!assignment.provider) missingFields.push("'provider' in assignment");
      }
      const errorDetail = `Missing ${missingFields.join(' and ')} in speakerAssignments for speaker '${segment.speaker}'. Cannot synthesize.`;
      toast.error('Voice assignment incomplete for segment preview.', { description: errorDetail });
      console.error(`[useSegmentPreview] ${errorDetail}`);
      segmentStates.value[index] = { status: 'error', message: 'Voice assignment incomplete.', error: errorDetail };
      if (segmentPreviews.value[index]) segmentPreviews.value[index].audioUrl = null; else segmentPreviews.value[index] = { audioUrl: null, timestamps: [] };
      return;
    }

    const { voiceId, provider } = assignment;

    // Initialize progress tracking in unified store
    const unifiedStore = usePlaygroundUnifiedStore();
    unifiedStore.updateSegmentProgress(index, {
      status: 'loading',
      progress: 10,
      stage: 'Preparing synthesis request...'
    });

    segmentStates.value[index] = { status: 'loading', message: 'Generating preview...' };
    isPreviewingSegment.value = index;

    console.log(`[useSegmentPreview] Synthesizing segment ${index} for speaker '${segment.speaker}' with voice '${voiceId}' using provider '${provider}'`);

    try {
        const podcastIdToUse = processStore.podcastId || `preview_session_${settingsStore.podcastSettings.title?.trim().replace(/\s+/g, '_') || Date.now()}`;
  
        // Update progress: Sending request
        unifiedStore.updateSegmentProgress(index, {
          status: 'loading',
          progress: 30,
          stage: 'Sending synthesis request...'
        });

        const response = await fetch('/api/podcast/process/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            podcastId: podcastIdToUse,
            segments: [ // API expects speakerPersonaId, not voiceId directly here. This needs careful mapping.
              { // This segment structure for the API might need speakerPersonaId
                segmentIndex: index,
                text: segment.text,
                // voiceId: voiceId, // API expects speakerPersonaId. We need to pass segment.personaId (if available and numeric)
                                     // or handle this mapping if the synthesize API is strictly speakerPersonaId based.
                                     // For now, assuming the synthesize API can take voiceId if provider is also specified.
                                     // This part of the payload for /api/podcast/process/synthesize needs to align with its actual expectation.
                                     // If it strictly needs speakerPersonaId, then `segment.personaId` (numeric) should be used.
                                     // Let's assume for now the backend /synthesize can handle a direct voiceId if ttsProvider is given.
                speakerPersonaId: typeof segment.personaId === 'string' ? parseInt(segment.personaId, 10) : segment.personaId, // Ensure it's number if possible
                // The backend /synthesize endpoint was refactored to take speakerPersonaId.
                // So, we should pass segment.personaId (numeric) here.
                // The voiceId (model identifier) and provider are resolved by the backend using speakerPersonaId.
                // The `provider` in `assignment` is what this segment's persona is configured for.
                // The `voiceId` in `assignment` is the `voice_model_identifier`.
                // The API call below should reflect the actual /synthesize API input.
              }
            ],
            // defaultModelId: settingsStore.podcastSettings.elevenLabsProjectId || 'eleven_multilingual_v2', // This might be specific to a provider
            globalTtsProvider: provider, // Pass the resolved provider for this segment
            globalSynthesisParams: { // Pass relevant synthesis params
                ...settingsStore.synthesisParams, // Global settings
                // Specific params from assignment if they existed (e.g. if speakerAssignments stored more than voiceId/provider)
            }
          })
        });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
      }

      // Update progress: Processing response
      unifiedStore.updateSegmentProgress(index, {
        status: 'loading',
        progress: 60,
        stage: 'Processing server response...'
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && data.generatedSegments && data.generatedSegments.length > 0) {
          const segmentResult = data.generatedSegments[0];
          if (segmentResult.audioFileUrl) {
            // Update progress: Loading audio file
            unifiedStore.updateSegmentProgress(index, {
              status: 'loading',
              progress: 80,
              stage: 'Loading audio file...'
            });

            let fetchedTimestamps: any[] = [];
            if (segmentResult.timestampFileUrl) {
              try {
                fetchedTimestamps = await fetch(segmentResult.timestampFileUrl).then(r => r.json()).catch(() => []);
              } catch (tsError) {
                console.error(`[useSegmentPreview] Error fetching timestamps from ${segmentResult.timestampFileUrl} for segment ${index}:`, tsError);
                fetchedTimestamps = []; // Fallback on error
              }
            }
            segmentPreviews.value[index] = {
              audioUrl: segmentResult.audioFileUrl,
              timestamps: fetchedTimestamps
            };
            
            // Update progress: Success
            unifiedStore.updateSegmentProgress(index, {
              status: 'success',
              progress: 100,
              stage: 'Audio ready',
              audioUrl: segmentResult.audioFileUrl
            });
            
            segmentStates.value[index] = { status: 'success', message: 'Preview successful' };
          } else {
            const errorMsg = segmentResult.error || 'Synthesis failed: No audioFileUrl from backend.';
            throw new Error(errorMsg);
          }
        } else {
          throw new Error(data.message || 'API did not return successful segment data.');
        }
      } else {
        const responseText = await response.text();
        throw new Error(`Unexpected server response. Expected JSON, got: ${contentType}. Response: ${responseText.substring(0, 200)}...`);
      }
    } catch (error: any) {
      console.error('Segment preview generation failed:', error);
      toast.error('Segment preview failed', { description: error.message });
      
      // Update progress: Error
      unifiedStore.updateSegmentProgress(index, {
        status: 'error',
        progress: 0,
        stage: 'Synthesis failed',
        error: error.message
      });
      
      segmentStates.value[index] = { status: 'error', message: 'Preview failed', error: error.message };
      if (segmentPreviews.value[index]) {
        segmentPreviews.value[index].audioUrl = null;
      } else {
        segmentPreviews.value[index] = { audioUrl: null, timestamps: [] };
      }
    } finally {
      isPreviewingSegment.value = null;
    }
  }

  async function previewAllSegments() {
    // Ensure all segments have complete voice assignments (voiceId and provider)
    const allSegmentsAssigned = parsedScriptSegments.value.every(seg => {
      const assignment = speakerAssignments.value[seg.speaker]; // Use .speaker
      return assignment && assignment.voiceId && assignment.provider;
    });

    if (!allSegmentsAssigned) {
      toast.error('Please ensure all segments have complete voice (ID and provider) assignments before previewing all.');
      const firstUnassigned = parsedScriptSegments.value.find(seg => {
        const assignment = speakerAssignments.value[seg.speaker]; // Use .speaker
        return !assignment || !assignment.voiceId || !assignment.provider;
      });
      if (firstUnassigned) {
        const assignment = speakerAssignments.value[firstUnassigned.speaker]; // Use .speaker
        const missing = [];
        if (!assignment) missing.push("assignment object");
        else {
            if(!assignment.voiceId) missing.push("'voiceId'");
            if(!assignment.provider) missing.push("'provider'");
        }
        console.warn(`[useSegmentPreview] Preview all aborted: Segment for speaker '${firstUnassigned.speaker}' has incomplete assignment (missing ${missing.join(' & ')}).`);
      }
      return false;
    }

    if (parsedScriptSegments.value.length === 0) {
        toast.info('No segments to preview.');
        return false;
    }

    parsedScriptSegments.value.forEach((_, index) => {
        segmentStates.value[index] = { status: 'loading', message: 'Generating all previews...' };
    });
    toast.info('Generating all segment previews, please wait...');

    try {
        // This function calls the /api/podcast/process/synthesize endpoint with all segments.
        // The backend /synthesize endpoint expects segments with speakerPersonaId.
        
        const segmentsForApi = parsedScriptSegments.value.map(s => ({
            text: s.text,
            speakerPersonaId: typeof s.personaId === 'string' ? parseInt(s.personaId, 10) : s.personaId, // Ensure numeric or null
            speakerName: s.speaker,
            segmentIndex: parsedScriptSegments.value.indexOf(s) // Ensure segmentIndex is passed
        })).filter(s => s.speakerPersonaId !== null && s.speakerPersonaId !== undefined) as { text: string; speakerPersonaId: number; speakerName: string; segmentIndex: number }[];


        if (segmentsForApi.length !== parsedScriptSegments.value.length) {
            console.warn("[useSegmentPreview] Some segments were filtered out for 'previewAllSegments' due to missing speakerPersonaId.");
            // Optionally inform the user or handle segments that couldn't be mapped.
        }
        
        if (segmentsForApi.length === 0) {
            toast.error("No segments with valid Persona IDs to synthesize for 'preview all'.");
            parsedScriptSegments.value.forEach((_, index) => {
                segmentStates.value[index] = { status: 'error', message: 'No valid Persona ID', error: 'No Persona ID' };
            });
            return false;
        }


        const requestBody = {
            podcastId: processStore.podcastId || `preview_session_${settingsStore.podcastSettings.title?.trim().replace(/\s+/g, '_') || Date.now()}`,
            segments: segmentsForApi,
            globalTtsProvider: settingsStore.podcastSettings.ttsProvider, // Use the global provider from settings
            globalSynthesisParams: settingsStore.synthesisParams
        };

        // Call the backend /api/podcast/process/synthesize
        const response = await fetch('/api/podcast/process/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          if (data.success) {
            if (data.generatedSegments && Array.isArray(data.generatedSegments)) {
              for (const segmentResult of data.generatedSegments) {
                const idx = segmentResult.segmentIndex;
                if (idx === undefined || segmentPreviews.value[idx] === undefined) {
                  console.warn(`[useSegmentPreview] Received segment result with invalid or missing index:`, segmentResult);
                  continue;
                }

                if (segmentResult.audioFileUrl) {
                  let fetchedTimestamps: any[] = [];
                  if (segmentResult.timestampFileUrl) {
                    try {
                      fetchedTimestamps = await fetch(segmentResult.timestampFileUrl).then(r => r.json()).catch(() => []);
                    } catch (tsError) {
                      console.error(`[useSegmentPreview] Error fetching timestamps for segment ${idx} (all previews):`, tsError);
                      fetchedTimestamps = [];
                    }
                  }
                  segmentPreviews.value[idx] = {
                    audioUrl: segmentResult.audioFileUrl,
                    timestamps: fetchedTimestamps
                  };
                  segmentStates.value[idx] = { status: 'success', message: 'Preview successful' };
                } else {
                  segmentStates.value[idx] = { status: 'error', message: 'Preview failed', error: segmentResult.error || 'Unknown error from segment result' };
                }
              }
            }
            // Note: The `combinedPreviewUrl` logic was from an older version targeting `/api/podcast/preview/segments`.
            // The current `/api/podcast/process/synthesize` endpoint returns individual segments.
            // If a combined URL is still needed, it would typically come from a separate `/combine-audio` call.
            // For now, `combinedPreviewUrl` will not be set by this specific API call.
            // combinedPreviewUrl.value = data.combinedPreviewUrl; // This line might be irrelevant now.
            
            toast.success('All segment previews processed.'); // Changed message slightly
            return true;
          } else {
            throw new Error(data.message || 'API returned unsuccessful response.');
          }
        } else {
          const responseText = await response.text();
          throw new Error(`Unexpected server response. Expected JSON, got: ${contentType}. Response: ${responseText.substring(0, 200)}...`);
        }
    } catch (error: any) {
      console.error('All segments preview generation failed:', error);
      toast.error('Failed to generate all previews', { description: error.message });
      
      // Update all segments to error state
      parsedScriptSegments.value.forEach((_, index) => {
        segmentStates.value[index] = { status: 'error', message: 'Preview failed', error: error.message };
      });
      
      return false;
    }
  }

  const onSegmentPlay = (playedIndex: number) => {
    // When a segment is played, ensure all other segments are paused
    Object.keys(audioRefs.value).forEach(indexStr => {
      const index = parseInt(indexStr, 10);
      if (index !== playedIndex && audioRefs.value[index]) {
        audioRefs.value[index]?.pause();
      }
    });
    audioPlayingState.value[playedIndex] = true;
  };

  const onSegmentPauseOrEnd = (pausedIndex: number) => {
    audioPlayingState.value[pausedIndex] = false;
  };

  const setAudioRef = (index: number, el: HTMLAudioElement | null) => {
    audioRefs.value[index] = el;
  };

  return {
    segmentPreviews,
    combinedPreviewUrl,
    segmentStates,
    isPreviewingSegment,
    previewSegment,
    previewAllSegments,
    setAudioRef,
    onSegmentPlay,
    onSegmentPauseOrEnd,
    audioPlayingState
  };
}
