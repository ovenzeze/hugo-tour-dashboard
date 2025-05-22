import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePersonaCache } from '~/composables/usePersonaCache';

// Interface for the validation result
export interface ValidateScriptResponse { // Renamed from ClientValidationResult
  success: boolean;
  message?: string; // Added to match usage in usePlaygroundAudio
  structuredData?: any; // Added to match usage, type can be refined later
  error?: string;
}

export function useScriptValidator() {
  const settingsStore = usePlaygroundSettingsStore();
  const scriptStore = usePlaygroundScriptStore();
  const personaCache = usePersonaCache();
  const isValidating = ref(false); // Still useful to prevent concurrent validations if any async ops remain
  const validationError = ref<string | null>(null);

  /**
   * Validates script content and podcast settings on the client-side.
   * This function no longer makes API calls.
   */
  async function validateClientSide(): Promise<ValidateScriptResponse> { // Updated return type
    if (isValidating.value) {
      // This check might be less critical now but kept for safety
      return { success: false, error: 'Validation is already in progress.', message: 'Validation in progress.' };
    }

    isValidating.value = true;
    validationError.value = null;

    try {
      // Validate basic settings from playgroundSettingsStore
      if (!settingsStore.podcastSettings.title) {
        toast.error('Podcast title is required.');
        return { success: false, error: 'Podcast title is required.', message: 'Podcast title is required.' };
      }

      const hostPersonaIdNumeric = settingsStore.getHostPersonaIdNumeric; // Corrected getter access
      if (hostPersonaIdNumeric === undefined) {
        toast.error('A host persona must be selected.');
        return { success: false, error: 'A host persona must be selected.', message: 'A host persona must be selected.' };
      }

      // Validate script content from playgroundScriptStore
      if (!scriptStore.scriptContent) {
        toast.error('Script content cannot be empty.');
        return { success: false, error: 'Script content cannot be empty.', message: 'Script content cannot be empty.' };
      }
      
      // Validate that the selected host persona exists in the cache
      const hostPersona = personaCache.getPersonaById(hostPersonaIdNumeric);
      if (!hostPersona) {
        toast.error('Selected host persona not found. Please refresh personas.');
        return { success: false, error: 'Selected host persona not found.', message: 'Selected host persona not found.' };
      }

      // Validate guest personas if any are selected
      const guestPersonaIdsNumeric = settingsStore.getGuestPersonaIdsNumeric; // Corrected getter access
      if (guestPersonaIdsNumeric && guestPersonaIdsNumeric.length > 0) {
        for (const guestId of guestPersonaIdsNumeric) {
          // guestId here is already a number, no need to check for null from the getter
          const guestPersona = personaCache.getPersonaById(guestId);
          if (!guestPersona) {
            toast.error(`Selected guest persona (ID: ${guestId}) not found. Please refresh personas.`);
            return { success: false, error: `Selected guest persona (ID: ${guestId}) not found.`, message: `Selected guest persona (ID: ${guestId}) not found.` };
          }
        }
      }
      
      // The script parsing and segment validation is now handled by playgroundScriptStore.parseScript.
      // We can check if parsedSegments exist and are not empty as a proxy for successful parsing.
      if (!scriptStore.parsedSegments || scriptStore.parsedSegments.length === 0) {
        if (scriptStore.scriptContent && scriptStore.scriptContent.trim() !== '') {
            toast.error('Script could not be parsed into segments. Check format: "Speaker: Text"');
            return { success: false, error: 'Script could not be parsed into segments. Ensure format is "Speaker: Text content".', message: 'Script could not be parsed into segments.' };
        }
      }

      // All client-side checks passed
      toast.success('Client-side validation passed.');
      // For now, return a basic structure. structuredData can be populated if needed by client-side logic.
      return { success: true, message: 'Client-side validation passed.', structuredData: {} };

    } catch (err: any) {
      // Catch any unexpected errors during client-side validation
      console.error('[ERROR] Client-side validation failed:', err);
      const errorMessage = err.message || 'An unexpected error occurred during validation.';
      toast.error(`Validation error: ${errorMessage}`);
      validationError.value = errorMessage;
      return { success: false, error: errorMessage, message: errorMessage };
    } finally {
      isValidating.value = false;
    }
  }

  return {
    isValidating,
    validationError, // Expose validationError for UI feedback
    validateClientSide // Renamed function
    // parseScriptToSegments is removed
  };
}