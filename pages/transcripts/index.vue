<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <!-- Page Title -->
    <div class="sm:flex sm:items-center mb-6">

      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <Button @click="openAddTranscriptDialog">
          <Icon name="heroicons-outline:plus" class="h-4 w-4 mr-2" />
          Add Transcript
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="space-y-4 py-4">
      <Skeleton class="h-10 w-full" />
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="space-y-4">
          <Skeleton class="h-32 w-full" />
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-1/2" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-md bg-destructive/10 p-4 my-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons-outline:exclamation-circle" class="h-5 w-5 text-destructive" aria-hidden="true" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-destructive">Error loading transcripts</h3>
          <div class="mt-2 text-sm text-destructive/80">
            <p>{{ error.message || 'An unknown error occurred' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!guideTexts || !guideTexts.length" class="text-center py-12 border-2 border-dashed border-muted rounded-lg">
      <Icon name="heroicons-outline:document-text" class="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 class="mt-2 text-sm font-medium text-foreground">No transcripts</h3>
      <p class="mt-1 text-sm text-muted-foreground">Get started by creating a new transcript.</p>
      <div class="mt-6">
        <Button @click="openAddTranscriptDialog">
          <Icon name="heroicons-outline:plus" class="h-4 w-4 mr-2" />
          New Transcript
        </Button>
      </div>
    </div>

    <!-- Content List - Card View -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      <div
        v-for="transcript in guideTexts"
        :key="transcript.guide_text_id"
        class="border rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white/95 dark:bg-zinc-900/90 min-w-[300px] flex flex-col"
      >
        <!-- Card Header: Persona, Language, Version, Latest Tag -->
        <div class="px-4 py-3 border-b flex justify-between items-center bg-muted/40">
          <div class="flex flex-col min-w-0 flex-1 overflow-hidden">
            <!-- First Row: Persona Name -->
            <span class="font-bold text-lg text-primary flex items-center gap-1 min-w-0 truncate">
              <Icon name="ph:user" class="h-5 w-5 flex-shrink-0 text-primary" />
              <span class="truncate">{{ transcript.personas?.name || `Persona #${transcript.persona_id}` }}</span>
            </span>
            <!-- Second Row: Tag Information -->
            <div class="flex flex-row items-center gap-2 mt-1 min-w-0 flex-wrap">
              <span v-if="transcript.is_latest_version"
                class="px-2 py-0.5 text-xs bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-full font-semibold tracking-wide flex items-center gap-1 flex-shrink-0"
              >
                <Icon name="ph:check-circle" class="h-4 w-4" />
                Latest
              </span>
              <span class="rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200 px-3 py-0.5 text-xs uppercase flex items-center gap-1 flex-shrink-0 font-medium">
                <Icon name="ph:translate" class="h-4 w-4 mr-1" />
                {{ transcript.language }}
              </span>
              <span class="bg-gray-50 uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400 px-3 py-0.5 rounded-full text-xs ml-1 flex items-center gap-1 flex-shrink-0 font-medium">
                <Icon name="ph:file-text" class="h-4 w-4 mr-1" />
                v{{ transcript.version }}
              </span>
            </div>
          </div>
          <div class="flex space-x-1 flex-shrink-0 ml-2">
            <Button variant="ghost" size="sm" @click="openEditTranscriptDialog(transcript)">
              <Icon name="ph:pencil-simple" class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="confirmDeleteTranscript(transcript.guide_text_id)"
              class="text-destructive"
            >
              <Icon name="ph:trash" class="h-4 w-4" />
            </Button>
          </div>
        </div>
        <!-- Card Content Summary -->
        <div class="p-4 flex flex-col gap-3 flex-1">
          <p class="text-base font-semibold text-foreground line-clamp-4 leading-relaxed">
            {{ transcript.transcript }}
          </p>
          <!-- Metadata Group (fixed at bottom) -->
          <div class="flex flex-wrap gap-3 text-xs text-muted-foreground mt-auto">
            <span class="opacity-70">
              <Icon name="ph:calendar-blank" class="inline h-4 w-4 mr-1 align-text-bottom" />
              {{ formatDate(transcript.created_at) }}
            </span>
            <template v-if="transcript.object_id || transcript.gallery_id || transcript.museum_id">
              <span
                v-if="transcript.object_id"
                class="bg-muted/60 px-2 py-0.5 rounded flex items-center gap-1 opacity-80"
              >
                <Icon name="ph:cube" class="inline h-4 w-4 align-text-bottom" />
                <span class="font-medium text-blue-500 dark:text-blue-300">Object</span>:
                <span>{{ transcript.objects?.title || transcript.object_id }}</span>
              </span>
              <span
                v-if="transcript.gallery_id"
                class="bg-muted/60 px-2 py-0.5 rounded flex items-center gap-1 opacity-80"
              >
                <Icon name="ph:image-square" class="inline h-4 w-4 align-text-bottom" />
                <span class="font-medium text-purple-500 dark:text-purple-300">Gallery</span>:
                <span>{{ transcript.galleries?.name || transcript.gallery_id }}</span>
              </span>
              <span
                v-if="transcript.museum_id"
                class="bg-muted/60 px-2 py-0.5 rounded flex items-center gap-1 opacity-80"
              >
                <Icon name="ph:bank" class="inline h-4 w-4 align-text-bottom" />
                <span class="font-medium text-green-500 dark:text-green-300">Museum</span>:
                <span>{{ transcript.museums?.name || transcript.museum_id }}</span>
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination and Statistics -->
    <div v-if="guideTexts && guideTexts.length > 0 && !pending && !error" class="mt-8 flex justify-between items-center">
      <p class="text-sm text-muted-foreground">
        Showing {{ guideTexts.length }} transcripts
      </p>
      <!-- Pagination component can be added in the future -->
    </div>

    <!-- Add Dialog -->
    <Dialog v-model:open="isAddDialogOpen">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Transcript</DialogTitle>
          <DialogDescription>Create a new transcript for a guide or exhibit.</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="addTranscript">
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="persona" class="text-right">Persona</Label>
              <Select v-model="newTranscript.persona_id" class="col-span-3" required>
                <SelectTrigger id="persona">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    v-for="persona in personas" 
                    :key="persona.persona_id" 
                    :value="persona.persona_id"
                  >
                    {{ persona.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="language" class="text-right">Language</Label>
              <Input 
                id="language" 
                v-model="newTranscript.language" 
                placeholder="e.g. en, zh" 
                class="col-span-3"
                required 
              />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <Label for="transcript" class="text-right">Content</Label>
              <Textarea 
                id="transcript" 
                v-model="newTranscript.transcript" 
                placeholder="Transcript content..." 
                class="col-span-3" 
                rows="6"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeAddDialog">Cancel</Button>
            <Button type="submit" :disabled="pendingAdd">
              <span v-if="pendingAdd">Adding...</span>
              <span v-else>Add Transcript</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
 
     <!-- Edit Dialog - Similar to Add Dialog, adjust as needed -->
     <!-- Delete Confirmation Dialog -->
     <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            transcript and any associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="isDeleteDialogOpen = false">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            @click="deleteTranscript"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {{ pendingDelete ? 'Deleting...' : 'Delete' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import type { Database } from '~/types/supabase';

// Define types based on Supabase schema
type PersonaRow = Database['public']['Tables']['personas']['Row'];
type MuseumRow = Database['public']['Tables']['museums']['Row'];
type GalleryRow = Database['public']['Tables']['galleries']['Row'];
type DBObjectRow = Database['public']['Tables']['objects']['Row']; // Renamed to avoid conflict with global Object

// Define the main GuideText type including potential nested objects from joins
export type GuideText = Database['public']['Tables']['guide_texts']['Row'] & {
  personas?: PersonaRow | null;
  objects?: DBObjectRow | null;
  galleries?: GalleryRow | null;
  museums?: MuseumRow | null;
};

// Type for the data fetched for the personas dropdown
type PersonaSelectItem = Pick<PersonaRow, 'persona_id' | 'name'>;

// Type definition for new/editing transcript form data
interface TranscriptFormData {
  transcript: string;
  language: string;
  persona_id: number | null;
  guide_text_id?: number | null; // Optional for new, required for edit
}

/**
 * Date formatting function: prioritize "x hours ago", otherwise "YYYY-MM-DD HH:mm"
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay < 7) return `${diffDay} days ago`;

  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Fetching data
const { data: guideTexts, pending, error, refresh } = useAsyncData<GuideText[]>('guideTexts',
  async () => {
    const data = await $fetch<GuideText[]>('/api/transcripts');
    console.log('API response:', data);
    return data;
  },
  {
    default: () => [] as GuideText[],
  }
);

const { data: personas } = useAsyncData<PersonaSelectItem[]>('personas', 
  () => $fetch<PersonaSelectItem[]>('/api/personas'), 
  { default: () => [] as PersonaSelectItem[] }
);

// Dialog states
const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);

// Form data
const newTranscript = reactive<TranscriptFormData>({
  transcript: '',
  language: '',
  persona_id: null,
});
const editingTranscript = reactive<TranscriptFormData>({
  guide_text_id: null,
  transcript: '',
  language: '',
  persona_id: null,
});
const deletingTranscriptId = ref<number | null>(null);

// Pending states
const pendingAdd = ref(false);
const pendingEdit = ref(false); // Added for completeness, though editTranscript is not fully implemented
const pendingDelete = ref(false);

// Dialog operations
function openAddTranscriptDialog() {
  Object.assign(newTranscript, {
    transcript: '',
    language: '',
    persona_id: null,
    guide_text_id: undefined, // Ensure all fields are reset
  });
  isAddDialogOpen.value = true;
}

function closeAddDialog() {
  isAddDialogOpen.value = false;
}

function openEditTranscriptDialog(transcript: GuideText) {
  editingTranscript.guide_text_id = transcript.guide_text_id;
  editingTranscript.transcript = transcript.transcript;
  editingTranscript.language = transcript.language;
  editingTranscript.persona_id = transcript.persona_id;
  isEditDialogOpen.value = true;
}

function confirmDeleteTranscript(id: number) {
  deletingTranscriptId.value = id;
  isDeleteDialogOpen.value = true;
}

// API interactions
async function addTranscript() {
  if (!validateTranscript(newTranscript)) return;
  
  try {
    pendingAdd.value = true;
    await $fetch('/api/transcripts', {
      method: 'POST',
      body: { // Send only necessary fields for creation
        transcript: newTranscript.transcript,
        language: newTranscript.language,
        persona_id: newTranscript.persona_id,
        // object_id, gallery_id, museum_id would be added here if part of the form
      }
    });
    
    isAddDialogOpen.value = false;
    refresh();
  } catch (err: unknown) {
    console.error('Failed to add transcript:', err);
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    alert(`Failed to add transcript: ${message}`);
  } finally {
    pendingAdd.value = false;
  }
}

// Placeholder for edit transcript functionality
// async function editTranscript() {
//   if (!editingTranscript.guide_text_id || !validateTranscript(editingTranscript)) return;
//   try {
//     pendingEdit.value = true;
//     await $fetch(`/api/transcripts/${editingTranscript.guide_text_id}`, {
//       method: 'PUT', // or PATCH
//       body: editingTranscript
//     });
//     isEditDialogOpen.value = false;
//     refresh();
//   } catch (err: unknown) {
//     console.error('Failed to edit transcript:', err);
//     const message = err instanceof Error ? err.message : 'An unknown error occurred';
//     alert(`Failed to edit transcript: ${message}`);
//   } finally {
//     pendingEdit.value = false;
//   }
// }

async function deleteTranscript() {
  if (!deletingTranscriptId.value) return;
  
  try {
    pendingDelete.value = true;
    await $fetch(`/api/transcripts/${deletingTranscriptId.value}`, {
      method: 'DELETE'
    });
    
    isDeleteDialogOpen.value = false;
    refresh();
  } catch (err: unknown) {
    console.error('Failed to delete transcript:', err);
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    alert(`Failed to delete transcript: ${message}`);
  } finally {
    pendingDelete.value = false;
  }
}

// Form validation
function validateTranscript(data: TranscriptFormData): boolean {
  if (!data.transcript?.trim()) {
    alert('Transcript content is required');
    return false;
  }
  if (!data.language?.trim()) {
    alert('Language is required');
    return false;
  }
  if (data.persona_id === null || isNaN(Number(data.persona_id)) || Number(data.persona_id) <= 0) {
     alert('Please select a valid persona');
     return false;
  }
  // Ensure persona_id is a number if it's not null
  if (data.persona_id !== null) {
    data.persona_id = Number(data.persona_id);
  }
  return true;
}

// Page meta
definePageMeta({
  layout: 'default',
  title: 'Transcripts Management'
});
</script>
