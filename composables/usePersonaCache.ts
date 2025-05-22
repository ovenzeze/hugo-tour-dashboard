import { ref, computed } from 'vue';
import type { Persona } from '~/types/persona'; // Ensure this path is correct for your Persona type definition

// Module-scoped cache and state
const personasCache = ref<Persona[]>([]);
const isLoading = ref(false);
const lastFetchTime = ref(0);
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

export function usePersonaCache() {
  const isCacheStale = computed(() => {
    return (
      personasCache.value.length === 0 ||
      Date.now() - lastFetchTime.value > CACHE_DURATION
    );
  });

  async function fetchPersonas(forceRefresh = false) {
    if ((isCacheStale.value || forceRefresh) && !isLoading.value) {
      isLoading.value = true;
      try {
        // Assuming your API endpoint for fetching active personas is /api/personas
        // Adjust if necessary
        const data = await $fetch<Persona[]>('/api/personas?active=true');
        personasCache.value = data || []; // Ensure cache is always an array
        lastFetchTime.value = Date.now();
        return personasCache.value;
      } catch (error) {
        console.error('Failed to fetch personas:', error);
        // Depending on your error handling strategy, you might want to throw the error
        // or return an empty array / previously cached data.
        return personasCache.value; // Return existing cache on error to prevent breaking UI
      } finally {
        isLoading.value = false;
      }
    }
    return personasCache.value;
  }

  function getPersonaById(id: number | string): Persona | undefined {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) return undefined;
    return personasCache.value.find(p => p.persona_id === numericId);
  }

  function getPersonaByName(name: string): Persona | undefined {
    if (!name) return undefined;
    return personasCache.value.find(
      p => p.name?.toLowerCase() === name.toLowerCase()
    );
  }

  function invalidateCache() {
    lastFetchTime.value = 0; // Mark cache as stale
    personasCache.value = []; // Optionally clear existing data
  }

  return {
    personas: computed(() => personasCache.value),
    isLoading: computed(() => isLoading.value),
    fetchPersonas,
    getPersonaById,
    getPersonaByName,
    invalidateCache,
    isCacheStale
  };
} 