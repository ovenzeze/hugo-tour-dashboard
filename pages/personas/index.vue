<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="sm:flex sm:items-center">
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <Button @click="openAddPersonaDialog">
         <Icon name="ph:plus" class=" h-4 w-4" />Add Persona
        </Button>
      </div>
    </div>

    <!-- Card View for all screen sizes -->
    <div class="mt-8">
      <div v-if="pending" class="space-y-4 py-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="space-y-4 p-4 border rounded-xl shadow-md bg-white/95 dark:bg-zinc-900/90">
            <div class="flex items-center space-x-3 mb-3">
              <Skeleton class="h-8 w-8 rounded-full" />
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-4 w-1/4 ml-auto" />
            </div>
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <div class="flex justify-between mt-4">
              <Skeleton class="h-4 w-1/3" />
              <Skeleton class="h-4 w-1/3" />
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="text-center py-4">
        <p class="text-red-500">Failed to load personas: {{ error.message }}</p>
      </div>
      <div v-else-if="personas && personas.length > 0" class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
        <PersonaCard
          v-for="persona in personas"
          :key="persona.persona_id"
          :persona="persona"
          @edit="editPersona"
          @delete="confirmDeletePersona"
          @view-details="viewPersonaDetails"
        />
      </div>
      <div v-else class="text-center py-12">
        <Icon name="ph:users-three" class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Personas Found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new persona.</p>
        <div class="mt-6">
          <Button @click="openAddPersonaDialog">
            <Icon name="ph:plus-circle" class="mr-2 h-4 w-4" />
            Create Persona
          </Button>
        </div>
      </div>
    </div>

    <AlertDialog :open="!!personaToDelete" @update:open="personaToDelete = null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the persona.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction @click="deletePersona(personaToDelete!)">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog :open="showEditDialog" @update:open="showEditDialog = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Persona</DialogTitle>
          <DialogDescription>
            Make changes to your persona here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div v-if="editingPersona" class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">Name</Label>
            <Input id="name" v-model="editingPersona.name" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="description" class="text-right">Description</Label>
            <Textarea id="description" v-model="editingPersonaDescription" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="system_prompt" class="text-right">System Prompt</Label>
            <Textarea id="system_prompt" v-model="editingPersonaSystemPrompt" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="voice_settings" class="text-right">Voice Settings</Label>
            <Textarea id="voice_settings" v-model="editingPersonaVoiceSettings" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="is_active" class="text-right">Active</Label>
            <Switch id="is_active" :checked="editingPersona.is_active ?? false" @update:checked="(val: boolean) => { if (editingPersona) editingPersona.is_active = val; }" class="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="showEditDialog = false">Cancel</Button>
          <Button type="submit" @click="saveEditedPersona">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Persona</DialogTitle>
          <DialogDescription>
            Fill in the details for the new persona. Click create when you're done.
          </DialogDescription>
        </DialogHeader>
        <form @submit="onAddSubmit">
          <div class="grid gap-4 py-4">
            <FormField v-slot="{ componentField }" name="name">
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Persona name" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="description">
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Persona description (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="system_prompt">
              <FormItem>
                <FormLabel>System Prompt</FormLabel>
                <FormControl>
                  <Textarea placeholder="System prompt (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="voice_settings">
              <FormItem>
                <FormLabel>Voice Settings</FormLabel>
                <FormControl>
                  <Textarea placeholder="Voice settings (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="avatar_url">
              <FormItem>
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/avatar.png (optional)" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ value, handleChange }" name="is_active">
              <FormItem class="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div class="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive personas will not be available for selection.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch :checked="value" @update:checked="handleChange" />
                </FormControl>
              </FormItem>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="showAddDialog = false">Cancel</Button>
            <Button type="submit">Create Persona</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import * as z from 'zod';

// Define a more specific type for what the API returns, including potential joins
export interface ApiPersona {
  persona_id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  scenario: string | null;
  is_active: boolean | null;
  system_prompt: string | null;
  voice_settings: string | null; // Assuming this might be JSON or structured string
  voice_description?: string | null;
  tts_provider?: string | null;
  language_support?: string[] | null;
  voice_model_identifier?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const personaToDelete = ref<number | null>(null);
const showEditDialog = ref(false);
const editingPersona = ref<ApiPersona | null>(null);
const showAddDialog = ref(false);

const editingPersonaDescription = computed({
  get: () => editingPersona.value?.description || '',
  set: (val) => {
    if (editingPersona.value) {
      editingPersona.value.description = val;
    }
  }
});

const editingPersonaSystemPrompt = computed({
  get: () => editingPersona.value?.system_prompt || '',
  set: (val) => {
    if (editingPersona.value) {
      editingPersona.value.system_prompt = val;
    }
  }
});

const editingPersonaVoiceSettings = computed({
  get: () => editingPersona.value?.voice_settings || '',
  set: (val) => {
    if (editingPersona.value) {
      editingPersona.value.voice_settings = val;
    }
  }
});
// Zod schema for Add Persona form
const addPersonaFormSchema = toTypedSchema(z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  description: z.string().max(500).optional().nullable(),
  system_prompt: z.string().max(500).optional().nullable(),
  voice_settings: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')).nullable(),
  is_active: z.boolean().default(true),
}));

const { handleSubmit: handleAddSubmit, resetForm: resetAddForm, setValues: setAddFormValues } = useForm({
  validationSchema: addPersonaFormSchema,
  initialValues: {
    name: '',
    description: null,
    system_prompt: null,
    voice_settings: null,
    avatar_url: null,
    is_active: true,
  }
});

const onAddSubmit = handleAddSubmit(async (values) => {
  await saveNewPersona(values);
});

watch(showAddDialog, (newValue) => {
  if (newValue) {
    resetAddForm({
      values: {
        name: '',
        description: null,
        system_prompt: null,
        voice_settings: null,
        avatar_url: null,
        is_active: true,
      }
    });
  }
});

const { data: personas, pending, error, refresh: refreshPersonas } = await useAsyncData('personas',
  () => $fetch('/api/personas'), {
    transform: (data: any) => {
      return Array.isArray(data) ? data.map(p => ({ ...p, is_active: p.is_active ?? false })) : []
    }
  }
);

const openAddPersonaDialog = () => {
  resetAddForm({
    values: {
      name: '',
      description: null,
      system_prompt: null,
      voice_settings: null,
      avatar_url: null,
      is_active: true,
    }
  });
  showAddDialog.value = true;
};

async function saveNewPersona(formData: Partial<ApiPersona>) {
  try {
    await $fetch('/api/personas', {
      method: 'POST',
      body: formData,
    });
    toast({ title: 'Success', description: 'Persona created successfully.' });
    refreshPersonas(); 
    showAddDialog.value = false;
  } catch (e: any) {
    let description = 'Failed to create persona.';
    if (e instanceof Error) {
      description = e.message;
    } else if (e && typeof e.data?.message === 'string') {
      description = e.data.message;
    } else if (typeof e === 'string') {
      description = e;
    }
    toast({ title: 'Error Creating Persona', description, variant: 'destructive' });
    console.error('Failed to create persona:', e);
  }
}

const editPersona = (id: number) => {
  const foundPersona = personas.value?.find(p => p.persona_id === id);
  if (foundPersona) {
    editingPersona.value = {
      ...foundPersona,
      description: foundPersona.description ?? '',
      system_prompt: foundPersona.system_prompt ?? '',
      voice_settings: foundPersona.voice_settings ?? '',
      is_active: foundPersona.is_active ?? false, // Ensure boolean for Switch
    };
    showEditDialog.value = true;
  }
};

async function saveEditedPersona() {
  if (!editingPersona.value) return;
  try {
    await $fetch(`/api/personas/${editingPersona.value.persona_id}`, {
      method: 'PUT',
      body: editingPersona.value,
    });
    toast({ title: 'Success', description: 'Persona updated successfully.' });
    refreshPersonas();
    showEditDialog.value = false;
  } catch (e: any) {
    let description = 'Failed to update persona.';
    if (e instanceof Error) {
      description = e.message;
    } else if (e && typeof e.data?.message === 'string') {
      description = e.data.message;
    } else if (typeof e === 'string') {
      description = e;
    }
    toast({ title: 'Error Updating Persona', description, variant: 'destructive' });
    console.error('Failed to update persona:', e);
  }
};

const confirmDeletePersona = (id: number) => {
  console.log('Attempting to delete persona:', id);
  personaToDelete.value = id;
};

async function deletePersona(id: number) {
  try {
    await $fetch(`/api/personas/${id}`, {
      method: 'DELETE',
    });
    toast({ title: 'Success', description: 'Persona deleted successfully.' });
    refreshPersonas();
    personaToDelete.value = null;
  } catch (error: unknown) { 
    let description = 'Failed to delete persona.';
    const originalError = error; 

    if (error instanceof Error) {
      description = error.message;
    } else if (typeof error === 'string') {
      description = error;
    } else if (error && typeof error === 'object') {
      const errObj = error as { message?: string; data?: { message?: string } };
      if (errObj.data && typeof errObj.data.message === 'string') {
        description = errObj.data.message;
      } else if (typeof errObj.message === 'string') {
        description = errObj.message;
      }
    }

    toast({ title: 'Error Deleting Persona', description, variant: 'destructive' });
    console.error(`User-facing error: "${description}". Original error object:`, originalError);
  }
};

const viewPersonaDetails = (id: number) => {
  useNuxtApp().$alert(`View persona details for persona ${id}`);
};

definePageMeta({
  title: 'Personas Management'
});
</script>
