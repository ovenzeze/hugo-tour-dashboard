"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
import type { ValidateScriptResponse } from "~/composables/useScriptValidator"; // For structured script data
import type { FullPodcastSettings } from "./playgroundSettings";

// Copied from playground.ts
export interface SynthesisParams {
  temperature: number;
  speed: number;
  temperatureArray: number[]; // For slider binding
  speedArray: number[]; // For slider binding
}

// Copied from playground.ts
export const defaultSynthesisParams: SynthesisParams = {
  temperature: 0.7,
  speed: 1.0,
  temperatureArray: [0.7],
  speedArray: [1.0],
};

export interface PlaygroundAudioState {
  synthesisParams: SynthesisParams;
  outputFilename: string;
  isSynthesizing: boolean;
  synthesisError: string | null;
  audioUrl: string | null; // URL of the fully synthesized podcast (if applicable)
  isPlaying: boolean; // General playing state, could be for full audio or preview
  currentPreviewAbortController: AbortController | null;
  isStreamingPreview: boolean;
  streamingPreviewError: string | null;
  segmentTimestamps: any[]; // Timestamps for synthesized segments
  podcastId: string | null; // ID of the podcast being worked on, crucial for segment synthesis
}

export const usePlaygroundAudioStore = defineStore("playgroundAudio", {
  state: (): PlaygroundAudioState => ({
    synthesisParams: { ...defaultSynthesisParams },
    outputFilename: "synthesis_output.mp3",
    isSynthesizing: false,
    synthesisError: null,
    audioUrl: null,
    isPlaying: false,
    currentPreviewAbortController: null,
    isStreamingPreview: false,
    streamingPreviewError: null,
    segmentTimestamps: [],
    podcastId: null, // Initialize as null
  }),
  actions: {
    // Action to explicitly set the podcastId, e.g., after creation or loading an existing one
    setPodcastId(id: string | null) {
        this.podcastId = id;
    },

    updateOutputFilename(filename: string) {
      this.outputFilename = filename;
    },

    updateSynthesisParams(params: Partial<SynthesisParams>) {
      this.synthesisParams = {
        ...this.synthesisParams,
        ...params,
        temperatureArray:
          params.temperature !== undefined
            ? [params.temperature]
            : this.synthesisParams.temperatureArray,
        speedArray:
          params.speed !== undefined
            ? [params.speed]
            : this.synthesisParams.speedArray,
      };
    },

    saveSegmentTimestamps(timestamps: any[]) {
      this.segmentTimestamps = timestamps;
    },

    // For previewing a single segment or the whole script with one voice
    async startStreamingPreview(textToPreview: string, voiceModelId: string | undefined): Promise<Response | undefined> {
      if (!textToPreview.trim()) {
        toast.error("No content to preview.");
        return;
      }
      if (!voiceModelId) {
        toast.error("Voice model ID is required for preview.");
        return;
      }

      this.isStreamingPreview = true;
      this.streamingPreviewError = null;

      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
      }
      this.currentPreviewAbortController = new AbortController();

      try {
        // @ts-ignore - Nuxt auto-imported $fetch
        const response = await $fetch.raw("/api/tts/stream-preview", {
          method: "POST",
          body: {
            text: textToPreview,
            voice_id: voiceModelId,
            // Potentially add synthesisParams here if the API supports them for preview
          },
          signal: this.currentPreviewAbortController.signal,
        } as any);
        // Note: isPlaying state might be handled by the component based on audio events
        return response;
      } catch (error: any) {
        if (error.name === "AbortError") {
          toast.info("Preview aborted");
        } else {
          const errorMessage = error.data?.message || error.message || "Preview failed";
          this.streamingPreviewError = errorMessage;
          toast.error("Preview failed", { description: errorMessage });
        }
        this.isStreamingPreview = false;
        return undefined;
      }
    },

    stopStreamingPreview() {
      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
        this.currentPreviewAbortController = null;
      }
      this.isStreamingPreview = false;
      this.isPlaying = false; // Ensure playing state is reset
    },

    // For synthesizing all segments of a validated script
    async synthesizeAllSegmentsConcurrently(
        validationResult: ValidateScriptResponse | null, // Pass the full validation result
        podcastSettings: FullPodcastSettings // Pass necessary settings
    ) {
      if (this.isSynthesizing) return;
      if (!this.podcastId) {
        toast.error("Podcast ID is missing. Cannot synthesize segments.");
        return;
      }
      if (!validationResult?.structuredData?.script || validationResult.structuredData.script.length === 0) {
        toast.error("No valid script segments to synthesize.");
        return;
      }

      this.isSynthesizing = true;
      this.synthesisError = null;
      let successfulSegments = 0;
      let failedSegments = 0;
      
      const segmentsToProcess = validationResult.structuredData.script;
      const voiceMap = validationResult.structuredData.voiceMap;
      const totalSegments = segmentsToProcess.length;

      toast.info(`Starting concurrent synthesis for ${totalSegments} segments...`);

      const CONCURRENCY_LIMIT = 4;
      // Explicitly type seg and index in the map function
      const processingQueue = [...segmentsToProcess.map((seg: { role: 'host' | 'guest'; name: string; text: string; }, index: number) => ({ segment: seg, index }))];
      const activePromises: Promise<any>[] = [];

      const processSegment = async (segmentWithIndex: { segment: { role: 'host' | 'guest'; name: string; text: string; }, index: number }) => {
        const { segment, index } = segmentWithIndex;
        // Ensure voiceMap and segment.name are valid keys for voiceMap
        const voiceInfo = voiceMap && segment.name && voiceMap[segment.name] ? voiceMap[segment.name] : undefined;
        const toastId = `segment-toast-${this.podcastId}-${index}`;

        if (!voiceInfo || !voiceInfo.voice_model_identifier) {
          const errorMsg = `Voice ID not found for speaker: ${segment.name} in segment ${index + 1}. Skipping.`;
          toast.warning(errorMsg, { id: toastId });
          failedSegments++;
          return;
        }

        const inputSegment = {
          segmentIndex: index,
          text: segment.text,
          voiceId: voiceInfo.voice_model_identifier,
          speakerName: segment.name,
        };

        try {
          toast.loading(`Synthesizing segment ${index + 1}/${totalSegments}: ${segment.name}...`, { id: toastId });
          // @ts-ignore
          const response = await $fetch('/api/podcast/process/synthesize-segments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              podcastId: this.podcastId,
              segments: [inputSegment],
              defaultModelId: podcastSettings.elevenLabsProjectId, // Use from passed settings
              voiceSettings: {
                stability: this.synthesisParams.temperature,
                similarity_boost: this.synthesisParams.speed, // This was mapped to speed in original store
              }
            },
          });

          // @ts-ignore
          if (response.success && response.generatedSegments && response.generatedSegments[0] && !response.generatedSegments[0].error) {
            toast.success(`Segment ${index + 1} (${segment.name}) synthesized.`, { id: toastId });
            successfulSegments++;
          } else {
            // @ts-ignore
            const errorMsg = response.generatedSegments?.[0]?.error || response.message || "Unknown synthesis error";
            toast.error(`Failed segment ${index + 1} (${segment.name}): ${errorMsg}`, { id: toastId });
            failedSegments++;
          }
        } catch (error: any) {
          const errorMessage = error.data?.message || error.message || "Network/server error during synthesis";
          toast.error(`Error for segment ${index + 1} (${segment.name}): ${errorMessage}`, { id: toastId });
          failedSegments++;
        }
      };
      
      const manageConcurrency = async () => {
        while (processingQueue.length > 0 || activePromises.length > 0) {
          while (activePromises.length < CONCURRENCY_LIMIT && processingQueue.length > 0) {
            const task = processingQueue.shift();
            if (task) {
              const promise = processSegment(task).finally(() => {
                const idx = activePromises.indexOf(promise);
                if (idx > -1) activePromises.splice(idx, 1);
              });
              activePromises.push(promise);
            }
          }
          if (activePromises.length > 0) {
            await Promise.race(activePromises);
          }
        }
      };

      await manageConcurrency();

      this.isSynthesizing = false;
      if (failedSegments > 0) {
        this.synthesisError = `${failedSegments} segment(s) failed.`;
        toast.error(`Synthesis complete: ${successfulSegments} succeeded, ${failedSegments} failed.`);
      } else {
        toast.success(`All ${successfulSegments} segments synthesized successfully!`);
      }
      // After all segments are synthesized, one might want to fetch the final combined audio URL
      // This would likely be another action, e.g., fetchFinalPodcastAudio(this.podcastId)
    },
    
    // Action to set the final audio URL, e.g., after combining segments or direct synthesis
    setFinalAudioUrl(url: string | null) {
        this.audioUrl = url;
        if (url) {
            toast.success("Podcast audio is ready.");
        }
    },

    setIsPlaying(playing: boolean) {
        this.isPlaying = playing;
    },

    resetAudioState() {
      this.synthesisParams = { ...defaultSynthesisParams };
      this.outputFilename = "synthesis_output.mp3";
      this.isSynthesizing = false;
      this.synthesisError = null;
      this.audioUrl = null;
      this.isPlaying = false;
      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
        this.currentPreviewAbortController = null;
      }
      this.isStreamingPreview = false;
      this.streamingPreviewError = null;
      this.segmentTimestamps = [];
      // this.podcastId = null; // podcastId should be managed more carefully, reset only when a new podcast lifecycle starts
      // toast.info("Audio settings and state have been reset.");
    }
  },
  getters: {
    // Getter to check if synthesis can start (basic check)
    canSynthesize(state: PlaygroundAudioState): boolean {
      return !!state.podcastId && !state.isSynthesizing;
    }
  }
});
