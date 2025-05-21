// server/utils/podcastScriptProcessor.ts
import { consola } from 'consola';

// Interface for persona data
interface Persona {
  name: string;
  voice_model_identifier: string; // This is the default voice model
  // Potentially, personas could have a structure like:
  // voice_models: { default: string; 'zh-CN'?: string; 'es-ES'?: string; ... }
  // For now, we'll handle overrides externally to this interface.
}

// Interface for individual script segments from input
interface ScriptSegment {
  speaker: string; // Name of the speaker, e.g., "Elliot"
  text: string;
}

/**
 * Normalizes a name by converting to lowercase and removing all spaces.
 */
function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '');
}

/**
 * 解码可能包含Unicode转义序列的字符串
 * 例如将 "\u516c\u56db" 转换为实际的中文字符
 */
function decodeUnicodeEscapes(str: string): string {
  // 如果字符串不包含转义序列，直接返回
  if (!str || !str.includes('\\u')) return str;

  try {
    // 解析JSON格式的字符串，这会自动处理Unicode转义
    // 例如 "\"\\u516c\\u56db\"" 会被解析为包含中文字符的字符串
    return JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
  } catch (e) {
    // 如果解析失败，使用更直接的替换方法
    consola.warn(`[decodeUnicodeEscapes] JSON.parse failed for '${str}', using regex replacement`);
    return str.replace(/\\u([a-fA-F0-9]{4})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
  }
}

// New interface for the output of this function, preparing segments for the next synthesis step
export interface PreparedSegmentForSynthesis {
  segmentIndex: number;
  text: string;
  voiceId: string; // The actual voice_model_identifier to be used for TTS
  speakerName: string; // Original speaker name
  error?: string;
}

// --- Language-Specific Voice Configuration ---
// IMPORTANT: Replace placeholder voice IDs with actual valid voice model identifiers from your TTS provider.

// Define persona-specific voice IDs for different languages
// Key: PersonaName, Value: { LanguageCode: VoiceId }
// This configuration is now ONLY for overriding a persona's default (final and usable) voice
// with a *different* (also final and usable) voice for a specific language.
// In most cases, the defaultVoiceId (from the database) will be used directly.
const PERSONA_LANGUAGE_VOICES: Record<string, Record<string, string>> = {
  // Example: If "Elliot"'s default voice_model_identifier (from DB) is 'volc_elliot_default_english_id',
  // but for Chinese, you specifically want to use 'volc_elliot_chinese_version_id' (also a final ID).
  // "Elliot": {
  //   "zh-CN": "volc_elliot_chinese_version_id"
  // }
  // Add other personas and their language-specific voices here
  // e.g., "Maria": { "es-ES": "maria_spanish_voice_id" }
};

// Define generic fallback voice IDs for languages if a persona doesn't have a specific one
// Key: LanguageCode, Value: VoiceId
// GENERIC_LANGUAGE_VOICES is no longer needed as the defaultVoiceId from the database
// is confirmed to be the final, usable ID.
// const GENERIC_LANGUAGE_VOICES: Record<string, string> = {
  // "zh-CN": "BV104_streaming", // TODO: Replace with a generic high-quality Chinese voice ID. Temporarily removed to test direct defaultVoiceId usage.
  // "es-ES": "generic_high_quality_spanish_voice_id"  // TODO: Replace with a generic high-quality Spanish voice ID
  // Add other languages and their generic fallback voices
// };
// --- End of Language-Specific Voice Configuration ---

/**
 * Determines the actual voice_model_identifier to use for synthesis,
 * considering the target language and persona.
 * Assumes 'defaultVoiceId' (sourced from the persona's voice_model_identifier in the database)
 * is ALREADY the final, usable voice_type ID for the TTS provider.
 *
 * PERSONA_LANGUAGE_VOICES can be used if a persona needs to use a *different*
 * (but still final and usable) voice for a specific target language,
 * overriding its default (final and usable) voice.
 */
async function getActualVoiceIdForSynthesis(
  personaName: string,
  defaultVoiceId: string, // Persona's default voice_model_identifier (assumed to be final and usable)
  targetLanguage: string  // e.g., "zh-CN", "en-US"
): Promise<string> {
  consola.info(`[getActualVoiceIdForSynthesis] ENTERING: personaName='${personaName}', defaultVoiceId='${defaultVoiceId}', targetLanguage='${targetLanguage}'`); // Added log
  
  // 1. Check for a persona-specific voice override for the target language.
  // This allows using a different (but still final) voice for a specific language
  // than the persona's default (final) voice.
  if (PERSONA_LANGUAGE_VOICES[personaName] && PERSONA_LANGUAGE_VOICES[personaName][targetLanguage]) {
    const specificVoiceId = PERSONA_LANGUAGE_VOICES[personaName][targetLanguage];
    consola.info(`[getActualVoiceIdForSynthesis] Using specific language override voice '${specificVoiceId}' for persona '${personaName}' in ${targetLanguage}.`);
    return specificVoiceId;
  }

  // 2. Otherwise, use the default voice_model_identifier from the persona (database)
  // as it's confirmed to be the final, usable ID.
  consola.info(`[getActualVoiceIdForSynthesis] Using default (final) voice '${defaultVoiceId}' for persona '${personaName}' for language ${targetLanguage}.`);
  return defaultVoiceId;
}

/**
 * Processes the raw podcast script and personas to prepare segments for TTS synthesis.
 * This function identifies the speaker, text, and the appropriate voiceId (voice_model_identifier)
 * for each segment, considering the overall podcast language.
 * It does NOT perform TTS itself.
 */
export async function processPodcastScript(
  podcastId: string,
  script: ScriptSegment[],
  personas: { hostPersona?: Persona; guestPersonas?: Persona[] },
  language: string // Overall language for the podcast, e.g., "zh-CN"
): Promise<PreparedSegmentForSynthesis[]> {
  consola.info(`[processPodcastScript] ENTERING: podcastId='${podcastId}', language='${language}'. Received personas:`, JSON.stringify(personas, null, 2)); // Added log
  const preparedSegments: PreparedSegmentForSynthesis[] = [];

  for (const [index, segment] of script.entries()) {
    consola.info(`[processPodcastScript] Loop iteration ${index})`); // Added log
    const segmentIndex = index + 1; // 1-based index for logging/errors
    const { speaker, text } = segment;

    if (!speaker || !text) {
      consola.warn(`[processPodcastScript] Skipping segment ${segmentIndex} for podcast "${podcastId}" due to missing speaker or text.`);
      preparedSegments.push({
        segmentIndex,
        text: text || '',
        speakerName: speaker || 'Unknown',
        voiceId: '', // No voiceId if speaker/text is missing
        error: 'Segment missing speaker or text.',
      });
      continue;
    }

    let defaultVoiceId: string | null = null;
    let currentPersona: Persona | undefined = undefined;

    // 解码speaker名称，处理可能的Unicode转义序列
    const decodedSpeaker = decodeUnicodeEscapes(speaker);
    if (decodedSpeaker !== speaker) {
      consola.info(`[processPodcastScript] Decoded speaker name from '${speaker}' to '${decodedSpeaker}'`);
    }
    
    // --- PRIORITY 1: Exact Match (using decodedSpeaker and original speaker) ---
    if (personas.hostPersona && (personas.hostPersona.name === decodedSpeaker || personas.hostPersona.name === speaker)) {
      currentPersona = personas.hostPersona;
      consola.info(`[processPodcastScript] Exact match for HOST: '${currentPersona.name}' with decoded speaker '${decodedSpeaker}'.`);
    } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
      currentPersona = personas.guestPersonas.find(p => p.name === decodedSpeaker || p.name === speaker);
      if (currentPersona) {
        consola.info(`[processPodcastScript] Exact match for GUEST: '${currentPersona.name}' with decoded speaker '${decodedSpeaker}'.`);
      }
    }

    // --- PRIORITY 2: Normalized Match (if no exact match found) ---
    if (!currentPersona) {
      const normalizedDecodedSpeaker = normalizeName(decodedSpeaker);
      consola.info(`[processPodcastScript] Attempting normalized match for '${decodedSpeaker}' (normalized to '${normalizedDecodedSpeaker}')`);
      if (personas.hostPersona && normalizeName(personas.hostPersona.name) === normalizedDecodedSpeaker) {
        currentPersona = personas.hostPersona;
        consola.info(`[processPodcastScript] Normalized match for HOST: '${currentPersona.name}'.`);
      } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
        currentPersona = personas.guestPersonas.find(p => normalizeName(p.name) === normalizedDecodedSpeaker);
        if (currentPersona) {
          consola.info(`[processPodcastScript] Normalized match for GUEST: '${currentPersona.name}'.`);
        }
      }
    }

    if (currentPersona) {
      defaultVoiceId = currentPersona.voice_model_identifier;
      consola.info(`[processPodcastScript] Matched speaker '${decodedSpeaker}' to persona '${currentPersona.name}'. DefaultVoiceId: '${defaultVoiceId}'.`);
    } else {
      consola.warn(`[processPodcastScript] No exact or normalized match found for speaker: "${decodedSpeaker}" (original: "${speaker}") in segment ${segmentIndex}`);
      // No persona matched, push segment with error and empty voiceId
      preparedSegments.push({
        segmentIndex,
        text,
        speakerName: speaker,
        voiceId: '', //留空 (Empty, as no persona/voice could be determined)
        error: `No persona matched for speaker: ${speaker} (decoded: ${decodedSpeaker})`
      });
      continue; // Skip to next segment
    }

    // Determine the actual voiceId to use, considering the podcast language
    const actualVoiceId = await getActualVoiceIdForSynthesis(
      currentPersona.name,
      defaultVoiceId,
      language
    );

    preparedSegments.push({
      segmentIndex,
      text,
      voiceId: actualVoiceId,
      speakerName: speaker,
    });
  }

  consola.info(`[processPodcastScript] Prepared ${preparedSegments.length} segments for podcast "${podcastId}" using language ${language}.`);
  return preparedSegments;
}
