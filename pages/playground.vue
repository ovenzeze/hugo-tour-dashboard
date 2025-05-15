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
      <CardHeader v-if="currentStepIndex !== 1" class="border-b flex-shrink-0 py-3">
        <div class="flex items-center justify-between">
          <CardTitle v-if="currentStepIndex !== 2">{{ getCurrentStepTitle }}</CardTitle>
          
          <div v-if="currentStepIndex !== 2" class="flex-1"></div> 

          <div v-if="currentStepIndex === 2 && voicePerformanceSettingsRef && (voicePerformanceSettingsRef as any).ttsProvider" 
               class="flex items-center space-x-4 pl-0 flex-1 w-full">
            <div class="flex-shrink-0 w-1/3">
              <Select :model-value="(voicePerformanceSettingsRef as any).ttsProvider.value" 
                      @update:model-value="(newValue) => { if (voicePerformanceSettingsRef && (voicePerformanceSettingsRef as any).onProviderChange && typeof newValue === 'string') { (voicePerformanceSettingsRef as any).onProviderChange(newValue); } else if (voicePerformanceSettingsRef && (voicePerformanceSettingsRef as any).onProviderChange && newValue === null) { /* Optionally handle null, e.g., pass an empty string or a specific signal if the composable expects it, or do nothing if it should only react to strings */ } }" >
                <SelectTrigger id="headerTtsProvider" class="w-full">
                  <SelectValue placeholder="Select TTS Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="azure">Azure TTS</SelectItem>
                    <SelectItem value="openai_tts">OpenAI TTS</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div class="flex-1 flex items-center space-x-4">
              <div class="flex items-center gap-2 flex-1">
                <Label class="whitespace-nowrap text-sm">Temp: {{ playgroundStore.synthesisParams.temperature.toFixed(1) }}</Label>
                <Slider
                  class="flex-1"
                  :model-value="playgroundStore.synthesisParams.temperatureArray"
                  @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ temperature: value[0] }) }"
                  :min="0"
                  :max="1"
                  :step="0.1"
                />
              </div>
              
              <div class="flex items-center gap-2 flex-1">
                <Label class="whitespace-nowrap text-sm">Speed: {{ playgroundStore.synthesisParams.speed.toFixed(1) }}x</Label>
                <Slider
                  class="flex-1"
                  :model-value="playgroundStore.synthesisParams.speedArray"
                  @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ speed: value[0] }) }"
                  :min="0.5"
                  :max="2"
                  :step="0.1"
                />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <!-- Card Content: Main Area with Left-Right Layout - Scrollable Area -->
      <CardContent class="flex-1 p-0 flex flex-col md:flex-row min-h-0 overflow-auto">
        <!-- Left Panel: Settings for Current Step -->
        <div v-if="currentStepIndex !== 2" class="flex flex-col min-h-0 overflow-y-auto p-4 md:w-1/3 md:border-r md:border-b-0 min-w-[360px]">
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
            <Icon name="ph:loader" class="h-12 w-12 animate-spin text-primary mb-4" />
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
      <CardFooter class="border-t p-3 flex justify-between items-center flex-shrink-0 bg-background">
        <!-- Left-aligned buttons (Back, Reset, and Step 1 Utilities) -->
        <div class="flex items-center gap-2">
          <Button
            v-if="currentStepIndex > 1"
            variant="outline"
            @click="handlePreviousStep"
          >
            <Icon name="ph:arrow-left" class="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="ghost"
            @click="resetPodcastView"
          >
            <Icon name="ph:arrow-counter-clockwise" class="w-4 h-4 mr-2" />
            Reset
          </Button>

          <!-- Step 1 Utility Buttons - Now part of the left group -->
          <template v-if="currentStepIndex === 1">
            <Button variant="outline" @click="handleUsePresetScript" :disabled="isGeneratingOverall">
              <Icon name="ph:book-open-text" class="w-4 h-4 mr-2" /> Use Preset Script
            </Button>
            <Button variant="outline" :disabled="isGeneratingOverall || !playgroundStore.textToSynthesize" @click="handleJustValidateScript">
              <Icon name="ph:loader" v-if="isValidating" class="w-4 h-4 mr-2 animate-spin" />
              <Icon name="ph:check-circle" v-else class="w-4 h-4 mr-2" />
              <span v-if="isValidating">Validating...</span>
              <span v-else>Validate Script</span>
            </Button>
          </template>
        </div>

        <!-- Right-aligned buttons (Action Buttons for each step) -->
        <div class="flex items-center gap-2">
          <!-- Step 1 Main Action Buttons -->
          <template v-if="currentStepIndex === 1">
            <Button
              @click="handleToolbarGenerateScript"
              :disabled="isGeneratingOverall || !playgroundStore.canGeneratePodcastScript"
              :variant="playgroundStore.textToSynthesize ? 'outline' : 'default'"
            >
              <Icon name="ph:loader" v-if="isScriptGenerating" class="w-4 h-4 mr-2 animate-spin" />
              <Icon name="ph:sparkle" v-else class="w-4 h-4 mr-2" />
              <span v-if="isScriptGenerating">Generating...</span>
              <span v-else>Generate Script</span>
            </Button>
            <Button
              variant="default"
              :disabled="!playgroundStore.textToSynthesize || isGeneratingOverall || isValidating"
              @click="handleProceedWithoutValidation"
            >
              Next <Icon name="ph:arrow-right" class="w-4 h-4 ml-2" />
            </Button>
          </template>

          <!-- Step 2 Buttons -->
          <template v-if="currentStepIndex === 2">
            <Button 
              variant="outline"
              @click="generateAudioPreview"
              :disabled="!canProceedFromStep2 || isGeneratingAudioPreview"
            >
              <Icon name="ph:loader" v-if="isGeneratingAudioPreview" class="w-4 h-4 mr-2 animate-spin" />
              <Icon name="ph:radio-tower" v-else class="w-4 h-4 mr-2" />
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
              <Icon name="ph:loader" v-if="playgroundStore.isSynthesizing" class="w-4 h-4 mr-2 animate-spin" />
              <Icon name="ph:radio-tower" v-else class="w-4 h-4 mr-2" />
              Synthesize Podcast
            </Button>
          </template>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import PodcastSettingsForm from '../components/playground/PodcastSettingsForm.vue';
import VoicePerformanceSettings from '../components/playground/VoicePerformanceSettings.vue';
import AudioSynthesis from '../components/playground/AudioSynthesis.vue';
// import { Loader2, ArrowRight, ArrowLeft, RadioTower, Download, RotateCcw, BookOpenText, CheckCircle, Sparkles } from 'lucide-vue-next'; // Removed Lucide imports

import { toast } from 'vue-sonner';
import { usePlaygroundStore, type Persona } from '../stores/playground'; // Import Persona type
import { useScriptValidator } from '../composables/useScriptValidator';
import { useRouter, useRoute } from 'vue-router';

const playgroundStore = usePlaygroundStore();
const { isValidating, validateScript } = useScriptValidator();
const router = useRouter();
const route = useRoute();

const voicePerformanceSettingsRef = ref(null);
const currentStepIndex = ref(1);
const isScriptGenerating = ref(false);
const podcastPerformanceConfig = ref(null);
const lastPodcastUrlForDownload = ref(null);
const isGeneratingAudioPreview = ref(false);

// Setup global event listeners to prevent page refreshes on audio file access
onMounted(async () => {
  await playgroundStore.fetchPersonas();
  currentStepIndex.value = 2;
  
  // Add event listener to prevent audio links from refreshing page
  document.addEventListener('click', preventAudioRefresh, true);
  
  // Also add event listener for a elements that might be created dynamically
  window.addEventListener('DOMContentLoaded', () => {
    interceptDownloadLinks();
  });
  
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

// Clean up event listeners when component is unmounted
onUnmounted(() => {
  document.removeEventListener('click', preventAudioRefresh, true);
});

// Function to prevent audio links from causing page refresh
function preventAudioRefresh(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const link = target.closest('a');
  
  if (link && link.href) {
    // Check if link points to audio files or podcast segments
    if (
      link.href.includes('/podcasts/') ||
      link.href.includes('/segments/') ||
      link.href.includes('.mp3') ||
      link.href.includes('.wav') ||
      link.href.includes('.ogg')
    ) {
      console.log('拦截到音频链接:', link.href);
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

// Function to intercept dynamically created download links
function interceptDownloadLinks() {
  // Find all link elements that might be for audio downloads
  const links = document.querySelectorAll('a[href*="/podcasts/"], a[href*="/segments/"], a[href*=".mp3"]');
  
  links.forEach(link => {
    if (!link.hasAttribute('data-intercepted')) {
      link.setAttribute('data-intercepted', 'true');
      link.addEventListener('click', function(e: Event) { // Changed to Event type
        e.preventDefault();
        e.stopPropagation();
        if (link instanceof HTMLAnchorElement) { // Type guard
          console.log('Intercepted download link click:', link.href);
        }
      });
    }
  });
}

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
async function generateAudioPreview() {
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration is incomplete. Please assign voices to all characters.");
    return;
  }
  
  isGeneratingAudioPreview.value = true;
  try {
    // 创建并设置一个阻止默认操作的事件处理器
    const preventDefaultHandler = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };
    
    // 在生成音频前，临时阻止所有a标签的默认行为
    document.addEventListener('click', preventDefaultHandler, true);

    // 延迟一小段时间以确保事件处理器已经添加
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 调用VoicePerformanceSettings组件的generateAudio方法
    const result = await (voicePerformanceSettingsRef.value as any).generateAudio();
    
    // 移除事件处理器
    document.removeEventListener('click', preventDefaultHandler, true);
    
    if (result && result.success) {
      toast.success("音频生成成功！点击播放按钮可以预览。");
    } else {
      toast.warning("音频生成不成功，请检查语音配置。");
    }
  } catch (error) {
    console.error("生成音频预览失败:", error);
    toast.error("生成音频预览失败：" + (error instanceof Error ? error.message : "未知错误"));
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
  link.className = 'temp-download-link';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // 设置延时移除下载链接，避免页面刷新
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 100);
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

// Load script from file or use default
const initializeScript = async () => {
  isScriptGenerating.value = true;
  try {
    // You could load script from API or state here
    // For now, just use a simple default script if empty
    if (!playgroundStore.textToSynthesize) {
      playgroundStore.textToSynthesize = `Host: 您好，欢迎来到预设的第二步测试环境。`;
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
</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style> 