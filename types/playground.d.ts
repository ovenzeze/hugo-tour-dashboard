import type { Persona } from './persona';

export interface SynthesisParams {
  temperature: number;
  speed: number;
}

export interface FullPodcastSettings {
  title: string;
  topic: string;
  numberOfSegments: number;
  style: string;
  keywords: string[]; // Changed to string[] to match PodcastSettingsForm logic
  hostPersonaId: number | string | undefined;
  guestPersonaIds: (number | string | undefined)[];
  backgroundMusic?: string | undefined;
  elevenLabsProjectId?: string | undefined; // Specific to ElevenLabs
  ttsProvider?: 'elevenlabs' | 'volcengine'; // New field for TTS provider
  language?: string; // Added field for podcast language
  useTimestamps?: boolean; // Added for controlling timestamp usage in synthesis
}

export type { Persona };
