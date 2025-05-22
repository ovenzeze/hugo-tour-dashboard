import { ref, reactive, watch } from 'vue'; // Added watch
import { usePlaygroundUnifiedStore } from '../stores/playgroundUnified';
import { toast } from 'vue-sonner';
import type { ParsedScriptSegment, Voice } from './useVoiceManagement'; // Assuming interfaces are exported

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
    // speakerTag should come from ParsedScriptSegment
    voiceId: string | null; // This will be the voice_model_identifier (effectively assignedVoiceId)
    audioUrl: string | null; 
    isLoading: boolean;
    isEditing: boolean;
    ttsProvider: string | undefined; // Each segment can have its own provider (effectively assignedVoiceProvider)
    assignedVoiceName?: string; // For display purposes
    // Ensure all fields from ParsedScriptSegment are implicitly here (speakerTag, text)
    roleType: 'host' | 'guest'; // Made required
    personaId: string | undefined; // Added personaId
    personaLanguage?: string; // Added for language display
    personaAvatarUrl?: string; // Added for avatar display
}

export function useSegmentPreview(
    parsedScriptSegments: globalThis.Ref<PreviewableSegment[]>,
    speakerAssignments: globalThis.Ref<Record<string, { voiceId: string, provider: string }>> // Updated type
) {
  const unifiedStore = usePlaygroundUnifiedStore();

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
    const assignment = speakerAssignments.value[segment.speakerTag] as ({ voiceId: string, provider: string } | undefined);

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
      const errorDetail = `Missing ${missingFields.join(' and ')} in speakerAssignments for speaker '${segment.speakerTag}'. Cannot synthesize.`;
      toast.error('Voice assignment incomplete for segment preview.', { description: errorDetail });
      console.error(`[useSegmentPreview] ${errorDetail}`);
      segmentStates.value[index] = { status: 'error', message: 'Voice assignment incomplete.', error: errorDetail };
      if (segmentPreviews.value[index]) segmentPreviews.value[index].audioUrl = null; else segmentPreviews.value[index] = { audioUrl: null, timestamps: [] };
      return;
    }

    const { voiceId, provider } = assignment; // provider here is the value from speakerAssignments

    segmentStates.value[index] = { status: 'loading', message: 'Generating preview...' };
    isPreviewingSegment.value = index;

    console.log(`[useSegmentPreview] Synthesizing segment ${index} for speaker '${segment.speakerTag}' with voice '${voiceId}' using provider '${provider}'`);

    try {
        // Use the actual podcastId from the store if available, otherwise generate a temporary one for preview
        const podcastIdToUse = unifiedStore.podcastId || `preview_session_${unifiedStore.podcastSettings.title?.trim().replace(/\s+/g, '_') || Date.now()}`;
  
        const response = await fetch('/api/podcast/process/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            podcastId: podcastIdToUse, // Use the ID from the store or temporary
            segments: [
              {
                segmentIndex: index,
                text: segment.text,
                voiceId: voiceId, // Use the resolved voiceId
                speakerName: segment.speakerTag
              }
            ],
            defaultModelId: unifiedStore.podcastSettings.elevenLabsProjectId || 'eleven_multilingual_v2',
            voiceSettings: {
              stability: unifiedStore.synthesisParams.temperature,
              similarity_boost: unifiedStore.synthesisParams.speed, // Use speed for similarity_boost
              // style: 0, // TODO: Make configurable or part of persona if API supports
              // use_speaker_boost: true // TODO: Make configurable or part of persona if API supports
            },
            synthesisParams: unifiedStore.synthesisParams, // Pass global synthesis params from the store
            ttsProvider: provider // Use the provider from speakerAssignments for the API call's ttsProvider field
          })
        });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && data.generatedSegments && data.generatedSegments.length > 0) {
          const segmentResult = data.generatedSegments[0];
          if (segmentResult.audioFileUrl) {
            segmentPreviews.value[index] = {
              audioUrl: segmentResult.audioFileUrl,
              timestamps: segmentResult.timestampFileUrl ? await fetch(segmentResult.timestampFileUrl).then(r => r.json()).catch(() => []) : []
            };
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
      const assignment = speakerAssignments.value[seg.speakerTag];
      return assignment && assignment.voiceId && assignment.provider;
    });

    if (!allSegmentsAssigned) {
      toast.error('Please ensure all segments have complete voice (ID and provider) assignments before previewing all.');
      const firstUnassigned = parsedScriptSegments.value.find(seg => {
        const assignment = speakerAssignments.value[seg.speakerTag];
        return !assignment || !assignment.voiceId || !assignment.provider;
      });
      if (firstUnassigned) {
        const assignment = speakerAssignments.value[firstUnassigned.speakerTag];
        const missing = [];
        if (!assignment) missing.push("assignment object");
        else {
            if(!assignment.voiceId) missing.push("'voiceId'");
            if(!assignment.provider) missing.push("'provider'");
        }
        console.warn(`[useSegmentPreview] Preview all aborted: Segment for speaker '${firstUnassigned.speakerTag}' has incomplete assignment (missing ${missing.join(' & ')}).`);
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
        // The backend for /api/podcast/preview/segments needs to handle
        // speakerAssignments: Record<string, { voiceId: string, provider: string }>
        // It will iterate through segments, look up the speakerTag in speakerAssignments,
        // and use the corresponding voiceId and provider for synthesis.

        const payloadSegments = parsedScriptSegments.value.map(segment => ({
            speakerTag: segment.speakerTag, // Backend uses this to lookup in speakerAssignments
            text: segment.text,
            // voiceId and provider are now sourced from speakerAssignments on the backend
            // based on speakerTag
        }));

        const requestBody = {
            config: {
                // Pass the entire speakerAssignments object.
                // The backend will use this to find the voiceId and provider for each segment's speakerTag.
                speakerAssignments: speakerAssignments.value,
                segments: payloadSegments // Segments now only need speakerTag and text
            },
            synthesisParams: {
                // Take from the unifiedStore
                temperature: unifiedStore.synthesisParams.temperature,
                speed: unifiedStore.synthesisParams.speed,
                stability: unifiedStore.synthesisParams.stability,
                similarity_boost: unifiedStore.synthesisParams.similarity_boost
            },
            podcastId: unifiedStore.podcastId || `preview_session_${unifiedStore.podcastSettings.title?.trim().replace(/\s+/g, '_') || Date.now()}`
        };

        // Call the backend
        const response = await fetch('/api/podcast/preview/segments', {
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
            // Update all segment previews with their URLs
            if (data.segmentPreviews && Array.isArray(data.segmentPreviews)) {
              data.segmentPreviews.forEach((preview: any, idx: number) => {
                if (preview && preview.audioUrl) {
                  segmentPreviews.value[idx] = {
                    audioUrl: preview.audioUrl,
                    timestamps: preview.timestampUrl ? fetch(preview.timestampUrl).then(r => r.json()).catch(() => []) : []
                  };
                  segmentStates.value[idx] = { status: 'success', message: 'Preview successful' };
                } else {
                  segmentStates.value[idx] = { status: 'error', message: 'Preview failed', error: preview?.error || 'Unknown error' };
                }
              });
            }
            
            // If there's a combined preview URL, update that too
            if (data.combinedPreviewUrl) {
              combinedPreviewUrl.value = data.combinedPreviewUrl;
            }
            
            toast.success('All segment previews generated successfully.');
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
