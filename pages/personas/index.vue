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
        <button
          type="button"
          @click="navigateToAddPersonaPage"
          class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Add Persona
        </button>
      </div>
    </div>

    <div class="mt-8 flex flex-col">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div v-if="pending" class="text-center py-4">
            <p class="text-gray-500 dark:text-gray-400">Loading personas...</p>
            <!-- You can add a spinner or skeleton loader here -->
          </div>
          <div v-else-if="error" class="text-center py-4">
            <p class="text-red-500">Failed to load personas: {{ error.message }}</p>
          </div>
          <div v-else-if="personas && personas.length > 0" class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg dark:ring-white/10">
            <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">Avatar</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Name</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Description</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Status</th>
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                <tr v-for="persona in personas" :key="persona.persona_id">
                  <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                    <img v-if="persona.avatar_url" :src="persona.avatar_url" alt="Avatar" class="h-10 w-10 rounded-full" />
                    <span v-else class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">No Avatar</span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div class="font-medium text-gray-900 dark:text-gray-100">{{ persona.name }}</div>
                  </td>
                  <td class="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {{ persona.description || 'N/A' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span 
                      :class="['inline-flex rounded-full px-2 text-xs font-semibold leading-5',
                               persona.is_active 
                                 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                                 : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300']"
                    >
                      {{ persona.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button @click="editPersona(persona.persona_id)" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">Edit</button>
                    <button @click="confirmDeletePersona(persona.persona_id)" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-gray-500 dark:text-gray-400">No personas found. Get started by adding a new one!</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Placeholder for Add/Edit Persona Modal/Page logic -->
    <!-- <AddPersonaModal v-if="showAddPersonaModal" @close="showAddPersonaModal = false" @persona-added="refreshPersonas" /> -->
    <!-- <ConfirmDeleteModal v-if="personaToDelete" :personaId="personaToDelete" @close="personaToDelete = null" @persona-deleted="refreshPersonas" /> -->

  </div>
</template>

<script setup lang="ts">
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

const personaToDelete = ref<number | null>(null)

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

const navigateToAddPersonaPage = async () => {
  await navigateTo('/personas/create');
};

const editPersona = async (id: number) => {
  await navigateTo(`/personas/edit/${id}`);
}

const confirmDeletePersona = (id: number) => {
  console.log('Attempting to delete persona:', id)
  // Show confirmation modal
  // Example: personaToDelete.value = id
  if (confirm(`Are you sure you want to delete persona ${id}? This action cannot be undone.`)) {
    deletePersona(id);
  }
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
