<template>
  <div class="p-4 sm:p-6 lg:p-8 dark:bg-gray-900 min-h-screen">
    <div v-if="pendingPersonaData" class="text-center py-10 dark:text-gray-300">
      <p>Loading persona details...</p>
    </div>
    <div v-else-if="personaError" class="text-center py-10">
      <p class="text-red-500 dark:text-red-400">Failed to load persona: {{ personaError.message }}</p>
      <NuxtLink to="/personas" class="mt-4 inline-block text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Back to Personas</NuxtLink>
    </div>
    <div v-else-if="!formData.name && !pendingPersonaData"> <!-- Check if formData name is empty after loading -->
      <p class="text-center py-10 text-red-500 dark:text-red-400">Persona not found or data is invalid.</p>
      <NuxtLink to="/personas" class="mt-4 inline-block text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Back to Personas</NuxtLink>
    </div>
    <div v-else>
      <div class="sm:flex sm:items-center mb-8">
        <div class="sm:flex-auto">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Persona: {{ formData.name }}</h1>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">Update the details for this persona.</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <NuxtLink
            to="/personas"
            class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
          >
            Back to Personas
          </NuxtLink>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-8 divide-y divide-gray-200 dark:divide-gray-700">
        <div class="space-y-8 divide-y divide-gray-200 dark:divide-gray-700 sm:space-y-5">
          <div>
            <div>
              <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Persona Information</h3>
            </div>
            <div class="mt-6 sm:mt-5 space-y-6 sm:space-y-5">
              <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:sm:border-gray-700 sm:pt-5">
                <Label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-px sm:pt-2"> Name <span class="text-red-500 dark:text-red-400">*</span> </Label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <Input type="text" name="name" id="name" v-model="formData.name" required class="max-w-lg block w-full sm:max-w-xs" />
                </div>
              </div>

              <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:sm:border-gray-700 sm:pt-5">
                <Label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-px sm:pt-2"> Description </Label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <Textarea id="description" name="description" v-model="formData.description" rows="3" class="max-w-lg block w-full" />
                   <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Brief description for the persona.</p>
                </div>
              </div>

              <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:sm:border-gray-700 sm:pt-5">
                <Label for="avatar_url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-px sm:pt-2"> Avatar URL </Label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <Input type="url" name="avatar_url" id="avatar_url" v-model="formData.avatar_url" class="max-w-lg block w-full sm:max-w-xs" />
                </div>
              </div>
              
              <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:sm:border-gray-700 sm:pt-5">
                <Label for="system_prompt" class="block text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-px sm:pt-2"> System Prompt </Label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <Textarea id="system_prompt" name="system_prompt" v-model="formData.system_prompt" rows="5" class="max-w-lg block w-full" />
                   <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Instructions for the AI model.</p>
                </div>
              </div>

              <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 dark:sm:border-gray-700 sm:pt-5">
                <Label class="block text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-px sm:pt-2">Status</Label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <Select v-model="formData.status">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="pt-5">
          <div class="flex justify-end">
            <NuxtLink to="/personas">
                <Button type="button" variant="outline" class="mr-3">
                    Cancel
                </Button>
            </NuxtLink>
            <Button type="submit" :disabled="isSubmitting">
              {{ isSubmitting ? 'Updating...' : 'Update Persona' }}
            </Button>
          </div>
          <p v-if="submitError" class="mt-4 text-sm text-red-600 dark:text-red-400 text-right">Error: {{ submitError }}</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Json } from '~/types/supabase' // For voice_settings if used

// Interface for data coming from the API
interface ApiPersonaData {
  persona_id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string | null;
  status: 'active' | 'inactive' | 'deprecated';
}

// Interface for the form data
interface PersonaForm {
  persona_id?: number; // Optional, as it's part of the route, not directly in form for PUT
  name: string;
  description: string | undefined;
  avatar_url: string | undefined;
  system_prompt: string | undefined;
  status: 'active' | 'inactive' | 'deprecated';
}

const route = useRoute()
const router = useRouter()
const personaId = computed(() => route.params.id as string)

const formData = ref<PersonaForm>({
  name: '',
  description: undefined,
  avatar_url: undefined,
  system_prompt: undefined,
  status: 'active',
});

const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const pendingPersonaData = ref(true);
const personaError = ref<Error | null>(null);

// Fetch persona data on component mount
onMounted(async () => {
  if (personaId.value) {
    try {
      pendingPersonaData.value = true;
      const fetchedPersona = await $fetch<ApiPersonaData>(`/api/personas/${personaId.value}`);
      if (fetchedPersona) {
        formData.value = { 
          persona_id: fetchedPersona.persona_id,
          name: fetchedPersona.name || '',
          description: fetchedPersona.description || undefined,
          avatar_url: fetchedPersona.avatar_url || undefined,
          system_prompt: fetchedPersona.system_prompt || undefined,
          status: fetchedPersona.status || 'active'
        };
      } else {
        personaError.value = new Error('Persona not found or data is invalid.');
      }
    } catch (err: any) {
      console.error('Failed to fetch persona details:', err);
      // Nuxt $fetch throws an error for non-2xx responses, so 404s will be caught here.
      personaError.value = err.data || err; 
    } finally {
      pendingPersonaData.value = false;
    }
  }
});

const handleSubmit = async () => {
  if (!personaId.value) return;
  isSubmitting.value = true;
  submitError.value = null;
  try {
    // Prepare payload for the API. The API's PUT endpoint can handle boolean for is_active.
    const payload = {
        name: formData.value.name,
        description: formData.value.description === undefined ? null : formData.value.description,
        avatar_url: formData.value.avatar_url === undefined ? null : formData.value.avatar_url,
        system_prompt: formData.value.system_prompt === undefined ? null : formData.value.system_prompt,
        status: formData.value.status,
    };
    
    await $fetch(`/api/personas/${personaId.value}`, {
      method: 'PUT',
      body: payload,
    });
    alert('Persona updated successfully!');
    router.push('/personas');
  } catch (err: any) {
    console.error('Failed to update persona:', err);
    submitError.value = err.data?.message || err.message || 'An unknown error occurred.';
  } finally {
    isSubmitting.value = false;
  }
};

definePageMeta({
  title: 'Edit Persona'
});
</script>
