<template>
  <div class="min-h-screen">
    <div class="max-w-6xl mx-auto px-4">
      <div class="mb-8">

      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        <!-- Left Column: Settings -->
        <div class="space-y-6 bg-background p-6 rounded-lg shadow-md h-fit border lg:col-span-1">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-3 mb-4">Settings</h2>
          <div>
            <Select v-model="selectedProvider">
              <SelectTrigger id="provider" class="mt-1 w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent class="">
                <SelectItem v-for="provider in providers" :key="provider.id" :value="provider.id" class="dark:hover:bg-gray-700">
                  {{ provider.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label for="persona" class="text-gray-700 dark:text-gray-300">Persona</Label>
            <Select v-model="selectedPersonaId" :disabled="!selectedProvider || personasLoading || personas.length === 0">
              <SelectTrigger id="persona" class="mt-1 w-full">
                <SelectValue placeholder="Select a persona" />
              </SelectTrigger>
              <SelectContent>
                <p v-if="personasLoading" class="p-2 text-sm text-gray-500 dark:text-gray-400">Loading personas...</p>
                <SelectItem v-else v-for="persona in personas" :key="persona.persona_id" :value="String(persona.persona_id)"  class="dark:hover:bg-gray-700">
                  {{ persona.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
              <h3 class="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">Parameters</h3>
              <div class="space-y-3">
                  <div class="space-y-1">
                      <div class="flex justify-between text-sm">
                          <Label for="temperature" class="text-gray-700 dark:text-gray-300">Temperature</Label>
                          <span class="text-gray-700 dark:text-gray-300">{{ synthesisParams.temperature.toFixed(2) }}</span>
                      </div>
                      <Slider id="temperature" :min="0" :max="1" :step="0.01" v-model="synthesisParams.temperatureArray" class="dark:[&>span:first-child]:bg-primary [&>span:first-child_span]:bg-primary" />
                  </div>
                   <div class="space-y-1">
                      <div class="flex justify-between text-sm">
                          <Label for="speed" class="text-gray-700 dark:text-gray-300">Speed</Label>
                          <span class="text-gray-700 dark:text-gray-300">{{ synthesisParams.speed.toFixed(2) }}x</span>
                      </div>
                      <Slider id="speed" :min="0.5" :max="2" :step="0.05" v-model="synthesisParams.speedArray" class="dark:[&>span:first-child]:bg-primary [&>span:first-child_span]:bg-primary" />
                  </div>
              </div>
          </div>

          <div>
            <Label for="output-filename" class="text-gray-700 dark:text-gray-300">Output Filename (Optional)</Label>
            <Input id="output-filename" v-model="outputFilename" placeholder="e.g., intro_audio.mp3" class="mt-1" />
          </div>
        </div> 

        <!-- Right Column: Text Input & Output -->
        <div class="h-full lg:col-span-2 p-0 rounded-lg shadow-md flex flex-col space-y-6">
          <!-- Toolbar for buttons and audio player -->
          <PlaygroundToolbar
            ref="toolbarRef"
            :is-generating-script="isGeneratingScript"
            :is-synthesizing="isSynthesizing"
            :can-preview-or-synthesize="!!(textToSynthesize && selectedPersonaId)"
            :audio-url="audioUrl"
            :is-playing="isPlaying"
            @generate-script="handleGenerateLouvreScript"
            @preview-audio="handleRealtimePreview"
            @synthesize-audio="handleSynthesize"
            @toggle-play="togglePlayPause"
            @download-audio="downloadAudio"
            @reset-content="handleReset"
            @audio-ended="() => { isPlaying = false; }"
            @audio-played="() => { isPlaying = true; }"
            @audio-paused="() => { isPlaying = false; }"
          />

          <!-- Text Input Section - this should grow -->
          <div class="flex-1 flex flex-col flex-grow space-y-2">
            <p v-if="scriptGenerationError" class="text-sm text-red-500 dark:text-red-400 mt-1">{{ scriptGenerationError }}</p>
            <p v-if="synthesisError" class="text-sm text-red-500 dark:text-red-400 mt-1">{{ synthesisError }}</p>
            <Textarea
              id="text-to-synthesize"
              v-model="textToSynthesize"
              placeholder="Write something to synthesize or generate a script using the AI button above..."
              class="flex-grow"
            />
          </div>
        </div>

      </div> <!-- grid 结束 -->
    </div> <!-- max-w-6xl 结束 -->
  </div> <!-- min-h-screen 结束 -->

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PlaygroundToolbar from '~/components/PlaygroundToolbar.vue';

interface VoiceProvider {
  id: string;
  name: string;
}

interface Persona {
  persona_id: number;
  name: string;
  avatar_url?: string | null;
  description?: string | null;
  system_prompt?: string | null;
  is_active?: boolean;
}

const synthesisParams = reactive({
  temperature: 0.5,
  speed: 1.0,
  get temperatureArray() { return [this.temperature]; },
  set temperatureArray(val: number[]) { this.temperature = val[0]; },
  get speedArray() { return [this.speed]; },
  set speedArray(val: number[]) { this.speed = val[0]; },
});

const textToSynthesize = ref('');
const selectedProvider = ref<string | undefined>('elevenlabs');
const selectedPersonaId = ref<string | undefined>(undefined);
const outputFilename = ref('');

const audioUrl = ref<string | null>(null);
const toolbarRef = ref<InstanceType<typeof PlaygroundToolbar> | null>(null);
const isPlaying = ref(false);

const isSynthesizing = ref(false);
const synthesisError = ref<string | null>(null);

const isGeneratingScript = ref(false);
const scriptGenerationError = ref<string | null>(null);

const providers = ref<VoiceProvider[]>([
  { id: 'elevenlabs', name: 'ElevenLabs' },
]);

const personas = ref<Persona[]>([]);
const personasLoading = ref(false);

async function fetchPersonas() {
  personasLoading.value = true;
  try {
    const data = await $fetch<Persona[]>('/api/personas'); 
    personas.value = data.filter(p => p.is_active);
    if (personas.value.length === 0) {
        toast.info('No active personas found. Please create or activate a persona first.');
    }
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    toast.error('Failed to load personas.');
  }
  personasLoading.value = false;
}

onMounted(async () => {
  await fetchPersonas();
});

onUnmounted(() => {
  if (typeof audioUrl.value === 'string' && audioUrl.value.startsWith('blob:')) {
    toolbarRef.value?.pause();
    URL.revokeObjectURL(audioUrl.value);
  }
});

async function handleGenerateLouvreScript() {
  if (!selectedPersonaId.value) {
    toast.warning('Please select a Persona first to generate a script tailored to their style.');
    return;
  }
  isGeneratingScript.value = true;
  scriptGenerationError.value = null;
  textToSynthesize.value = ''; // Clear existing text before generating new one

  try {
    const response = await $fetch<{ script: string }>('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, 
      body: {
        persona_id: selectedPersonaId.value,
        prompt: "Generate a natural-sounding dialogue script, about 200-250 words, between two people, Alex (an art enthusiast) and Ben (a curious first-time visitor), as they walk through the Louvre Museum. They should discuss at least two to three famous artworks (e.g., Mona Lisa, Venus de Milo, Winged Victory of Samothrace), expressing their thoughts and some interesting facts. The dialogue should be engaging and suitable for text-to-speech synthesis. Format the script with character names followed by their lines, for example: ALEX: (line) BEN: (line)."
      }
    } as any);

    textToSynthesize.value = response.script;
    toast.success('Louvre dialogue script generated successfully!');
  } catch (error: any) {
    console.error('Failed to generate script:', error);
    const message = error.data?.message || error.data?.statusMessage || error.message || 'Failed to generate script.';
    scriptGenerationError.value = message;
    toast.error(message);
  } finally {
    isGeneratingScript.value = false;
  }
}

async function handleSynthesize() {
  if (!textToSynthesize.value || !selectedPersonaId.value) {
    toast.warning('Please enter text and select a persona.');
    return;
  }

  isSynthesizing.value = true;
  synthesisError.value = null;

  // Clear previous audio and revoke blob URL if necessary
  if (typeof audioUrl.value === 'string' && audioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl.value);
  }
  audioUrl.value = null;

  let createdGuideTextId: string | number | undefined;

  try {
    // Step 1: Save the transcript to the database
    const transcriptPayload = {
      text_content: textToSynthesize.value,
      persona_id: Number(selectedPersonaId.value), // Ensure persona_id is a number
      // title: outputFilename.value || `Playground Script ${new Date().toISOString()}`, // Optional: consider a title
    };

    const createdTranscript = await $fetch<{ id: string | number }>('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: transcriptPayload,
    } as any);

    if (!createdTranscript || !createdTranscript.id) {
      throw new Error('Failed to save transcript or received invalid ID.');
    }
    createdGuideTextId = createdTranscript.id;
    toast.success(`Transcript saved with ID: ${createdGuideTextId}`);

    // Step 2: Synthesize audio using the saved transcript context
    const ttsRequestBody: {
      text: string; // Text might still be needed by some TTS providers directly
      personaId: string;
      guideTextId?: string | number; // Pass the newly created guide_text_id
      outputFilename?: string;
      providerId?: string;
      temperature?: number;
      speed?: number;
    } = {
      text: textToSynthesize.value, // Some TTS might still want raw text for their own processing
      personaId: selectedPersonaId.value,
      guideTextId: createdGuideTextId,
      providerId: selectedProvider.value || undefined,
      temperature: synthesisParams.temperature,
      speed: synthesisParams.speed,
    };

    if (outputFilename.value) {
      ttsRequestBody.outputFilename = outputFilename.value;
    }

    const ttsResponse = await $fetch<{ audioUrl: string, guideAudioId: string, duration: number }>('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: ttsRequestBody,
    } as any);

    audioUrl.value = ttsResponse.audioUrl;
    toast.success(`Audio synthesized! Duration: ${ttsResponse.duration.toFixed(2)}s. Audio ID: ${ttsResponse.guideAudioId}`);
    isPlaying.value = false;
  } catch (error: any) {
    console.error('Synthesis process failed:', error);
    const errorMessage = error.data?.message || error.data?.statusMessage || error.message || 'An unknown error occurred during synthesis.';
    synthesisError.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    isSynthesizing.value = false;
  }
}

function handleRealtimePreview() {
  toast.info('Real-time audio preview feature coming soon!');
}

function togglePlayPause() {
  if (!toolbarRef.value) return;

  if (isPlaying.value) {
    toolbarRef.value.pause();
  } else {
    toolbarRef.value.play();
  }
}

function handleReset() {
  if (window.confirm("Are you sure you want to reset? All generated script and audio will be lost.")) {
    textToSynthesize.value = '';
    audioUrl.value = null;
    scriptGenerationError.value = null;
    synthesisError.value = null;
    isPlaying.value = false;
    toast.info('Content has been reset.');
  }
}

async function downloadAudio() {
  if (!audioUrl.value) {
    toast.warning('No audio to download.');
    return;
  }

  if (typeof audioUrl.value === 'string' && audioUrl.value.startsWith('blob:')) {
    const link = document.createElement('a');
    link.href = audioUrl.value;
    link.download = outputFilename.value || `synthesized_audio_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    toast.info('Starting download...');
    const response = await fetch(audioUrl.value);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const blob = await response.blob();
    const tempUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = tempUrl;
    link.download = outputFilename.value || `synthesized_audio_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(tempUrl);
    toast.success('Download complete!');
  } catch (error: any) {
    console.error('Download failed:', error);
    toast.error(`Download failed: ${error.message}`);
  }
}

</script>

<style scoped>
/* Custom scrollbar for textarea if needed, though shadcn/ui usually handles this well */
/* Ensure sliders are styled correctly in dark mode if default styles conflict */
</style>