import type { Database } from '~/types/supabase';
// Import and directly re-export Persona from its original source
export type { Persona } from '~/stores/playgroundPersona';

// Define types with nested relationships based on Supabase types for composable use

/**
 * Represents an audio segment file, potentially with duration and other parameters.
 * Based on segment_audios table.
 */
export type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'] & {
  duration_ms?: number | null;
  params?: any;
};

/**
 * Represents a segment of a podcast transcript.
 * Based on podcast_segments table.
 */
export type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
  voice_id?: string;
  segment_id?: string | number; // Ensure segment_id is available
};

/**
 * Represents a podcast episode, including its segments and associated personas.
 * Based on podcasts table.
 */
export type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
  
  // Fields primarily from usePodcastPlayer.ts context (or potentially general usage)
  host_name?: string;
  guest_name?: string;
  // description is likely from DB but ensured here if used dynamically
  description?: string; 

  // Fields primarily from usePodcastDatabase.ts context (linked personas and cover)
  host_persona?: Persona | null; // Use the directly re-exported Persona
  creator_persona?: Persona | null; // Use the directly re-exported Persona
  guest_persona?: Persona | null; // Use the directly re-exported Persona
  // cover_image_url is in DB schema but re-iterated here for clarity from usePodcastDatabase
  cover_image_url?: string | null;
  
  // Added for PersonaStats component
  total_word_count?: number | null;
};

export interface CombineAudioResponse {
  audioUrl: string;
  duration?: string;
  fileSize?: string;
}
