// types/api/podcast.d.ts

// Base synthesis parameters, shared across TTS providers where applicable
export interface SynthesisParams {
  // Common parameters
  temperature?: number;       // Controls randomness, higher is more random.
  speed?: number;             // Speaking rate.
  
  // ElevenLabs specific parameters (optional)
  stability?: number;         // Voice stability for ElevenLabs.
  similarity_boost?: number;  // Similarity boost for ElevenLabs.
  style?: number;             // Style exaggeration for ElevenLabs v1.
  use_speaker_boost?: boolean; // Speaker boost for ElevenLabs.
  
  // Volcengine specific parameters (optional)
  pitch?: number;             // Pitch adjustment for Volcengine.
  volume?: number;            // Volume adjustment for Volcengine.
  volcengineEncoding?: 'mp3' | 'pcm' | 'wav'; // Audio encoding for Volcengine.
}

// Represents a segment of the podcast script
export interface ScriptSegment {
  speaker: string;            // Speaker's name (primarily for UI display and script readability)
  speakerPersonaId: number | null; // The unique ID of the Persona for this speaker. Can be null if no persona is matched/assigned.
  text: string;               // The text content of the segment.
}

// Request body for creating a new podcast
export interface PodcastCreateRequest {
  podcastTitle: string;       // Title of the podcast.
  script: ScriptSegment[];    // Array of script segments.
  hostPersonaId: number;      // Persona ID of the main host.
  guestPersonaIds: number[];  // Array of Persona IDs for any guests.
  language: string;           // Language code (e.g., 'en-US', 'zh-CN').
  ttsProvider: 'elevenlabs' | 'volcengine'; // TTS provider to use.
  synthesisParams?: SynthesisParams; // Optional synthesis parameters for all segments.
  
  // Optional metadata
  topic?: string;            // Topic of the podcast.
  keywords?: string[];       // Keywords related to the podcast content.
  style?: string;            // Overall style or genre of the podcast (e.g., "interview", "news").
  
  // Other optional fields that might be relevant for your application
  total_duration_ms?: number; // Estimated or actual total duration in milliseconds.
  total_word_count?: number;  // Total word count of the script.
  museumId?: number;         // Associated museum ID, if applicable.
  galleryId?: number;        // Associated gallery ID, if applicable.
  objectId?: number;         // Associated object ID, if applicable.
}

// Response body after a podcast creation request (or script processing)
export interface PodcastCreateResponse {
  success: boolean;           // Indicates if the operation was successful.
  podcastId: string | number; // Unique identifier for the created/processed podcast.
  // Segments prepared by the backend, possibly with minor adjustments or additional info.
  // Front-end can use this for subsequent synthesis requests if needed.
  preparedSegments: Array<{
    segmentIndex: number;     // Original index of the segment.
    text: string;             // Text of the segment (might be slightly modified by backend if necessary).
    speakerPersonaId: number; // Persona ID for this segment.
    speakerName: string;      // Speaker name (for UI confirmation).
    error?: string;          // Error message if there was an issue with this specific segment.
  }>;
  message: string;            // A message describing the result of the operation.
} 