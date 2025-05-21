"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
import type { ValidateScriptResponse } from "~/composables/useScriptValidator"; // For structured script data
import type { FullPodcastSettings } from "./playgroundSettings";
import { usePlaygroundPersonaStore } from "./playgroundPersona"; // Import persona store

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
        podcastSettings: FullPodcastSettings, // Pass necessary settings
        speakerAssignments?: Record<string, { voiceId: string, provider?: string }> // Updated type for speakerAssignments
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
      const voiceMap = validationResult.structuredData.voiceMap; // Keep voiceMap for persona info
      const totalSegments = segmentsToProcess.length;

      // TTS Provider will be determined per segment inside processSegment
      toast.info(`Starting concurrent synthesis for ${totalSegments} segments...`);

      const CONCURRENCY_LIMIT = 5; // 并发数为5
      const MAX_RETRIES = 2; // 最大重试次数
      // Explicitly type seg and index in the map function
      const processingQueue = [...segmentsToProcess.map((seg: { role: 'host' | 'guest'; name: string; text: string; }, index: number) => ({ segment: seg, index, retries: 0 }))];
      const activePromises: Promise<any>[] = [];

      const processSegment = async (segmentWithIndex: { segment: { role: 'host' | 'guest'; name: string; text: string; }, index: number, retries: number }) => {
        const { segment, index, retries } = segmentWithIndex;
        const toastId = `segment-toast-${this.podcastId}-${index}`;
        
        const assignment = speakerAssignments && speakerAssignments[segment.name];
        const finalVoiceId = assignment?.voiceId;
        const ttsProviderForSegment = assignment?.provider; // 直接使用assignment中的provider，确保数据透传

        // 详细记录每个片段的处理信息
        console.log(`[synthesizeAllSegmentsConcurrently] Processing segment ${index + 1}/${totalSegments}:`, {
          speakerTag: segment.name,
          role: segment.role,
          textPreview: segment.text.substring(0, 50) + (segment.text.length > 50 ? '...' : ''),
          assignment: assignment,
          finalVoiceId: finalVoiceId,
          ttsProviderForSegment: ttsProviderForSegment,
          retries: retries
        });

        if (!ttsProviderForSegment) {
            console.warn(`TTS provider for speaker ${segment.name} in segment ${index + 1} is not explicitly set. API might use a default or fail if required.`);
        }

        if (!finalVoiceId) {
          const errorMsg = `Voice ID not found for speaker: ${segment.name} in segment ${index + 1}. Skipping.`;
          toast.warning(errorMsg, { id: toastId });
          console.error(`[synthesizeAllSegmentsConcurrently] ${errorMsg}`);
          failedSegments++;
          return;
        }

        const inputSegment = {
          segmentIndex: index,
          text: segment.text,
          voiceId: finalVoiceId,
          speakerName: segment.name,
        };

        try {
          toast.loading(`Synthesizing segment ${index + 1}/${totalSegments}: ${segment.name}${retries > 0 ? ` (Retry ${retries})` : ''}...`, { id: toastId });
          
          // 记录请求参数，便于调试
          const requestBody = {
            podcastId: this.podcastId,
            segments: [inputSegment],
            defaultModelId: podcastSettings.elevenLabsProjectId,
            voiceSettings: {
              stability: this.synthesisParams.temperature,
              similarity_boost: this.synthesisParams.speed,
            },
            ttsProvider: ttsProviderForSegment, // 使用per-segment provider
            synthesisParams: this.synthesisParams,
          };
          
          console.log(`[synthesizeAllSegmentsConcurrently] Segment ${index + 1} request:`, JSON.stringify(requestBody, null, 2));
          
          // @ts-ignore
          const response = await $fetch('/api/podcast/process/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });

          // 详细记录响应结果
          console.log(`[synthesizeAllSegmentsConcurrently] Segment ${index + 1} response:`, JSON.stringify(response, null, 2));

          // @ts-ignore
          if (response.success && response.generatedSegments && response.generatedSegments[0] && !response.generatedSegments[0].error) {
            toast.success(`Segment ${index + 1} (${segment.name}) synthesized.`, { id: toastId });
            console.log(`[synthesizeAllSegmentsConcurrently] Segment ${index + 1} (${segment.name}) synthesized successfully.`);
            successfulSegments++;
          } else {
            // @ts-ignore
            const errorMsg = response.generatedSegments?.[0]?.error || response.message || "Unknown synthesis error";
            toast.error(`Failed segment ${index + 1} (${segment.name}): ${errorMsg}`, { id: toastId });
            console.error(`[synthesizeAllSegmentsConcurrently] Failed segment ${index + 1} (${segment.name}): ${errorMsg}`);
            
            // 如果失败且未达到最大重试次数，则重新加入队列
            if (retries < MAX_RETRIES) {
              console.log(`[synthesizeAllSegmentsConcurrently] Retrying segment ${index + 1} (${segment.name}), retry ${retries + 1}/${MAX_RETRIES}`);
              processingQueue.push({ segment, index, retries: retries + 1 });
            } else {
              console.error(`[synthesizeAllSegmentsConcurrently] Segment ${index + 1} (${segment.name}) failed after ${MAX_RETRIES} retries.`);
              failedSegments++;
            }
          }
        } catch (error: any) {
          const errorMessage = error.data?.message || error.message || "Network/server error during synthesis";
          toast.error(`Error for segment ${index + 1} (${segment.name}): ${errorMessage}`, { id: toastId });
          console.error(`[synthesizeAllSegmentsConcurrently] Error for segment ${index + 1} (${segment.name}):`, error);
          
          // 如果失败且未达到最大重试次数，则重新加入队列
          if (retries < MAX_RETRIES) {
            console.log(`[synthesizeAllSegmentsConcurrently] Retrying segment ${index + 1} (${segment.name}) after error, retry ${retries + 1}/${MAX_RETRIES}`);
            processingQueue.push({ segment, index, retries: retries + 1 });
          } else {
            console.error(`[synthesizeAllSegmentsConcurrently] Segment ${index + 1} (${segment.name}) failed after ${MAX_RETRIES} retries due to error:`, errorMessage);
            failedSegments++;
          }
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
      
      // 返回成功生成的segment数量，便于UI显示
      return {
        successfulSegments,
        failedSegments,
        totalSegments
      };
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
