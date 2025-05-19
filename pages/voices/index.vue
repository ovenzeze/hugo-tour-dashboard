<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
        <Icon name="ph:speaker-high" class="mr-2 h-6 w-6" />
        Voices
      </h1>
      <Button @click="openAddAudioDialog">
        <Icon name="ph:microphone" class="mr-2 h-5 w-5" />
        Add/Generate Audio
      </Button>
    </div>


    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div v-if="pending" class="space-y-4 py-4">
            <Skeleton class="h-10 w-full" />
            <div class="space-y-2">
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
            </div>
          </div>
          <div v-else-if="error" class="text-center py-4">
            <p class="text-red-500 flex items-center justify-center">
              <Icon name="ph:warning-octagon" class="mr-2 h-5 w-5" />
              Failed to load audios: {{ error.message }}
            </p>
          </div>
          <div v-else-if="guideAudios && guideAudios.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 mx-auto px-6">
            <Card
              v-for="audio in guideAudios"
              :key="audio.audio_guide_id"
              class="border rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white/95 dark:bg-zinc-900/90 flex flex-col py-0 min-w-[300px]"
            >
              <!-- Card Header: Main Info -->
              <div class="px-4 py-3 border-b flex justify-between items-center gap-2">
                <div class="flex flex-col min-w-0 flex-1 overflow-hidden">
                  <!-- Main Info: Audio Name/Summary -->
                  <span class="font-bold text-lg text-primary flex items-center gap-1 min-w-0 truncate">
                    <Icon name="ph:speaker-high" class="h-5 w-5 flex-shrink-0 text-primary" />
                    <span class="truncate">{{ audio.guide_text_preview || `Audio #${audio.audio_guide_id}` }}</span>
                  </span>
                  <!-- Main Tag Area: Horizontal scroll, main tags displayed in a single line -->
                  <div
                    class="flex flex-row items-center gap-2 min-w-0 overflow-x-auto no-scrollbar scrollbar-thumb-gray-300 scrollbar-track-transparent"
                    style="max-width: 100%;"
                  >
                    <span class="main-tag truncate max-w-[110px] whitespace-nowrap flex items-center">
                      <Icon name="ph:user" class="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>{{ audio.persona_name || audio.persona_id }}</span>
                    </span>
                    <span class="main-tag truncate max-w-[90px] whitespace-nowrap flex items-center">
                      <Icon name="ph:translate" class="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>{{ audio.language }}</span>
                    </span>
                    <template v-if="audio.is_active">
                      <span class="main-tag-green whitespace-nowrap flex items-center">
                        <Icon name="ph:check-circle" class="h-4 w-4 mr-1 flex-shrink-0" />
                        <span>Active</span>
                      </span>
                    </template>
                    <template v-else>
                      <span class="sub-tag whitespace-nowrap flex items-center">
                        <Icon name="ph:pause-circle" class="h-4 w-4 mr-1 flex-shrink-0" />
                        <span>Inactive</span>
                      </span>
                    </template>
                    <span class="sub-tag truncate max-w-[80px] whitespace-nowrap flex items-center">
                      <Icon name="ph:file-audio" class="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>v{{ audio.version || 'N/A' }}</span>
                    </span>
                    <span v-if="audio.is_latest_version"
                      class="main-tag-yellow whitespace-nowrap flex items-center"
                    >
                      <Icon name="ph:star" class="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>Latest</span>
                    </span>
                  </div>
                </div>
                <!-- Action Menu -->
                <div class="flex flex-row gap-1 flex-shrink-0 ml-2">
                  <Button variant="ghost" size="sm" @click="openEditAudioDialog(audio)">
                    <Icon name="ph:pencil-simple" class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="confirmDeleteAudio(audio.audio_guide_id)"
                    class="text-destructive"
                  >
                    <Icon name="ph:trash" class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <!-- Card Content Summary and Playback -->
              <div class="p-4 flex flex-col gap-3 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <Icon name="ph:waveform" class="h-5 w-5 text-primary" />
                  <span class="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-3 leading-relaxed flex-1 truncate">
                    {{ audio.guide_text_preview || 'No transcript preview.' }}
                  </span>
                </div>
                <div v-if="audio.audio_url" class="flex items-center gap-2">
                  <audio
                    :ref="(el: HTMLAudioElement | null) => audioRefs[audio.audio_guide_id] = el"
                    controls
                    class="w-full h-10 text-xs"
                    :src="audio.audio_url"
                    @play="handlePlay(audio.audio_guide_id)"
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <!-- 移除弹窗播放按钮，避免与原生 audio 冲突 -->
                </div>
                <Button v-else variant="outline" size="sm" disabled class="w-full opacity-60">
                  <Icon name="ph:speaker-x" class="mr-2 h-4 w-4" />
                  Audio Not Available
                </Button>
                <!-- 辅助信息分组（底部固定） -->
                <!-- 辅助信息分组（底部固定） -->
                <div class="flex flex-wrap gap-2 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
                  <span class="metadata-pill">
                    <Icon name="ph:calendar-blank" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span>{{ formatDisplayDate(audio.generated_at) }}</span>
                  </span>
                  <span v-if="audio.object_id" class="metadata-pill">
                    <Icon name="ph:cube" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span class="font-medium text-blue-600 dark:text-blue-400 mr-1">Object:</span>
                    <span>{{ audio.object_id }}</span>
                  </span>
                  <span v-if="audio.gallery_id" class="metadata-pill">
                    <Icon name="ph:image-square" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span class="font-medium text-purple-600 dark:text-purple-400 mr-1">Gallery:</span>
                    <span>{{ audio.gallery_id }}</span>
                  </span>
                  <span v-if="audio.museum_id" class="metadata-pill">
                    <Icon name="ph:bank" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span class="font-medium text-green-600 dark:text-green-400 mr-1">Museum:</span>
                    <span>{{ audio.museum_id }}</span>
                  </span>
                  <span class="metadata-pill">
                    <Icon name="ph:identification-card" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span class="mr-1">ID:</span>
                    <span>{{ audio.audio_guide_id }}</span>
                  </span>
                  <span class="metadata-pill">
                    <Icon name="ph:clock" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    <span class="mr-1">Duration:</span>
                    <span>{{ audio.duration_seconds ? `${audio.duration_seconds}s` : 'N/A' }}</span>
                  </span>
                  <!-- New: Display of main metadata fields -->
                  <template v-if="audio.metadata">
                    <span v-if="audio.metadata.tts_provider" class="metadata-pill">
                      <Icon name="ph:robot" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span class="mr-1">TTS:</span>
                      <span>{{ audio.metadata.tts_provider }}</span>
                    </span>
                    <span v-if="audio.metadata.voice_id" class="metadata-pill">
                      <Icon name="ph:user-voice" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span class="mr-1">Voice:</span>
                      <span>{{ audio.metadata.voice_id }}</span>
                    </span>
                    <span v-if="audio.metadata.source" class="metadata-pill">
                      <Icon name="ph:waveform" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span class="mr-1">Source:</span>
                      <span>{{ audio.metadata.source }}</span>
                    </span>
                    <span v-if="audio.metadata.recorder" class="metadata-pill">
                      <Icon name="ph:user" class="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                      <span class="mr-1">Recorder:</span>
                      <span>{{ audio.metadata.recorder }}</span>
                    </span>
                  </template>
                </div>
              </div> <!-- Closing tag for the div started on line 99 -->
            </Card>
          </div>
          <div v-else class="text-center py-8">
            <div class="text-center py-8">
              <Icon name="ph:speaker-slash" class="mx-auto h-12 w-12 text-gray-400" />
              <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No audios</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding or generating a new audio.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Generate Audio Dialog -->
    <Dialog :open="showAddAudioDialog" @update:open="showAddAudioDialog = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <Icon name="ph:waveform" class="mr-2 h-5 w-5" />
            Add or Generate Audio
          </DialogTitle>
          <DialogDescription>
            Provide an existing audio URL or generate a new one from a transcript.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <fieldset class="border p-4 rounded-md">
            <legend class="text-sm font-medium px-1">Option 1: Add Existing Audio</legend>
            <div class="grid items-center gap-1.5 mt-2">
              <Label for="newAudioUrl">Audio URL</Label>
              <Input id="newAudioUrl" v-model="newAudioData.audio_url" placeholder="https://example.com/audio.mp3" />
            </div>
            <div class="grid items-center gap-1.5 mt-4">
              <Label for="newAudioDuration">Duration (seconds)</Label>
              <Input id="newAudioDuration" type="number" v-model.number="newAudioData.duration_seconds" />
            </div>
          </fieldset>

          <div class="text-center my-2 font-semibold">OR</div>

          <fieldset class="border p-4 rounded-md">
            <legend class="text-sm font-medium px-1">Option 2: Generate from Transcript</legend>
            <div class="grid items-center gap-1.5 mt-2">
              <Label for="newAudioGuideTextId">Guide Text (for generation)</Label>
              <Select v-model="newAudioData.guide_text_id">
                <SelectTrigger id="newAudioGuideTextId">
                  <SelectValue placeholder="Select Guide Text" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="text in availableGuideTexts" :key="text.guide_text_id" :value="text.guide_text_id?.toString()">
                      {{ text.guide_text_id }} - {{ text.transcript_preview }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </fieldset>
          
          <hr class="my-4" />

          <h3 class="text-md font-medium mb-2">Common Details</h3>
           <div class="grid items-center gap-1.5">
            <Label for="newAudioPersonaId">Persona</Label>
            <Select v-model="newAudioData.persona_id">
              <SelectTrigger id="newAudioPersonaId">
                <SelectValue placeholder="Select Persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="persona in availablePersonas" :key="persona.persona_id" :value="persona.persona_id.toString()">
<!-- debug log -->
{{ console.log('persona in SelectItem:', persona) }}
                    {{ persona?.name ?? 'Unknown' }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="newAudioLanguage">Language</Label>
            <Input id="newAudioLanguage" v-model="newAudioData.language" placeholder="e.g., en" required />
          </div>
          <div class="flex items-center space-x-2">
            <Switch id="newAudioIsActive" v-model:checked="newAudioData.is_active" />
            <Label for="newAudioIsActive">Is Active</Label>
          </div>
           <div class="flex items-center space-x-2">
            <Switch id="newAudioIsLatest" v-model:checked="newAudioData.is_latest_version" />
            <Label for="newAudioIsLatest">Is Latest Version</Label>
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="newAudioVersion">Version</Label>
            <Input id="newAudioVersion" type="number" v-model.number="newAudioData.version" placeholder="e.g., 1" />
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="newAudioMetadata">Metadata (JSON)</Label>
            <Textarea id="newAudioMetadata" v-model="newAudioData.metadata_json_string" placeholder='e.g., {"tts_provider": "elevenlabs", "voice_id": "xyz"}' rows="3" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter valid JSON for audio metadata.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="showAddAudioDialog = false">Cancel</Button>
          <Button type="submit" @click="saveNewAudio">Save Audio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Audio Dialog -->
    <Dialog :open="showEditAudioDialog" @update:open="showEditAudioDialog = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <Icon name="ph:sliders-horizontal" class="mr-2 h-5 w-5" />
            Edit Audio Details
          </DialogTitle>
        </DialogHeader>
        <div v-if="editingAudioData && editingAudioData.audio_guide_id !== undefined" class="grid gap-4 py-4">
          <div class="grid items-center gap-1.5">
            <Label for="editAudioUrl">Audio URL</Label>
            <Input id="editAudioUrl" v-model="editingAudioData.audio_url" required />
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="editAudioDuration">Duration (seconds)</Label>
            <Input id="editAudioDuration" type="number" v-model.number="editingAudioData.duration_seconds" />
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="editAudioPersonaId">Persona</Label>
            <Select v-model="editingAudioData.persona_id">
              <SelectTrigger id="editAudioPersonaId">
                <SelectValue placeholder="Select Persona" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="persona in availablePersonas" :key="persona.persona_id" :value="persona.persona_id.toString()">
                    {{ persona?.name ?? 'Unknown' }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="editAudioGuideTextId">Guide Text</Label>
            <Select v-model="editingAudioData.guide_text_id">
              <SelectTrigger id="editAudioGuideTextId">
                <SelectValue placeholder="Select Guide Text" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="text in availableGuideTexts" :key="text.guide_text_id" :value="text.guide_text_id?.toString()">
                     {{ text.guide_text_id }} - {{ text.transcript_preview }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="editAudioLanguage">Language</Label>
            <Input id="editAudioLanguage" v-model="editingAudioData.language" required />
          </div>
          <div class="flex items-center space-x-2">
            <Switch id="editAudioIsActive" v-model:checked="editingAudioData.is_active" />
            <Label for="editAudioIsActive">Is Active</Label>
          </div>
           <div class="flex items-center space-x-2">
            <Switch id="editAudioIsLatest" v-model:checked="editingAudioData.is_latest_version" />
            <Label for="editAudioIsLatest">Is Latest Version</Label>
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="editAudioVersion">Version</Label>
            <Input id="editAudioVersion" type="number" v-model.number="editingAudioData.version" />
          </div>
          <div class="grid items-center gap-1.5">
            <Label for="editAudioMetadata">Metadata (JSON)</Label>
            <Textarea id="editAudioMetadata" v-model="editingAudioData.metadata_json_string" placeholder='e.g., {"tts_provider": "elevenlabs", "voice_id": "xyz"}' rows="3" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter valid JSON for audio metadata.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="showEditAudioDialog = false">Cancel</Button>
          <Button type="submit" @click="saveEditedAudio">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="!!audioToDeleteId" @update:open="audioToDeleteId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center">
            <Icon name="ph:warning-circle" class="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the audio.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="audioToDeleteId = null">Cancel</AlertDialogCancel>
          <AlertDialogAction @click="deleteAudio">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Removed Dialog Player to avoid conflict with audio in cards -->
  </div>
</template>

<script setup lang="ts">


import { onBeforeUpdate, reactive, ref } from 'vue';

interface PersonaInfo { // Assuming this might be shared or defined elsewhere
  persona_id: number;
  name: string;
}

interface GuideTextInfo { // For select dropdown
  guide_text_id: number | null; // guide_text_id can be null in GuideAudio
  transcript_preview?: string; // A short preview of the transcript
}

interface GuideAudio {
  audio_guide_id: number;
  audio_url: string;
  duration_seconds: number | null;
  gallery_id: number | null;
  generated_at: string | null;
  guide_text_id: number | null;
  guide_text_preview?: string; // Added for display
  is_active: boolean | null;
  is_latest_version: boolean | null;
  language: string;
  /**
   * metadata 字段结构示例：
   * {
   *   tts_provider?: string;
   *   voice_id?: string;
   *   source?: string;
   *   recorder?: string;
   *   [key: string]: any;
   * }
   */
  metadata: Record<string, any> | null;
  museum_id: number | null;
  object_id: number | null;
  persona_id: number;
  persona_name?: string; // Added for display
  version: number | null;
}

// For form binding, as metadata is JSON
interface GuideAudioFormData extends Omit<Partial<GuideAudio>, 'metadata'> {
  metadata_json_string?: string;
}

const guideAudios = ref<GuideAudio[]>([]);
const pending = ref(false);
const error = ref<Error | null>(null);
const supabase = useSupabaseClient();
const runtimeConfig = useRuntimeConfig();
const bucketName = runtimeConfig.public.supabaseStorageBucketName;

const showAddAudioDialog = ref(false);
const newAudioData = reactive<GuideAudioFormData>({
  audio_url: '',
  duration_seconds: null,
  guide_text_id: null,
  persona_id: undefined,
  language: 'en',
  is_active: true,
  is_latest_version: true,
  version: 1,
  metadata_json_string: '{}',
});

const showEditAudioDialog = ref(false);
const editingAudioData = reactive<GuideAudioFormData>({});

const audioToDeleteId = ref<number | null>(null);
const showAudioPlayerDialog = ref(false);
const currentAudioUrl = ref<string | null>(null); // Keep for the dialog player if still used elsewhere, or remove if fully deprecated.

// Refs for audio elements in cards
const audioRefs = ref<Record<number, any | null>>({}); // Workaround for HTMLAudioElement TS error

// Ensure refs are cleared before each update to avoid stale refs on list changes
onBeforeUpdate(() => {
  audioRefs.value = {};
});

const handlePlay = (playingAudioId: number) => {
  for (const audioId in audioRefs.value) {
    if (audioRefs.value[audioId] && Number(audioId) !== playingAudioId) {
      audioRefs.value[audioId]?.pause();
    }
  }
};

async function fetchGuideAudios() {
  pending.value = true;
  error.value = null;
  try {
    const response = await $fetch<GuideAudio[] | { data: GuideAudio[] }>('/api/guide-audios');
    let audios: GuideAudio[] = [];
    if (Array.isArray(response)) {
      audios = response;
    } else if (response && Array.isArray((response as any).data)) {
      audios = (response as any).data;
    } else {
      // Print the actual content returned by the API for debugging
      // eslint-disable-next-line no-console
      console.error('API /api/guide-audios returned content:', response);
      throw new Error('API response is not an array or does not contain a data array');
    }
    console.log('Original audio data from API:', JSON.parse(JSON.stringify(audios)));

    guideAudios.value = audios.map(audio => {
      let publicUrl = '';
      if (audio.audio_url) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(audio.audio_url);
        if (data && data.publicUrl) {
          publicUrl = data.publicUrl;
        } else {
          console.error(`Could not get public URL for Supabase path: ${audio.audio_url}`);
        }
      }
      return {
        ...audio,
        audio_url: publicUrl, // Use the public URL from Supabase
        metadata_json_string: audio.metadata ? JSON.stringify(audio.metadata, null, 2) : '{}'
      };
    });
    console.log('Processed guideAudios with Supabase public URLs:', JSON.parse(JSON.stringify(guideAudios.value)));
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('fetchGuideAudios error:', e);
    error.value = e;
  } finally {
    pending.value = false;
  }
}

fetchGuideAudios();

const formatDisplayDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Mock data for Select components - in a real app, fetch this from API
const availablePersonas = ref<PersonaInfo[]>([
  { persona_id: 1, name: 'Enthusiastic Historian' },
  { persona_id: 2, name: 'Art Critic' },
  { persona_id: 3, name: 'Curious Child' },
]);
const availableGuideTexts = ref<GuideTextInfo[]>([
  { guide_text_id: 1, transcript_preview: 'First transcript about an object...' },
  { guide_text_id: 2, transcript_preview: 'Second transcript for a gallery tour...' },
  { guide_text_id: 3, transcript_preview: 'A very short one.' },
]);

const openAddAudioDialog = () => {
  newAudioData.audio_url = '';
  newAudioData.duration_seconds = null;
  newAudioData.guide_text_id = null;
  newAudioData.persona_id = undefined;
  newAudioData.language = 'en';
  newAudioData.is_active = true;
  newAudioData.is_latest_version = true;
  newAudioData.version = 1;
  newAudioData.metadata_json_string = '{}';
  showAddAudioDialog.value = true;
};

const openEditAudioDialog = (audio: GuideAudio) => {
  // Deep copy and prepare for form
  editingAudioData.audio_guide_id = audio.audio_guide_id;
  editingAudioData.audio_url = audio.audio_url;
  editingAudioData.duration_seconds = audio.duration_seconds;
  editingAudioData.gallery_id = audio.gallery_id;
  editingAudioData.generated_at = audio.generated_at;
  editingAudioData.guide_text_id = audio.guide_text_id;
  editingAudioData.is_active = audio.is_active;
  editingAudioData.is_latest_version = audio.is_latest_version;
  editingAudioData.language = audio.language;
  editingAudioData.metadata_json_string = audio.metadata ? JSON.stringify(audio.metadata, null, 2) : '{}';
  editingAudioData.museum_id = audio.museum_id;
  editingAudioData.object_id = audio.object_id;
  editingAudioData.persona_id = audio.persona_id;
  editingAudioData.version = audio.version;
  showEditAudioDialog.value = true;
};

const saveNewAudio = async () => {
  if (!newAudioData.persona_id || !newAudioData.language) {
    console.error('Persona ID and Language are required.');
    return;
  }
  if (!newAudioData.audio_url && !newAudioData.guide_text_id) {
    console.error('Either an Audio URL or a Guide Text ID for generation must be provided.');
    return;
  }

  let metadata;
  try {
    metadata = newAudioData.metadata_json_string ? JSON.parse(newAudioData.metadata_json_string) : null;
  } catch (e) {
    console.error('Invalid JSON in metadata.');
    return;
  }

  const payload = { ...newAudioData, metadata };
  delete payload.metadata_json_string;

  try {
    pending.value = true;
    await $fetch<GuideAudio>('/api/guide-audios', { method: 'POST', body: payload });
    await fetchGuideAudios();
    console.error('Audio created/generated successfully.');
    showAddAudioDialog.value = false;
  } catch (e: any) {
    error.value = e;
    console.error(`Failed to save audio: ${e.message}`);
  } finally {
    pending.value = false;
  }
};

const saveEditedAudio = async () => {
  if (!editingAudioData.audio_guide_id || !editingAudioData.audio_url || !editingAudioData.persona_id || !editingAudioData.language) {
    console.error('ID, Audio URL, Persona ID, and Language are required.');
    return;
  }
  let metadata;
  try {
    metadata = editingAudioData.metadata_json_string ? JSON.parse(editingAudioData.metadata_json_string) : null;
  } catch (e) {
    console.error('Invalid JSON in metadata.');
    return;
  }
  const payload = { ...editingAudioData, metadata };
  delete payload.metadata_json_string;

  try {
    pending.value = true;
    await $fetch<GuideAudio>(`/api/guide-audios/${editingAudioData.audio_guide_id}`, { method: 'PUT', body: payload });
    await fetchGuideAudios();
    console.error('Audio updated successfully.');
    showEditAudioDialog.value = false;
  } catch (e: any) {
    error.value = e;
    console.error(`Failed to update audio: ${e.message}`);
  } finally {
    pending.value = false;
  }
};

const confirmDeleteAudio = (id: number) => {
  audioToDeleteId.value = id;
};

const deleteAudio = async () => {
  if (audioToDeleteId.value === null) return;
  try {
    pending.value = true;
    await $fetch(`/api/guide-audios/${audioToDeleteId.value}`, { method: 'DELETE' });
    await fetchGuideAudios();
    console.error(`Audio ${audioToDeleteId.value} deleted successfully.`);
    audioToDeleteId.value = null;
  } catch (e: any) {
    error.value = e;
    console.error(`Failed to delete audio: ${e.message}`);
  } finally {
    pending.value = false;
  }
};

const playAudio = (url: string) => {
  currentAudioUrl.value = url;
  showAudioPlayerDialog.value = true;
};


</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.metadata-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.3rem; /* py-0.5 px-2 */
  border-radius: 0.75rem; /* rounded-full */
  background-color: hsl(var(--muted) / 0.7); /* bg-muted/70 */
  /* color: hsl(var(--muted-foreground)); */ /* Already on parent */
  font-size: 0.75rem; /* text-xs */
  line-height: 1rem;
  white-space: nowrap;
  /* max-width needed if we don't want them to grow too much, but flex-wrap should handle overall line breaking */
}
</style>

