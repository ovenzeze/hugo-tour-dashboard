import { ref, reactive } from 'vue';
import { usePlaygroundStore } from '../stores/playground';
import { toast } from 'vue-sonner';
import type { ParsedScriptSegment, Voice } from './useVoiceManagement'; // Assuming interfaces are exported

export interface SegmentState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  error?: string;
  audioUrl?: string; // This might be redundant if segmentPreviews holds the URL
}

export interface SegmentPreviewData {
  audioUrl: string;
  timestamps?: any[]; // Define more specific type if structure is known
}

// Enhanced segment type that the preview composable will work with
// This combines the parsed script segment with voice assignment and potentially persona details
export interface PreviewableSegment extends ParsedScriptSegment {
    voiceId?: string; // Assigned voice ID for this segment's speaker
    // Add other relevant details that might be needed for preview context or API calls
    // e.g. personaId, roleType, etc. if required by previewSegment API
}

export function useSegmentPreview(
    parsedScriptSegments: globalThis.Ref<PreviewableSegment[]>,
    speakerAssignments: globalThis.Ref<Record<string, string>>,
    ttsProvider: globalThis.Ref<string> // Needed for some API calls
) {
  const playgroundStore = usePlaygroundStore();

  const isPreviewingSegment = ref<number | null>(null); // Index of the segment being previewed
  const segmentPreviews = ref<Record<number, SegmentPreviewData>>({}); // Index -> { audioUrl, timestamps }
  const segmentStates = ref<Record<number, SegmentState>>({}); // Index -> SegmentState
  const combinedPreviewUrl = ref<string | null>(null);

  // Audio player management
  const audioRefs = ref<Record<number, HTMLAudioElement | null>>({}); // Stores <audio> element references
  const audioPlayingState = ref<Record<number, boolean>>({}); // Tracks if audio for a segment index is playing

  const initializeSegmentStates = () => {
    parsedScriptSegments.value.forEach((_, index) => {
      if (!segmentStates.value[index]) {
        segmentStates.value[index] = { status: 'idle', message: 'Ready to preview' };
      }
      if(!segmentPreviews.value[index]){
        // Ensure segmentPreviews has an entry, even if empty
        // segmentPreviews.value[index] = { audioUrl: '' }; 
      }
    });
  };
  
  watch(parsedScriptSegments, () => {
      initializeSegmentStates();
      // Potentially clear segmentPreviews and combinedPreviewUrl if script changes significantly
      // segmentPreviews.value = {};
      // combinedPreviewUrl.value = null;
  }, { deep: true, immediate: true });

  async function previewSegment(segment: PreviewableSegment, index: number) {
    const voiceId = speakerAssignments.value[segment.speakerTag];
    if (!segment.text || !voiceId) {
      toast.error('Missing text or voice assignment for segment preview.');
      segmentStates.value[index] = { status: 'error', message: 'Missing text or voice assignment.', error: 'No text or voice.' };
      return;
    }

    segmentStates.value[index] = { status: 'loading', message: 'Generating preview...' };
    isPreviewingSegment.value = index;

    try {
      const podcastIdForPreview = `preview_session_${playgroundStore.podcastSettings.title?.trim().replace(/\s+/g, '_') || Date.now()}`;

      const response = await fetch('/api/podcast/process/synthesize-segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: podcastIdForPreview,
          segments: [
            {
              segmentIndex: index,
              text: segment.text,
              voiceId: voiceId,
              speakerName: segment.speakerTag
            }
          ],
          defaultModelId: 'eleven_multilingual_v2', // TODO: Make configurable
          voiceSettings: { // Pass global synthesis params from the store
            stability: playgroundStore.synthesisParams.temperature,
            similarity_boost: 0.75, // TODO: Make configurable or part of persona
            style: 0, // TODO: Make configurable or part of persona
            use_speaker_boost: true // TODO: Make configurable or part of persona
          }
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
            segmentStates.value[index] = { status: 'success', message: 'Preview successful', audioUrl: segmentResult.audioFileUrl };
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
    } finally {
      isPreviewingSegment.value = null;
    }
  }

  async function previewAllSegments() {
    const segmentsToPreview = parsedScriptSegments.value.filter(seg => speakerAssignments.value[seg.speakerTag]);
    if (segmentsToPreview.length !== parsedScriptSegments.value.length) {
        toast.error('Please assign voices to all segments before previewing all.');
        return false;
    }
    if (segmentsToPreview.length === 0) {
        toast.warn('No segments with assigned voices to preview.');
        return false;
    }

    parsedScriptSegments.value.forEach((seg, index) => {
        if(speakerAssignments.value[seg.speakerTag]) {
            segmentStates.value[index] = { status: 'loading', message: 'Generating all previews...' };
        }
    });
    toast.info('Generating all segment previews, please wait...');

    try {
        // This uses the /api/podcast/preview/segments endpoint which takes a different payload
        const payloadSegments = parsedScriptSegments.value.map(segment => ({
            speakerTag: segment.speakerTag,
            text: segment.text
        }));

        const response = await fetch('/api/podcast/preview/segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                config: {
                    ttsProvider: ttsProvider.value,
                    speakerAssignments: speakerAssignments.value,
                    segments: payloadSegments
                },
                synthesisParams: {
                    stability: playgroundStore.synthesisParams.temperature,
                    similarity_boost: 0.75,
                    style: 0,
                    use_speaker_boost: true
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Preview all generation failed: ${response.statusText}`);
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
                    segmentStates.value[index] = { status: 'success', message: 'Preview successful', audioUrl };
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