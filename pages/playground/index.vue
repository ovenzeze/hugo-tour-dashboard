<template>
  <div class="min-h-screen">
    <div class="max-w-6xl mx-auto px-4">
      <div class="mb-8">

      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        <!-- Left Column: Text Input & Output -->
        <div class="h-full col-span-2 p-0 rounded-lg shadow-md flex flex-col space-y-6">
          <!-- Text Input Section - this should grow -->
          <div class="flex-1 flex flex-col flex-grow">
            <Textarea
              id="text-to-synthesize"
              v-model="textToSynthesize"
              placeholder="Write something to synthesize..."
              class="mt-1 flex-grow"
            />
          </div>
          <!-- Synthesized Audio Section - this should not grow excessively -->
          <div class="w-full">
            <Label class="text-gray-700 dark:text-gray-300">Synthesized Audio</Label>
            <div v-if="audioUrl" class="mt-2 p-4 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 shadow-sm">
              <audio controls :src="audioUrl" class="w-full"></audio>
              <Button @click="downloadAudio" variant="outline" class="mt-3 w-full sm:w-auto dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                Download Audio
              </Button>
            </div>
            <p v-else class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Audio will appear here after synthesis.
            </p>
          </div>
        </div>

        <!-- Right Column: Settings -->
        <div class="space-y-6 bg-background p-6 rounded-lg shadow-md h-fit border">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200  border-gray-200 dark:border-gray-600 pb-3 mb-4">Settings</h2>
          <div>
            <!-- <Label for="provider" class="text-gray-700 dark:text-gray-300">Voice Provider</Label> -->
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
          
          <div class="flex flex-col space-y-3 pt-4 border-t dark:border-gray-700 mt-4">
              <Button @click="handleSynthesize" :disabled="isSynthesizing || !textToSynthesize || !selectedPersonaId" class="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                {{ isSynthesizing ? 'Synthesizing...' : 'Synthesize Audio' }}
              </Button>
              <Button @click="handleSaveAudio" :disabled="isSaving || !synthesizedAudioBlob" variant="secondary" class="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-600">
                 {{ isSaving ? 'Saving...' : 'Save Synthesized Audio' }}
              </Button>
          </div>
          <p v-if="synthesisError" class="text-sm text-red-500 dark:text-red-400 mt-2">{{ synthesisError }}</p>
        </div> <!-- 右侧设置区块结束 -->
      </div> <!-- grid 结束 -->
    </div> <!-- max-w-6xl 结束 -->
  </div> <!-- min-h-screen 结束 -->

</template>

<script setup lang="ts">
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
const selectedProvider = ref<string | undefined>(undefined);
const selectedPersonaId = ref<string | undefined>(undefined);
const outputFilename = ref('');

const audioUrl = ref<string | null>(null);
const synthesizedAudioBlob = ref<Blob | null>(null);

const isSynthesizing = ref(false);
const isSaving = ref(false);
const synthesisError = ref<string | null>(null);

const providers = ref<VoiceProvider[]>([
  { id: 'provider_one', name: 'VoiceProvider One (Mock)' },
  { id: 'provider_two', name: 'VoiceProvider Two (Mock)' },
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

onMounted(() => {
  fetchPersonas();
});

onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});

async function handleSynthesize() {
  if (!textToSynthesize.value) {
    toast.warning('Please enter some text to synthesize.');
    return;
  }
  if (!selectedProvider.value) {
    toast.warning('Please select a voice provider.');
    return;
  }
  if (!selectedPersonaId.value) {
    toast.warning('Please select a persona.');
    return;
  }

  isSynthesizing.value = true;
  synthesisError.value = null;
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
    audioUrl.value = null;
    synthesizedAudioBlob.value = null;
  }

  console.log('Synthesizing with:', {
    text: textToSynthesize.value,
    provider: selectedProvider.value,
    personaId: selectedPersonaId.value,
    params: {
        temperature: synthesisParams.temperature,
        speed: synthesisParams.speed,
    }
  });

  // MOCK SYNTHESIS
  await new Promise(resolve => setTimeout(resolve, 1500));
  try {
    const mockBlob = new Blob([`mock audio data for ${textToSynthesize.value}`], { type: 'audio/mpeg' });
    synthesizedAudioBlob.value = mockBlob;
    audioUrl.value = URL.createObjectURL(mockBlob);
    toast.success('Voice synthesized successfully (Mock)!');
  } catch (error: any) {
    console.error('Synthesis failed:', error);
    synthesisError.value = error.message || 'Synthesis failed.';
    toast.error(synthesisError.value);
  }
  isSynthesizing.value = false;
}

function downloadAudio() {
  if (!synthesizedAudioBlob.value || !audioUrl.value) {
    toast.error('No audio to download.');
    return;
  }
  const link = document.createElement('a');
  link.href = audioUrl.value;
  const filename = outputFilename.value.trim() || `synthesis_${selectedPersonaId.value}_${Date.now()}.mp3`;
  link.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.info(`Downloading ${link.download}`);
}

async function handleSaveAudio() {
    if (!synthesizedAudioBlob.value) {
        toast.warning('No synthesized audio to save.');
        return;
    }
    isSaving.value = true;
    const filename = outputFilename.value.trim() || `playground_synthesis_${selectedPersonaId.value}_${Date.now()}.mp3`;
    const finalFilename = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;

    console.log('Attempting to save audio:', finalFilename, 'with blob:', synthesizedAudioBlob.value);
    
    const formDataToSave = new FormData();
    formDataToSave.append('audioFile', synthesizedAudioBlob.value, finalFilename);
    formDataToSave.append('text', textToSynthesize.value);
    formDataToSave.append('provider_id', selectedProvider.value!);
    formDataToSave.append('persona_id', selectedPersonaId.value!);
    formDataToSave.append('parameters', JSON.stringify({ temperature: synthesisParams.temperature, speed: synthesisParams.speed }));
    formDataToSave.append('filename', finalFilename);

    // MOCK SAVE - Replace with actual API call to /api/playground/save-audio
    try {
      // const response = await $fetch('/api/playground/save-audio', { method: 'POST', body: formDataToSave });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mocking network delay
      console.log('Mock save successful for:', finalFilename, formDataToSave);
      toast.success(`Audio \"${finalFilename}\" saved to server (Mock)!`);
    } catch (error) {
      toast.error('Failed to save audio (Mock).');
      console.error('Save audio error:', error);
    }
    isSaving.value = false;
}

</script>

<style scoped>
/* Custom scrollbar for textarea if needed, though shadcn/ui usually handles this well */
/* Ensure sliders are styled correctly in dark mode if default styles conflict */
</style>