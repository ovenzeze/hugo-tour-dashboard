import { ref, reactive, watch } from 'vue'; // Added watch
import { usePlaygroundAudioStore } from '../stores/playgroundAudio';
import { usePlaygroundSettingsStore } from '../stores/playgroundSettings';
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
  const audioStore = usePlaygroundAudioStore();
  const settingsStore = usePlaygroundSettingsStore();

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
        const podcastIdToUse = audioStore.podcastId || `preview_session_${settingsStore.podcastSettings.title?.trim().replace(/\s+/g, '_') || Date.now()}`;
  
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
            defaultModelId: settingsStore.podcastSettings.elevenLabsProjectId || 'eleven_multilingual_v2',
            voiceSettings: {
              stability: audioStore.synthesisParams.temperature,
              similarity_boost: audioStore.synthesisParams.speed, // Use speed for similarity_boost
              // style: 0, // TODO: Make configurable or part of persona if API supports
              // use_speaker_boost: true // TODO: Make configurable or part of persona if API supports
            },
            synthesisParams: audioStore.synthesisParams, // Pass global synthesis params from the store
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
                stability: audioStore.synthesisParams.temperature,
                similarity_boost: audioStore.synthesisParams.speed,
            }
        };

        console.log('[useSegmentPreview] previewAllSegments requestBody:', JSON.stringify(requestBody, null, 2));


        const response = await fetch('/api/podcast/preview/segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Preview all generation failed: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        if (result.segments && Array.isArray(result.segments)) {
            let successCount = 0;
            result.segments.forEach((segmentResultItem: any, index: number) => {
                // Assuming the order of segments in response matches parsedScriptSegments
                if (segmentResultItem.status === 'success' && segmentResultItem.audio) {
                    const binary = atob(segmentResultItem.audio);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    const audioBlob = new Blob([bytes], { type: segmentResultItem.contentType || 'audio/mpeg' });
                    const audioUrl = URL.createObjectURL(audioBlob);

                    segmentPreviews.value[index] = {
                        audioUrl,
                        timestamps: segmentResultItem.timestamps || []
                    };
                    segmentStates.value[index] = { status: 'success', message: 'Preview successful' };
                    successCount++;
                } else {
                    segmentStates.value[index] = { 
                        status: 'error', 
                        message: segmentResultItem.error || 'Preview failed for this segment', 
                        error: segmentResultItem.error || 'Unknown error'
                    };
                }
            });

            if (successCount > 0 && result.segments.length > 0) {
                // Set combined preview to the first successful segment for simplicity
                const firstSuccessIndex = result.segments.findIndex((s:any) => s.status === 'success');
                if (firstSuccessIndex !== -1 && segmentPreviews.value[firstSuccessIndex]) {
                    combinedPreviewUrl.value = segmentPreviews.value[firstSuccessIndex].audioUrl;
                }
            }
            toast.success(`Successfully previewed ${successCount}/${result.segments.length} audio segments`);
            return successCount > 0;
        } else {
            throw new Error('Server did not return expected preview segments array.');
        }

    } catch (error: any) {
        console.error('Preview all segments failed:', error);
        toast.error(`Preview all failed: ${error.message}`);
        parsedScriptSegments.value.forEach((_, index) => {
            if (segmentStates.value[index]?.status === 'loading') { // Only update those that were attempted
                segmentStates.value[index] = { status: 'error', message: 'Preview all failed', error: error.message };
            }
        });
        return false;
    }
  }

  // Functions for audio playback control, to be used by SegmentVoiceAssignmentItem via parent
  const onSegmentPlay = (playedIndex: number) => {
    audioPlayingState.value[playedIndex] = true;
    Object.entries(audioRefs.value).forEach(([indexStr, audioEl]) => {
      const currentIndex = Number(indexStr);
      if (audioEl && currentIndex !== playedIndex && !audioEl.paused) {
        audioEl.pause();
        audioPlayingState.value[currentIndex] = false;
      }
    });
  };

  const onSegmentPauseOrEnd = (pausedIndex: number) => {
    audioPlayingState.value[pausedIndex] = false;
  };

  // Expose function to register audio refs from child components
  const setAudioRef = (index: number, el: HTMLAudioElement | null) => {
    if (el) {
        audioRefs.value[index] = el;
    } else {
        delete audioRefs.value[index]; // Clean up if element is destroyed
    }
  };

  return {
    isPreviewingSegment,
    segmentPreviews,
    segmentStates,
    combinedPreviewUrl,
    audioPlayingState, // Expose if needed by parent for UI updates
    previewSegment,
    previewAllSegments,
    onSegmentPlay,
    onSegmentPauseOrEnd,
    setAudioRef,
    initializeSegmentStates // Expose if manual re-init is needed
  };
}
