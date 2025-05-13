<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Personas Management</h1>
        <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
          A list of all the personas in your account including their name, description, and status.
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <Button @click="openAddPersonaDialog">
          <CirclePlus class="mr-2 h-4 w-4" /> Add Persona
        </Button>
      </div>
    </div>

    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div v-if="pending" class="space-y-4 py-4">
            <Skeleton class="h-12 w-full" />
            <div class="space-y-3">
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
              <Skeleton class="h-8 w-full" />
            </div>
          </div>
          <div v-else-if="error" class="text-center py-4">
            <p class="text-red-500">Failed to load personas: {{ error.message }}</p>
          </div>
          <div v-else-if="personas && personas.length > 0" class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg dark:ring-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[100px]">Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>System Prompt</TableHead>
                  <TableHead>Voice Settings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="persona in personas" :key="persona.persona_id">
                  <TableCell class="font-medium">
                    <Avatar class="h-10 w-10">
                      <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
                      <AvatarFallback>
                        <UserCircle class="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>{{ persona.name }}</TableCell>
                  <TableCell class="max-w-xs break-words">{{ persona.description || 'N/A' }}</TableCell>
                  <TableCell class="max-w-xs break-words">{{ persona.system_prompt || 'N/A' }}</TableCell>
                  <TableCell class="max-w-xs break-words">{{ persona.voice_settings || 'N/A' }}</TableCell>
                  <TableCell>
                    <Badge :variant="persona.is_active ? 'default' : 'secondary'" :class="persona.is_active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
                      {{ persona.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <span class="sr-only">Open menu</span>
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="editPersona(persona.persona_id)">
                          <Pencil class="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="viewPersonaDetails(persona.persona_id)">
                          <Eye class="mr-2 h-4 w-4" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="confirmDeletePersona(persona.persona_id)" class="text-red-600 hover:!text-red-600 dark:text-red-500 dark:hover:!text-red-500">
                          <Trash2 class="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div v-else class="text-center py-12">
            <Users2 class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No Personas Found</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new persona.</p>
            <div class="mt-6">
              <Button @click="openAddPersonaDialog">
                <CirclePlus class="mr-2 h-4 w-4" />
                Create Persona
              </Button>
            </div>
          </div>
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
            <Switch id="is_active" v-model:checked="editingPersona.is_active" class="col-span-3" />
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

            <FormField v-slot="{ componentField }" name="is_active">
              <FormItem class="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div class="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive personas will not be available for selection.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch :checked="componentField.value" @update:checked="componentField['onUpdate:modelValue']" />
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
import { ref, computed, reactive, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';

// Define a more specific type for what the API returns, including potential joins
interface ApiPersona {
  persona_id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  system_prompt: string | null;
  voice_settings: string | null;
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

const saveNewPersona = async (formData: Partial<ApiPersona>) => {
  try {
    const payload = {
      name: formData.name,
      description: formData.description || null,
      system_prompt: formData.system_prompt || null,
      voice_settings: formData.voice_settings || null,
      is_active: formData.is_active,
      avatar_url: formData.avatar_url || null,
    };
    const createdPersona = await $fetch('/api/personas', {
      method: 'POST',
      body: payload
    }) as ApiPersona;
    useNuxtApp().$alert(`Persona "${createdPersona.name}" created successfully.`);
    showAddDialog.value = false;
    await refreshPersonas();
  } catch (err: any) {
    console.error('Failed to create persona:', err);
    useNuxtApp().$alert(`Failed to create persona: ${err.data?.message || err.message}`);
  }
};

const editPersona = (id: number) => {
  const persona = personas.value?.find((p: ApiPersona) => p.persona_id === id);
  if (persona) {
    editingPersona.value = JSON.parse(JSON.stringify(persona));
    showEditDialog.value = true;
  }
};

const saveEditedPersona = async () => {
  if (!editingPersona.value) return;
  try {
    await $fetch(`/api/personas/${editingPersona.value.persona_id}`, {
      method: 'PUT',
      body: editingPersona.value
    });
    useNuxtApp().$alert(`Persona ${editingPersona.value.name} updated successfully.`);
    showEditDialog.value = false;
    editingPersona.value = null;
    await refreshPersonas();
  } catch (err: any) {
    console.error('Failed to update persona:', err);
    useNuxtApp().$alert(`Failed to update persona: ${err.data?.message || err.message}`);
  }
};

const confirmDeletePersona = (id: number) => {
  console.log('Attempting to delete persona:', id);
  personaToDelete.value = id;
};

const deletePersona = async (id: number) => {
  try {
    await $fetch(`/api/personas/${id}`, { method: 'DELETE' });
    useNuxtApp().$alert(`Persona ${id} deleted successfully.`);
    await refreshPersonas();
  } catch (err: any) {
    console.error('Failed to delete persona:', err);
    useNuxtApp().$alert(`Failed to delete persona ${id}: ${err.data?.message || err.message}`);
  }
};

const viewPersonaDetails = (id: number) => {
  useNuxtApp().$alert(`View persona details for persona ${id}`);
};

definePageMeta({
  title: 'Personas Management'
});
</script>
