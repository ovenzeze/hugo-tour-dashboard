<template>
  <div class="h-full flex flex-col"> 
    <div class="max-w-7xl mx-auto px-4 w-full flex-1 flex flex-col"> 
      <div class="mb-8">

      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">

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
            <Label for="system-prompt-display" class="font-medium">System Prompt</Label>
            <div 
              id="system-prompt-display" 
              class="mt-1 p-3 bg-muted/40 dark:bg-muted/30 rounded-md border border-dashed text-sm text-muted-foreground min-h-[100px] whitespace-pre-wrap select-text"
            >
              {{ systemPrompt }}
            </div>
          </div>

          <div>
            <Label for="user-instruction">User Instruction</Label>
            <Textarea
              id="user-instruction"
              v-model="userInstruction"
              placeholder="e.g., Story of Notre Dame (Renaissance) with 3 scholars: Prof. A (Architectural Historian), Dr. V (Art Historian), Leo (Social Historian). Detail their discussion points..."
              class="mt-1 min-h-[100px]"
            />
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
            :selected-persona-id="selectedPersonaId !== null ? String(selectedPersonaId) : undefined"
            @generate-script="handleGenerateScript"
            @preview-audio="handleRealtimePreview"
            @synthesize-audio="handleSynthesize"
            @toggle-play="togglePlayPause"
            @download-audio="downloadAudio"
            @reset-content="handleReset"
            @audio-ended="() => { isPlaying = false; }"
            @audio-played="() => { isPlaying = true; }"
            @audio-paused="() => { isPlaying = false; }"
          />

          <!-- Hidden Audio element for real-time preview -->
          <audio ref="previewAudioPlayer" style="display: none;" @ended="() => isPlaying = false" @play="() => isPlaying = true" @pause="() => isPlaying = false"></audio>

          <!-- Main Audio Player (controlled by PlaygroundToolbar via audioUrl prop) -->
          <audio ref="audioPlayer" style="display: none;" @ended="() => isPlaying = false" @play="() => isPlaying = true" @pause="() => isPlaying = false"></audio>

          <!-- Text Input Section - this should grow -->
          <div class="flex-1 flex flex-col flex-grow space-y-2 min-h-0">
            <p v-if="scriptGenerationError" class="text-sm text-red-500 dark:text-red-400 mt-1">{{ scriptGenerationError }}</p>
            <p v-if="synthesisError" class="text-sm text-red-500 dark:text-red-400 mt-1">{{ synthesisError }}</p>
            <Textarea
              id="text-to-synthesize"
              v-model="textToSynthesize"
              placeholder="Write something to synthesize or generate a script using the AI button above..."
              class="flex-1 min-h-0"
            />
          </div>
        </div>

      </div> <!-- grid 结束 -->
    </div> <!-- max-w-7xl 结束 -->
  </div> <!-- min-h-screen 结束 -->

</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
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
import PlaygroundToolbar from '~/components/PlaygroundToolbar.vue';
import type { Tables } from '~/types/supabase'; // Import generated types

// Use Supabase generated type for Persona directly
type Persona = Tables<'personas'>;

interface VoiceProvider {
  id: string;
  name: string;
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
const selectedPersonaId = ref<Persona['persona_id'] | null>(null); // Use persona_id from generated type
const outputFilename = ref('');
const userInstruction = ref("Create a script about Notre Dame Cathedral in Paris during the Renaissance. The discussion should involve three scholars:\n- Professor Armand: An established architectural historian, detailing the structural changes and Gothic-to-Renaissance transitions of the cathedral.\n- Dr. Vivienne: A passionate art historian, focusing on the new artworks, stained glass, and decorative elements introduced or influenced by the Renaissance.\n- Leo: A young, enthusiastic social historian, bringing to life the human stories, events, and daily activities around Notre Dame during this period.\nEnsure their dialogue reflects their respective expertise and perspectives, creating an engaging historical narrative.");
const systemPrompt = ref("Generate a script for a commentary or presentation. This could involve a single host, multiple hosts, or even a round-table discussion format. The output should be the script itself, suitable for text-to-speech.");

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

const previewAudioPlayer = ref<HTMLAudioElement | null>(null); // For real-time preview stream
const currentPreviewAbortController = ref<AbortController | null>(null); // For aborting preview

const mediaSource = ref<MediaSource | null>(null); // To hold the native MediaSource object
const sourceBuffer = ref<SourceBuffer | null>(null); // To hold the SourceBuffer

const selectedVoiceId = ref<string | undefined>(); // Ensuring this is correctly defined

onMounted(async () => {
  await fetchPersonas();
});

onUnmounted(() => {
  if (currentPreviewAbortController.value) {
    currentPreviewAbortController.value.abort();
    console.log('[Unmounted] Aborted active preview stream.');
    currentPreviewAbortController.value = null;
  }
  if (mediaSource.value) {
    mediaSource.value.removeEventListener('sourceopen', () => {});
    mediaSource.value.removeEventListener('sourceended', () => {});
    mediaSource.value.removeEventListener('sourceclose', () => {});
  }
  if (typeof audioUrl.value === 'string' && audioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl.value);
  }
});

async function fetchPersonas() {
  personasLoading.value = true;
  try {
    const data = await $fetch<Persona[]>('/api/personas'); 
    personas.value = data.filter(p => p.is_active);
    if (personas.value.length === 0) {
        toast.info('No active personas found.', {
          description: 'Please create or activate a persona first.',
        });
    } else if (personas.value.length > 0 && !selectedPersonaId.value) {
      const firstPersona = personas.value[0];
      if (firstPersona && typeof firstPersona.persona_id === 'number') { // Use persona_id
        selectedPersonaId.value = firstPersona.persona_id;
      } else {
        console.warn('First active persona does not have a valid persona_id field according to generated types.');
      }
    }
  } catch (e: any) {
    console.error('Failed to fetch personas:', e);
    toast.error('Failed to fetch personas', {
      description: e.message || 'Unknown error',
    });
  }
  personasLoading.value = false;
}

async function handleGenerateScript() {
  if (!selectedPersonaId.value) {
    toast.warning('Please select a Persona first.', {
      description: 'This will help generate a script tailored to their style.',
    });
    return;
  }
  isGeneratingScript.value = true;
  scriptGenerationError.value = null;
  try {
    const response = await $fetch<{ script: string }>('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, 
      body: {
        personaId: selectedPersonaId.value,
        providerId: selectedProvider.value,
        system_prompt: systemPrompt.value,   // Pass the system prompt
        user_prompt: userInstruction.value, // Pass the user-specific instruction
      },
    } as any); 

    console.log('API Response for generate-script:', response); // Add this line to inspect

    textToSynthesize.value = response.script;
    toast.success('Script generated successfully!');

  } catch (e: any) {
    console.error('Failed to generate script:', e);
    const errorMessage = e.data?.message || e.message || 'An unknown error occurred during script generation.';
    scriptGenerationError.value = errorMessage;
    toast.error('Error Generating Script', {
      description: errorMessage || 'Failed to generate script.',
    });
  } finally {
    isGeneratingScript.value = false;
  }
}

async function handleRealtimePreview() {
  if (!textToSynthesize.value || !selectedPersonaId.value) {
    toast.warning('Please enter text and select a persona.');
    return;
  }

  // Abort any existing preview before starting a new one
  if (currentPreviewAbortController.value) {
    currentPreviewAbortController.value.abort();
    console.log('[Preview] Aborted previous preview stream.');
    // currentPreviewAbortController.value will be set to null in the finally block of the aborted fetch
  }

  currentPreviewAbortController.value = new AbortController();
  const signal = currentPreviewAbortController.value.signal; // Capture signal for this specific call

  isSynthesizing.value = true; // Start of synthesis process
  synthesisError.value = null;

  // Stop any currently playing audio from the preview player
  if (previewAudioPlayer.value && !previewAudioPlayer.value.paused) {
    previewAudioPlayer.value.pause();
  }
  // Reset MediaSource if it was previously used
  if (mediaSource.value && mediaSource.value.readyState === 'open') {
    mediaSource.value.endOfStream();
  }
  if (!mediaSource.value) {
    // If not open (e.g. 'closed'), try to (re)start it with the element.
    // This should ideally be 'open' after onMounted.
    mediaSource.value = new MediaSource();
    if (previewAudioPlayer.value) {
      previewAudioPlayer.value.src = URL.createObjectURL(mediaSource.value);
    }
  }
  
  // Wait for MediaSource to be ready (state is 'open' and sourceBuffer exists)
  // This might require a short delay or a watchEffect.
  await nextTick(); // Give Vue a chance to update DOM and for onMounted to run if not yet.
  
  try {
    mediaSource.value = new MediaSource();
    if (previewAudioPlayer.value) {
      previewAudioPlayer.value.src = URL.createObjectURL(mediaSource.value);
      previewAudioPlayer.value.load(); // Important to load the new source
    } else {
      throw new Error("Preview audio player is not available.");
    }

    mediaSource.value.addEventListener('sourceopen', async () => {
      console.log('MediaSource opened');
      if (!mediaSource.value) return;

      try {
        sourceBuffer.value = mediaSource.value.addSourceBuffer('audio/mpeg');
        const response = await fetch('/api/tts/stream-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToSynthesize.value,
            voiceId: selectedVoiceId.value || undefined, 
            providerId: selectedProvider.value, // Pass current provider
          }),
          signal, 
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: `HTTP error! status: ${response.status}`,
            provider_error: null // Default structure if JSON parsing fails
          }));
          // Create an error object that potentially carries more structured data
          const err = new Error(errorData.message || `HTTP error! status: ${response.status}`);
          (err as any).provider_error = errorData.provider_error || (errorData.detail ? errorData : null) || errorData; // Attach provider_error or details
          (err as any).status = response.status;
          throw err;
        }

        const contentType = response.headers.get('Content-Type');
        console.log('Stream Content-Type:', contentType);
        toast.info(`Stream Content-Type: ${contentType}`);

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        previewAudioPlayer.value?.play().catch(e => console.warn('Autoplay prevented:', e));

        sourceBuffer.value.addEventListener('updateend', async () => {
          const { done, value } = await reader.read();
          if (done) {
            if (mediaSource.value && mediaSource.value.readyState === 'open') {
              mediaSource.value.endOfStream();
            }
            isSynthesizing.value = false;
            toast.success('Audio stream finished.');
            return;
          }
          if (value && sourceBuffer.value && !sourceBuffer.value.updating) {
            try {
              sourceBuffer.value.appendBuffer(value);
            } catch (e: any) {
              console.error('Error appending buffer:', e);
              synthesisError.value = `Error appending buffer: ${e.message}`;
              toast.error(synthesisError.value);
              if (mediaSource.value && mediaSource.value.readyState === 'open') {
                mediaSource.value.endOfStream(); // Or mediaSource.sourceBuffer.abort() ?
              }
              isSynthesizing.value = false;
            }
          }
        });

        // Kick off the first read
        const { done, value } = await reader.read();
        if (done) {
          if (mediaSource.value && mediaSource.value.readyState === 'open') {
            mediaSource.value.endOfStream();
          }
          isSynthesizing.value = false;
          toast.success('Audio stream finished (empty stream).');
          return;
        }
        if (value && sourceBuffer.value && !sourceBuffer.value.updating) {
          sourceBuffer.value.appendBuffer(value);
        }

      } catch (err: any) {
        console.error('Streaming fetch error:', err);
        let displayMessage = err.message;
        const providerError = (err as any).provider_error;

        if (err.name === 'AbortError') {
          console.log('[Preview] Fetch aborted by user or new request.');
          // No toast or error message for user-initiated aborts
        } else {
          if (providerError) {
            // Try to get a more specific message if provider_error details are available
            // This structure depends on what your backend /api/tts/stream-preview.post.ts sends
            const elStatus = providerError.status || providerError.status_code;
            const elMessage = providerError.detail_message || providerError.message || providerError.detail?.message;

            if (elStatus === 'quota_exceeded' || (typeof elMessage === 'string' && elMessage.toLowerCase().includes('quota'))) {
              displayMessage = 'Live Preview Failed: API quota exceeded.';
              if (elMessage) {
                displayMessage += ` (Details: ${elMessage})`;
              }
              console.error('Detailed Provider Error (Quota Exceeded):', providerError);
            } else if (elMessage) {
              displayMessage = `Preview API Error: ${elMessage}`;
              console.error('Detailed Provider Error:', providerError);
            } else {
              displayMessage = `Preview API Error: ${err.message || 'An unexpected error occurred during streaming.'}`;
            }
          } else {
            // Generic error message if no providerError details
            displayMessage = err.message || 'An unknown error occurred during streaming.';
          }

          synthesisError.value = displayMessage;
          toast.error('Preview Error', { 
            description: displayMessage, 
            duration: 8000 // Longer duration for errors
          });
        }

        if (mediaSource.value && mediaSource.value.readyState === 'open') {
          mediaSource.value.endOfStream();
        }
      }
    });

    mediaSource.value.addEventListener('sourceended', () => {
      console.log('MediaSource ended');
      isSynthesizing.value = false;
    });

    mediaSource.value.addEventListener('sourceclose', () => {
      console.log('MediaSource closed');
      isSynthesizing.value = false;
    });
  } catch (e: any) {
    // This catch is for errors during MediaSource setup or player interaction before streaming starts
    console.error('Error setting up MediaSource or player:', e);
    toast.error('Preview Setup Error', { description: e.message });
    isSynthesizing.value = false;
    if (currentPreviewAbortController.value && currentPreviewAbortController.value.signal === signal) {
      currentPreviewAbortController.value.abort(); // Abort the fetch if setup fails
      currentPreviewAbortController.value = null;
    }
  } finally {
    isSynthesizing.value = false;
    // Only nullify the controller if it's the one associated with this call
    // and it hasn't been replaced by a newer call already.
    if (currentPreviewAbortController.value && currentPreviewAbortController.value.signal === signal) {
      currentPreviewAbortController.value = null;
    }
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
    // Find the selected persona to get its language
    const currentPersona = personas.value.find(p => p.persona_id === selectedPersonaId.value);
    
    // Determine the language to save.
    // 'currentPersona.language_support' is expected to be string[] | null based on types/supabase.ts
    let languageToSave = 'en'; // Default language
    if (currentPersona?.language_support && Array.isArray(currentPersona.language_support) && currentPersona.language_support.length > 0) {
      languageToSave = currentPersona.language_support[0]; // Use the first language from the array
    }
    // Ensure the codes in language_support are appropriate for saving (e.g., 'en', 'zh-CN')

    // Step 1: Save the transcript to the database
    const transcriptPayload = {
      transcript: textToSynthesize.value, 
      persona_id: Number(selectedPersonaId.value), 
      language: languageToSave, // Use the determined single language string
      museum_id: 4, // Associate with the 'Playground Sandbox Museum'
      gallery_id: null, // Explicitly set to null
      object_id: null,  // Explicitly set to null
      // title: outputFilename.value || `Playground Script ${new Date().toISOString()}`, // Optional: consider a title
    };

    // Backend expects an object, not specifically {id: ...}. Frontend receives the full object.
    const createdTranscript = await $fetch<Tables<'guide_texts'>>('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: transcriptPayload,
    } as any); // Cast to 'any' to bypass strict $fetch typing if backend returns more than just ID

    if (!createdTranscript || !createdTranscript.guide_text_id) { // Use guide_text_id from the response
      throw new Error('Failed to save transcript or received invalid ID.');
    }
    createdGuideTextId = createdTranscript.guide_text_id; // Assign guide_text_id
    toast.success('Transcript Saved', { 
      description: `Transcript saved with ID: ${createdGuideTextId}`,
    });

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
      personaId: String(selectedPersonaId.value), // Convert number to string
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
    toast.success('Audio synthesized!', {
      description: `Duration: ${ttsResponse.duration.toFixed(2)}s. Audio ID: ${ttsResponse.guideAudioId}`,
    });
    isPlaying.value = false;
  } catch (e: any) {
    console.error('Synthesis process failed:', e);
    const errorMessage = e.data?.message || e.data?.statusMessage || e.message || 'An unknown error occurred during synthesis.';
    synthesisError.value = errorMessage;
    toast.error('Synthesis Error', {
      description: errorMessage || 'An unknown error occurred.',
    });
  } finally {
    isSynthesizing.value = false;
  }
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
  textToSynthesize.value = '';
  outputFilename.value = '';
  synthesisError.value = null;
  scriptGenerationError.value = null;
  isSynthesizing.value = false;
  isGeneratingScript.value = false;

  // Abort any active preview stream
  if (currentPreviewAbortController.value) {
    currentPreviewAbortController.value.abort();
    console.log('[Reset] Aborted active preview stream.');
    currentPreviewAbortController.value = null;
  }

  // Stop and reset the preview audio player
  if (previewAudioPlayer.value) {
    previewAudioPlayer.value.pause();
    previewAudioPlayer.value.currentTime = 0;
    if (previewAudioPlayer.value.src && previewAudioPlayer.value.src.startsWith('blob:')) {
      URL.revokeObjectURL(previewAudioPlayer.value.src);
    }
    previewAudioPlayer.value.src = ''; // Clear the source
    // If using MediaSource, ensure it's properly cleaned up too, if necessary
    // For example, detach from player, remove source buffers if not handled by 'sourceended' or 'sourceclose'
  }

  // Resetting audioUrl and isPlaying should be sufficient for the main player in PlaygroundToolbar
  if (audioUrl.value && audioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl.value);
  }
  audioUrl.value = null;
  isPlaying.value = false;

  toast.info('Playground Reset', { description: 'All inputs and outputs have been cleared.' });
}

function downloadAudio() {
  if (audioUrl.value) {
    const link = document.createElement('a');
    link.href = audioUrl.value;
    // Try to get filename from URL, or fallback to a generic name
    let filename = outputFilename.value || 'playground_audio.mp3';
    try {
      const urlObj = new URL(audioUrl.value);
      const pathSegments = urlObj.pathname.split('/');
      const lastSegment = pathSegments.pop();
      if (lastSegment && lastSegment.includes('.')) { // basic check for extension
        filename = lastSegment;
      }
    } catch (e: any) { /* ignore if URL parsing fails, use default */ }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download Started', {
      description: `Downloading ${filename}`,
    });
  } else {
    toast.error('No Audio', {
      description: 'No audio available to download.',
    });
  }
}

// Watch for persona changes to update available voices if providers differ
watch(selectedPersonaId, async (newPersonaId) => {
  // Ensure newPersonaId is not null or undefined before proceeding
  if (newPersonaId !== null && newPersonaId !== undefined) {
    // Convert newPersonaId to number if it's a string, as persona_id in the array is a number
    const targetId = typeof newPersonaId === 'string' ? parseInt(newPersonaId, 10) : newPersonaId;

    // Check if parsing resulted in NaN (e.g., if newPersonaId was an unexpected non-numeric string)
    if (isNaN(targetId)) {
      console.warn(`[Watch selectedPersonaId] Invalid persona ID received: "${newPersonaId}". Could not parse to a number.`);
      selectedVoiceId.value = undefined; // Clear related state
      // Optionally, inform the user or reset selectedProvider
      return; // Exit if ID is not valid
    }

    const persona = personas.value.find(p => p.persona_id === targetId);

    if (persona) {
      // Match the user's log format for easier debugging comparison
      console.log(`[Watch selectedPersonaId] Found persona for ID ${targetId}:`, JSON.parse(JSON.stringify(persona)));
      console.log(`[Watch selectedPersonaId] Persona.voice_model_identifier: ${persona.voice_model_identifier} Type: ${typeof persona.voice_model_identifier}`);
      
      selectedVoiceId.value = persona.voice_model_identifier ?? undefined; // Handle null by converting to undefined

      // Update selectedProvider based on persona's tts_provider, if available
      // Use optional chaining for tts_provider as it might not exist on the type yet
      const personaTtsProvider = (persona as any)?.tts_provider;
      if (personaTtsProvider) {
        const providerExists = providers.value.some(prov => prov.id === personaTtsProvider);
        if (providerExists) {
          selectedProvider.value = personaTtsProvider;
          console.log(`[Watch selectedPersonaId] Switched provider to: ${personaTtsProvider} based on persona settings.`);
        } else {
          console.warn(`[Watch selectedPersonaId] Persona's TTS provider "${personaTtsProvider}" is not in the available providers list. Current provider "${selectedProvider.value}" will be used.`);
        }
      } else {
        console.log(`[Watch selectedPersonaId] Persona does not have a specific TTS provider. Using current provider: ${selectedProvider.value}`);
      }

    } else {
      // Match the user's log format
      console.log(`[Watch selectedPersonaId] No persona found for ID: ${targetId}`);
      selectedVoiceId.value = undefined;
    }
  } else {
    // newPersonaId is null or undefined, so reset dependent values
    console.log('[Watch selectedPersonaId] newPersonaId is null or undefined. Clearing selectedVoiceId.');
    selectedVoiceId.value = undefined;
  }
});

</script>

<style scoped>
/* Custom scrollbar for textarea if needed, though shadcn/ui usually handles this well */
/* Ensure sliders are styled correctly in dark mode if default styles conflict */
</style>