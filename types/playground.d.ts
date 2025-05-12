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
  keywords: string;
  hostPersonaId: number | string | undefined;
  guestPersonaIds: (number | string | undefined)[];
  backgroundMusic?: string | undefined;
  elevenLabsProjectId?: string | undefined;
}

export type { Persona }; 