<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
        <Icon icon="ph:speaker-high" class="mr-2 h-6 w-6" />
        Voices (Audios) Management
      </h1>
      <Button @click="openAddAudioDialog">
        <Icon icon="ph:microphone" class="mr-2 h-5 w-5" />
        Add/Generate Audio
      </Button>
    </div>
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Icon icon="ph:speaker-high" class="mr-2 h-6 w-6" />
          Voices (Audios) Management
        </h1>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <Button @click="openAddAudioDialog">
          <Icon icon="ph:microphone" class="mr-2 h-5 w-5" />
          Add/Generate Audio
        </Button>
      </div>
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
              <Icon icon="ph:warning-octagon" class="mr-2 h-5 w-5" />
              Failed to load audios: {{ error.message }}
            </p>
          </div>
          <div v-else-if="guideAudios && guideAudios.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              v-for="audio in guideAudios"
              :key="audio.audio_guide_id"
              class="border rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white/95 dark:bg-zinc-900/90 min-w-[360px] max-w-[480px] flex flex-col"
            >
              <!-- 卡片头部：主信息 -->
              <div class="px-4 border-b flex justify-between items-center bg-gray-100 dark:bg-zinc-800 gap-2">
                <div class="flex flex-col min-w-0 flex-1 overflow-hidden">
                  <!-- 主信息：音频名称/摘要 -->
                  <span class="font-bold text-lg text-primary flex items-center gap-1 min-w-0 truncate">
                    <Icon icon="ph:speaker-high" class="h-5 w-5 flex-shrink-0 text-primary" />
                    <span class="truncate">{{ audio.guide_text_preview || `Audio #${audio.audio_guide_id}` }}</span>
                  </span>
                  <!-- 主标签区：横向滚动，主标签单行展示 -->
                  <div
                    class="flex flex-row items-center gap-2 mt-1 min-w-0 overflow-x-auto no-scrollbar scrollbar-thumb-gray-300 scrollbar-track-transparent"
                    style="max-width: 100%;"
                  >
                    <span class="main-tag truncate max-w-[110px]">
                      <Icon icon="ph:user" class="h-4 w-4 mr-1" />
                      {{ audio.persona_name || audio.persona_id }}
                    </span>
                    <span class="main-tag truncate max-w-[90px]">
                      <Icon icon="ph:translate" class="h-4 w-4 mr-1" />
                      {{ audio.language }}
                    </span>
                    <template v-if="audio.is_active">
                      <span class="main-tag-green">
                        <Icon icon="ph:check-circle" class="h-4 w-4" />
                        Active
                      </span>
                    </template>
                    <template v-else>
                      <span class="sub-tag">
                        <Icon icon="ph:pause-circle" class="h-4 w-4" />
                        Inactive
                      </span>
                    </template>
                    <span class="sub-tag truncate max-w-[80px]">
                      <Icon icon="ph:file-audio" class="h-4 w-4 mr-1" />
                      v{{ audio.version || 'N/A' }}
                    </span>
                    <span v-if="audio.is_latest_version"
                      class="main-tag-yellow"
                    >
                      <Icon icon="ph:star" class="h-4 w-4" />
                      Latest
                    </span>
                  </div>
                </div>
                <!-- 操作菜单 -->
                <div class="flex flex-row gap-1 flex-shrink-0 ml-2">
                  <Button variant="ghost" size="sm" @click="openEditAudioDialog(audio)">
                    <Icon icon="ph:pencil-simple" class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="confirmDeleteAudio(audio.audio_guide_id)"
                    class="text-destructive"
                  >
                    <Icon icon="ph:trash" class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <!-- 卡片内容摘要与播放 -->
              <div class="p-4 flex flex-col gap-3 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <Icon icon="ph:waveform" class="h-5 w-5 text-primary" />
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
                  <Button variant="ghost" size="icon" @click="playAudio(audio.audio_url)">
                    <Icon icon="ph:play-circle" class="h-6 w-6 text-primary" />
                  </Button>
                </div>
                <Button v-else variant="outline" size="sm" disabled class="w-full opacity-60">
                  <Icon icon="ph:speaker-x" class="mr-2 h-4 w-4" />
                  Audio Not Available
                </Button>
                <!-- 辅助信息分组（底部固定） -->
                <div class="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mt-auto opacity-80">
                  <span class="sub-tag truncate max-w-[120px]">
                    <Icon icon="ph:calendar-blank" class="inline h-4 w-4 mr-1 align-text-bottom" />
                    {{ formatDisplayDate(audio.generated_at) }}
                  </span>
                  <span v-if="audio.object_id" class="sub-tag truncate max-w-[110px]">
                    <Icon icon="ph:cube" class="inline h-4 w-4 align-text-bottom" />
                    <span class="font-medium text-blue-500 dark:text-blue-300">Object</span>:
                    <span>{{ audio.object_id }}</span>
                  </span>
                  <span v-if="audio.gallery_id" class="sub-tag truncate max-w-[110px]">
                    <Icon icon="ph:image-square" class="inline h-4 w-4 align-text-bottom" />
                    <span class="font-medium text-purple-500 dark:text-purple-300">Gallery</span>:
                    <span>{{ audio.gallery_id }}</span>
                  </span>
                  <span v-if="audio.museum_id" class="sub-tag truncate max-w-[110px]">
                    <Icon icon="ph:bank" class="inline h-4 w-4 align-text-bottom" />
                    <span class="font-medium text-green-500 dark:text-green-300">Museum</span>:
                    <span>{{ audio.museum_id }}</span>
                  </span>
                  <span class="sub-tag-id truncate max-w-[90px]">
                    <Icon icon="ph:identification-card" class="inline h-4 w-4 mr-1 align-text-bottom" />
                    ID: {{ audio.audio_guide_id }}
                  </span>
                  <span class="sub-tag-id truncate max-w-[90px]">
                    <Icon icon="ph:clock" class="inline h-4 w-4 mr-1 align-text-bottom" />
                    Duration: {{ audio.duration_seconds ? `${audio.duration_seconds}s` : 'N/A' }}
                  </span>
                </div>
              </div>
            </Card>
          </div>
          <div v-else class="text-center py-8">
            <div class="text-center py-8">
              <Icon icon="ph:speaker-slash" class="mx-auto h-12 w-12 text-gray-400" />
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
            <Icon icon="ph:waveform" class="mr-2 h-5 w-5" />
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
            <Icon icon="ph:sliders-horizontal" class="mr-2 h-5 w-5" />
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
            <Icon icon="ph:warning-circle" class="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
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

    <!-- Audio Player Dialog -->
    <Dialog :open="showAudioPlayerDialog" @update:open="showAudioPlayerDialog = false">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center">
            <Icon icon="ph:play" class="mr-2 h-5 w-5" />
            Play Audio
          </DialogTitle>
        </DialogHeader>
        <div class="py-4">
          <audio v-if="currentAudioUrl" :src="currentAudioUrl" controls autoplay class="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
        <DialogFooter>
          <Button type="button" @click="showAudioPlayerDialog = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">


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
const audioRefs = ref<Record<number, HTMLAudioElement | null>>({});

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
    // const response = await $fetch<GuideAudio[]>('/api/guide-audios');
    // guideAudios.value = response.map(audio => ({
    //   ...audio,
    //   metadata_json_string: audio.metadata ? JSON.stringify(audio.metadata, null, 2) : '{}'
    // }));
    // Placeholder data for now
    // TODO: Fetch actual persona names and guide text previews or include them in the API response
    guideAudios.value = [
      { audio_guide_id: 1, audio_url: 'https://example.com/audio1.mp3', duration_seconds: 120, language: 'en', persona_id: 1, persona_name: 'Enthusiastic Historian', guide_text_id: 1, guide_text_preview: 'Transcript 1 preview...', is_active: true, is_latest_version: true, version: 1, generated_at: new Date(2023, 10, 16, 11,0).toISOString(), metadata: { provider: 'elevenlabs' }, gallery_id: 1, museum_id: 1, object_id: 101 },
      { audio_guide_id: 2, audio_url: 'https://example.com/audio2.mp3', duration_seconds: 180, language: 'fr', persona_id: 2, persona_name: 'Art Critic', guide_text_id: 2, guide_text_preview: 'Transcript 2 preview...', is_active: false, is_latest_version: true, version: 1, generated_at: new Date(2023, 11, 2, 15,30).toISOString(), metadata: { provider: 'google' }, gallery_id: 1, museum_id: 1, object_id: 102 },
    ];
    guideAudios.value.forEach(audio => (audio as GuideAudioFormData).metadata_json_string = audio.metadata ? JSON.stringify(audio.metadata, null, 2) : '{}');
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (e: any) {
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

const saveNewAudio = async () => {
  if (!newAudioData.persona_id || !newAudioData.language) {
    alert('Persona ID and Language are required.');
    return;
  }
  if (!newAudioData.audio_url && !newAudioData.guide_text_id) {
    alert('Either an Audio URL or a Guide Text ID for generation must be provided.');
    return;
  }

  let metadata;
  try {
    metadata = newAudioData.metadata_json_string ? JSON.parse(newAudioData.metadata_json_string) : null;
  } catch (e) {
    alert('Invalid JSON in metadata.');
    return;
  }

  const payload = { ...newAudioData, metadata };
  delete payload.metadata_json_string;

  try {
    pending.value = true;
    // const created = await $fetch<GuideAudio>('/api/guide-audios', { method: 'POST', body: payload });
    console.log('Saving new audio:', payload);
    const newId = guideAudios.value.length > 0 ? Math.max(...guideAudios.value.map(a => a.audio_guide_id)) + 1 : 1;
    const newAudioEntry = { ...payload, audio_guide_id: newId, generated_at: new Date().toISOString() } as GuideAudio;
    (newAudioEntry as any).metadata_json_string = newAudioData.metadata_json_string;
    guideAudios.value.push(newAudioEntry);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    alert('Audio created/generated successfully (simulated).');
    showAddAudioDialog.value = false;
  } catch (e: any) {
    error.value = e;
    alert(`Failed to save audio: ${e.message}`);
  } finally {
    pending.value = false;
  }
};

const openEditAudioDialog = (audio: GuideAudio) => {
  const dataToEdit = JSON.parse(JSON.stringify(audio));
  editingAudioData.audio_guide_id = dataToEdit.audio_guide_id;
  editingAudioData.audio_url = dataToEdit.audio_url;
  editingAudioData.duration_seconds = dataToEdit.duration_seconds;
  editingAudioData.guide_text_id = dataToEdit.guide_text_id;
  editingAudioData.persona_id = dataToEdit.persona_id;
  editingAudioData.language = dataToEdit.language;
  editingAudioData.is_active = dataToEdit.is_active;
  editingAudioData.is_latest_version = dataToEdit.is_latest_version;
  editingAudioData.version = dataToEdit.version;
  editingAudioData.metadata_json_string = dataToEdit.metadata ? JSON.stringify(dataToEdit.metadata, null, 2) : '{}';
  showEditAudioDialog.value = true;
};

const saveEditedAudio = async () => {
  if (!editingAudioData.audio_guide_id || !editingAudioData.audio_url || !editingAudioData.persona_id || !editingAudioData.language) {
    alert('ID, Audio URL, Persona ID, and Language are required.');
    return;
  }
  let metadata;
  try {
    metadata = editingAudioData.metadata_json_string ? JSON.parse(editingAudioData.metadata_json_string) : null;
  } catch (e) {
    alert('Invalid JSON in metadata.');
    return;
  }
  const payload = { ...editingAudioData, metadata };
  delete payload.metadata_json_string;

  try {
    pending.value = true;
    // const updated = await $fetch<GuideAudio>(`/api/guide-audios/${editingAudioData.audio_guide_id}`, { method: 'PUT', body: payload });
    console.log('Saving edited audio:', payload);
    const index = guideAudios.value.findIndex(a => a.audio_guide_id === editingAudioData.audio_guide_id);
    if (index !== -1) {
      const updatedAudio = { ...guideAudios.value[index], ...payload } as GuideAudio;
      (updatedAudio as any).metadata_json_string = editingAudioData.metadata_json_string;
      guideAudios.value[index] = updatedAudio;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    alert('Audio updated successfully (simulated).');
    showEditAudioDialog.value = false;
  } catch (e: any) {
    error.value = e;
    alert(`Failed to update audio: ${e.message}`);
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
    // await $fetch(`/api/guide-audios/${audioToDeleteId.value}`, { method: 'DELETE' });
    console.log('Deleting audio ID:', audioToDeleteId.value);
    guideAudios.value = guideAudios.value.filter(a => a.audio_guide_id !== audioToDeleteId.value);
    await new Promise(resolve => setTimeout(resolve, 500));
    alert(`Audio ${audioToDeleteId.value} deleted successfully (simulated).`);
    audioToDeleteId.value = null;
  } catch (e: any) {
    error.value = e;
    alert(`Failed to delete audio: ${e.message}`);
  } finally {
    pending.value = false;
  }
};

const playAudio = (url: string) => {
  currentAudioUrl.value = url;
  showAudioPlayerDialog.value = true;
};

definePageMeta({
  layout: 'default',
  title: 'Voices' // Matching menu label
});
</script>
<style scoped>

</style>
