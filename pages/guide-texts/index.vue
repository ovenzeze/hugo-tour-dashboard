<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <!-- Header Section -->
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Icon icon="ph:scroll" class="mr-2 h-6 w-6" />
          Transcripts Management
        </h1>
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Manage all guide texts (transcripts) in the system.
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <Button @click="openAddTranscriptDialog" class="gap-1">
          <Icon icon="ph:plus-circle" class="h-5 w-5" />
          Add Transcript
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <!-- Loading State -->
          <div v-if="pending" class="space-y-4 py-4">
            <Skeleton class="h-10 w-full" />
            <div class="space-y-2">
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="text-center py-4">
            <p class="text-red-500 flex items-center justify-center">
              <Icon icon="ph:warning-octagon" class="mr-2 h-5 w-5" />
              Failed to load transcripts: {{ error.message }}
            </p>
          </div>

          <!-- Success State -->
          <div v-else-if="guideTexts && guideTexts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              v-for="transcript in guideTexts"
              :key="transcript.guide_text_id"
              class="flex flex-col relative overflow-hidden group hover:shadow-lg transition-shadow"
              :class="transcript.is_latest_version ? 'border-green-200' : 'border-amber-200'"
            >
              <!-- Status Badge -->
              <div v-if="transcript.is_latest_version" class="absolute top-2 right-2">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>

              <CardHeader class="relative">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle class="text-lg font-semibold text-primary">
                      {{ transcript.persona_name || `Persona #${transcript.persona_id}` }}
                    </CardTitle>
                    <CardDescription class="flex items-center gap-2 mt-1">
                      <Badge variant="outline" class="font-mono text-xs">
                        {{ transcript.language ? transcript.language.toUpperCase() : 'N/A' }}
                      </Badge>
                      <span class="text-xs text-muted-foreground">
                        v{{ transcript.version }}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <!-- Operations Dropdown - Visible on hover -->
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon" aria-label="Transcript actions">
                        <Icon icon="ph:dots-three-vertical" class="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-40">
                      <DropdownMenuItem @click="openEditTranscriptDialog(transcript)">
                        <Icon icon="ph:pencil-simple" class="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="confirmDeleteTranscript(transcript.guide_text_id)" class="text-destructive focus:text-destructive">
                        <Icon icon="ph:trash" class="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent class="flex-grow space-y-3">
                <!-- Transcript Preview -->
                <div class="space-y-1">
                  <p class="text-xs font-medium text-muted-foreground">Transcript Preview</p>
                  <p
                    class="text-sm line-clamp-3 hover:line-clamp-none cursor-text bg-muted/10 p-2 rounded"
                    :title="transcript.transcript"
                  >
                    {{ transcript.transcript }}
                  </p>
                </div>

                <!-- Metadata -->
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p class="text-muted-foreground">Object ID</p>
                    <p>{{ transcript.object_id || '--' }}</p>
                  </div>
                   <div>
                    <p class="text-muted-foreground">Created At</p>
                    <p>{{ formatCompactDate(transcript.created_at) }}</p>
                  </div>
                </div>
              </CardContent>

              <!-- Direct Action Buttons - Optionally keep for clear main actions -->
              <!-- <CardFooter class="bg-gradient-to-t from-white/80 to-transparent dark:from-black/80 pt-0">
                <div class="flex gap-2 w-full">
                   Add main action buttons here if needed, e.g., Play Audio
                </div>
              </CardFooter> -->
            </Card>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-8 border-2 border-dashed rounded-lg">
            <Icon icon="ph:files" class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">No transcripts found</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              Get started by creating a new transcript
            </p>
            <Button
              class="mt-4 gap-1"
              @click="openAddTranscriptDialog"
            >
              <Icon icon="ph:plus" class="h-4 w-4" />
              New Transcript
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Transcript Dialog -->
    <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Icon icon="ph:text-aa-plus" class="h-5 w-5" />
            Add New Transcript
          </DialogTitle>
          <DialogDescription>
            Fill in the details for the new guide text
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-1.5">
            <Label for="newTranscriptText">Transcript Content</Label>
            <Textarea
              id="newTranscriptText"
              v-model="newTranscriptData.transcript"
              placeholder="Enter the transcript text..."
              class="min-h-[120px]"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-1.5">
              <Label for="newTranscriptLanguage">Language</Label>
              <Input
                id="newTranscriptLanguage"
                v-model="newTranscriptData.language"
                placeholder="en, fr, etc."
              />
            </div>

            <div class="grid gap-1.5">
              <Label for="newTranscriptPersonaId">Persona</Label>
              <Select v-model="newTranscriptData.persona_id">
                <SelectTrigger id="newTranscriptPersonaId">
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="persona in availablePersonas"
                      :key="persona.persona_id"
                      :value="persona.persona_id.toString()"
                    >
                      {{ persona.name }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
             <div class="grid gap-1.5">
              <Label for="newTranscriptObjectId">Object ID</Label>
              <Input
                id="newTranscriptObjectId"
                type="number"
                v-model.number="newTranscriptData.object_id"
                placeholder="Optional"
              />
            </div>
             <div class="grid gap-1.5">
              <Label for="newTranscriptGalleryId">Gallery ID</Label>
              <Input
                id="newTranscriptGalleryId"
                type="number"
                v-model.number="newTranscriptData.gallery_id"
                placeholder="Optional"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="newTranscriptMuseumId">Museum ID</Label>
              <Input
                id="newTranscriptMuseumId"
                type="number"
                v-model.number="newTranscriptData.museum_id"
                placeholder="Optional"
              />
            </div>
            <div class="grid gap-1.5 col-span-3"> <!-- Span full width if other fields are optional -->
               <Label for="newTranscriptVersion">Version</Label>
                <Input
                  id="newTranscriptVersion"
                  type="number"
                  v-model.number="newTranscriptData.version"
                  placeholder="1"
                />
            </div>
             <div class="flex items-center gap-2 col-span-3"> <!-- Span full width -->
              <Switch
                id="newTranscriptIsLatest"
                v-model:checked="newTranscriptData.is_latest_version"
              />
              <Label for="newTranscriptIsLatest">Mark as latest version</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="showAddDialog = false">
            Cancel
          </Button>
          <Button @click="saveNewTranscript" class="gap-1">
            <Icon icon="ph:check-circle" class="h-4 w-4" />
            Create Transcript
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Transcript Dialog -->
    <Dialog :open="showEditDialog" @update:open="showEditDialog = $event">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Icon icon="ph:note-pencil" class="h-5 w-5" />
            Edit Transcript
          </DialogTitle>
          <DialogDescription>
            Make changes to the transcript below
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-1.5">
            <Label>Transcript ID</Label>
            <Input :value="editingTranscriptData.guide_text_id" disabled />
          </div>

          <div class="grid gap-1.5">
            <Label for="edit-transcript">Content</Label>
            <Textarea
              id="edit-transcript"
              v-model="editingTranscriptData.transcript"
              class="min-h-[120px]"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-1.5">
              <Label for="edit-language">Language</Label>
              <Input
                id="edit-language"
                v-model="editingTranscriptData.language"
              />
            </div>

            <div class="grid gap-1.5">
              <Label for="edit-persona">Persona</Label>
              <Select v-model="editingTranscriptData.persona_id">
                <SelectTrigger id="edit-persona"> <!-- Add ID for consistency -->
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="persona in availablePersonas"
                      :key="persona.persona_id"
                      :value="persona.persona_id.toString()"
                    >
                      {{ persona.name }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
           <div class="grid grid-cols-3 gap-4">
             <div class="grid gap-1.5">
              <Label for="edit-object-id">Object ID</Label>
              <Input
                id="edit-object-id"
                type="number"
                v-model.number="editingTranscriptData.object_id"
                placeholder="Optional"
              />
            </div>
             <div class="grid gap-1.5">
              <Label for="edit-gallery-id">Gallery ID</Label>
              <Input
                id="edit-gallery-id"
                type="number"
                v-model.number="editingTranscriptData.gallery_id"
                placeholder="Optional"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="edit-museum-id">Museum ID</Label>
              <Input
                id="edit-museum-id"
                type="number"
                v-model.number="editingTranscriptData.museum_id"
                placeholder="Optional"
              />
            </div>
            <div class="grid gap-1.5 col-span-3"> <!-- Span full width -->
               <Label for="edit-version">Version</Label>
                <Input
                  id="edit-version"
                  type="number"
                  v-model.number="editingTranscriptData.version"
                  placeholder="1"
                />
            </div>
             <div class="flex items-center gap-2 col-span-3"> <!-- Span full width -->
              <Switch
                id="edit-is-latest"
                v-model:checked="editingTranscriptData.is_latest_version"
              />
              <Label for="edit-is-latest">Mark as latest version</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showEditDialog = false">
            Cancel
          </Button>
          <Button @click="saveEditedTranscript" class="gap-1">
            <Icon icon="ph:floppy-disk" class="h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="!!transcriptToDeleteId" @update:open="transcriptToDeleteId = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center gap-2">
            <Icon icon="ph:warning" class="h-5 w-5 text-destructive" />
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the transcript.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="transcriptToDeleteId = null">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            @click="deleteTranscript"
            class="bg-destructive hover:bg-destructive/90"
          >
            <Icon icon="ph:trash" class="mr-2 h-4 w-4" />
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  </div>
</template>

<script setup lang="ts">

// Ensure shadcn components are auto-imported via nuxt.config.ts and components.json
// No manual imports for Button, Card, Dialog, etc. are needed here.

interface PersonaInfo {
  persona_id: number
  name: string
}

interface GuideText {
  guide_text_id: number
  transcript: string
  language: string
  persona_id: number // Ensure this is always a number after selection
  persona_name?: string
  object_id: number | null
  gallery_id: number | null
  museum_id: number | null
  is_latest_version: boolean // Use boolean for latest status
  version?: number // Make version optional as per form
  created_at?: string // Changed back to string as $fetch might return string
  updated_at?: string // Changed back to string as $fetch might return string
}

// State Management
const guideTexts = ref<GuideText[]>([])
const pending = ref(false)
const error = ref<Error | null>(null)
const transcriptToDeleteId = ref<number | null>(null)

// Dialog Controls
const showAddDialog = ref(false)
const showEditDialog = ref(false)

// Form Data
const newTranscriptData = reactive<Partial<GuideText>>({
  transcript: '',
  language: 'en',
  persona_id: undefined as any, // Explicitly use any for initial undefined, will be number
  object_id: null,
  gallery_id: null,
  museum_id: null,
  is_latest_version: true,
  version: 1
})

const editingTranscriptData = reactive<Partial<GuideText>>({
  guide_text_id: undefined,
  transcript: '',
  language: '',
  persona_id: undefined as any, // Explicitly use any for initial undefined, will be number
  object_id: null,
  gallery_id: null,
  museum_id: null,
  is_latest_version: false,
  version: undefined
})

// Sample Data (Replace with API fetch for available personas too if needed)
const availablePersonas = ref<PersonaInfo[]>([
  { persona_id: 1, name: 'Enthusiastic Historian' },
  { persona_id: 2, name: 'Art Critic' },
  { persona_id: 3, name: 'Curious Child' }
])

// Formatting Functions
const formatCompactDate = (dateString?: string) => {
  if (!dateString) return '--'
  try {
    const date = new Date(dateString);
     if (isNaN(date.getTime())) {
      return '--'; // Handle invalid date strings
    }
    // Use Intl.DateTimeFormat for robust localization
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return '--';
  }
}

// Data Operations
const fetchGuideTexts = async () => {
  pending.value = true
  error.value = null
  try {
    // Revert to actual API fetch
    const response = await $fetch<GuideText[]>('/api/guide-texts');
    // Ensure date fields are Date objects if necessary for formatCompactDate
    // Or adjust formatCompactDate to handle strings
    guideTexts.value = response; // Assuming API returns correct structure
  } catch (err: any) { // Catch any error type
    error.value = err
    guideTexts.value = []; // Clear data on error
    console.error('Failed to fetch guide texts:', err);
    alert(`Failed to load transcripts: ${err.message || 'Unknown error'}`);
  } finally {
    pending.value = false
  }
}

// Dialog Controls
const openAddTranscriptDialog = () => {
  // Reset form data
  Object.assign(newTranscriptData, {
    transcript: '',
    language: 'en',
    persona_id: undefined as any,
    object_id: null,
    gallery_id: null,
    museum_id: null,
    is_latest_version: true,
    version: 1
  })
  showAddDialog.value = true
}

const openEditTranscriptDialog = (transcript: GuideText) => {
  // Populate form data from the selected transcript
   // Ensure persona_id is a number when populating
  Object.assign(editingTranscriptData, {
    ...transcript,
    persona_id: Number(transcript.persona_id) // Ensure persona_id is a number
  })
  showEditDialog.value = true
}

// CRUD Operations
const saveNewTranscript = async () => {
  if (!validateTranscript(newTranscriptData)) return

  try {
    pending.value = true
    // Revert to actual API call
    const created = await $fetch<GuideText>('/api/guide-texts', { method: 'POST', body: newTranscriptData });

    // Add the created transcript to the list
    guideTexts.value.push(created); // Use the response from the API

    alert('Transcript created successfully.');
    showAddDialog.value = false
  } catch (err: any) { // Catch any error type
    error.value = err
    console.error('Failed to create transcript:', err);
    alert(`Failed to create transcript: ${err.message || 'Unknown error'}`);
  } finally {
    pending.value = false
  }
}

const saveEditedTranscript = async () => {
  // Check for required fields before saving
  if (!editingTranscriptData.guide_text_id || !validateTranscript(editingTranscriptData)) {
     alert('Transcript ID, Content, Language, and Persona are required for editing.');
     return;
  }

  try {
    pending.value = true
    // Revert to actual API call
    const updated = await $fetch<GuideText>(`/api/guide-texts/${editingTranscriptData.guide_text_id}`, { method: 'PUT', body: editingTranscriptData });

    // Update the transcript in the list
    const index = guideTexts.value.findIndex(t => t.guide_text_id === updated.guide_text_id) // Use updated ID
    if (index !== -1) {
      guideTexts.value[index] = updated; // Replace with the response from the API
    }

    alert('Transcript updated successfully.');
    showEditDialog.value = false
  } catch (err: any) { // Catch any error type
    error.value = err
    console.error('Failed to update transcript:', err);
    alert(`Failed to update transcript: ${err.message || 'Unknown error'}`);
  } finally {
    pending.value = false
  }
}

const confirmDeleteTranscript = (id: number) => {
  transcriptToDeleteId.value = id;
};

const deleteTranscript = async () => {
  if (!transcriptToDeleteId.value) return

  try {
    pending.value = true
    const idToDelete = transcriptToDeleteId.value; // Store before resetting dialog

    // Revert to actual API call
    await $fetch(`/api/guide-texts/${idToDelete}`, { method: 'DELETE' });

    // Remove the transcript from the list
    guideTexts.value = guideTexts.value.filter(
      t => t.guide_text_id !== idToDelete
    )

    alert(`Transcript ${idToDelete} deleted successfully.`);
    transcriptToDeleteId.value = null // Close dialog
  } catch (err: any) { // Catch any error type
    error.value = err
    console.error('Failed to delete transcript:', err);
    alert(`Failed to delete transcript: ${err.message || 'Unknown error'}`);
  } finally {
    pending.value = false
  }
}

// Form Validation Helper
const validateTranscript = (data: Partial<GuideText>) => {
  if (!data.transcript?.trim()) {
    alert('Transcript content is required')
    return false
  }
  if (!data.language?.trim()) {
    alert('Language is required')
    return false
  }
  // Ensure persona_id is a number after being bound from Select value string
  const personaIdNum = Number(data.persona_id);
  if (isNaN(personaIdNum) || personaIdNum <= 0) {
     alert('Please select a valid persona');
     return false;
  }
   // Update the reactive object with the correct number type if it was undefined/string
  data.persona_id = personaIdNum;
  return true;
}

// Initialize data on component mount
fetchGuideTexts();

// Define layout and page meta
definePageMeta({
  layout: 'default',
  title: 'Transcripts Management'
});
</script>

<style scoped>
/* Custom transitions for smoother interactions */
.card-enter-active,
.card-leave-active {
  transition: all 0.3s ease;
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Better focus states for accessibility (Tailwind handles most, but good to be explicit) */
/* button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
} */

/* Ensure Card content does not overflow when text is long but not expanded */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hover\:line-clamp-none:hover {
  -webkit-line-clamp: unset;
  display: block; /* Or unset */
}
</style>