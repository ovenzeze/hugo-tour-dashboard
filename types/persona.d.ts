// Import Supabase generated types to align Persona with the database schema
import type { Database } from './supabase'; // Adjust path if necessary

// Define Persona based on the Supabase table definition for consistency
export type Persona = Database['public']['Tables']['personas']['Row'] & {
  // Add any client-side specific, optional fields here if needed
  role?: 'Host' | 'Guest' | 'Both' | string; // string for flexibility if backend has other roles

  // voice_id is not in supabase personas table; voice_model_identifier is used.
  // Keep voice_id if it's used for some specific client-side logic or backward compatibility, but mark as optional.
  voice_id?: string;

  // The `voice` object for specific TTS provider params can also be an optional client-side addition
  // This structure was present in the previous simple Persona interface.
  voice?: {
    volcengine?: {
      voiceType: string;
    };
    // other providers...
  };
  // language_support is already part of Database['public']['Tables']['personas']['Row']
  // description is already part of Database['public']['Tables']['personas']['Row']
  // tts_provider is already part of Database['public']['Tables']['personas']['Row']
  // voice_model_identifier is already part of Database['public']['Tables']['personas']['Row']
  // avatar_url is already part of Database['public']['Tables']['personas']['Row']
  // name is already part of Database['public']['Tables']['personas']['Row']
  // persona_id is already part of Database['public']['Tables']['personas']['Row']
};
