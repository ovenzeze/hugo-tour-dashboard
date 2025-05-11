qun'g<template>
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
          <PlusCircle class="mr-2 h-4 w-4" /> Add Persona
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
                        <UserCircle2 class="h-6 w-6 text-gray-500 dark:text-gray-400" />
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>{{ persona.name }}</TableCell>
                  <TableCell class="max-w-xs truncate">{{ persona.description || 'N/A' }}</TableCell>
                  <TableCell>
                    <Badge :variant="persona.is_active ? 'default' : 'secondary'">
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
                <PlusCircle class="mr-2 h-4 w-4" />
                Create Persona
              </Button>
            </div>
          </div>
        </div>
      </div>
:start_line:78
-------
    </div>

    <!-- Placeholder for Add/Edit Persona Modal/Page logic -->
    <!-- <AddPersonaModal v-if="showAddPersonaModal" @close="showAddPersonaModal = false" @persona-added="refreshPersonas" /> -->

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
:start_line:86
-------
    </AlertDialog>

    <!-- Edit Persona Dialog -->
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
            <Textarea id="description" v-model="editingPersona.description" class="col-span-3" />
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

    <!-- Add Persona Dialog -->
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
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { UserCircle2, PlusCircle, Pencil, Trash2, Users2, MoreHorizontal } from 'lucide-vue-next';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import * as z from 'zod';
// Assuming Supabase types are globally available or imported via `~/types/supabase`
// For example: import type { Database } from '~/types/supabase'
// type Persona = Database['public']['Tables']['personas']['Row']

// Define a more specific type for what the API returns, including potential joins
interface ApiPersona {
  persona_id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  // Add other fields returned by your /api/personas endpoint if necessary
  // e.g., system_prompt, voice_settings, created_at, updated_at
}

const personaToDelete = ref<number | null>(null);
const showEditDialog = ref(false);
const editingPersona = ref<ApiPersona | null>(null);
const showAddDialog = ref(false);
// Zod schema for Add Persona form
const addPersonaFormSchema = toTypedSchema(z.object({
  name: z.string().min(1, { message: "Name is required" }).max(100),
  description: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')).nullable(),
  is_active: z.boolean().default(true),
}));

const { handleSubmit: handleAddSubmit, resetForm: resetAddForm, setValues: setAddFormValues } = useForm({
  validationSchema: addPersonaFormSchema,
  initialValues: {
    name: '',
    description: null,
    avatar_url: null,
    is_active: true,
  }
});

const onAddSubmit = handleAddSubmit(async (values) => {
  await saveNewPersona(values);
});

// Watch showAddDialog to reset form when it opens
watch(showAddDialog, (newValue) => {
  if (newValue) {
    resetAddForm({
      values: {
        name: '',
        description: null,
        avatar_url: null,
        is_active: true,
      }
    });
  }
});

// Fetch personas
const { data: personas, pending, error, refresh: refreshPersonas } = await useAsyncData<ApiPersona[]>('personas',
  () => $fetch('/api/personas'), {
    transform: (data: any) => {
      // Ensure data is an array and map to ensure is_active defaults correctly if null
      return Array.isArray(data) ? data.map(p => ({ ...p, is_active: p.is_active ?? false })) : []
    }
  }
)

definePageMeta({
  title: 'Personas Management'
});

const openAddPersonaDialog = () => {
  resetAddForm({ // Reset with initial values when dialog opens
    values: {
      name: '',
      description: null,
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
      description: formData.description || null, // Ensure null if empty
      is_active: formData.is_active,
      avatar_url: formData.avatar_url || null, // Ensure null if empty
    };
    const createdPersona = await $fetch('/api/personas', {
      method: 'POST',
      body: payload
    }) as ApiPersona;
    alert(`Persona "${createdPersona.name}" created successfully.`);
    showAddDialog.value = false;
    await refreshPersonas();
  } catch (err: any) {
    console.error('Failed to create persona:', err);
    alert(`Failed to create persona: ${err.data?.message || err.message}`);
  }
};

const editPersona = (id: number) => {
  const persona = personas.value?.find(p => p.persona_id === id);
  if (persona) {
    // Create a deep copy for editing to avoid mutating the original list directly
    editingPersona.value = JSON.parse(JSON.stringify(persona));
    showEditDialog.value = true;
  }
}

const saveEditedPersona = async () => {
  if (!editingPersona.value) return;
  try {
    await $fetch(`/api/personas/${editingPersona.value.persona_id}`, {
      method: 'PUT',
      body: editingPersona.value
    });
    alert(`Persona ${editingPersona.value.name} updated successfully.`);
    showEditDialog.value = false;
    editingPersona.value = null;
    await refreshPersonas();
  } catch (err: any) {
    console.error('Failed to update persona:', err);
    alert(`Failed to update persona: ${err.data?.message || err.message}`);
  }
}

const confirmDeletePersona = (id: number) => {
  console.log('Attempting to delete persona:', id);
  personaToDelete.value = id;
}

const deletePersona = async (id: number) => {
  try {
    await $fetch(`/api/personas/${id}`, { method: 'DELETE' });
    alert(`Persona ${id} deleted successfully.`);
    await refreshPersonas(); // Refresh the list
  } catch (err: any) {
    console.error('Failed to delete persona:', err);
    alert(`Failed to delete persona ${id}: ${err.data?.message || err.message}`);
  }
}

// Example of how a modal for adding might work (implementation needed)
// const handlePersonaAdded = async () => {
//   showAddPersonaModal.value = false;
//   await refreshPersonas();
// };

</script>
