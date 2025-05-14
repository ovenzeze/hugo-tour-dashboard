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
      <CardHeader class="border-b flex-shrink-0 py-3">
        <CardTitle>{{ getCurrentStepTitle }}</CardTitle>
      </CardHeader>

      <!-- Card Content: Main Area with Left-Right Layout - Scrollable Area -->
      <CardContent class="flex-1 p-0 flex flex-col md:flex-row min-h-0 overflow-auto">
        <!-- Left Panel: Settings for Current Step -->
        <div v-if="currentStepIndex !== 2" class="flex flex-col min-h-0 overflow-y-auto p-4 md:w-1/3 md:border-r">
          <!-- Podcast Creation Steps Content -->
          <PodcastSettingsForm
            v-if="currentStepIndex === 1"
            v-model="playgroundStore.podcastSettings"
            :personas="personasForForm"
            :personas-loading="playgroundStore.personasLoading"
          />
          
          <!-- Step 2 has been moved to take the full width -->
          
          <AudioSynthesis
            v-if="currentStepIndex === 3"
            :performanceConfig="podcastPerformanceConfig === null ? undefined : podcastPerformanceConfig"
            :audio-url="playgroundStore.audioUrl === null ? undefined : playgroundStore.audioUrl"
            :is-synthesizing="playgroundStore.isSynthesizing"
            @synthesize="onSynthesizeAudioForPodcast"
            @download="handleDownloadCurrentAudio"
            :modelValue="playgroundStore.audioUrl || undefined"
            :scriptContent="playgroundStore.textToSynthesize"
            :synthesisParams="playgroundStore.synthesisParams"
            :isLoading="playgroundStore.isSynthesizing"
            @update:outputFilename="playgroundStore.updateOutputFilename"
          />
        </div>

        <!-- Right Panel: Editor & Output -->
        <div class="flex-1 flex flex-col min-h-0 overflow-hidden" :class="{'w-full': currentStepIndex === 2}">
          <!-- Loading Status Indicator -->
          <div v-if="isScriptGenerating || isValidating" class="flex flex-col items-center justify-center h-full p-4">
            <Loader2 class="h-12 w-12 animate-spin text-primary mb-4" />
            <p class="text-center text-lg font-medium">
              {{ isScriptGenerating ? 'Generating Script...' : 'Validating Script...' }}
            </p>
            <p class="text-center text-sm text-muted-foreground mt-2">
              {{ isScriptGenerating ? 'This may take a moment, please wait.' : 'Checking script format and content.' }}
            </p>
          </div>
          
          <!-- Textarea for editing when no persona is selected for highlighting in Step 1 -->
          <Textarea
            v-else-if="currentStepIndex === 1 && !playgroundStore.selectedPersonaIdForHighlighting"
            v-model="mainEditorContent"
            placeholder="Script will appear here after generation..."
            class="flex-1 w-full h-full resize-none min-h-[200px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-4"
          />

          <!-- Display area for highlighted script when a persona is selected in Step 1 -->
          <div
            v-else-if="currentStepIndex === 1 && playgroundStore.selectedPersonaIdForHighlighting"
            class="flex-1 w-full h-full overflow-y-auto p-4 text-sm"
            v-html="highlightedScript"
          ></div>
          
          <!-- Voice Performance Settings takes the full space in Step 2 -->
          <VoicePerformanceSettings
            v-else-if="currentStepIndex === 2"
            v-model:scriptContent="playgroundStore.textToSynthesize"
            @next="onPerformanceSettingsNextForPodcast"
            ref="voicePerformanceSettingsRef"
            class="w-full overflow-y-auto p-4"
          />
          
          <!-- Audio Preview Section (conditionally shown) -->
          <div v-if="playgroundStore.audioUrl" class="p-4 border-t">
            <p class="font-medium text-sm mb-2">Audio Preview:</p>
            <audio :src="playgroundStore.audioUrl" controls class="w-full"></audio>
            
            <div v-if="podcastPerformanceConfig && playgroundStore.audioUrl" class="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
              <p class="font-medium text-sm text-foreground mb-1">Podcast Audio Details:</p>
              <p><strong>Type:</strong> {{ (podcastPerformanceConfig as any)?.provider || 'N/A' }}</p>
              <p><strong>Voices:</strong> {{ getAssignedVoicesString() }}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <!-- Card Footer with Action Buttons - Fixed at the bottom -->
      <CardFooter class="border-t p-3 flex justify-between flex-shrink-0 bg-background">
        <!-- Left-aligned buttons (Back, Reset) -->
        <div class="flex items-center gap-2">
          <Button 
            v-if="currentStepIndex > 1" 
            variant="outline" 
            @click="handlePreviousStep"
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            variant="ghost" 
            @click="resetPodcastView"
          >
            <RotateCcw class="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
        
        <!-- Right-aligned buttons (Action Buttons) -->
        <div class="flex items-center gap-2">
          <!-- Step 1 Buttons -->
          <template v-if="currentStepIndex === 1">
            <Button 
              variant="outline"
              @click="handleUsePresetScript" 
              :disabled="isGeneratingOverall"
            >
              <BookOpenText class="w-4 h-4 mr-2" />
              Use Preset Script
            </Button>
            
            <Button 
              variant="outline"
              :disabled="isGeneratingOverall || !playgroundStore.textToSynthesize"
              @click="handleJustValidateScript"
            >
              <Loader2 v-if="isValidating" class="w-4 h-4 mr-2 animate-spin" />
              <CheckCircle v-else class="w-4 h-4 mr-2" />
              <span v-if="isValidating">Validating...</span>
              <span v-else>Validate Script</span>
            </Button>
            
            <Button 
              @click="handleToolbarGenerateScript" 
              :disabled="isGeneratingOverall || !playgroundStore.canGeneratePodcastScript"
            >
              <Loader2 v-if="isScriptGenerating" class="w-4 h-4 mr-2 animate-spin" />
              <Sparkles v-else class="w-4 h-4 mr-2" />
              <span v-if="isScriptGenerating">Generating...</span>
              <span v-else>Generate Script</span>
            </Button>
            
            <Button 
              variant="default"
              :disabled="!playgroundStore.textToSynthesize || isGeneratingOverall || isValidating"
              @click="handleProceedWithoutValidation"
            >
              Next
              <ArrowRight class="w-4 h-4 ml-2" />
            </Button>
          </template>
          
          <!-- Step 2 Buttons -->
          <template v-if="currentStepIndex === 2">
            <Button 
              variant="outline"
              @click="generateAudioPreview"
              :disabled="!canProceedFromStep2 || isGeneratingAudioPreview"
            >
              <Loader2 v-if="isGeneratingAudioPreview" class="w-4 h-4 mr-2 animate-spin" />
              <RadioTower v-else class="w-4 h-4 mr-2" />
              {{ isGeneratingAudioPreview ? 'Generating...' : 'Generate Audio Preview' }}
            </Button>
            
            <Button 
              @click="handleNextFromStep2" 
              :disabled="!canProceedFromStep2"
            >
              Proceed to Synthesis
              <ArrowRight class="w-4 h-4 ml-2" />
            </Button>
          </template>
          
          <!-- Step 3 Buttons -->
          <template v-if="currentStepIndex === 3">
            <Button
              v-if="playgroundStore.audioUrl"
              variant="outline" 
              @click="handleDownloadCurrentAudio"
            >
              <Download class="w-4 h-4 mr-2" />
              Download Audio
            </Button>
            
            <Button 
              @click="handleToolbarSynthesizePodcastAudio" 
              :disabled="isGeneratingOverall" 
            >
              <Loader2 v-if="playgroundStore.isSynthesizing" class="w-4 h-4 mr-2 animate-spin" />
              <RadioTower v-else class="w-4 h-4 mr-2" />
              Synthesize Podcast
            </Button>
          </template>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import PodcastSettingsForm from '../components/playground/PodcastSettingsForm.vue';
import VoicePerformanceSettings from '../components/playground/VoicePerformanceSettings.vue';
import AudioSynthesis from '../components/playground/AudioSynthesis.vue';
import { Loader2, ArrowRight, ArrowLeft, RadioTower, Download, RotateCcw, BookOpenText, CheckCircle, Sparkles } from 'lucide-vue-next';

import { toast } from 'vue-sonner';
import { usePlaygroundStore, type Persona } from '../stores/playground'; // Import Persona type
import { useScriptValidator } from '../composables/useScriptValidator';

const playgroundStore = usePlaygroundStore();
const { isValidating, validateScript } = useScriptValidator();

const voicePerformanceSettingsRef = ref(null);
const isGeneratingAudioPreview = ref(false);

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

const currentStepIndex = ref(2);
const podcastPerformanceConfig = ref<object | null>(null);
const isScriptGenerating = ref(false);

const podcastSteps = [
  { step: 1, title: 'Script Generation', description: 'Select roles and script settings' },
  { step: 2, title: 'Voice Configuration', description: 'Configure voices, roles, and styles' },
  { step: 3, title: 'Audio Synthesis', description: 'Synthesize and download audio' },
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

onMounted(async () => {
  await playgroundStore.fetchPersonas();
  currentStepIndex.value = 2;
});

// Handle previous step navigation
function handlePreviousStep() {
  if (currentStepIndex.value > 1) {
    currentStepIndex.value--;
  }
}

// Generate audio preview in step 2
async function generateAudioPreview() {
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration is incomplete. Please assign voices to all characters.");
    return;
  }
  
  isGeneratingAudioPreview.value = true;
  try {
    // Call the generateAudio method from the VoicePerformanceSettings component
    const result = await (voicePerformanceSettingsRef.value as any).generateAudio();
    if (result) {
      toast.success("Audio preview generated successfully!");
    } else {
      toast.warning("Audio preview generation was not successful. Please check voice assignments.");
    }
  } catch (error) {
    console.error("Failed to generate audio preview:", error);
    toast.error("Failed to generate audio preview: " + (error instanceof Error ? error.message : "Unknown error"));
  } finally {
    isGeneratingAudioPreview.value = false;
  }
}

// Handle next from step 2
function handleNextFromStep2() {
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration is incomplete. Please assign voices to all characters.");
    return;
  }
  
  const config = (voicePerformanceSettingsRef.value as any).getPerformanceConfig();
  if (config) {
    podcastPerformanceConfig.value = config;
    currentStepIndex.value = 3;
    toast.success("Voice configuration saved. Proceeding to audio synthesis.");
  } else {
    toast.error("Voice configuration is invalid. Please ensure all characters have assigned voices.");
  }
}

async function handleToolbarGenerateScript() {
  if (!playgroundStore.canGeneratePodcastScript) {
    toast.warning("Please complete all podcast settings before generating the script.");
    return;
  }
  
  isScriptGenerating.value = true;
  try {
    await playgroundStore.generateScript();
    if (!playgroundStore.scriptGenerationError) {
      toast.success("Script generated successfully!");
    }
  } finally {
    isScriptGenerating.value = false;
  }
}

function onPerformanceSettingsNextForPodcast(config: object) {
  podcastPerformanceConfig.value = config;
  currentStepIndex.value = 3;
}

async function onSynthesizeAudioForPodcast(payload: { useTimestamps: boolean, synthesisParams?: any, performanceConfig?: any }) {
  if (!podcastPerformanceConfig.value) {
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
  
  // Call the synthesis method in the store, passing the useTimestamps parameter
  await playgroundStore.synthesizePodcastAudio({
    useTimestamps: payload.useTimestamps
  });

  if (!playgroundStore.synthesisError) {
    toast.success("Podcast audio synthesized successfully!");
  }
}

function handleToolbarSynthesizePodcastAudio() {
  onSynthesizeAudioForPodcast({
    useTimestamps: true,
    synthesisParams: playgroundStore.synthesisParams,
    performanceConfig: podcastPerformanceConfig.value
  });
}

function handleDownloadCurrentAudio() {
  if (!playgroundStore.audioUrl) return;

  const link = document.createElement('a');
  link.href = playgroundStore.audioUrl;
  link.download = playgroundStore.outputFilename || 'podcast_output.mp3';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    toast.error('没有可播放的音频');
    return;
  }
  
  // 直接使用浏览器内置音频播放
  const audio = new Audio(playgroundStore.audioUrl);
  audio.play().catch(error => {
    toast.error('播放失败: ' + error.message);
  });
}
</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style> 