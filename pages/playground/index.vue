<template>
  <div class="h-full flex flex-col">
    <div class="max-w-7xl mx-auto px-4 w-full flex-1 flex flex-col">
      <div class="mb-8">
        <!-- Placeholder for any top-level controls or titles if needed -->
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
  <!-- 左侧 Setting 面板，内部Tabs切换 -->
  <div class="space-y-6 bg-background p-6 rounded-lg shadow-md h-fit border lg:col-span-1">
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
      <TabsContent value="standard" class="transition-all duration-300">
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
      <TabsContent value="podcast">
        <!-- Podcast设置内容 -->
        <h2 class="text-xl font-semibold mb-4">Podcast Project Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label for="podcast-project-name">Project Name</Label>
            <Input id="podcast-project-name" v-model="podcastProjectName" placeholder="e.g., My Awesome Podcast" class="mt-1" />
          </div>
          <div>
            <Label for="podcast-title">Podcast Title (Optional)</Label>
            <Input id="podcast-title" v-model="podcastTitle" placeholder="Defaults to Project Name" class="mt-1" />
          </div>
          <div>
            <Label for="podcast-author">Author (Optional)</Label>
            <Input id="podcast-author" v-model="podcastAuthor" placeholder="e.g., John Doe" class="mt-1" />
          </div>
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-3">Script Segments</h3>
          <div v-for="(segment, index) in podcastScriptSegments" :key="segment.id" class="flex items-start space-x-2 mb-3 p-3 border rounded-md bg-background/50">
            <div class="flex-shrink-0 pt-2 font-medium text-sm">{{ index + 1 }}.</div>
            <div class="flex-grow space-y-2">
              <Input v-model="segment.role" placeholder="Role / Speaker Name" />
              <Textarea v-model="segment.text" placeholder="Dialogue text for this role..." class="min-h-[70px]" />
            </div>
            <Button @click="removePodcastSegment(segment.id)" variant="ghost" size="sm" :disabled="podcastScriptSegments.length <= 1" class="text-red-500 hover:text-red-700 mt-1">
              Remove
            </Button>
          </div>
          <Button @click="addPodcastSegment" variant="outline" class="mt-2">
            Add Segment
          </Button>
        </div>
        <div class="mt-6">
          <Button @click="handleGeneratePodcast" :disabled="isGeneratingPodcast || podcastScriptSegments.some(s => !s.role || !s.text)" class="w-full md:w-auto">
            <span v-if="isGeneratingPodcast">Generating Podcast...</span>
            <span v-else>Generate Podcast</span>
          </Button>
          <p v-if="podcastGenerationError" class="text-sm text-red-500 dark:text-red-400 mt-2">{{ podcastGenerationError }}</p>
        </div>
        <!-- TODO: Display podcast audio player and download link once generated -->
      </TabsContent>
    </Tabs>
  </div>
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
import PlaygroundToolbar from '@/components/PlaygroundToolbar.vue';
import AudioHandler from '@/components/audio/AudioHandler.vue';
import { usePlaygroundStore } from '@/stores/playground';
import type { Database } from '@/types/supabase'; // Import Database type
import { useSupabaseClient } from '#imports';

// Define Persona type from Database schema
type Persona = Database['public']['Tables']['personas']['Row'];

interface VoiceProvider {
  id: string;
  name: string;
}

// --- Podcast Mode State ---
interface PodcastScriptSegment {
  id: string; // For v-for key and easier manipulation
  role: string;
  text: string;
}
const podcastProjectName = ref('');
const podcastTitle = ref('');
const podcastAuthor = ref('');
const podcastScriptSegments = ref<PodcastScriptSegment[]>([
  { id: crypto.randomUUID(), role: '', text: '' }
]);
const isGeneratingPodcast = ref(false);
const podcastGenerationError = ref<string | null>(null);
// --- End Podcast Mode State ---

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
  if (!selectedPersonaId.value) return 'Please select a persona.';
  const persona = personas.value.find((p: Persona) => String(p.persona_id) === String(selectedPersonaId.value));
  return persona?.system_prompt || 'No system prompt available for this persona.';
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

// --- Podcast Mode Functions ---
function addPodcastSegment() {
  podcastScriptSegments.value.push({ id: crypto.randomUUID(), role: '', text: '' });
}

function removePodcastSegment(segmentId: string) {
  const index = podcastScriptSegments.value.findIndex(s => s.id === segmentId);
  if (index !== -1 && podcastScriptSegments.value.length > 1) {
    podcastScriptSegments.value.splice(index, 1);
  } else if (podcastScriptSegments.value.length === 1) {
    // Optionally clear the last segment instead of removing it, or prevent removal
    toast.info('At least one script segment is required.');
  }
}

const handleGeneratePodcast = async () => {
  if (podcastScriptSegments.value.some(s => !s.role.trim() || !s.text.trim())) {
    toast.error('All podcast script segments must have a role and text.');
    return;
  }
  if (!podcastProjectName.value.trim()) {
    toast.error('Podcast Project Name is required.');
    return;
  }

  isGeneratingPodcast.value = true;
  podcastGenerationError.value = null;

  const payload = {
    projectName: podcastProjectName.value,
    title: podcastTitle.value || podcastProjectName.value, // Default title to project name
    author: podcastAuthor.value,
    script: podcastScriptSegments.value.map(s => ({ role: s.role, text: s.text })),
    // voiceService: selectedProvider.value, // Or a dedicated podcast provider selector
    // outputFormat: 'mp3', // etc.
  };

  try {
    const response = await fetch('/api/generate-podcast.post.ts', { // Ensure correct endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server' }));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const result = await response.json(); 
    toast.success('Podcast generation started!', { description: `Details: ${JSON.stringify(result)}` }); // Adjust based on actual response
    // TODO: Handle podcast audio URL, display player, etc. based on 'result'

  } catch (err: any) {
    podcastGenerationError.value = err.message || 'An unexpected error occurred while generating the podcast.';
    toast.error('Podcast Generation Failed', { description: podcastGenerationError.value });
  } finally {
    isGeneratingPodcast.value = false;
  }
};
// --- End Podcast Mode Functions ---


const handleGenerateScript = async () => {
  if (isGeneratingScript.value || !userInstruction.value) return;
  isGeneratingScript.value = true;
  scriptGenerationError.value = null;
  try {
    const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: userInstruction.value }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    const data = await response.json();
    textToSynthesize.value = data.script;
    toast.success('Script generated successfully!');
  } catch (err: any) {
    scriptGenerationError.value = err.message || 'An unexpected error occurred while generating the script.';
    toast.error('Script Generation Failed', { description: scriptGenerationError.value });
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

  // Reset podcast fields
  podcastProjectName.value = '';
  podcastTitle.value = '';
  podcastAuthor.value = '';
  podcastScriptSegments.value = [{ id: crypto.randomUUID(), role: '', text: '' }];
  isGeneratingPodcast.value = false;
  podcastGenerationError.value = null;

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