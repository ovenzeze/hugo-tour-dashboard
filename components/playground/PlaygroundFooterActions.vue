<template>
  <CardFooter class="border-t p-3 flex flex-col md:flex-row justify-between items-center flex-shrink-0 bg-background gap-2 md:gap-4">
    <!-- Left Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto">
      <Button
        v-if="currentStep > 1"
        variant="outline"
        @click="handlePreviousStep"
        class="w-full md:w-auto"
      >
        <Icon name="ph:arrow-left" class="w-4 h-4 mr-2" />
        Previous
      </Button>
      <Button
        variant="ghost"
        @click="handleReset"
        class="w-full md:w-auto"
      >
        <Icon name="ph:arrow-counter-clockwise" class="w-4 h-4 mr-2" />
        Reset
      </Button>
      <!-- Step 1 specific buttons: AI Script and Use Preset -->
      <template v-if="currentStep === 1">
        <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                @click="handleGenerateAiScript"
                :disabled="isAnyLoading"
                :variant="!isScriptEmpty ? 'outline' : 'default'"
                class="w-full md:w-auto relative overflow-hidden group"
              >
                <div class="flex items-center justify-center">
                  <div v-if="isGeneratingScript" class="absolute inset-0 bg-primary/10 animate-pulse"></div>
                  <div class="flex items-center justify-center relative z-10">
                    <Icon
                      v-if="isGeneratingScript"
                      name="ph:sparkle"
                      class="w-5 h-5 animate-pulse text-primary"
                    />
                    <Icon
                      v-else
                      name="ph:brain"
                      class="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300"
                    />
                    <span v-if="isGeneratingScript">AI Creating...</span>
                    <span v-else>AI Script</span>
                  </div>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Use AI to automatically generate a podcast script based on your settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                variant="outline"
                @click="handleUsePresetScript"
                :disabled="isAnyLoading"
                class="w-full md:w-auto group"
              >
                <Icon
                  name="ph:book-open-text"
                  class="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300"
                />
                <span>Use Preset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Load a preset example script for quick testing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </template>
    </div>
    
    <!-- Right Main Action Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto justify-end">
      <!-- Step 1: Next Button -->
      <template v-if="currentStep === 1">
        <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                variant="default"
                :disabled="isScriptEmpty || isAnyLoading || processStore.isValidating || isProcessingNextStepComputed"
                @click="handleProceedToStep2"
                class="w-full md:w-auto relative overflow-hidden group"
              >
                <div class="flex items-center justify-center">
                  <div v-if="processStore.isValidating || isProcessingNextStepComputed" class="absolute inset-0 bg-primary/10 animate-pulse"></div>
                  <div class="flex items-center justify-center relative z-10">
                    <Icon
                      v-if="processStore.isValidating || isProcessingNextStepComputed"
                      name="ph:spinner"
                      class="w-4 h-4 mr-2 animate-spin text-primary"
                    />
                    <span v-if="processStore.isValidating">Validating...</span>
                    <span v-else-if="isProcessingNextStepComputed">Processing...</span>
                    <span v-else>Next</span>
                    <Icon v-if="!processStore.isValidating && !isProcessingNextStepComputed" name="ph:arrow-right" class="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent v-if="processStore.isValidating">
              <p>Validating script and preparing next step...</p>
            </TooltipContent>
            <TooltipContent v-else-if="isProcessingNextStepComputed">
              <p>Processing and preparing next step...</p>
            </TooltipContent>
            <TooltipContent v-else-if="isScriptEmpty">
              <p>Please enter or generate a script to proceed.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </template>
      
      <!-- Step 2: Preview and Synthesize Buttons -->
      <template v-if="currentStep === 2">
        <Button
          variant="outline"
          @click="handleGenerateAudioPreview"
          :disabled="!canProceedFromStep2Computed || processStore.isSynthesizing"
          class="w-full md:w-auto"
        >
          <Icon v-if="processStore.isSynthesizing && isPreviewing" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
          <Icon v-else name="ph:broadcast" class="w-4 h-4 mr-2" />
          {{ (processStore.isSynthesizing && isPreviewing) ? 'Generating Preview...' : 'Generate Audio Preview' }}
        </Button>
        <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                variant="default"
                :disabled="!isPodcastGenerationAllowedComputed || processStore.isSynthesizing"
                @click="handleSynthesizePodcast"
                class="w-full md:w-auto"
              >
                <Icon v-if="processStore.isSynthesizing && !isPreviewing" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
                <Icon v-else name="ph:rocket-launch" class="w-4 h-4 mr-2" />
                {{ (processStore.isSynthesizing && !isPreviewing) ? 'Synthesizing...' : 'Synthesize Podcast' }}
              </Button>
            </TooltipTrigger>
            <TooltipContent v-if="!isPodcastGenerationAllowedComputed">
              <p>Ensure script is parsed and all voices are assigned. Preview generation might be required by some logic.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </template>
      
      <!-- Step 3: Download and Re-synthesize Buttons -->
      <template v-if="currentStep === 3">
        <Button
          v-if="finalAudioUrl"
          variant="outline"
          @click="handleDownloadAudio"
          class="w-full md:w-auto"
        >
          <Icon name="ph:download-simple" class="w-4 h-4 mr-2" />
          Download Audio
        </Button>
        <Button
          @click="handleSynthesizePodcast"
          :disabled="isAnyLoading || processStore.isSynthesizing"
          variant="default"
          class="w-full md:w-auto"
        >
          <Icon v-if="processStore.isSynthesizing" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
          <Icon v-else name="ph:arrows-clockwise" class="w-4 h-4 mr-2" />
          {{ processStore.isSynthesizing ? 'Re-synthesizing...' : 'Re-Synthesize Podcast' }}
        </Button>
      </template>
    </div>
  </CardFooter>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePersonaCache } from '~/composables/usePersonaCache';

const uiStore = usePlaygroundUIStore();
const processStore = usePlaygroundProcessStore();
const unifiedStore = usePlaygroundUnifiedStore(); // Use unified store instead of script store
const settingsStore = usePlaygroundSettingsStore(); // Instantiate settings store

const { currentStep, finalAudioUrl } = storeToRefs(uiStore);
const { isLoading: isGeneratingScript, isSynthesizing, isValidating, error: processError } = storeToRefs(processStore);
const { scriptContent, parsedSegments, error: scriptError } = storeToRefs(unifiedStore); // Use unified store
const { podcastSettings } = storeToRefs(settingsStore); // For TTS provider, etc.

// Computed properties for script state
const isScriptEmpty = computed(() => unifiedStore.isScriptEmpty);
const uniqueSpeakers = computed(() => {
  const speakers = new Set(unifiedStore.parsedSegments.map(segment => segment.speaker));
  return Array.from(speakers);
});

const isPreviewing = ref(false); // Local state to differentiate preview synthesis from full synthesis

// --- Computed Properties for Button States ---
const isAnyLoading = computed(() =>
  processStore.isLoading || processStore.isSynthesizing || processStore.isCombining || processStore.isValidating
);

const isProcessingNextStepComputed = computed(() => {
  // Example: if current step is 1 and script is being processed for step 2
  return currentStep.value === 1 && processStore.isLoading;
});

const canProceedFromStep2Computed = computed(() => {
  if (isScriptEmpty.value || unifiedStore.error) return false;
  // Check if all unique speakers have a valid persona assigned
  const { assignedVoicePerformances } = storeToRefs(uiStore); // Get it here for reactivity
  if (!uniqueSpeakers.value.length) return false; // No speakers, no proceed
  return uniqueSpeakers.value.every(speaker =>
    assignedVoicePerformances.value[speaker] &&
    (assignedVoicePerformances.value[speaker].match_status === 'exact' || assignedVoicePerformances.value[speaker].match_status === 'fallback') && // Ensure persona is found
    (assignedVoicePerformances.value[speaker].voice_id || assignedVoicePerformances.value[speaker].voice_model_identifier) // Ensure voice ID is present
  );
});

const isPodcastGenerationAllowedComputed = computed(() => {
  // Similar to canProceedFromStep2, but could have additional checks like all segments previewed (if that becomes a feature)
  // For now, let's assume it's the same as being able to proceed from step 2
  // And also ensure there's a podcastId from script processing
  return canProceedFromStep2Computed.value && !!processStore.podcastId;
});


// --- Event Handlers ---
const handlePreviousStep = () => {
  if (currentStep.value > 1) {
    uiStore.setCurrentStep(currentStep.value - 1);
  }
};

const handleReset = () => {
  uiStore.resetAllPlaygroundStates();
};

const handleGenerateAiScript = async () => {
  try {
    console.log('[handleGenerateAiScript] Starting AI script generation...');
    processStore.error = null;
    
    // Call the AI script generation endpoint
    const aiResponse = await generateAiScript();
    console.log('[handleGenerateAiScript] AI Response received:', JSON.stringify(aiResponse, null, 2));
    
    // The API directly returns the parsed response, not wrapped in success
    if (aiResponse && typeof aiResponse === 'object') {
      const { script, podcastTitle, language, voiceMap } = aiResponse as any;
      
      // Validate that we have a script array
      if (!Array.isArray(script) || script.length === 0) {
        console.error('[handleGenerateAiScript] No valid script array found in response:', aiResponse);
        processStore.error = 'AI response does not contain a valid script';
        return;
      }
      
      console.log('[handleGenerateAiScript] Processing script with', script.length, 'segments');
      
      // Convert AI response to script content format expected by scriptStore
      // Support both 'name' and 'speaker' fields for flexibility
      const scriptContent = script
        .filter((segment: any) => {
          const speakerName = segment?.name || segment?.speaker;
          const isValid = segment && 
                         typeof speakerName === 'string' && speakerName.trim() &&
                         typeof segment.text === 'string' && segment.text.trim();
          if (!isValid) {
            console.warn('[handleGenerateAiScript] Filtering out invalid segment:', segment);
          }
          return isValid;
        })
        .map((segment: any) => {
          const speakerName = segment.name || segment.speaker;
          return `${speakerName}: ${segment.text}`;
        })
        .join('\n');
      
      if (!scriptContent.trim()) {
        console.error('[handleGenerateAiScript] Generated script content is empty after processing');
        processStore.error = 'AI generated script is empty or contains no valid segments';
        return;
      }
      
      console.log('[handleGenerateAiScript] Final script content:', scriptContent);
      
      // Update the unified store with the generated content
      unifiedStore.updateScriptContent(scriptContent);
      console.log('[handleGenerateAiScript] Script content updated in unified store successfully');
      
      // Update settings with AI-provided metadata
      if (typeof podcastTitle === 'string' && podcastTitle.trim()) {
        console.log('[handleGenerateAiScript] Updating podcast title:', podcastTitle);
        settingsStore.setPodcastTitle(podcastTitle);
      }
      
      if (typeof language === 'string' && language.trim()) {
        console.log('[handleGenerateAiScript] Updating language:', language);
        settingsStore.updatePodcastSettings({ language: language });
      }
      
      // Log voice mapping for debugging "undefined" names issue
      if (voiceMap && typeof voiceMap === 'object') {
        console.log('[handleGenerateAiScript] AI provided voice map:', voiceMap);
        // TODO: Could potentially use this to auto-assign voices to speakers
      }
      
      console.log('[handleGenerateAiScript] AI script generation completed successfully');
      
    } else {
      console.error('[handleGenerateAiScript] AI response is not a valid object:', aiResponse);
      processStore.error = 'AI script generation failed - invalid response format';
    }
  } catch (e: any) {
    console.error('[handleGenerateAiScript] Error during AI script generation:', e);
    processStore.error = `AI script generation failed: ${e?.message || 'Unknown error'}`;
  }
};

// Helper function to call AI script generation endpoint
const generateAiScript = async () => {
  console.log('[generateAiScript] Starting...');
  processStore.isLoading = true;
  processStore.error = null;
  
  try {
    const requestBody: any = {
      podcastSettings: {
        title: settingsStore.podcastSettings.title,
        topic: settingsStore.podcastSettings.topic,
        numberOfSegments: 4, // Default number of segments
        style: settingsStore.podcastSettings.style || 'conversational',
        keywords: settingsStore.podcastSettings.keywords?.join(', ') || '',
        language: settingsStore.podcastSettings.language || 'en-US',
        // museumId, galleryId, objectId are not in the current type definition
        // but may be needed by the API, so we'll add them conditionally
        ...(settingsStore.podcastSettings as any).museumId && { museumId: (settingsStore.podcastSettings as any).museumId },
        ...(settingsStore.podcastSettings as any).galleryId && { galleryId: (settingsStore.podcastSettings as any).galleryId },
        ...(settingsStore.podcastSettings as any).objectId && { objectId: (settingsStore.podcastSettings as any).objectId },
      }
    };

    // Add host persona if available
    const hostId = settingsStore.getHostPersonaIdNumeric;
    if (hostId !== undefined) {
      const { getPersonaById } = usePersonaCache();
      const hostPersona = getPersonaById(hostId);
      if (hostPersona) {
        requestBody.hostPersona = {
          persona_id: hostPersona.persona_id,
          name: hostPersona.name,
          voice_model_identifier: hostPersona.voice_model_identifier || 'default_voice'
        };
      }
    }

    // Add guest personas if available
    const guestIds = settingsStore.getGuestPersonaIdsNumeric;
    if (guestIds.length > 0) {
      const { getPersonaById } = usePersonaCache();
      requestBody.guestPersonas = guestIds.map(id => {
        const persona = getPersonaById(id);
        return persona ? {
          persona_id: persona.persona_id,
          name: persona.name,
          voice_model_identifier: persona.voice_model_identifier || 'default_voice'
        } : null;
      }).filter(Boolean);
    }

    console.log('[generateAiScript] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await $fetch('/api/generate-script', {
      method: 'POST',
      body: requestBody,
    });

    console.log('[generateAiScript] Raw API response:', response);

    // The API returns the parsed response directly
    return response;
  } catch (err: any) {
    console.error('[generateAiScript] Error:', err);
    throw new Error(err.data?.message || err.message || 'Failed to generate AI script');
  } finally {
    processStore.isLoading = false;
  }
};

const handleUsePresetScript = () => {
  // Default preset, or could be made dynamic
  uiStore.loadPresetScript('default');
};

const handleProceedToStep2 = async () => {
  if (isScriptEmpty.value) {
    unifiedStore.error = "Script content is empty. Please write or generate a script.";
    return;
  }
  if (unifiedStore.error) {
     // Error already set in unifiedStore by parseScript
    return;
  }
  // Optional: Add a validation step here if needed before proceeding
  // For now, directly go to next step if script is not empty and no parsing error
  uiStore.setCurrentStep(2);
};

const handleGenerateAudioPreview = async () => {
  if (!canProceedFromStep2Computed.value) {
    // This should ideally be caught by button's disabled state, but as a safeguard:
    processStore.error = "Cannot generate preview. Ensure script is valid and voices are assigned.";
    return;
  }
  isPreviewing.value = true;
  try {
    await processStore.synthesizeAudioPreviewForAllSegments();
    // Response is handled by playgroundProcessStore.previewApiResponse
    // UI components (like SegmentVoiceAssignmentItem) would then use this response.
  } catch (e) {
    console.error("Audio preview generation failed:", e);
  } finally {
    isPreviewing.value = false;
  }
};

const handleSynthesizePodcast = async () => {
  // Check conditions based on current step
  if (currentStep.value === 2 && !isPodcastGenerationAllowedComputed.value) {
    processStore.error = "Cannot synthesize podcast. Ensure script is valid, voices assigned, and podcast ID exists.";
    return;
  }
  
  isPreviewing.value = false; // Ensure this is false for full synthesis
  try {
    const synthResponse = await processStore.synthesizeAudio();
    if (synthResponse?.success && synthResponse.finalAudioUrl) {
      uiStore.setFinalAudioUrl(synthResponse.finalAudioUrl);
      // Only move to step 3 if we're currently in step 2 (initial synthesis)
      // If we're in step 3, we're re-synthesizing, so stay in step 3
      if (currentStep.value === 2) {
        uiStore.setCurrentStep(3);
      }
    } else if (synthResponse?.success && synthResponse.segmentResults && !synthResponse.finalAudioUrl) {
      // This case implies segments were synthesized but not yet combined.
      console.warn("Synthesis successful but no final audio URL. Segments might need combining.");
      // Attempt to combine if segments were produced
      if (processStore.synthesizeApiResponse?.segmentResults?.some(r => r.audioUrl)) {
        const combineResponse = await processStore.combineAudio();
        if (combineResponse?.success && combineResponse.audioUrl) {
          uiStore.setFinalAudioUrl(combineResponse.audioUrl);
          if (currentStep.value === 2) {
            uiStore.setCurrentStep(3);
          }
        } else {
           processStore.error = combineResponse?.message || "Failed to combine audio segments after synthesis.";
        }
      } else {
         processStore.error = synthResponse?.message || "Synthesis completed but no audio was produced.";
      }
    }
    // Error is handled by processStore if !synthResponse.success
  } catch (e) {
    console.error("Podcast synthesis failed:", e);
  }
};

const handleDownloadAudio = () => {
  if (finalAudioUrl.value) {
    const link = document.createElement('a');
    link.href = finalAudioUrl.value;
    // Extract filename from URL or generate one
    const filename = finalAudioUrl.value.substring(finalAudioUrl.value.lastIndexOf('/') + 1) || 'podcast_audio.mp3';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

</script>
