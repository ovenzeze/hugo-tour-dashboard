import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettings';
import { usePlaygroundScriptStore } from '~/stores/playgroundScript';
import { usePlaygroundPersonaStore } from '~/stores/playgroundPersona';

export interface ValidateScriptRequest {
  // Required fields
  rawScript: string;                // Original script content entered in the editor
  title: string;                    // Podcast title
  
  // Character information
  personas: {
    hostPersona: {                  // Host information
      id: number;                   // persona_id
      name: string;                 // Character name
      voice_model_identifier: string; // Voice model identifier
    },
    guestPersonas: Array<{          // Guest information list
      id: number;                   // persona_id
      name: string;                 // Character name
      voice_model_identifier: string; // Voice model identifier
    }>
  };
  
  // Style preferences
  preferences: {
    style: string;                  // Podcast style, e.g., "conversational", "interview"
    language: string;               // Language, default "en-US"
    keywords: string;               // Keywords
    numberOfSegments?: number;      // Number of segments
    backgroundMusic?: string;       // Background music type
  };
}

export interface ValidateScriptResponse {
  success: boolean;                 // Whether validation was successful
  message?: string;                 // Success/failure message
  structuredData?: {
    podcastTitle: string;           // Podcast title
    script: Array<{                 // Structured script
      role: 'host' | 'guest';       // Role type
      name: string;                 // Character name
      text: string;                 // Dialogue content
    }>;
    voiceMap: Record<string, {      // Mapping of character names to voices
      personaId: number;            // persona ID
      voice_model_identifier: string; // Voice model identifier
    }>;
    language: string;               // Language
  };
  error?: string;                   // Error message
}

export interface ScriptSegment {
  speaker: string;
  text: string;
}

export function useScriptValidator() {
  const settingsStore = usePlaygroundSettingsStore();
  const scriptStore = usePlaygroundScriptStore();
  const personaStore = usePlaygroundPersonaStore();
  const isValidating = ref(false);
  const validationResult = ref<ValidateScriptResponse | null>(null);
  const validationError = ref<string | null>(null);

  /**
   * Parses script content into segments
   */
  function parseScriptToSegments(content: string): ScriptSegment[] {
    if (!content) return [];
    
    return content
      .split('\n')
      .map(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex <= 0) return null; // Invalid line
        
        const speaker = line.substring(0, colonIndex).trim();
        const text = line.substring(colonIndex + 1).trim();
        
        return { speaker, text };
      })
      .filter(segment => segment && segment.speaker && segment.text) as ScriptSegment[];
  }

  /**
   * Validates script content
   */
  async function validateScript() {
    if (isValidating.value) {
      return { success: false, error: 'Validation is already in progress' };
    }
    
    isValidating.value = true;
    validationResult.value = null;
    validationError.value = null;

    try {
        // Validate basic settings
        const podcastSettings = settingsStore.podcastSettings; // Use settingsStore
        
        if (!podcastSettings?.title) {
          toast.error('Please set the podcast title');
          return { success: false, error: 'Please set the podcast title' };
        }
        
        if (!podcastSettings?.hostPersonaId) {
          toast.error('Please select a host');
          return { success: false, error: 'Please select a host' };
        }
        
        if (!scriptStore.textToSynthesize) { // Use scriptStore
          toast.error('Script content is empty');
          return { success: false, error: 'Script content is empty' };
        }
        
        // Get host information
        const hostPersona = personaStore.personas.find( // Use personaStore
          (p) => p.persona_id === Number(podcastSettings.hostPersonaId)
        );
        
        if (!hostPersona) {
          toast.error('Selected host not found');
          return { success: false, error: 'Selected host not found' };
        }
        
        // Get guest information
        const guestPersonas = podcastSettings.guestPersonaIds
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0)
          .map(id => personaStore.personas.find(p => p.persona_id === id)) // Use personaStore
          .filter(p => p !== undefined) as any[];
        
        if (guestPersonas.length === 0) {
          toast.error('Please select at least one guest');
          return { success: false, error: 'Please select at least one guest' };
        }
        
        // Parse script
        const scriptSegments = parseScriptToSegments(scriptStore.textToSynthesize); // Use scriptStore
        
        if (scriptSegments.length === 0) {
          toast.error('Failed to parse script. Please ensure the format is "Speaker: Text content"');
          return { success: false, error: 'Failed to parse script' };
        }
        
        // Build request body
        const requestBody: ValidateScriptRequest = {
          title: podcastSettings.title,
          rawScript: scriptStore.textToSynthesize, // Use scriptStore
          personas: {
            hostPersona: {
              id: hostPersona.persona_id,
            voice_model_identifier: hostPersona.voice_model_identifier || ''
          },
          guestPersonas: guestPersonas.map(persona => ({
            id: persona.persona_id,
            name: persona.name,
            voice_model_identifier: persona.voice_model_identifier || ''
          }))
        },
        preferences: {
          style: podcastSettings.style || 'conversational',
          language: 'en-US',
          keywords: podcastSettings.keywords || '',
          numberOfSegments: podcastSettings.numberOfSegments || 3,
          backgroundMusic: podcastSettings.backgroundMusic
        }
      };
      
      console.log('[DEBUG] API request body (standalone validation):', JSON.stringify(requestBody, null, 2));
      
      // Call API
      const response = await $fetch<ValidateScriptResponse>('/api/podcast/process/validate', {
        method: 'POST',
        body: requestBody as Record<string, any>
      });
      
      console.log('[DEBUG] API response (standalone validation):', response);
      
      validationResult.value = response;
      
      if (response.success) {
        toast.success('Script validation passed');
        return { success: true, data: response.structuredData };
      } else {
        toast.error(`Validation failed: ${response.message || response.error || 'Unknown error'}`);
        validationError.value = response.error || response.message || 'Validation failed';
        return { success: false, error: validationError.value };
      }
    } catch (err: any) {
      console.error('[ERROR] API request failed (standalone validation):', err);
      const errorMessage = err.data?.message || err.message || 'Server error';
      toast.error(`Request error: ${errorMessage}`);
      validationError.value = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      isValidating.value = false;
    }
  }

  return {
    isValidating,
    validationResult,
    validationError,
    validateScript,
    parseScriptToSegments
  };
} 