<template>
  <div class="container mx-auto px-0 py-6"
       v-motion
       :initial="{ opacity: 0 }"
       :enter="{ opacity: 1, transition: { duration: 300 } }">

    <Card class="px-2">
      <CardHeader>
        <!-- <CardTitle class="text-lg text-teal-800">ElevenLabs TTS Debug Tool</CardTitle> -->
        <CardDescription>
          Enhanced TTS testing and debugging interface built with shadcn-vue components.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Configuration Section (Collapsible) -->
        <Collapsible v-model:open="isConfigOpen">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" class="w-full flex justify-between items-center px-2 py-1.5 mb-2 text-sm font-medium border rounded-md">
              <span>TTS Configuration</span>
              <Icon :name="isConfigOpen ? 'ph:caret-up' : 'ph:caret-down'" class="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div class="space-y-6 p-4 border rounded-md">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label for="voice-select">Select Voice</Label>
                  <Select id="voice-select" v-model="selectedVoiceId" @update:modelValue="handleVoiceChange">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem v-for="voice in availableVoices" :key="voice.id" :value="voice.id">
                          {{ voice.name }} ({{ voice.language }})
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p v-if="selectedVoiceConfig" class="text-xs text-muted-foreground mt-1">
                    ID: {{ selectedVoiceConfig.id }} | Model: {{ selectedVoiceConfig.modelId }}
                  </p>
                </div>
                <div>
                  <Label for="model-select">Select Model (Override)</Label>
                  <Select id="model-select" v-model="selectedModelId">
                    <SelectTrigger>
                      <SelectValue placeholder="Default or select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem v-for="(modelId, key) in elevenLabsConfig.models" :key="key" :value="modelId">
                          {{ key }} ({{ modelId }})
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p class="text-xs text-muted-foreground mt-1">
                    Overrides the default model for the selected voice above.
                  </p>
                </div>
              </div>

              <div>
                <Label :for="`stability-slider-${_uid}`">Stability ({{ ttsSettings.stability.toFixed(2) }})</Label>
                <Slider
                  :id="`stability-slider-${_uid}`"
                  :model-value="[ttsSettings.stability]"
                  @update:model-value="val => { if (val && val.length > 0) ttsSettings.stability = val[0] }"
                  :min="0" :max="1" :step="0.05"
                  :default-value="[elevenLabsConfig.defaultSettings.stability ?? 0.5]"
                  class="my-2"
                />
                <p class="text-xs text-muted-foreground">Higher values are more stable but might be monotonous; lower values are more expressive but might be unstable.</p>
              </div>

              <div>
                <Label :for="`similarity-slider-${_uid}`">Similarity Boost ({{ ttsSettings.similarity_boost.toFixed(2) }})</Label>
                <Slider
                  :id="`similarity-slider-${_uid}`"
                  :model-value="[ttsSettings.similarity_boost]"
                  @update:model-value="val => { if (val && val.length > 0) ttsSettings.similarity_boost = val[0] }"
                  :min="0" :max="1" :step="0.05"
                  :default-value="[elevenLabsConfig.defaultSettings.similarity_boost ?? 0.75]"
                  class="my-2"
                />
                <p class="text-xs text-muted-foreground">Higher values boost resemblance to the original voice but may cause artifacts; default is recommended.</p>
              </div>

              <div v-if="isStyleSupported">
                <Label :for="`style-slider-${_uid}`">Style Exaggeration ({{ ttsSettings.style.toFixed(2) }})</Label>
                <Slider
                  :id="`style-slider-${_uid}`"
                  :model-value="[ttsSettings.style]"
                  @update:model-value="val => { if (val && val.length > 0) ttsSettings.style = val[0] }"
                  :min="0" :max="1" :step="0.05"
                  :default-value="[elevenLabsConfig.defaultSettings.style ?? 0]"
                  class="my-2"
                />
                <p class="text-xs text-muted-foreground">Boost the intensity of the speech style (only supported by some models).</p>
              </div>

              <div class="flex items-center space-x-2">
                <Switch id="speaker-boost-switch" v-model:checked="ttsSettings.use_speaker_boost" class=""/>
                <Label for="speaker-boost-switch">Use Speaker Boost</Label>
                <p class="text-xs text-muted-foreground ml-auto">Improves audio quality and pronunciation clarity (recommended).</p>
              </div>

            </div>
          </CollapsibleContent>
        </Collapsible>

        <!-- Generate & Playback Section -->
        <div class="space-y-4">
          <!-- Preset Texts Section -->
          <div>
            <Label class="block text-sm font-medium mb-1 text-gray-700">Load Preset Text:</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="(text, index) in presetTexts"
                :key="index"
                @click="elevenLabsInputText = text"
                variant="outline"
                size="sm"
                class="text-xs"
              >
                Preset {{ index + 1 }}
              </Button>
            </div>
          </div>

          <!-- Prompt Examples -->
          <div v-if="selectedVoiceConfig?.promptExamples && Object.keys(selectedVoiceConfig.promptExamples).length > 0">
            <Label class="block text-sm font-medium mb-1">Prompt Examples:</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="(prompt, key) in selectedVoiceConfig.promptExamples"
                :key="key"
                @click="loadPromptExample(prompt)"
                variant="outline"
                size="sm"
              >
                Load "{{ key }}"
              </Button>
            </div>
          </div>

          <div>
            <Label for="tts-input">Input Text</Label>
            <Textarea
              id="tts-input"
              v-model="elevenLabsInputText"
              placeholder="Enter text here to synthesize..."
              class="mt-1 min-h-[80px]"
              rows="4"
            />
          </div>

          <div class="flex flex-wrap gap-2 items-center">
            <Button @click="handleElevenLabsGenerate" :disabled="elevenLabsIsLoading">
              <Icon v-if="!elevenLabsIsLoading" name="ph:play-circle" class="mr-2 h-4 w-4" />
              <Icon v-else name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
              {{ elevenLabsIsLoading ? 'Generating...' : 'Generate Speech' }}
            </Button>
            <Button
              v-if="elevenLabsInputText"
              @click="elevenLabsInputText = ''"
              variant="outline"
            >
              Clear Text
            </Button>
          </div>

          <Alert v-if="elevenLabsError" variant="destructive">
            <Icon name="ph:warning-circle" class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {{ elevenLabsError }}
            </AlertDescription>
          </Alert>

          <div v-if="elevenLabsAudioUrl">
            <Label>Playback Generated Audio</Label>
            <audio controls :src="elevenLabsAudioUrl" class="w-full mt-1">
              Your browser does not support the audio element.
            </audio>
            <div class="flex gap-2 mt-2">
              <Button @click="clearElevenLabsAudio" variant="outline" size="sm">
                Clear Audio
              </Button>
              <Button v-if="elevenLabsAudioData" @click="downloadAudio" variant="outline" size="sm">
                <Icon name="ph:download-simple" class="mr-1 h-4 w-4" />
                Download MP3
              </Button>
            </div>
          </div>
        </div>

        <!-- Debug Log Section -->
        <div class="space-y-4">
          <Alert v-if="lastRequestPayload">
            <Icon name="ph:code" class="h-4 w-4" />
            <AlertTitle>Last Request Payload</AlertTitle>
            <AlertDescription>
              <pre class="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto">
                <code class="text-white">{{ JSON.stringify(lastRequestPayload, null, 2) }}</code>
              </pre>
            </AlertDescription>
          </Alert>
          <Alert v-if="lastResponseInfo" :variant="lastResponseInfo.ok ? 'default' : 'destructive'">
            <Icon :name="lastResponseInfo.ok ? 'ph:check-circle' : 'ph:warning-circle'" class="h-4 w-4" />
            <AlertTitle>Last Response Info</AlertTitle>
            <AlertDescription>
              <pre class="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto">
                <code class="text-white">{{ JSON.stringify(lastResponseInfo, null, 2) }}</code>
              </pre>
            </AlertDescription>
          </Alert>
          <Alert v-if="!lastRequestPayload && !lastResponseInfo">
            <Icon name="ph:info" class="h-4 w-4" />
            <AlertTitle>No Debug Information</AlertTitle>
            <AlertDescription>
              Generate speech once to see relevant request and response information here.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
// Vue imports
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'

// Composables and Config
import { useElevenLabsTTS } from '~/composables/useElevenLabsTTS'
import elevenlabsConfigImport, { getAllVoices, findVoiceById } from '~/config/elevenlabs' // Import config object directly
import type { Voice } from '~/types/voice'

// Shadcn-vue component imports
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// Define interface for debug info
interface LastResponseInfo {
  ok: boolean;
  status?: number;
  error?: string;
  message?: string;
  stack?: string;
  timestamp: string;
}

// Define page meta for title
definePageMeta({
  title: 'TTS Tool'
})

// --- ElevenLabs TTS State ---
const {
  audioUrl: elevenLabsAudioUrl,
  audioData: elevenLabsAudioData, // Get Blob data
  isLoading: elevenLabsIsLoading,
  error: elevenLabsError,
  generateTTS, // Use the base generator
  clearAudio: clearElevenLabsAudioBase,
} = useElevenLabsTTS()

const elevenLabsConfig = elevenlabsConfigImport // Use imported config
const availableVoices = ref<Voice.Config[]>([])
const selectedVoiceId = ref<string | undefined>(undefined)
const selectedModelId = ref<string | undefined>(undefined)
const elevenLabsInputText = ref('')

// Reactive object for TTS settings
const ttsSettings = ref({
  stability: elevenLabsConfig.defaultSettings.stability ?? 0.5, // Ensure initial number
  similarity_boost: elevenLabsConfig.defaultSettings.similarity_boost ?? 0.75, // Ensure initial number
  style: elevenLabsConfig.defaultSettings.style ?? 0, // Ensure initial number
  use_speaker_boost: elevenLabsConfig.defaultSettings.use_speaker_boost ?? true, // Ensure initial boolean
})

// Debugging state
const lastRequestPayload = ref<object | null>(null)
const lastResponseInfo = ref<LastResponseInfo | null>(null) // Apply the interface

// Preset Texts
const presetTexts = [
  "Hello, this is a test of the Eleven Labs text-to-speech synthesis.",
  "The quick brown fox jumps over the lazy dog.",
  "To be, or not to be, that is the question.",
  "Hello, this is a test in Chinese.", // 中文示例
];

// Get component instance uid for unique IDs
const instance = getCurrentInstance()
const _uid = instance?.uid || Math.random().toString(36).substring(7) // Fallback for unique ID

// --- Computed Properties ---
const selectedVoiceConfig = computed(() => {
  return selectedVoiceId.value ? findVoiceById(selectedVoiceId.value) : null
})

// Check if the currently selected (or default) model supports style exaggeration
const isStyleSupported = computed(() => {
  const model = selectedModelId.value || selectedVoiceConfig.value?.modelId
  // Adjust based on actual ElevenLabs model IDs that support style
  return model?.includes('eleven_multilingual_v2') || model?.includes('eleven_english_v2');
})

// --- Methods ---
const clearElevenLabsAudio = () => {
  clearElevenLabsAudioBase()
  lastRequestPayload.value = null // Clear debug info as well
  lastResponseInfo.value = null
}

// Load voices on mount
onMounted(async () => {
  availableVoices.value = getAllVoices()
  // Set default voice selection
  const defaultVoice = availableVoices.value.find(v => v.is_default) || availableVoices.value[0];
  if (defaultVoice) {
      handleVoiceChange(defaultVoice.id); // Use handleVoiceChange to set ID and update settings
  }
})

// Handle voice selection change
const handleVoiceChange = (voiceIdPayload: string | null | undefined | number | Record<string, any>) => {
  const voiceId = typeof voiceIdPayload === 'string' ? voiceIdPayload : undefined;

  if (!voiceId) {
    selectedVoiceId.value = undefined
    Object.assign(ttsSettings.value, elevenLabsConfig.defaultSettings); // Use .value here
    selectedModelId.value = undefined; // Reset to undefined
    return;
  }
  selectedVoiceId.value = voiceId
  const voice = findVoiceById(voiceId)
  if (voice) {
    Object.assign(ttsSettings.value, { ...elevenLabsConfig.defaultSettings, ...voice.settings }); // Use .value here
    selectedModelId.value = undefined; // Reset model override to undefined when voice changes
     if (!isStyleSupported.value) {
        ttsSettings.value.style = 0; // Reset style if not supported by the new voice/model
     }
  }
}

// Load prompt example into textarea
const loadPromptExample = (prompt: string) => {
  elevenLabsInputText.value = prompt
}

// Handle TTS generation click
const handleElevenLabsGenerate = async () => {
  if (!elevenLabsInputText.value || !selectedVoiceId.value) {
    elevenLabsError.value = 'Please select a voice and enter text.'
    return
  }

  const voiceConfig = selectedVoiceConfig.value;
  if (!voiceConfig) {
     elevenLabsError.value = 'Could not find configuration for the selected voice.'
     return;
  }

  // Prepare voiceSettings explicitly matching the stricter type expected by useElevenLabsTTS
  const finalVoiceSettings: {
      stability: number;
      similarity_boost: number;
      style?: number;
      use_speaker_boost?: boolean;
  } = {
      stability: ttsSettings.value.stability ?? elevenLabsConfig.defaultSettings.stability ?? 0.5, // Ensure number
      similarity_boost: ttsSettings.value.similarity_boost ?? elevenLabsConfig.defaultSettings.similarity_boost ?? 0.75, // Ensure number
      use_speaker_boost: ttsSettings.value.use_speaker_boost ?? true,
      // Conditionally add style only if supported and has a value > 0
      ...(isStyleSupported.value && (ttsSettings.value.style ?? 0) > 0 && { style: ttsSettings.value.style ?? 0 })
  };

  // Prepare options for generateTTS
  const options = {
    voiceId: selectedVoiceId.value, // Should always have a value here due to earlier check
    modelId: selectedModelId.value || voiceConfig.modelId || elevenLabsConfig.models.multilingual,
    voiceSettings: finalVoiceSettings
  };

  // Store request payload for debugging (ensure it uses the final processed options)
  lastRequestPayload.value = {
    text: elevenLabsInputText.value.substring(0, 500),
    voiceId: options.voiceId,
    modelId: options.modelId,
    voiceSettings: options.voiceSettings
  }
  lastResponseInfo.value = null // Clear previous response info

  try {
    // Ensure options passed match the expected TTSOptions structure from the composable
    await generateTTS(elevenLabsInputText.value, {
        voiceId: options.voiceId,
        modelId: options.modelId,
        voiceSettings: options.voiceSettings // Pass the strictly typed object
    })
    if (!elevenLabsError.value) {
       lastResponseInfo.value = { ok: true, status: 200, timestamp: new Date().toISOString() }
    } else {
       lastResponseInfo.value = { ok: false, error: elevenLabsError.value ?? 'Unknown error after generation', timestamp: new Date().toISOString() }
    }
  } catch(err: any) {
      console.error("Error during TTS generation:", err);
      const errorMsg = err.message || 'An unexpected error occurred during generation.';
      elevenLabsError.value = errorMsg;
      lastResponseInfo.value = { ok: false, error: errorMsg, message: err.message, stack: err.stack, timestamp: new Date().toISOString() }
  }
}

// Download audio function
const downloadAudio = () => {
  if (!elevenLabsAudioData.value) return;
  const url = URL.createObjectURL(elevenLabsAudioData.value);
  const a = document.createElement('a');
  a.href = url;
  const voiceName = selectedVoiceConfig.value?.name?.replace(/\s+/g, '_') || 'audio';
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  a.download = `elevenlabs_${voiceName}_${timestamp}.mp3`; // Assuming MP3 format
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Watch for style support changes
watch(isStyleSupported, (newVal) => {
  if (!newVal && ttsSettings.value.style > 0) {
    // Reset style if it becomes unsupported
    // ttsSettings.value.style = 0; // Optionally reset the value
  }
});

// State for Collapsible config section
const isConfigOpen = ref(false)

</script>

<style scoped>
/* Style for debug pre blocks */
pre {
  white-space: pre-wrap;       /* CSS 3 */
  white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
  white-space: -pre-wrap;      /* Opera 4-6 */
  white-space: -o-pre-wrap;    /* Opera 7 */
  word-wrap: break-word;       /* Internet Explorer 5.5+ */
  font-family: 'Courier New', Courier, monospace; /* Monospaced font */
  font-size: 0.8rem; /* Slightly smaller font */
  line-height: 1.4;
}
code {
 font-family: 'Courier New', Courier, monospace; /* Ensure code block uses monospace */
}
</style>