<template>
  <div class="h-[calc(100svh-var(--header-height,0px))] w-full flex flex-col overflow-hidden p-2 sm:p-4 md:p-6">
    <!-- Main Card Layout -->
    <Card class="flex-1 flex flex-col min-h-0 overflow-hidden border rounded-lg shadow-sm">
      <CardHeader class="border-b flex-shrink-0 py-3">
        <CardTitle>TTS Debug Tool</CardTitle>
      </CardHeader>

      <CardContent class="flex-1 p-3 sm:p-4 md:p-6 flex flex-col min-h-0 overflow-auto gap-8 bg-background">
        <!-- Section 1: Selection & Input -->
        <section class="space-y-6">
          <h2 class="text-2xl font-semibold text-foreground border-b pb-2">Input & Provider</h2>
          <!-- API Selector -->
          <div class="space-y-2">
            <Label for="api-select" class="font-semibold">Select TTS API Provider</Label>
            <Select id="api-select" v-model="selectedApiProvider">
              <SelectTrigger>
                <SelectValue placeholder="Select API Provider..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="volcengine">Volcengine</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <!-- Text Input -->
          <div class="space-y-2">
            <Label for="tts-input-text" class="font-semibold">Input Text</Label>
            <Textarea
              id="tts-input-text"
              v-model="inputText"
              placeholder="Enter text to synthesize..."
              class="min-h-[120px] w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary bg-background text-foreground placeholder:text-muted-foreground"
              rows="6"
            />
          </div>

          <!-- Preset Texts Buttons -->
          <div class="space-y-2">
            <Label class="font-semibold">Preset Texts</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="preset in presetTexts"
                :key="preset.label"
                variant="outline"
                size="sm"
                @click="() => inputText = preset.value"
              >
                {{ preset.label }}
              </Button>
            </div>
          </div>
        </section>

        <!-- Section 2: API Configuration -->
        <section class="space-y-6">
          <h2 class="text-2xl font-semibold text-foreground border-b pb-2">API Configuration</h2>
          
          <!-- ElevenLabs Specific Config -->
          <div v-if="selectedApiProvider === 'elevenlabs'" class="space-y-4 p-4 border border-border rounded-lg bg-muted/20 shadow-sm">
            <h3 class="text-xl font-semibold text-primary mb-3">ElevenLabs Settings</h3>
            <div>
              <Label for="el-voice-select">Select Voice (ElevenLabs)</Label>
              <Select id="el-voice-select" v-model="elevenLabsConfig.voiceId">
                <SelectTrigger>
                  <SelectValue placeholder="Select an ElevenLabs voice..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-if="elevenLabsVoices.length === 0" :value="'_loading_voices_'" disabled>Loading voices...</SelectItem>
                    <SelectItem v-for="voice in elevenLabsVoices" :key="voice.voice_id" :value="voice.voice_id">
                      {{ voice.name }} ({{ voice.category }})
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label for="el-model-id">Model ID (Optional)</Label>
              <Input id="el-model-id" v-model="elevenLabsConfig.modelId" placeholder="e.g., eleven_multilingual_v2" />
              <p class="text-xs text-muted-foreground mt-1">Backend might not use this. Check API analysis.</p>
            </div>
            <div>
              <Label :for="`el-stability-slider-${_uid}`">Stability ({{ elevenLabsConfig.voiceSettings.stability.toFixed(2) }})</Label>
              <Slider
                :id="`el-stability-slider-${_uid}`"
                :model-value="[elevenLabsConfig.voiceSettings.stability]"
                @update:model-value="val => { if (val && val.length > 0) elevenLabsConfig.voiceSettings.stability = val[0] }"
                :min="0" :max="1" :step="0.05" class="my-2"
              />
            </div>
            <div>
              <Label :for="`el-similarity-slider-${_uid}`">Similarity Boost ({{ elevenLabsConfig.voiceSettings.similarity_boost.toFixed(2) }})</Label>
              <Slider
                :id="`el-similarity-slider-${_uid}`"
                :model-value="[elevenLabsConfig.voiceSettings.similarity_boost]"
                @update:model-value="val => { if (val && val.length > 0) elevenLabsConfig.voiceSettings.similarity_boost = val[0] }"
                :min="0" :max="1" :step="0.05" class="my-2"
              />
            </div>
            <p class="text-xs text-muted-foreground">Voice settings might not be used by the backend currently.</p>
          </div>

          <!-- Volcengine Specific Config -->
          <div v-if="selectedApiProvider === 'volcengine'" class="space-y-4 p-4 border border-border rounded-lg bg-muted/20 shadow-sm">
            <h3 class="text-xl font-semibold text-primary mb-3">Volcengine Settings</h3>
            <div>
              <Label for="volc-persona-select">Select Persona (for Voice Type)</Label>
              <Select id="volc-persona-select" v-model="selectedPersonaIdForVolcengine" :disabled="personas.length === 0 && !personaStore.personasLoading">
                <SelectTrigger>
                  <SelectValue placeholder="Select a Persona for Volcengine voice..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem :value="'_select_persona_placeholder_'" disabled>
                      {{ personaStore.personasLoading ? 'Loading personas...' : (personas.length === 0 ? 'No personas available' : 'Select a Persona') }}
                    </SelectItem>
                    <SelectItem v-for="persona in personas" :key="persona.persona_id" :value="persona.persona_id">
                      {{ persona.name }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p v-if="!personaStore.personasLoading && personas.length === 0" class="text-sm text-muted-foreground mt-1">
                No personas found. Please add or activate personas.
              </p>
              <p v-if="selectedVolcenginePersona && (!selectedVolcenginePersona.voice_model_identifier)" class="text-sm text-destructive mt-1">
                Warning: Selected persona does not have a Volcengine voice_model_identifier configured.
              </p>
            </div>
            <div>
              <Label for="volc-encoding">Encoding</Label>
              <Select id="volc-encoding" v-model="volcengineConfig.encoding">
                <SelectTrigger>
                  <SelectValue placeholder="Select encoding..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="mp3">MP3 (Default)</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="pcm">PCM</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label :for="`volc-speed-slider-${_uid}`">Speed Ratio ({{ volcengineConfig.speedRatio.toFixed(2) }})</Label>
              <Slider
                :id="`volc-speed-slider-${_uid}`"
                :model-value="[volcengineConfig.speedRatio]"
                @update:model-value="val => { if (val && val.length > 0) volcengineConfig.speedRatio = val[0] }"
                :min="0.5" :max="2.0" :step="0.1" class="my-2"
              />
            </div>
            <div>
              <Label :for="`volc-volume-slider-${_uid}`">Volume Ratio ({{ volcengineConfig.volumeRatio.toFixed(2) }})</Label>
              <Slider
                :id="`volc-volume-slider-${_uid}`"
                :model-value="[volcengineConfig.volumeRatio]"
                @update:model-value="val => { if (val && val.length > 0) volcengineConfig.volumeRatio = val[0] }"
                :min="0.1" :max="5.0" :step="0.1" class="my-2"
              />
            </div>
            <div>
              <Label :for="`volc-pitch-slider-${_uid}`">Pitch Ratio ({{ volcengineConfig.pitchRatio.toFixed(2) }})</Label>
              <Slider
                :id="`volc-pitch-slider-${_uid}`"
                :model-value="[volcengineConfig.pitchRatio]"
                @update:model-value="val => { if (val && val.length > 0) volcengineConfig.pitchRatio = val[0] }"
                :min="0.5" :max="2.0" :step="0.1" class="my-2"
              />
            </div>
            <div class="flex items-center space-x-2">
              <Switch :id="`volc-timestamps-switch-${_uid}`" v-model:checked="volcengineConfig.enableTimestamps" />
              <Label :for="`volc-timestamps-switch-${_uid}`">Enable Timestamps</Label>
            </div>
          </div>
          <div v-if="selectedApiProvider !== 'elevenlabs' && selectedApiProvider !== 'volcengine'" class="text-muted-foreground p-4 text-center">
            Please select an API provider to see its configuration options.
          </div>
        </section>

        <!-- Section 3: Synthesis & Playback -->
        <section class="space-y-6">
          <h2 class="text-2xl font-semibold text-foreground border-b pb-2">Synthesis & Playback</h2>
           <!-- Status/Error Message Area -->
          <Alert v-if="statusMessage" :variant="isError ? 'destructive' : 'default'" class="mt-4">
            <Icon :name="isError ? 'ph:warning-circle-bold' : 'ph:info-bold'" class="h-5 w-5" />
            <AlertTitle class="font-semibold">{{ isError ? 'Error' : 'Status' }}</AlertTitle>
            <AlertDescription>
              {{ statusMessage }}
            </AlertDescription>
          </Alert>

          <!-- Audio Player -->
          <div v-if="audioSrc" class="space-y-3 mt-6 pt-4 border-t border-border">
            <Label class="text-lg font-semibold text-foreground">Playback Generated Audio</Label>
            <audio controls :src="audioSrc" class="w-full">
              Your browser does not support the audio element.
            </audio>
            <Button @click="clearAudio" variant="outline" size="sm">Clear Audio</Button>
          </div>
          <div v-else-if="!isLoading && !statusMessage.includes('Synthesizing...')" class="text-muted-foreground text-center py-4">
            No audio synthesized yet or synthesis failed. Click "Synthesize" to generate audio.
          </div>
        </section>

        <!-- Section 4: Debugging Information -->
        <section class="space-y-6">
          <h2 class="text-2xl font-semibold text-foreground border-b pb-2">Debugging Information</h2>
          
          <div class="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <div class="space-y-2">
              <h4 class="text-lg font-semibold text-foreground">Last Request Payload</h4>
              <pre class="mt-1 w-full rounded-md bg-slate-900 dark:bg-slate-800 p-3 overflow-x-auto text-xs"><code class="text-white">{{ JSON.stringify(lastRequestPayload, null, 2) || 'No request sent yet.' }}</code></pre>
            </div>
            <div class="space-y-2 pt-4 border-t border-slate-300 dark:border-slate-700">
              <h4 class="text-lg font-semibold text-foreground">Last Response Summary</h4>
              <pre class="mt-1 w-full rounded-md bg-slate-900 dark:bg-slate-800 p-3 overflow-x-auto text-xs"><code class="text-white">{{ JSON.stringify(lastResponse, null, 2) || 'No response received yet.' }}</code></pre>
            </div>
            <div class="space-y-2 pt-4 border-t border-slate-300 dark:border-slate-700">
              <h4 class="text-lg font-semibold text-foreground">Raw Response Details</h4>
              <pre class="mt-1 w-full rounded-md bg-slate-900 dark:bg-slate-800 p-3 overflow-x-auto text-xs"><code class="text-white">{{ rawResponseForDisplay || (lastResponse ? 'No raw details, see summary.' : 'No response received yet.') }}</code></pre>
            </div>
          </div>

          <!-- Backend APIs Used -->
          <div class="space-y-2 pt-4">
            <h3 class="text-xl font-semibold text-foreground">Dependent Backend APIs</h3>
            <ul class="list-disc pl-5 space-y-1 text-muted-foreground">
              <li v-for="api in backendApis" :key="api.path">
                <code class="font-mono text-sm bg-muted p-1 rounded-md">{{ api.path }}</code> - {{ api.description }}
              </li>
            </ul>
          </div>
        </section>
      </CardContent>

      <CardFooter class="border-t p-3 sm:p-4 flex-shrink-0 bg-background">
        <div class="flex justify-center w-full items-center">
          <Button @click="handleSynthesize" :disabled="isLoading || !isConfigStepValid" size="lg" class="min-w-[150px]">
            <Icon v-if="!isLoading" name="ph:play-circle-bold" class="mr-2 h-5 w-5" />
            <Icon v-else name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
            {{ isLoading ? 'Synthesizing...' : 'Synthesize' }}
          </Button>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue';
import { usePlaygroundPersonaStore } from '~/stores/playgroundPersona';
import type { Persona } from '~/types/persona';

// Shadcn-vue components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'; // No longer needed
import { Icon } from '#components';

// Custom Components
// import TtsDebugStepper from '~/components/tts-debug/TtsDebugStepper.vue'; // No longer needed

definePageMeta({
  title: 'TTS Debug Tool',
  layout: 'default',
});

const isConfigStepValid = computed(() => {
  if (selectedApiProvider.value === 'elevenlabs') {
    return !!elevenLabsConfig.value.voiceId;
  } else if (selectedApiProvider.value === 'volcengine') {
    // Considered valid if voice_model_identifier is a non-empty string.
    return !!selectedPersonaIdForVolcengine.value && !!selectedVolcenginePersona.value?.voice_model_identifier;
  }
  return false;
});

const instance = getCurrentInstance();
const _uid = instance?.uid || Math.random().toString(36).substring(7);

const backendApis = [
  { path: '/api/elevenlabs/voices', description: 'Get ElevenLabs voices list' },
  { path: '/api/elevenlabs/timing', description: 'ElevenLabs non-streaming synthesis' },
  // { path: '/api/elevenlabs/stream-timing', description: 'ElevenLabs streaming synthesis (not used by default)' },
  { path: '/api/tts/volcengine', description: 'Volcengine synthesis' },
];

// --- Reactive State ---
const selectedApiProvider = ref<string>('elevenlabs');
const inputText = ref<string>('床前明月光，疑是地上霜。举头望明月，低头思故乡。');

const presetTexts = [
  { label: '静夜思', value: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
  { label: '登鹳雀楼', value: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。' },
  { label: '春晓', value: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。' },
  { label: '中文测试', value: '你好世界，这是一段用于测试语音合成的文本。' },
  { label: 'English Test', value: 'The quick brown fox jumps over the lazy dog.' },
];

const isLoading = ref<boolean>(false);
const statusMessage = ref<string>('');
const isError = ref<boolean>(false);
const audioSrc = ref<string | null>(null);
const lastRequestPayload = ref<object | null>(null);
const lastResponse = ref<object | null>(null);
const rawResponseForDisplay = ref<string | null>(null);
// const activeDebugInfoTab = ref<'payload' | 'response' | 'raw'>('payload'); // No longer needed

// ElevenLabs specific state
const elevenLabsVoices = ref<any[]>([]);
const elevenLabsConfig = ref({
  voiceId: undefined as string | undefined,
  modelId: '' as string | undefined,
  voiceSettings: {
    stability: 0.75,
    similarity_boost: 0.75,
  },
});

// Volcengine specific state
const volcengineConfig = ref({
  encoding: 'mp3',
  speedRatio: 1.0,
  volumeRatio: 1.0,
  pitchRatio: 1.0,
  enableTimestamps: true,
});

// Persona store for Volcengine
const personaStore = usePlaygroundPersonaStore();
const personas = computed(() => personaStore.personas);
const selectedPersonaIdForVolcengine = ref<number | null>(null);
const selectedVolcenginePersona = computed<Persona | undefined>(() => {
  return personas.value.find(p => p.persona_id === selectedPersonaIdForVolcengine.value);
});

// --- Computed Properties ---
const apiEndpoint = computed(() => {
  if (selectedApiProvider.value === 'elevenlabs') {
    return '/api/elevenlabs/timing';
  } else if (selectedApiProvider.value === 'volcengine') {
    return '/api/tts/volcengine';
  }
  return '';
});

// --- Methods ---
const fetchElevenLabsVoices = async () => {
  isLoading.value = true;
  statusMessage.value = 'Loading ElevenLabs voices...';
  isError.value = false;
  try {
    const response = await $fetch<{ success: boolean, voices: any[] }>('/api/elevenlabs/voices', {
      method: 'GET', // Explicitly set method, though GET is default for $fetch
    });

    // $fetch throws an error for non-2xx responses, so we don't need to check error.value like with useFetch
    // The error handling will be caught by the catch block.

    if (response && response.success) {
      elevenLabsVoices.value = response.voices;
      if (response.voices.length > 0 && !elevenLabsConfig.value.voiceId) {
        const defaultVoice = response.voices.find((v: any) => v.name?.toLowerCase().includes('default') || v.name?.toLowerCase().includes('rachel')) || response.voices[0];
        if (defaultVoice) elevenLabsConfig.value.voiceId = defaultVoice.voice_id;
      }
      statusMessage.value = elevenLabsVoices.value.length > 0 ? 'ElevenLabs voices loaded.' : 'No ElevenLabs voices found.';
    } else {
      // This case might be redundant if $fetch always throws on error or non-success,
      // but kept for safety if the API might return 2xx with success: false
      throw new Error((response as any)?.message || 'Failed to fetch voices or no voices returned.');
    }
  } catch (e: any) {
    console.error('Exception fetching ElevenLabs voices:', e);
    // For $fetch, error details are often in e.data or e.response._data
    const errorMessage = e.data?.message || e.data?.error || (e.response?._data as any)?.message || (e.response?._data as any)?.error || e.message || 'Unknown error';
    statusMessage.value = `Error loading ElevenLabs voices: ${errorMessage}`;
    isError.value = true;
    elevenLabsVoices.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleSynthesize = async () => {
  if (!inputText.value.trim()) {
    statusMessage.value = 'Please enter some text to synthesize.';
    isError.value = true;
    // currentStep.value = 1; // Stepper removed
    return;
  }
  if (!apiEndpoint.value) {
    statusMessage.value = 'Please select an API provider.';
    isError.value = true;
    // currentStep.value = 1; // Stepper removed
    return;
  }
  if (!isConfigStepValid.value) {
    statusMessage.value = 'Please complete the API configuration.';
    isError.value = true;
    // currentStep.value = 2; // Stepper removed
    return;
  }

  isLoading.value = true;
  isError.value = false;
  statusMessage.value = 'Synthesizing...';
  if (audioSrc.value) URL.revokeObjectURL(audioSrc.value);
  audioSrc.value = null;
  lastRequestPayload.value = null;
  lastResponse.value = null;
  rawResponseForDisplay.value = null;

  let payload: any = { text: inputText.value };

  if (selectedApiProvider.value === 'elevenlabs') {
    payload.voiceId = elevenLabsConfig.value.voiceId;
    if (elevenLabsConfig.value.modelId) payload.modelId = elevenLabsConfig.value.modelId;
    payload.voiceSettings = elevenLabsConfig.value.voiceSettings;
  } else if (selectedApiProvider.value === 'volcengine') {
    const volcengineVoiceIdentifierFromPersona = selectedVolcenginePersona.value?.voice_model_identifier;
    payload.voiceType = volcengineVoiceIdentifierFromPersona; // Use voiceType parameter for API, but get value from voice_model_identifier
    payload.encoding = volcengineConfig.value.encoding;
    payload.speedRatio = volcengineConfig.value.speedRatio;
    payload.volumeRatio = volcengineConfig.value.volumeRatio;
    payload.pitchRatio = volcengineConfig.value.pitchRatio;
    payload.enableTimestamps = volcengineConfig.value.enableTimestamps;
  }

  lastRequestPayload.value = { ...payload };

  try {
    const response = await $fetch.raw(apiEndpoint.value, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    });

    const responseData = response._data;
    lastResponse.value = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      dataPreview: responseData ? (typeof responseData === 'object' ? '{...}' : String(responseData).substring(0,100)) : null,
    };
    rawResponseForDisplay.value = JSON.stringify(responseData, null, 2);


    if (response.status >= 200 && response.status < 300) {
      statusMessage.value = 'Synthesis successful!';
      isError.value = false;
      let audioBlob: Blob | null = null;

      if (selectedApiProvider.value === 'elevenlabs' && responseData?.audio?.data) {
        audioBlob = new Blob([new Uint8Array(responseData.audio.data)], { type: 'audio/mpeg' });
      } else if (selectedApiProvider.value === 'volcengine' && responseData?.audioBuffer) {
        if (responseData.audioBuffer instanceof ArrayBuffer) {
          audioBlob = new Blob([new Uint8Array(responseData.audioBuffer)], { type: `audio/${volcengineConfig.value.encoding || 'mpeg'}` });
        } else {
          const audioDataValues = Object.values(responseData.audioBuffer as any);
          if (audioDataValues.every(val => typeof val === 'number')) {
            audioBlob = new Blob([new Uint8Array(audioDataValues as number[])], { type: `audio/${volcengineConfig.value.encoding || 'mpeg'}` });
          } else {
            throw new Error('Received audioBuffer is not a processable ArrayBuffer or byte object.');
          }
        }
      } else if (responseData?.error || responseData?.message) {
        throw new Error(responseData.error || responseData.message);
      } else if (response.headers.get('content-type')?.startsWith('audio/')) {
        audioBlob = await response.blob();
      }
      
      if (audioBlob && audioBlob.size > 0) {
        audioSrc.value = URL.createObjectURL(audioBlob);
      } else {
        throw new Error('No valid audio data received in the response.');
      }
      // currentStep.value = 3; // Stepper removed
    } else {
      const errorBodyText = responseData ? JSON.stringify(responseData) : (await response.text() || 'No error body');
      throw new Error(`API Error ${response.status}: ${response.statusText} - ${errorBodyText}`);
    }
  } catch (e: any) {
    console.error('Synthesis API call failed:', e);
    isError.value = true;
    statusMessage.value = `Failed to synthesize: ${e.data?.statusMessage || e.data?.message || e.message || 'Unknown error'}`;
    if (e.data) rawResponseForDisplay.value = JSON.stringify(e.data, null, 2);
    else if (e.response?._data) rawResponseForDisplay.value = JSON.stringify(e.response._data, null, 2);
    else rawResponseForDisplay.value = e.message;
    // currentStep.value = 3; // Stepper removed
  } finally {
    isLoading.value = false;
  }
};

const clearAudio = () => {
  if (audioSrc.value) URL.revokeObjectURL(audioSrc.value);
  audioSrc.value = null;
  statusMessage.value = 'Audio cleared.';
  isError.value = false;
};

watch(selectedApiProvider, async (newProvider, oldProvider) => {
  if (newProvider === oldProvider) return;

  statusMessage.value = `Switched to ${newProvider} API.`;
  isError.value = false;
  lastRequestPayload.value = null;
  lastResponse.value = null;
  rawResponseForDisplay.value = null;
  // activeDebugInfoTab.value = 'payload'; // No longer needed

  if (newProvider === 'elevenlabs') {
    if (elevenLabsVoices.value.length === 0) {
      await fetchElevenLabsVoices();
    }
  } else if (newProvider === 'volcengine') {
    if (personas.value.length === 0 && !personaStore.personasLoading) {
      await personaStore.fetchPersonas();
    }
  }
}, { immediate: false });

// Refresh Linter

onMounted(async () => {
  console.log('[TTS-Debug] Component mounted. Initial API provider:', selectedApiProvider.value);
  if (selectedApiProvider.value === 'elevenlabs') {
    if (elevenLabsVoices.value.length === 0) {
      await fetchElevenLabsVoices();
    }
  } else if (selectedApiProvider.value === 'volcengine') {
    if (personas.value.length === 0 && !personaStore.personasLoading) {
      await personaStore.fetchPersonas();
    }
  }
});

</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem; /* Adjusted for better readability */
  line-height: 1.4;
}
code {
 font-family: 'Courier New', Courier, monospace;
}
/* Style for collapsible trigger icon - No longer needed */
/*
[data-state='open'] .collap-icon {
  transform: rotate(180deg);
}
*/
</style>