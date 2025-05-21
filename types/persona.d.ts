export interface Persona {
  persona_id: number; // Changed from 'id' to 'persona_id' and type to 'number'
  name: string;
  avatar_url?: string | null;
  voice_id?: string; // Keep for backward compatibility if needed
  voice_model_identifier?: string | null; // Added for Volcengine, allowing null
  description?: string | null; // Changed to allow null
  voice?: { // Add voice property
    volcengine?: {
      voiceType: string;
    };
    // Add other TTS providers here if needed
  };
}
