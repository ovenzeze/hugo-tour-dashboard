<template>
  <div class="h-full w-full flex flex-col px-4 py-4">
      <div class="mb-8">
        <!-- Placeholder for any top-level controls or titles if needed -->
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        <!-- 左侧 Setting 面板，内部Tabs切换 -->
        <Card class="lg:col-span-1 flex flex-col h-full">
          <CardHeader>
            <CardTitle>Setting</CardTitle>
          </CardHeader>
          <CardContent class="flex-1 overflow-y-auto p-6">
            <Tabs v-model="activeTab" class="w-full">
              <TabsList class="mb-4 w-full">
                <TabsTrigger value="standard" class="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Icon name="material-symbols:voice-over-off" class="mr-2" />
                  Standard Synthesis
                </TabsTrigger>
                <TabsTrigger value="podcast" class="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  <Icon name="material-symbols:podcasts" class="mr-2" />
                  Podcast Creation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="standard" class="transition-all duration-300 space-y-4">
                <div class="space-y-4">
                  <Select v-model="selectedProvider" class="w-full">
                    <SelectTrigger id="provider" class="w-full">
                      <SelectValue placeholder="Select voice provider" />
                    </SelectTrigger>
                    <SelectContent class="">
                      <SelectItem v-for="provider in providers" :key="provider.id" :value="provider.id" class="dark:hover:bg-gray-700">
                        {{ provider.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select v-model="selectedPersonaId" :disabled="!selectedProvider || personasLoading || personas.length === 0" class="w-full">
                    <SelectTrigger id="persona" class="w-full">
                      <SelectValue placeholder="Select a persona" />
                    </SelectTrigger>
                    <SelectContent>
                      <p v-if="personasLoading" class="p-2 text-sm text-gray-500 dark:text-gray-400">Loading personas...</p>
                      <SelectItem v-else v-for="persona in personas" :key="persona.persona_id" :value="String(persona.persona_id)" class="dark:hover:bg-gray-700">
                        {{ persona.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div class="space-y-4">
                    <div class="flex flex-col">
                      <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>Temperature</span>
                        <span>{{ synthesisParams.temperature.toFixed(2) }}</span>
                      </div>
                      <Slider id="temperature" :min="0" :max="1" :step="0.01" v-model="synthesisParams.temperatureArray" class="dark:[&>span:first-child]:bg-primary [&>span:first-child_span]:bg-primary" />
                    </div>
                    <div class="flex flex-col">
                      <div class="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>Speed</span>
                        <span>{{ synthesisParams.speed.toFixed(2) }}x</span>
                      </div>
                      <Slider id="speed" :min="0.5" :max="2" :step="0.05" v-model="synthesisParams.speedArray" class="dark:[&>span:first-child]:bg-primary [&>span:first-child_span]:bg-primary" />
                    </div>
                  </div>
                  <div>
                    <Label for="system-prompt-display" class="font-medium mb-2">System Prompt</Label>
                    <div
                      id="system-prompt-display"
                      class="p-3 bg-muted/40 dark:bg-muted/30 rounded-md border border-dashed text-sm text-muted-foreground min-h-[100px] whitespace-pre-wrap select-text"
                    >
                      {{ systemPrompt }}
                    </div>
                  </div>
                  <div>
                    <Label for="user-instruction" class="font-medium mb-2">User Instruction</Label>
                    <Textarea
                      id="user-instruction"
                      v-model="userInstruction"
                      placeholder="e.g., Story of Notre Dame (Renaissance) with 3 scholars: Prof. A (Architectural Historian), Dr. V (Art Historian), Leo (Social Historian). Detail their discussion points..."
                      class="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label for="output-filename" class="text-gray-700 dark:text-gray-300 mb-2">Output Filename (Optional)</Label>
                    <Input id="output-filename" v-model="outputFilename" placeholder="e.g., intro_audio.mp3" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="podcast" class="space-y-6">
                <PodcastSettings 
                  :personas="personas"
                  :personas-loading="personasLoading"
                  :providers="providers"
                  :current-selected-provider="selectedProvider"
                  @update:selectedProvider="val => selectedProvider = val" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <!-- 右侧输入与操作面板，始终显示 -->
        <div class="h-full lg:col-span-2 p-0 rounded-lg shadow-md flex flex-col space-y-6">
          <PlaygroundToolbar
            ref="toolbarRef"
            :is-generating-script="isGeneratingScript"
            :is-synthesizing="isSynthesizing"
            :can-preview-or-synthesize="!!(textToSynthesize && selectedPersonaId)"
            :audio-url="audioUrl"
            :is-playing="isPlaying"
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
          <AudioHandler
            ref="audioHandlerRef"
            :toolbar-ref="toolbarRef"
            :text-to-synthesize="textToSynthesize"
            :selected-persona-id="selectedPersonaId"
            :selected-provider="selectedProvider"
            :synthesis-params="synthesisParams"
            :output-filename="outputFilename"
            @error="(message) => toast.error('Error', { description: message })"
            @success="(message) => toast.success(message)"
            @audio-synthesized="(url) => audioUrl = url"
          />
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
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { toast } from 'vue-sonner';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import PlaygroundToolbar from '@/components/PlaygroundToolbar.vue';
import AudioHandler from '@/components/audio/AudioHandler.vue';
import PodcastSettings from '@/components/playground/PodcastSettings.vue';
import { usePlaygroundStore } from '@/stores/playground';
import type { Database } from '@/types/supabase'; // Import Database type
import { useSupabaseClient } from '#imports';

// Define Persona type from Database schema
type Persona = Database['public']['Tables']['personas']['Row'];

interface VoiceProvider {
  id: string;
  name: string;
}

const supabase = useSupabaseClient<Database>();
const playgroundStore = usePlaygroundStore();

const textToSynthesize = ref('');
const synthesisParams = reactive({
  temperature: 0.5,
  speed: 1.0,
  get temperatureArray() { return [this.temperature]; },
  set temperatureArray(val: number[]) { this.temperature = val[0]; },
  get speedArray() { return [this.speed]; },
  set speedArray(val: number[]) { this.speed = val[0]; },
});

const activeTab = ref<'standard' | 'podcast'>('podcast');
const audioHandlerRef = ref<any>(null);
const selectedProvider = ref<string | undefined>('elevenlabs');
const selectedPersonaId = ref<Persona['persona_id'] | null>(null);
const outputFilename = ref('');
const userInstruction = ref('');
const scriptGenerationError = ref<string | null>(null);
const synthesisError = ref<string | null>(null);

const audioUrl = ref<string | null>(null);
const isPlaying = ref(false);
const previewAudioPlayer = ref<HTMLAudioElement | null>(null);
const audioPlayer = ref<HTMLAudioElement | null>(null);
const toolbarRef = ref<InstanceType<typeof PlaygroundToolbar> | null>(null);

const isGeneratingScript = ref(false);
const isSynthesizing = ref(false);
const isPreviewing = ref(false);

const personas = ref<Persona[]>([]);
const personasLoading = ref(false);

const providers: VoiceProvider[] = [
  { id: 'elevenlabs', name: 'ElevenLabs' },
];

const systemPrompt = computed(() => {
  if (activeTab.value === 'standard') {
    if (!selectedPersonaId.value) return 'Please select a persona.';
    const persona = personas.value.find((p: Persona) => String(p.persona_id) === String(selectedPersonaId.value));
    return persona?.system_prompt || 'No system prompt available for this persona.';
  }
  return 'Select a persona or configure podcast cast to see system prompts.';
});

const fetchPersonas = async () => {
  if (!selectedProvider.value) return;
  personasLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .order('name');
    if (error) throw error;
    personas.value = data || [];
    if (!personas.value.find((p: Persona) => String(p.persona_id) === String(selectedPersonaId.value))) {
      selectedPersonaId.value = null;
    }
  } catch (err: any) {
    toast.error('Failed to load personas', { description: err.message });
    personas.value = [];
  } finally {
    personasLoading.value = false;
  }
};

watch(selectedProvider, fetchPersonas, { immediate: true });
onMounted(fetchPersonas);

const selectedPersonaVoiceId = computed(() => {
  if (!selectedPersonaId.value) return null;
  const persona = personas.value.find((p: Persona) => String(p.persona_id) === String(selectedPersonaId.value));
  return persona?.voice_id_elevenlabs;
});

const handleGenerateScript = async () => {
  if (isGeneratingScript.value) return;

  scriptGenerationError.value = null;
  isGeneratingScript.value = true;
  textToSynthesize.value = ''; // Clear previous script

  try {
    if (activeTab.value === 'standard') {
      if (!userInstruction.value) {
        scriptGenerationError.value = 'User instruction cannot be empty for standard script generation.';
        return;
      }
      if (!selectedPersonaId.value) {
        scriptGenerationError.value = 'Please select a persona for standard script generation.';
        return;
      }
      // Existing standard script generation logic
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: userInstruction.value,
          persona_id: selectedPersonaId.value,
          // Potentially send other params like temperature if your API supports it
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate script.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      textToSynthesize.value = data.script;
      toast.success('Script generated successfully!');

    } else if (activeTab.value === 'podcast') {
      // New podcast script generation logic
      const {
        podcastProviderId,
        podcastHostPersonaId,
        podcastGuestPersonaId,
        podcastInstruction,
      } = playgroundStore;

      if (!podcastInstruction) {
        scriptGenerationError.value = 'Podcast instruction cannot be empty.';
        return;
      }
      if (!podcastProviderId) {
        scriptGenerationError.value = 'Please select a voice provider for the podcast.';
        return;
      }
      if (!podcastHostPersonaId) {
        scriptGenerationError.value = 'Please select a host persona for the podcast.';
        return;
      }
      // Guest persona can be optional, depending on requirements. For now, let's assume it might be.
      // if (!podcastGuestPersonaId) {
      //   scriptGenerationError.value = 'Please select a guest persona for the podcast.';
      //   return;
      // }

      const podcastParams = {
        provider_id: podcastProviderId,
        host_persona_id: podcastHostPersonaId,
        guest_persona_id: podcastGuestPersonaId, // Will be null if not selected
        instruction: podcastInstruction,
        // The system prompt from PodcastSettings is fixed and backend might have its own or it can be passed
        // system_prompt: "Use the preset podcast system prompt..." // Or retrieve from store if made dynamic
      };

      const response = await fetch('/api/generate-podcast.post.ts', { // Ensure the endpoint is correct
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(podcastParams),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate podcast script.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.script) {
        textToSynthesize.value = data.script;
        toast.success('Podcast script generated successfully!');
      } else {
        throw new Error(data.message || 'Podcast script generation failed to return a script.');
      }
    }
  } catch (err: any) {
    console.error('Error generating script:', err);
    scriptGenerationError.value = err.message || 'An unexpected error occurred.';
    toast.error('Script Generation Failed', { description: err.message });
  } finally {
    isGeneratingScript.value = false;
  }
};

const streamAndPlayAudio = async (response: Response, player: HTMLAudioElement | null) => {
  if (!response.body || !player) {
    throw new Error('Response body or audio player is not available.');
  }

  player.pause();
  player.currentTime = 0;
  if (player.src && player.src.startsWith('blob:')) {
    URL.revokeObjectURL(player.src);
  }
  player.src = ''; 

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'audio/mpeg' });
  const objectUrl = URL.createObjectURL(blob);
  player.src = objectUrl;
  await player.play();
  return objectUrl; 
};


const handleRealtimePreview = async () => {
  if (!selectedPersonaId.value || !textToSynthesize.value || isPreviewing.value) {
    toast.warning('Please select a persona and enter some text to preview.');
    return;
  }

  const voiceId = selectedPersonaVoiceId.value;
  if (!voiceId) {
    toast.error('Selected persona does not have an associated voice ID.');
    return;
  }

  isPreviewing.value = true;
  synthesisError.value = null;
  if (toolbarRef.value) toolbarRef.value.setAudioPlayerSource(null); 

  try {
    const response = await fetch('/api/tts/stream-preview.post.ts', { // Ensure correct endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textToSynthesize.value,
        voiceId: voiceId,
        provider: selectedProvider.value,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    await streamAndPlayAudio(response, previewAudioPlayer.value);

  } catch (err: any) {
    console.error('Preview error:', err);
    synthesisError.value = err.message || 'An unexpected error occurred during preview.';
    toast.error('Preview Failed', { description: synthesisError.value });
  } finally {
    isPreviewing.value = false;
  }
};

const handleSynthesize = () => {
  if (audioHandlerRef.value) {
    audioHandlerRef.value.handleSynthesize();
  }
};

const togglePlayPause = () => {
  const player = audioPlayer.value; 
  if (!player || !audioUrl.value) return;

  if (player.paused) {
    player.play().catch((e: Error) => console.error('Error playing audio:', e));
  } else {
    player.pause();
  }
};

const downloadAudio = () => {
  if (!audioUrl.value) {
    toast.info('No audio to download.');
    return;
  }
  const link = document.createElement('a');
  link.href = audioUrl.value;
  link.download = outputFilename.value || `synthesis_${Date.now()}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('Audio download started.');
};

const handleReset = () => {
  // Reset standard synthesis fields
  textToSynthesize.value = '';
  userInstruction.value = '';
  outputFilename.value = '';
  audioUrl.value = null;
  scriptGenerationError.value = null;
  synthesisError.value = null;
  if (previewAudioPlayer.value) {
    previewAudioPlayer.value.pause();
    if (previewAudioPlayer.value.src.startsWith('blob:')) URL.revokeObjectURL(previewAudioPlayer.value.src);
    previewAudioPlayer.value.src = '';
  }
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    if (audioPlayer.value.src.startsWith('blob:')) URL.revokeObjectURL(audioPlayer.value.src);
    audioPlayer.value.src = '';
  }
  if (toolbarRef.value) toolbarRef.value.setAudioPlayerSource(null);
  isPlaying.value = false;

  toast.info('Playground has been reset.');
};


onUnmounted(() => {
  if (audioUrl.value && audioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(audioUrl.value);
  }
  if (previewAudioPlayer.value && previewAudioPlayer.value.src && previewAudioPlayer.value.src.startsWith('blob:')) {
    URL.revokeObjectURL(previewAudioPlayer.value.src);
  }
  if (audioPlayer.value && audioPlayer.value.src && audioPlayer.value.src.startsWith('blob:')) {
    URL.revokeObjectURL(audioPlayer.value.src);
  }
});

</script>

<style>
/* Add any specific styles for the playground here */
.min-h-0 {
  min-height: 0;
}
textarea.flex-1 {
  flex-basis: 0; 
}
</style>