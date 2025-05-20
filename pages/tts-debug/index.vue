<template>
  <div class="container mx-auto px-0 py-6">
    <Card class="px-2">
      <CardHeader>
        <CardTitle class="text-lg text-teal-800">TTS Debugging Tool</CardTitle>
        <CardDescription>
          A page to test and debug various Text-to-Speech (TTS) services.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- API Selector -->
        <div class="space-y-2">
          <Label for="api-select">Select TTS API Provider</Label>
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
          <Label for="tts-input-text">Input Text</Label>
          <Textarea
            id="tts-input-text"
            v-model="inputText"
            placeholder="Enter text to synthesize..."
            class="min-h-[100px]"
            rows="5"
          />
        </div>

        <!-- Preset Texts Buttons -->
        <div class="space-y-2 mt-3">
          <Label>Preset Texts</Label>
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

        <!-- Configuration Section -->
        <Collapsible v-model:open="isConfigOpen">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" class="w-full flex justify-between items-center px-2 py-1.5 mb-2 text-sm font-medium border rounded-md">
              <span>API Configuration</span>
              <Icon :name="isConfigOpen ? 'ph:caret-up' : 'ph:caret-down'" class="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div class="space-y-6 p-4 border rounded-md">
              <!-- ElevenLabs Specific Config -->
              <div v-if="selectedApiProvider === 'elevenlabs'" class="space-y-4">
                <h4 class="font-semibold">ElevenLabs Settings</h4>
                <div>
                  <Label for="el-voice-select">Select Voice (ElevenLabs)</Label>
                  <Select id="el-voice-select" v-model="elevenLabsConfig.voiceId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select an ElevenLabs voice..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem v-for="voice in elevenLabsVoices" :key="voice.voice_id" :value="voice.voice_id">
                          {{ voice.name }} ({{ voice.category }})
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label for="el-model-id">Model ID (Optional, if backend supports)</Label>
                  <Input id="el-model-id" v-model="elevenLabsConfig.modelId" placeholder="e.g., eleven_multilingual_v2" />
                  <p class="text-xs text-muted-foreground mt-1">Currently, backend might not use this. Check API analysis.</p>
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
                <p class="text-xs text-muted-foreground">Voice settings might not be used by the backend currently. Check API analysis.</p>
              </div>

              <!-- Volcengine Specific Config -->
              <div v-if="selectedApiProvider === 'volcengine'" class="space-y-4">
                <h4 class="font-semibold">Volcengine Settings</h4>
                <div>
                  <Label for="volc-voice">Voice</Label>
                  <Select id="volc-voice" v-model="volcengineConfig.voice">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Volcengine voice..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="female">Female (Default)</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <!-- Add more based on volcengineTTS.ts VOICE_TYPES or allow custom string -->
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
                  <Switch id="volc-timestamps-switch" v-model:checked="volcengineConfig.enableTimestamps" />
                  <Label for="volc-timestamps-switch">Enable Timestamps</Label>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <!-- Synthesize Button -->
        <div>
          <Button @click="handleSynthesize" :disabled="isLoading" class="w-full md:w-auto">
            <Icon v-if="!isLoading" name="ph:play-circle-bold" class="mr-2 h-5 w-5" />
            <Icon v-else name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
            {{ isLoading ? 'Synthesizing...' : 'Synthesize Speech' }}
          </Button>
        </div>

        <!-- Status/Error Message Area -->
        <Alert v-if="statusMessage" :variant="isError ? 'destructive' : 'default'">
          <Icon :name="isError ? 'ph:warning-circle-bold' : 'ph:info-bold'" class="h-4 w-4" />
          <AlertTitle>{{ isError ? 'Error' : 'Status' }}</AlertTitle>
          <AlertDescription>
            {{ statusMessage }}
          </AlertDescription>
        </Alert>

        <!-- Audio Player -->
        <div v-if="audioSrc" class="space-y-2">
          <Label>Playback Generated Audio</Label>
          <audio controls :src="audioSrc" class="w-full">
            Your browser does not support the audio element.
          </audio>
          <Button @click="clearAudio" variant="outline" size="sm">Clear Audio</Button>
        </div>

        <!-- Request/Response Display Area -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Last Request Payload</Label>
            <pre class="mt-1 w-full rounded-md bg-slate-900 dark:bg-slate-800 p-3 overflow-x-auto text-xs"><code class="text-white">{{ JSON.stringify(lastRequestPayload, null, 2) || 'No request sent yet.' }}</code></pre>
          </div>
          <div class="space-y-2">
            <Label>Last Response</Label>
            <pre class="mt-1 w-full rounded-md bg-slate-900 dark:bg-slate-800 p-3 overflow-x-auto text-xs"><code class="text-white">{{ JSON.stringify(lastResponse, null, 2) || 'No response received yet.' }}</code></pre>
          </div>
        </div>
        <div v-if="rawResponseForDisplay" class="space-y-2">
            <Label>Raw Response (Details)</Label>
            <pre class="mt-1 w-full rounded-md bg-slate-900 dark:bg-slate-800 p-3 overflow-x-auto text-xs"><code class="text-white">{{ rawResponseForDisplay }}</code></pre>
        </div>

        <!-- Backend APIs Used -->
        <div class="space-y-2 mt-6">
          <h3 class="text-lg font-semibold">依赖的后端 API</h3>
          <ul class="list-disc pl-5 space-y-1">
            <li v-for="api in backendApis" :key="api.path">
              <code>{{ api.path }}</code> - {{ api.description }}
            </li>
          </ul>
        </div>

      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue';
// useFetch and useRuntimeConfig are auto-imported or available globally in Nuxt 3
// $fetch is also globally available for making API calls.

const backendApis = [
  { path: '/api/elevenlabs/voices', description: '获取 ElevenLabs 声音列表' },
  { path: '/api/elevenlabs/timing', description: 'ElevenLabs 非流式合成' },
  { path: '/api/elevenlabs/stream-timing', description: 'ElevenLabs 流式合成' },
  { path: '/api/tts/volcengine', description: '火山引擎合成' },
];

// Shadcn-vue components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Define page meta
definePageMeta({
  title: 'TTS Debug Tool',
});

const instance = getCurrentInstance();
const _uid = instance?.uid || Math.random().toString(36).substring(7);

// --- Reactive State ---
const selectedApiProvider = ref<string>('elevenlabs'); // 'elevenlabs' or 'volcengine'
const inputText = ref<string>('');

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
const rawResponseForDisplay = ref<string | null>(null); // For non-JSON or large responses
const isConfigOpen = ref<boolean>(false);

// ElevenLabs specific state
const elevenLabsVoices = ref<any[]>([]);
const elevenLabsConfig = ref({
  voiceId: undefined as string | undefined,
  modelId: '' as string | undefined,
  voiceSettings: {
    stability: 0.75,
    similarity_boost: 0.75,
    // style and use_speaker_boost can be added if backend supports
  },
});

// Volcengine specific state
const volcengineConfig = ref({
  voice: 'female',
  encoding: 'mp3',
  speedRatio: 1.0,
  volumeRatio: 1.0,
  pitchRatio: 1.0,
  enableTimestamps: true,
});

// --- Computed Properties ---
const apiEndpoint = computed(() => {
  if (selectedApiProvider.value === 'elevenlabs') {
    // Prefer 'timing' over 'stream-timing' for simpler audio data handling initially
    return '/api/elevenlabs/timing';
  } else if (selectedApiProvider.value === 'volcengine') {
    return '/api/tts/volcengine';
  }
  return '';
});

// --- Methods ---
const fetchElevenLabsVoices = async () => {
  try {
    const { data, error } = await useFetch<{ success: boolean, voices: any[] }>('/api/elevenlabs/voices');
    if (error.value) {
      console.error('Failed to fetch ElevenLabs voices:', error.value);
      statusMessage.value = `Failed to load ElevenLabs voices: ${error.value.message || 'Unknown error'}`;
      isError.value = true;
      elevenLabsVoices.value = [];
    } else if (data.value && data.value.success) {
      elevenLabsVoices.value = data.value.voices;
      if (data.value.voices.length > 0 && !elevenLabsConfig.value.voiceId) {
         // Try to find a default or first voice
        const defaultVoice = data.value.voices.find((v: any) => v.name?.toLowerCase().includes('default') || v.name?.toLowerCase().includes('rachel')) || data.value.voices[0];
        if (defaultVoice) {
            elevenLabsConfig.value.voiceId = defaultVoice.voice_id;
        }
      }
    } else {
      elevenLabsVoices.value = [];
      statusMessage.value = 'Received no voices or unsuccessful response from ElevenLabs voices API.';
      isError.value = true;
    }
  } catch (e: any) {
    console.error('Exception fetching ElevenLabs voices:', e);
    statusMessage.value = `Exception loading ElevenLabs voices: ${e.message}`;
    isError.value = true;
    elevenLabsVoices.value = [];
  }
};

const handleSynthesize = async () => {
  if (!inputText.value.trim()) {
    statusMessage.value = 'Please enter some text to synthesize.';
    isError.value = true;
    return;
  }
  if (!apiEndpoint.value) {
    statusMessage.value = 'Please select an API provider.';
    isError.value = true;
    return;
  }

  isLoading.value = true;
  isError.value = false;
  statusMessage.value = 'Synthesizing...';
  audioSrc.value = null; // Clear previous audio
  lastRequestPayload.value = null;
  lastResponse.value = null;
  rawResponseForDisplay.value = null;

  let payload: any = { text: inputText.value };

  if (selectedApiProvider.value === 'elevenlabs') {
    if (!elevenLabsConfig.value.voiceId) {
        statusMessage.value = 'Please select an ElevenLabs voice.';
        isError.value = true;
        isLoading.value = false;
        return;
    }
    payload.voiceId = elevenLabsConfig.value.voiceId;
    // Only include modelId and voiceSettings if they have values and backend supports them
    // For now, we send them based on the UI, backend analysis suggests they might be ignored
    if (elevenLabsConfig.value.modelId) {
      payload.modelId = elevenLabsConfig.value.modelId;
    }
    payload.voiceSettings = elevenLabsConfig.value.voiceSettings;
  } else if (selectedApiProvider.value === 'volcengine') {
    payload = { ...payload, ...volcengineConfig.value };
  }

  lastRequestPayload.value = { ...payload }; // Store a copy

  try {
    const response = await $fetch.raw(apiEndpoint.value, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    });

    lastResponse.value = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        // body will be handled below
    };

    const responseData = response._data; // Nuxt $fetch raw response puts data in _data

    if (response.status >= 200 && response.status < 300) {
      statusMessage.value = 'Synthesis successful!';
      isError.value = false;

      if (selectedApiProvider.value === 'elevenlabs') {
        // Assuming /api/elevenlabs/timing returns { audio: Buffer, timestamps: Array }
        // The 'audio' field is a Buffer. We need to create a Blob URL.
        if (responseData?.audio?.data && Array.isArray(responseData.audio.data)) {
          const byteArray = new Uint8Array(responseData.audio.data);
          const blob = new Blob([byteArray], { type: 'audio/mpeg' }); // Assuming MP3
          audioSrc.value = URL.createObjectURL(blob);
          lastResponse.value = { ...lastResponse.value, dataPreview: "{ audio: [Buffer data], timestamps: ... }" };
          rawResponseForDisplay.value = `ElevenLabs Audio Buffer received (${byteArray.length} bytes). Timestamps: ${JSON.stringify(responseData.timestamps, null, 2)}`;
        } else {
            throw new Error('ElevenLabs response did not contain expected audio data.');
        }
      } else if (selectedApiProvider.value === 'volcengine') {
        // Assuming /api/tts/volcengine returns SynthesizedAudioResult { audioBuffer: ArrayBuffer, ... }
        if (responseData?.audioBuffer) {
          const blob = new Blob([responseData.audioBuffer], { type: `audio/${volcengineConfig.value.encoding || 'mpeg'}` });
          audioSrc.value = URL.createObjectURL(blob);
          lastResponse.value = { ...lastResponse.value, dataPreview: "{ audioBuffer: [ArrayBuffer data], ... }" };
          rawResponseForDisplay.value = `Volcengine AudioBuffer received. Timestamps: ${JSON.stringify(responseData.timestamps, null, 2)}. Duration: ${responseData.durationMs}ms. Error: ${responseData.error}`;
        } else if (responseData?.error) {
            throw new Error(`Volcengine synthesis failed: ${responseData.error}`);
        }
         else {
            throw new Error('Volcengine response did not contain expected audioBuffer.');
        }
      }
    } else {
      // Handle non-2xx responses that $fetch doesn't throw for by default with .raw
      isError.value = true;
      statusMessage.value = `API Error ${response.status}: ${response.statusText}. `;
      if (responseData) {
        statusMessage.value += typeof responseData === 'object' ? JSON.stringify(responseData) : responseData.toString();
        lastResponse.value = { ...lastResponse.value, data: responseData };
        rawResponseForDisplay.value = JSON.stringify(responseData, null, 2);
      }
    }
  } catch (e: any) {
    console.error('Synthesis API call failed:', e);
    isError.value = true;
    statusMessage.value = `Failed to synthesize: ${e.data?.statusMessage || e.message || 'Unknown error'}`;
    if (e.data) {
        lastResponse.value = e.data; // Error data from $fetch
        rawResponseForDisplay.value = JSON.stringify(e.data, null, 2);
    } else {
        lastResponse.value = { error: e.message };
        rawResponseForDisplay.value = e.message;
    }
  } finally {
    isLoading.value = false;
  }
};

const clearAudio = () => {
  if (audioSrc.value) {
    URL.revokeObjectURL(audioSrc.value);
  }
  audioSrc.value = null;
  statusMessage.value = 'Audio cleared.';
  isError.value = false;
  // Optionally clear request/response displays too
  // lastRequestPayload.value = null;
  // lastResponse.value = null;
  // rawResponseForDisplay.value = null;
};

// Watch for API provider change to fetch voices if ElevenLabs is selected
watch(selectedApiProvider, (newProvider) => {
  if (newProvider === 'elevenlabs' && elevenLabsVoices.value.length === 0) {
    fetchElevenLabsVoices();
  }
  // Reset common fields or specific configs if needed
  statusMessage.value = `Switched to ${newProvider} API.`;
  isError.value = false;
  audioSrc.value = null;
  lastRequestPayload.value = null;
  lastResponse.value = null;
  rawResponseForDisplay.value = null;
}, { immediate: true });


onMounted(() => {
  // Initial actions if any
  if (selectedApiProvider.value === 'elevenlabs') {
    fetchElevenLabsVoices();
  }
});

</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  line-height: 1.4;
}
code {
 font-family: 'Courier New', Courier, monospace;
}
</style>