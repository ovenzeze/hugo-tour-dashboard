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
const PERSONA_LANGUAGE_VOICES: Record<string, Record<string, string>> = {
  "Elliot": {
    "zh-CN": "actual_chinese_voice_id_for_elliot" // TODO: Replace with actual Chinese voice ID for Elliot
  },
  "Cybo": {
    "zh-CN": "actual_chinese_voice_id_for_cybo"   // TODO: Replace with actual Chinese voice ID for Cybo
  }
  // Add other personas and their language-specific voices here
  // e.g., "Maria": { "es-ES": "maria_spanish_voice_id" }
};

// Define generic fallback voice IDs for languages if a persona doesn't have a specific one
// Key: LanguageCode, Value: VoiceId
const GENERIC_LANGUAGE_VOICES: Record<string, string> = {
  "zh-CN": "generic_high_quality_chinese_voice_id", // TODO: Replace with a generic high-quality Chinese voice ID
  "es-ES": "generic_high_quality_spanish_voice_id"  // TODO: Replace with a generic high-quality Spanish voice ID
  // Add other languages and their generic fallback voices
};
// --- End of Language-Specific Voice Configuration ---

/**
 * Determines the actual voice_model_identifier to use for synthesis,
 * considering the target language and persona.
 */
async function getActualVoiceIdForSynthesis(
  personaName: string,
  defaultVoiceId: string, // Persona's default voice_model_identifier
  targetLanguage: string  // e.g., "zh-CN", "en-US"
): Promise<string> {
  consola.info(`[getActualVoiceIdForSynthesis] ENTERING: personaName='${personaName}', defaultVoiceId='${defaultVoiceId}', targetLanguage='${targetLanguage}'`); // Added log
  // 1. Check for a persona-specific voice for the target language
  if (PERSONA_LANGUAGE_VOICES[personaName] && PERSONA_LANGUAGE_VOICES[personaName][targetLanguage]) {
    const specificVoiceId = PERSONA_LANGUAGE_VOICES[personaName][targetLanguage];
    consola.info(`[getActualVoiceIdForSynthesis] Using specific ${targetLanguage} voice '${specificVoiceId}' for persona '${personaName}'.`);
    return specificVoiceId;
  }

  // 2. Check if the default voice is already suitable for the target language
  // This is a simplified check. A more robust system might store the language of the defaultVoiceId.
  // For now, if targetLanguage is 'en-US' (or general 'en'), assume default is often English-based.
  // Or, if the persona's default voice IS a Chinese voice, and target is Chinese, it's fine.
  // This part needs more sophisticated logic if personas have default voices in various languages.
  // For this example, we assume if no specific voice is found, we check generic, then default.

  // 3. Check for a generic high-quality voice for the target language
  if (GENERIC_LANGUAGE_VOICES[targetLanguage]) {
    // We should ideally only use this if the defaultVoiceId is NOT for the targetLanguage.
    // For now, we'll prioritize generic if no persona-specific one is found for the language.
    const genericVoiceId = GENERIC_LANGUAGE_VOICES[targetLanguage];
    consola.info(`[getActualVoiceIdForSynthesis] No specific ${targetLanguage} voice for '${personaName}'. Using generic ${targetLanguage} voice '${genericVoiceId}'.`);
    return genericVoiceId;
  }

  // 4. Fallback to the persona's default voice_model_identifier
  consola.info(`[getActualVoiceIdForSynthesis] No specific or generic ${targetLanguage} voice for '${personaName}'. Using default voice '${defaultVoiceId}'.`);
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
    consola.info(`[processPodcastScript] Loop iteration ${index}. Current personas state:`, JSON.stringify(personas, null, 2)); // Added log
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
    
    // 使用解码后的speaker名称进行匹配
    if (personas.hostPersona && (personas.hostPersona.name === decodedSpeaker || personas.hostPersona.name === speaker)) {
      defaultVoiceId = personas.hostPersona.voice_model_identifier;
      currentPersona = personas.hostPersona;
      consola.info(`[processPodcastScript] Matched hostPersona: '${decodedSpeaker}'. DefaultVoiceId: '${defaultVoiceId}'. CurrentPersona:`, JSON.stringify(currentPersona, null, 2));
    } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
      const guest = personas.guestPersonas.find(p => p.name === decodedSpeaker || p.name === speaker);
      if (guest) {
        defaultVoiceId = guest.voice_model_identifier;
        currentPersona = guest;
        consola.info(`[processPodcastScript] Matched guestPersona: '${speaker}'. DefaultVoiceId: '${defaultVoiceId}'. CurrentPersona:`, JSON.stringify(currentPersona, null, 2));
      } else {
        consola.warn(`[processPodcastScript] Speaker '${speaker}' not found in guestPersonas.`);
      }
    } else {
      consola.warn(`[processPodcastScript] No hostPersona or guestPersonas provided, or guestPersonas is not an array. Speaker: '${speaker}'`);
    }

    // 如果无法精确匹配角色名称，尝试基于角色类型分配声音
    if (!defaultVoiceId || !currentPersona) {
      consola.warn(`[processPodcastScript] No exact match found for speaker: "${speaker}" in segment ${segmentIndex}`);
      
      // 不做任何分配，只展示警告
      consola.warn(`[processPodcastScript] No persona matched for speaker: "${speaker}" in segment ${segmentIndex}`);
      preparedSegments.push({
        segmentIndex,
        text,
        speakerName: speaker,
        voiceId: '', // 留空
        error: `No persona matched for speaker: ${speaker}`
      });
      continue;
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
