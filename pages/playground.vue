<template>
  <div class="h-[100vh] w-full flex flex-col overflow-hidden">
    <!-- Top Section: Stepper -->
    <div class="px-4 py-4 border-b bg-background">
      <Stepper v-model="currentStepIndex" class="block w-full max-w-3xl mx-auto">
        <div class="flex w-full flex-start gap-2">
          <StepperItem
            v-for="step in podcastSteps"
            :key="step.step"
            v-slot="{ state }"
            class="relative flex w-full flex-col items-center justify-center"
            :step="step.step"
          >
            <StepperSeparator
              v-if="step.step !== podcastSteps[podcastSteps.length - 1].step"
              class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
            />

            <StepperTrigger as-child>
              <Button
                :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
                size="icon"
                class="z-10 rounded-full shrink-0"
                :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
              >
                <Icon v-if="state === 'completed'" name="ph:check" class="size-5" />
                <Icon v-if="state === 'active'" name="ph:circle" class="size-5" />
                <Icon v-if="state === 'inactive'" name="ph:dot" class="size-5" />
              </Button>
            </StepperTrigger>

            <div class="mt-5 flex flex-col items-center text-center">
              <StepperTitle
                :class="[state === 'active' && 'text-primary']"
                class="text-sm font-semibold transition lg:text-base"
              >
                {{ step.title }}
              </StepperTitle>
              <StepperDescription
                :class="[state === 'active' && 'text-primary']"
                class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
              >
                {{ step.description }}
              </StepperDescription>
            </div>
          </StepperItem>
        </div>
      </Stepper>
    </div>

    <!-- Main Content: Unified Card Layout -->
    <Card class="flex-1 flex flex-col min-h-0 overflow-hidden mx-4 my-4 border rounded-lg shadow-sm">
      <!-- Card Header with Title - Fixed at the top -->
      <CardHeader v-if="currentStepIndex !== 1 && currentStepIndex !== 2" class="border-b flex-shrink-0 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1"></div>
        </div>
      </CardHeader>

      <!-- Main Content: Unified Card Layout -->
      <CardContent class="flex-1 p-0 flex flex-col md:flex-row min-h-0 overflow-auto gap-4 bg-background">
        <!-- Main Content: Responsive Card Layout for Step 1 -->
        <div v-if="currentStepIndex === 1" class="flex flex-col md:flex-row gap-4 flex-1 p-4 bg-background h-full">
          <!-- 左侧表单区，单独滑动 -->
          <Card class="md:w-1/3 w-full p-4 flex-shrink-0 bg-muted/60 border-none shadow-md max-h-screen overflow-y-auto h-full">
            <PodcastSettingsForm
              v-model="playgroundStore.podcastSettings"
              :personas="personasForForm"
              :personas-loading="playgroundStore.personasLoading"
            />
          </Card>
          <!-- 右侧脚本编辑区，独立滑动 -->
          <Card class="flex-1 p-4 min-h-[240px] flex flex-col bg-background border-none shadow-md overflow-y-auto h-full">
            <template v-if="isScriptGenerating || isValidating">
              <div class="flex flex-col items-center justify-center h-full">
                <Icon name="ph:spinner" class="h-12 w-12 animate-spin text-primary mb-4" />
                <p class="text-center text-lg font-medium">
                  {{ isScriptGenerating ? 'Standardizing Script...' : 'Validating Script...' }}
                </p>
                <p class="text-center text-sm text-muted-foreground mt-2">
                  {{ isScriptGenerating ? 'Processing and saving script...' : 'Checking script format and content.' }}
                </p>
              </div>
            </template>
            <Textarea
              v-else-if="!playgroundStore.selectedPersonaIdForHighlighting"
              v-model="mainEditorContent"
              placeholder="Script will appear here after generation..."
              class="flex-1 w-full h-full resize-none min-h-[200px] rounded-lg border border-input bg-background p-4 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition placeholder:text-muted-foreground"
            />
            <div
              v-else
              class="flex-1 w-full h-full overflow-y-auto p-4 text-sm"
              v-html="highlightedScript"
            ></div>
          </Card>
        </div>
        <!-- 其他步骤内容保持原有逻辑 -->
        <VoicePerformanceSettings
          v-if="currentStepIndex === 2"
          v-model:scriptContent="playgroundStore.textToSynthesize"
          ref="voicePerformanceSettingsRef"
          :synth-progress="{
            synthesized: (voicePerformanceSettingsRef as any)?.synthesizedSegmentsCount,
            total: (voicePerformanceSettingsRef as any)?.totalSegmentsCount
          }"
          class="w-full overflow-y-auto p-2 md:p-4"
        />
        <div v-if="playgroundStore.audioUrl" class="p-4 border-t">
          <p class="font-medium text-sm mb-2">Audio Preview:</p>
          <audio :src="playgroundStore.audioUrl" controls class="w-full"></audio>
          <div v-if="podcastPerformanceConfig && playgroundStore.audioUrl" class="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
            <p class="font-medium text-sm text-foreground mb-1">Podcast Audio Details:</p>
            <p><strong>Type:</strong> {{ (podcastPerformanceConfig as any)?.provider || 'N/A' }}</p>
            <p><strong>Voices:</strong> {{ getAssignedVoicesString() }}</p>
          </div>
        </div>
      </CardContent>

      <!-- 按钮组：移动端100%宽，主按钮高亮 -->
      <CardFooter class="border-t p-3 flex flex-col md:flex-row justify-between items-center flex-shrink-0 bg-background gap-2 md:gap-4">
        <!-- 左侧按钮组 -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto">
          <Button
            v-if="currentStepIndex > 1"
            variant="outline"
            @click="handlePreviousStep"
            class="w-full md:w-auto"
          >
            <Icon name="ph:arrow-left" class="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="ghost"
            @click="resetPodcastView"
            class="w-full md:w-auto"
          >
            <Icon name="ph:arrow-counter-clockwise" class="w-4 h-4 mr-2" />
            Reset
          </Button>
          <template v-if="currentStepIndex === 1">
            <Button variant="outline" @click="handleUsePresetScript" :disabled="isGeneratingOverall" class="w-full md:w-auto">
              <Icon name="ph:book-open-text" class="w-4 h-4 mr-2" /> Use Preset Script
            </Button>
            <Button
              @click="handleToolbarGenerateScript"
              :disabled="isGeneratingOverall"
              :variant="playgroundStore.textToSynthesize ? 'outline' : 'default'"
              class="w-full md:w-auto"
            >
              <Icon v-if="isScriptGenerating" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="ph:robot" class="w-4 h-4 mr-2" />
              <span v-if="isScriptGenerating">Generating...</span>
              <span v-else>AI Script</span>
            </Button>
          </template>
        </div>
        <!-- 右侧主操作按钮组 -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto justify-end">
          <template v-if="currentStepIndex === 1">
            <Button
              variant="default"
              :disabled="!playgroundStore.textToSynthesize || isGeneratingOverall || isValidating"
              @click="handleProceedWithoutValidation"
              class="w-full md:w-auto"
            >
              Next <Icon name="ph:arrow-right" class="w-4 h-4 ml-2" />
            </Button>
          </template>
          <!-- 其他步骤按钮组保持原有逻辑 -->
          <template v-if="currentStepIndex === 2">
            <Button
              variant="outline"
              @click="generateAudioPreview"
              :disabled="!canProceedFromStep2 || isGeneratingAudioPreview"
            >
              <Icon v-if="isGeneratingAudioPreview" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="ph:broadcast" class="w-4 h-4 mr-2" />
              {{ isGeneratingAudioPreview ? 'Generating...' : 'Generate Audio Preview' }}
            </Button>

            <Button
              @click="handleNextFromStep2"
              :disabled="!canProceedFromStep2"
            >
              Proceed to Synthesis
              <Icon name="ph:arrow-right" class="w-4 h-4 ml-2" />
            </Button>
          </template>

          <!-- Step 3 Buttons -->
          <template v-if="currentStepIndex === 3">
            <Button
              v-if="playgroundStore.audioUrl"
              variant="outline"
              @click="handleDownloadCurrentAudio"
            >
              <Icon name="ph:download-simple" class="w-4 h-4 mr-2" />
              Download Audio
            </Button>

            <Button
              @click="handleToolbarSynthesizePodcastAudio"
              :disabled="isGeneratingOverall"
            >
              <Icon v-if="playgroundStore.isSynthesizing" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="ph:broadcast" class="w-4 h-4 mr-2" />
              Synthesize Podcast
            </Button>
          </template>
        </div>
      </CardFooter>
    </Card>

    <!-- Confirmation Dialog for Step 2 Proceed -->
    <AlertDialog :open="showStep2ProceedConfirmation" @update:open="(isOpen) => showStep2ProceedConfirmation = isOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          <AlertDialogDescription>
            There are still {{ pendingSegmentsCount }} segments that haven't been synthesized. Are you sure you want to proceed to generate the final podcast?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showStep2ProceedConfirmation = false">Cancel</AlertDialogCancel>
          <AlertDialogAction @click="confirmProceedToStep3">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import PodcastSettingsForm from '../components/playground/PodcastSettingsForm.vue';
import VoicePerformanceSettings from '../components/playground/VoicePerformanceSettings.vue';
// import { Loader2, ArrowRight, ArrowLeft, RadioTower, Download, RotateCcw, BookOpenText, CheckCircle, Sparkles } from 'lucide-vue-next'; // Removed Lucide imports

import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useScriptValidator } from '../composables/useScriptValidator';
import { usePlaygroundStore, type Persona } from '../stores/playground'; // Import Persona type

const playgroundStore = usePlaygroundStore();
const { isValidating, validateScript } = useScriptValidator();
const router = useRouter();
const route = useRoute();

const voicePerformanceSettingsRef = ref(null);
const currentStepIndex = ref(1); // Ensure default is step 1
const isScriptGenerating = ref(false);
const podcastPerformanceConfig = ref(null);
const lastPodcastUrlForDownload = ref(null);
const isGeneratingAudioPreview = ref(false);

// New refs for Step 2 confirmation dialog
const showStep2ProceedConfirmation = ref(false);
const pendingSegmentsCount = ref(0);

// Setup global event listeners to prevent page refreshes on audio file access
onMounted(() => {
  // Add global event listener to intercept audio and JSON links
  const preventDefaultForAudioLinks = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.href) {
      const href = link.href;

      // Check if link points to audio files or podcast segments
      if (
        (href.includes('/podcasts/') || href.includes('/segments/')) &&
        (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg') || href.endsWith('.json'))
      ) {
        console.log('Global interceptor: Audio/JSON link click:', href);
        event.preventDefault();
        event.stopPropagation();

        // If it's an audio file, play it instead of navigating
        if (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg')) {
          playAudioFile(href);
        } else if (href.endsWith('.json')) {
          // For JSON files, open in a new tab instead of navigating the main page
          window.open(href, '_blank');
        }
        return false;
      }
    }
    return true;
  };

  // Add global capture phase listener to catch all link clicks
  document.addEventListener('click', preventDefaultForAudioLinks, true);

  // Store reference to listener function for cleanup
  (window as any).__globalAudioLinkInterceptor = preventDefaultForAudioLinks;
});

// Helper function to play audio without page refresh
function playAudioFile(url: string) {
  // Create a new audio element
  const audio = new Audio(url);

  // Play the audio
  audio.play().catch(error => {
    console.error('Error playing audio:', error);
    toast.error('Error playing audio', { description: error instanceof Error ? error.message : 'Unknown error' });
  });
}
onMounted(async () => {
  await playgroundStore.fetchPersonas();
  currentStepIndex.value = 1; // Always start at step 1

  // Add global event listener to intercept audio and JSON links
  const preventDefaultForAudioLinks = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.href) {
      const href = link.href;
      console.log('Link clicked:', href);

      // Check if link points to audio files or podcast segments
      if (
        (href.includes('/podcasts/') || href.includes('/segments/')) &&
        (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg') || href.endsWith('.json'))
      ) {
        console.log('[Playground] Intercepting audio/json link click:', href);
        event.preventDefault();
        event.stopPropagation();

        // If it's an audio file, play it
        if (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg')) {
          handlePlayFileWithoutRedirect(href);
        } else if (href.endsWith('.json')) {
          // For JSON files, open in a new tab
          window.open(href, '_blank');
        }
        return false;
      }
    }
    return true;
  };

  // Add global capture phase listener to catch all link clicks
  document.addEventListener('click', preventDefaultForAudioLinks, true);

  // Store reference to listener function for cleanup
  (window as any).__playgroundAudioLinkInterceptor = preventDefaultForAudioLinks;

  // Initialize main editor content from store, in case it was updated by preset script or validation
  mainEditorContent.value = playgroundStore.textToSynthesize;

  // Check for query params to pre-fill or pre-validate
  if (route.query.script_id) {
    // TODO: Fetch script by script_id and populate the store
    console.log('Script ID from query:', route.query.script_id);
    // Example: await playgroundStore.loadScriptById(route.query.script_id);
    // Then potentially auto-validate or move to a specific step
  }

  // Reset state if needed, or load from local storage (if implemented in store)
  // playgroundStore.resetPlaygroundState(); // Call this if a full reset is desired on mount
  // playgroundStore.loadStateFromLocalStorage(); // If you implement this in the store
  console.log("Playground onMounted: Initialization complete.");
});

// Helper function to play audio files without navigating
function handlePlayFileWithoutRedirect(audioUrl: string) {
  if (!audioUrl) return;

  console.log('Playing audio without redirect:', audioUrl);
  const audio = new Audio(audioUrl);

  // Stop any currently playing audio first
  const allAudios = document.querySelectorAll('audio');
  allAudios.forEach(a => a.pause());

  // Play the new audio
  // audio.play().catch(error => {
  // console.error('Error playing audio:', error);
  // toast.error('Error playing audio', { description: error instanceof Error ? error.message : 'Unknown error' });;
  // });
}

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  // Remove our custom events
  if ((window as any).__playgroundAudioLinkInterceptor) {
    document.removeEventListener('click', (window as any).__playgroundAudioLinkInterceptor, true);
    delete (window as any).__playgroundAudioLinkInterceptor;
  }
});

// Handle previous step navigation
function handlePreviousStep() {
  if (currentStepIndex.value > 1) {
    currentStepIndex.value--;
  }
}

// Computed property to map personas for the form
const personasForForm = computed(() => {
  return playgroundStore.personas.map((p: any) => ({ // Explicitly type 'p' as any for now
    ...p,
    id: String(p.persona_id)
  }));
});

// Get current step title for card header
const getCurrentStepTitle = computed(() => {
  const step = podcastSteps.find(s => s.step === currentStepIndex.value);
  return step ? step.title : 'Podcast Creation';
});

// Computed property to generate highlighted script HTML
const highlightedScript = computed(() => {
  const script = playgroundStore.textToSynthesize;
  const selectedPersonaId = playgroundStore.selectedPersonaIdForHighlighting;

  if (!script || selectedPersonaId === null) {
    return script; // Return original script if no script or no persona selected
  }

  // Find the name of the selected persona
  const selectedPersona = playgroundStore.personas.find((p: any) => p.persona_id === selectedPersonaId); // Explicitly type 'p' as any
  const selectedPersonaName = selectedPersona?.name;

  if (!selectedPersonaName) {
    return script; // Return original script if selected persona name not found
  }

  const lines = script.split('\n');
  let highlightedHtml = '';

  lines.forEach(line => {
    // Simple check if the line starts with the persona's name followed by a colon
    if (line.trim().startsWith(`${selectedPersonaName}:`)) {
      highlightedHtml += `<p class="bg-yellow-200 dark:bg-yellow-800 p-1 rounded">${line}</p>`; // Apply highlight style
    } else {
      highlightedHtml += `<p>${line}</p>`; // Render non-highlighted line
    }
  });

  return highlightedHtml;
});

const podcastSteps = [
  { step: 1, title: 'Podcast Setup', description: 'Define your podcast and script.' },
  { step: 2, title: 'Voice Configuration', description: 'Assign voices and preview.' },
  { step: 3, title: 'Synthesize & Download', description: 'Generate and get your audio.' },
];

watch(() => playgroundStore.createPodcast, () => {
  if (currentStepIndex.value !== 2) {
    currentStepIndex.value = 1;
    playgroundStore.resetPlaygroundState();
    podcastPerformanceConfig.value = null;
  }
}, { immediate: true });

const mainEditorContent = computed({
  get: () => playgroundStore.textToSynthesize,
  set: (value: string) => {
    playgroundStore.textToSynthesize = value;
  }
});

const isGeneratingOverall = computed(() => {
  return playgroundStore.isGeneratingScript || playgroundStore.isSynthesizing || isScriptGenerating.value || isValidating.value || isGeneratingAudioPreview.value;
});

// Check if we can proceed from step 2
const canProceedFromStep2 = computed(() => {
  if (!voicePerformanceSettingsRef.value) return false;
  return (voicePerformanceSettingsRef.value as any).isFormValid;
});

// Get the string of assigned voices
function getAssignedVoicesString() {
  if (!podcastPerformanceConfig.value) return 'N/A';

  const config = podcastPerformanceConfig.value as any;
  if (!config.segments || !Array.isArray(config.segments)) return 'N/A';

  // Aggregate voice information: Role -> Voice Name
  const voiceMap = new Map<string, string>();

  config.segments.forEach((segment: any) => {
    if (segment.speakerTag && segment.voiceId) {
      const voiceName = config.availableVoices?.find((v: any) => v.id === segment.voiceId)?.name || segment.voiceId;
      voiceMap.set(segment.speakerTag, voiceName);
    }
  });

  if (voiceMap.size === 0) return 'N/A';

  // Format as "Role: Voice Name" list string
  return Array.from(voiceMap.entries())
    .map(([speaker, voice]) => `${speaker}: ${voice}`)
    .join(', ');
}

// Generate audio preview in step 2
// Generate and PERSIST all segments in step 2
async function generateAudioPreview() { // This function will now trigger persistent synthesis for all segments
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration incomplete. Please assign voices to all roles/speakers.");
    return;
  }
  if (!playgroundStore.podcastId) {
    toast.error("Podcast ID is missing. Cannot synthesize segments. Please ensure script is validated and saved (Step 1).");
    return;
  }

  const performanceConfig = (voicePerformanceSettingsRef.value as any).getPerformanceConfig();
  if (!performanceConfig || !performanceConfig.segments || performanceConfig.segments.length === 0) {
    toast.error("No segments configured for synthesis in Voice Performance Settings.");
    return;
  }

  // Prepare segments for the synthesizeAllSegmentsConcurrently action
  // The action expects segments from validationResult.structuredData.script,
  // so we need to ensure that validationResult is up-to-date with the current voice assignments
  // or adapt synthesizeAllSegmentsConcurrently to take segments directly.
  // For now, let's assume validationResult is the source of truth after voice assignment.

  // It's crucial that playgroundStore.validationResult.structuredData.script and .voiceMap
  // are correctly populated based on the UI selections in VoicePerformanceSettings.
  // If they are not, we need to update them first or pass the performanceConfig.segments directly.

  // Let's try to update validationResult based on current performanceConfig
  // This is a temporary workaround; ideally, VoicePerformanceSettings should update a shared reactive state.
  if (playgroundStore.validationResult && playgroundStore.validationResult.structuredData) {
    const newStructuredScript = performanceConfig.segments.map((s: any) => ({
      name: s.speakerTag,
      role: s.roleType,
      text: s.text,
    }));
    const newVoiceMap: Record<string, { personaId: number; voice_model_identifier: string }> = {};
    performanceConfig.segments.forEach((s: any) => {
      if (s.voiceId && s.personaId) {
        newVoiceMap[s.speakerTag] = {
          personaId: Number(s.personaId),
          voice_model_identifier: s.voiceId,
        };
      }
    });
    playgroundStore.validationResult.structuredData.script = newStructuredScript;
    playgroundStore.validationResult.structuredData.voiceMap = newVoiceMap;
    // podcastTitle and language should already be in validationResult from step 1
  } else {
    toast.error("Validation data is not available. Please complete Step 1 first.");
    return;
  }


  isGeneratingAudioPreview.value = true; // Reuse this flag for loading state
  try {
    console.log("[PlaygroundPage] Calling synthesizeAllSegmentsConcurrently for Step 2 'Generate Audio Preview'");
    await playgroundStore.synthesizeAllSegmentsConcurrently();
    // Toast messages are handled within the action
  } catch (error) {
    console.error("Error in generateAudioPreview calling synthesizeAllSegmentsConcurrently:", error);
    toast.error("Batch segment synthesis failed: " + (error instanceof Error ? error.message : "Unknown error"));
  } finally {
    isGeneratingAudioPreview.value = false;
  }
}

// New function to handle actual progression to Step 3
function confirmProceedToStep3() {
  if (!voicePerformanceSettingsRef.value) {
    toast.error("Internal error: Voice settings reference is unavailable.");
    showStep2ProceedConfirmation.value = false;
    return;
  }
  const vpsRef = voicePerformanceSettingsRef.value as any;
  const config = vpsRef.getPerformanceConfig();
  if (config) {
    podcastPerformanceConfig.value = config;
    currentStepIndex.value = 3;
    toast.success("Voice configuration saved. Proceeding to audio synthesis.");
  } else {
    toast.error("Voice configuration is invalid. Please ensure all characters have assigned voices.");
  }
  showStep2ProceedConfirmation.value = false; // Hide dialog
}

// Handle next from step 2
function handleNextFromStep2() {
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration is incomplete. Please assign voices to all characters.");
    return;
  }

  const vpsRef = voicePerformanceSettingsRef.value as any;
  // Ensure counts are numbers, default to 0 if undefined/null
  const synthesizedCount = (vpsRef.synthesizedSegmentsCount as number) || 0;
  const totalCount = (vpsRef.totalSegmentsCount as number) || 0;

  // Proceed directly if no segments or all are synthesized
  if (totalCount <= 0 || synthesizedCount >= totalCount) {
    confirmProceedToStep3();
  } else {
    // Show confirmation if there are pending segments
    pendingSegmentsCount.value = totalCount - synthesizedCount;
    showStep2ProceedConfirmation.value = true;
    // Actual progression will be handled by confirmProceedToStep3 via dialog action
  }
}

async function handleToolbarGenerateScript() {
  // Removed check for playgroundStore.canGeneratePodcastScript to allow generation even with empty fields
  console.log('[PlaygroundPage] Setting isScriptGenerating to true');
  isScriptGenerating.value = true;
  try {
    console.log('[PlaygroundPage] Calling playgroundStore.generateScript()');
    await playgroundStore.generateScript();
    console.log('[PlaygroundPage] playgroundStore.generateScript() finished');
    if (!playgroundStore.scriptGenerationError) {
      toast.success("Script generated successfully!");
    }
    // Note: scriptGenerationError is handled by a watcher in the store to show a toast
  } catch (error) {
    // This catch block might be redundant if errors are always handled within the store action
    // and reflected in playgroundStore.scriptGenerationError, but kept for safety.
    console.error("[PlaygroundPage] Error during handleToolbarGenerateScript:", error);
    toast.error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    console.log('[PlaygroundPage] Setting isScriptGenerating to false in finally block');
    isScriptGenerating.value = false;

    // Debug logs for Next button state
    console.log('[PlaygroundPage] Debug Next Button State:', {
      textToSynthesizeEmpty: !playgroundStore.textToSynthesize,
      textToSynthesizeLength: playgroundStore.textToSynthesize?.length, // Potential issue if playgroundStore.textToSynthesize is null/undefined
      isGeneratingOverall: isGeneratingOverall.value,
      isValidatingFromComposable: isValidating.value, // Direct check of the composable's ref
      store_isGeneratingScript: playgroundStore.isGeneratingScript,
      store_isSynthesizing: playgroundStore.isSynthesizing,
      local_isScriptGenerating: isScriptGenerating.value, // Should be false here
      local_isGeneratingAudioPreview: isGeneratingAudioPreview.value
    });
  }
}

async function onSynthesizeAudioForPodcast(payload: { useTimestamps: boolean, synthesisParams?: any, performanceConfig?: any }) {
  if (!podcastPerformanceConfig.value && !payload.performanceConfig) { // Check both direct ref and payload
    toast.error("Missing performance configuration.");
    return;
  }

  // If there is timestamp data, save it to the store
  if (payload.performanceConfig?.segments) {
    const timestamps = payload.performanceConfig.segments
      .filter((segment: any) => segment.timestamps && segment.timestamps.length > 0)
      .map((segment: any) => segment.timestamps)
      .flat();

    if (timestamps.length > 0) {
      playgroundStore.saveSegmentTimestamps(timestamps);
    }
  }

  // Call the synthesis method in the store
  await playgroundStore.synthesizeAllSegmentsConcurrently();

  if (!playgroundStore.synthesisError) {
    toast.success("Podcast audio synthesized successfully!");
  }
}

function handleToolbarSynthesizePodcastAudio() {
  // Directly call the new concurrent synthesis action.
  playgroundStore.synthesizeAllSegmentsConcurrently();
}

function handleDownloadCurrentAudio() {
  if (!playgroundStore.audioUrl) {
    toast.error('No audio available to download');
    return;
  }

  console.log('Starting download for:', playgroundStore.audioUrl);

  try {
    // Create an invisible iframe for downloading instead of using anchor
    // This approach avoids many browser redirect issues
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Create a form within the iframe to handle the download as POST
    const form = document.createElement('form');
    form.setAttribute('method', 'get');
    form.setAttribute('action', playgroundStore.audioUrl);

    // Add download attribute via input
    const downloadNameInput = document.createElement('input');
    downloadNameInput.setAttribute('type', 'hidden');
    downloadNameInput.setAttribute('name', 'download');
    downloadNameInput.setAttribute('value', playgroundStore.outputFilename || 'podcast_output.mp3');
    form.appendChild(downloadNameInput);

    // Add form to iframe and submit
    if (iframe.contentDocument?.body) {
      iframe.contentDocument.body.appendChild(form);

      // Submit the form to start download
      form.submit();
    } else {
      // Fallback if iframe document is not accessible
      console.warn('Iframe document not accessible, using alternative download method');
      downloadWithFetch(playgroundStore.audioUrl, playgroundStore.outputFilename || 'podcast_output.mp3');
    }

    // Remove iframe after a delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);

    toast.success('Download started', { description: 'Your audio file is being downloaded' });
  } catch (error) {
    console.error('Download error:', error);

    // Fallback method if iframe approach fails
    toast.info('Using alternative download method');
    downloadWithFetch(playgroundStore.audioUrl, playgroundStore.outputFilename || 'podcast_output.mp3');
  }
}

// Helper function to download file using fetch API
async function downloadWithFetch(url: string, filename: string) {
  try {
    // Use fetch to get the file as blob
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      redirect: 'follow', // Follow redirects
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    // Get the file as blob
    const blob = await response.blob();

    // Create object URL from blob
    const objectUrl = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';

    // Add to document, click, then remove
    document.body.appendChild(link);

    try {
      link.click();
    } catch (clickError) {
      console.error('Click method failed:', clickError);

      // If .click() fails, try dispatchEvent
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
      });
      link.dispatchEvent(clickEvent);
    }

    // Clean up
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(objectUrl); // Free memory
    }, 1000);

    toast.success('Download started', { description: `Downloading ${filename}` });
  } catch (error) {
    console.error('Fetch download error:', error);
    toast.error('Download failed', {
      description: 'Please try again or right-click the audio player and select "Save audio as..."'
    });
  }
}

function resetPodcastView() {
  playgroundStore.resetPlaygroundState();
  podcastPerformanceConfig.value = null;
  currentStepIndex.value = 1;
  toast.info("Ready to create a new podcast.");
}

function handleUsePresetScript() {
  playgroundStore.usePresetScript();
  toast.success("Preset script loaded. Please review the content.");
}

async function handleProceedWithoutValidation() {
  // Podcast settings validation
  const podcastSettings = playgroundStore.podcastSettings;

  if (!podcastSettings?.title) {
    toast.error('Please set the podcast title.');
    return;
  }

  if (!podcastSettings?.hostPersonaId) {
    toast.error('Please select a host.');
    return;
  }

  if (!playgroundStore.textToSynthesize) {
    toast.error('Script content is empty.');
    return;
  }

  // Get host information
  const hostPersona = playgroundStore.personas.find(
    (p: any) => p.persona_id === podcastSettings.hostPersonaId
  );

  if (!hostPersona) {
    toast.error('Selected host not found.');
    return;
  }

  // Parse script
  const scriptSegments = parseScriptToSegments(playgroundStore.textToSynthesize);

  if (scriptSegments.length === 0) {
    toast.error('Unable to parse script. Ensure format is "Role: Text Content".');
    return;
  }

  // --- Start Validation and API Call ---
  isScriptGenerating.value = true; // Use script generating state for overall process
  try {
    // 1. Validate script
    const validationResult = await playgroundStore.validateScript();

    if (!validationResult.success) {
      // Validation failed, show error and stop
      const errorMessage = validationResult.error || 'Script validation failed.';
      toast.error(`Validation failed: ${errorMessage}`);
      return; // Stop here
    }

    // Validation successful, proceed to API call
    toast.success('Script validated successfully. Saving to database...');

    // 2. Prepare data for API call
    const personasForApi = {
      hostPersona: hostPersona,
      guestPersonas: playgroundStore.podcastSettings.guestPersonaIds
        ?.map((id: string | number | undefined) => playgroundStore.personas.find((p: any) => p.persona_id === Number(id)))
        .filter((p: any): p is Persona => p !== undefined) // Filter out undefined and ensure type
        .map((p: any) => ({ // Map to the expected Persona interface for the API
          name: p.name,
          voice_model_identifier: p.voice_model_identifier,
        })),
    };

    const apiRequestBody = {
      podcastTitle: podcastSettings.title,
      script: scriptSegments,
      personas: personasForApi,
      hostPersonaId: Number(podcastSettings.hostPersonaId),
      language: podcastSettings.language || 'en', // Use language from settings or default to 'en'
      museumId: podcastSettings.museumId ?? undefined,
      galleryId: podcastSettings.galleryId ?? undefined,
      objectId: podcastSettings.objectId ?? undefined,
    };

    // 3. Call the API to process and save the script
    const response = await fetch('/api/podcast/process/script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.statusMessage || 'Failed to save script to database.');
    }

    const apiResult = await response.json();

    if (apiResult.success) {
      // Save podcastId to store
      if (apiResult.podcastId) {
        playgroundStore.podcastId = apiResult.podcastId;
      }
      // API call successful, proceed to the next step
      toast.success('Script saved to database successfully. Proceeding to voice assignment.');
      currentStepIndex.value++;
    } else {
      // API call failed (even if response.ok was true, if the API returned success: false)
      throw new Error(apiResult.message || 'Failed to save script to database.');
    }

  } catch (error) {
    console.error('Process script failed:', error);
    toast.error(`Failed to process and save script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    isScriptGenerating.value = false; // Reset loading state
  }
  // --- End Validation and API Call ---
}

async function handleJustValidateScript() {
  // Use the store's validateScript method directly to ensure data is saved to the store
  const result = await playgroundStore.validateScript();

  if (result.success) {
    // Validation successful
    toast.success('Script validated successfully.');

    // Log validation result but don't take any automatic actions on it
    if (playgroundStore.validationResult?.structuredData) {
      console.log('Validation successful with structured data');
    }
  } else {
    // Show error information
    const errorMessage = result.error || 'Unknown validation error';
    toast.error(`Script validation failed: ${errorMessage}`);
  }
}

// Improved script parsing function for multi-language scripts
function parseScriptToSegments(content: string) {
  if (!content) return [];

  return content
    .split('\n')
    .map(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) return null; // Invalid line

      const speaker = line.substring(0, colonIndex).trim();
      const text = line.substring(colonIndex + 1).trim();

      return { speaker, text };
    })
    .filter(segment => segment && segment.speaker && segment.text) as Array<{speaker: string, text: string}>;
}

function handlePlayCurrentAudio() {
  if (!playgroundStore.audioUrl) {
    toast.error('No audio available to play');
    return;
  }

  // Use browser's built-in audio player
  const audio = new Audio(playgroundStore.audioUrl);
  audio.play().catch(error => {
    toast.error('Playback failed: ' + error.message);
  });
}

// Load script from file or use default
const initializeScript = async () => {
  isScriptGenerating.value = true;
  try {
    // You could load script from API or state here
    // For now, just use a simple default script if empty
    if (!playgroundStore.textToSynthesize) {
      playgroundStore.textToSynthesize = `Host: Hello, welcome to the preset test environment for step 2.`;
      toast.success("Default script loaded. Please review the content.");
    }
    validateScript();
  } catch (err) {
    console.error('Error initializing script:', err);
    toast.error(`Failed to initialize script: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    isScriptGenerating.value = false;
  }
};

// Update final audio URL
function updateFinalAudioUrl(url: string) {
  playgroundStore.audioUrl = url;
}
</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style>