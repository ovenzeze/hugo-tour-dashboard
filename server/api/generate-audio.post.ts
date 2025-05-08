import { serverSupabaseServiceRole } from '#supabase/server';
import type { Database } from '~/types/supabase';
import type { H3Event } from 'h3';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { writeFileSync, unlinkSync, readFileSync } from 'fs'; // readFileSync might be needed if provider saves file
import { join } from 'path';
import { tmpdir } from 'os';
import { getTtsProvider } from '../services/tts/factory'; // Updated import
import type { VoiceSynthesisRequest } from '../services/tts/types'; // Updated import

// Define DB types (assuming these are still relevant for fetching text and persona)
type GuideAudioInsert = Database['public']['Tables']['guide_audios']['Insert']; // Corrected: Use type alias

// Define an interface for the expected shape of the persona data when joined
interface PersonaWithTtsData {
    persona_id: number;
    name: string;
    voice_model_identifier?: string | null;
    tts_provider?: string | null;
}

// type GuideTextRow = Database['public']['Tables']['guide_texts']['Row']; // Not directly used here anymore for provider specifics
// type PersonaRow = Database['public']['Tables']['personas']['Row']; // For tts_provider and voice_model_identifier

// Combine fetched data for clarity - This interface might not be needed or needs adjustment
// interface TextWithPersona {
//     guide_text_id: number;
//     transcript: string;
//     language?: string;
//     museum_id?: number | null;
//     gallery_id?: number | null;
//     object_id?: number | null;
//     persona_id: number;
//     personas: {
//         persona_id: number;
//         name: string;
//         voice_model_identifier?: string | null;
//         tts_provider?: string | null; // Added tts_provider
//     };
// }

export default defineEventHandler(async (event: H3Event) => {
    console.log('API Route /api/generate-audio (refactored) called.');

    const supabaseClient = await serverSupabaseServiceRole<Database>(event);
    const runtimeConfig = useRuntimeConfig(event);
    // const storageBucketName = 'guide-voices'; // Keep if direct upload to Supabase happens here, otherwise remove

    let tempAudioFilePath: string | null = null; // To track for cleanup on error

    try {
        // 1. Read and Validate Input Body
        const body = await readBody(event);
        if (!body || typeof body.guide_text_id !== 'number') {
            throw createError({ statusCode: 400, statusMessage: 'Bad Request: Missing or invalid guide_text_id.' });
        }
        const guideTextId: number = body.guide_text_id;
        console.log(`Processing request for guide_text_id: ${guideTextId}`);

        // 2. Fetch Guide Text and Associated Persona (to get transcript, persona voice_id, and tts_provider)
        const { data: textAndPersonaData, error: fetchError } = await supabaseClient
            .from('guide_texts')
            .select(`
                guide_text_id,
                transcript,
                language,
                persona_id,
                personas (
                    persona_id,
                    name,
                    voice_model_identifier,
                    tts_provider 
                )
            `)
            .eq('guide_text_id', guideTextId)
            .single();

        if (fetchError) {
            console.error('Error fetching guide text/persona:', fetchError);
            throw createError({ statusCode: 500, statusMessage: `Database error: ${fetchError.message}` });
        }
        if (!textAndPersonaData) {
            throw createError({ statusCode: 404, statusMessage: `Guide text with id ${guideTextId} not found.` });
        }

        const { transcript, language, personas: personaRecord } = textAndPersonaData;

        if (!personaRecord) {
             throw createError({ statusCode: 404, statusMessage: `Persona not found for guide text id ${guideTextId}.` });
        }

        // Type assertion for personaRecord as it comes from a join
        const persona = personaRecord as PersonaWithTtsData; // Use defined interface

        console.log(`Found text: "${transcript.substring(0, 30)}...", Persona: ${persona.name}`);

        // 3. Determine TTS Provider and Parameters
        const providerId = body.tts_provider || persona.tts_provider || 'elevenlabs'; // Default to elevenlabs
        const ttsProvider = getTtsProvider(providerId, runtimeConfig);

        const voiceId = body.voice_id || persona.voice_model_identifier;
        if (!voiceId) {
            throw createError({ statusCode: 400, statusMessage: 'Voice ID is required (from request body or Persona settings).' });
        }
        
        // Provider-specific model ID from request, or let provider use its default
        const modelId = body.model_id; 
        const requestedOutputFormat = body.output_format || 'mp3_44100_128'; // Example default

        // Prepare provider-specific options (e.g., for ElevenLabs)
        // These should align with what the specific provider implementation expects in 'providerOptions'
        const providerOptions: Record<string, any> = {};
        if (providerId === 'elevenlabs') {
            providerOptions.stability = typeof body.stability === 'number' ? body.stability : 0.5;
            providerOptions.similarity_boost = typeof body.similarity_boost === 'number' ? body.similarity_boost : 0.75;
            providerOptions.style = typeof body.style === 'number' ? body.style : 0.0; // ElevenLabs specific
            providerOptions.use_speaker_boost = typeof body.use_speaker_boost === 'boolean' ? body.use_speaker_boost : true; // ElevenLabs specific
        }
        // Add more provider-specific options here if needed for other providers

        const synthesisRequest: VoiceSynthesisRequest = {
            text: transcript,
            voiceId: voiceId,
            modelId: modelId, // Optional, provider will use its default if not set
            languageCode: language || undefined, // Pass language if available
            outputFormat: requestedOutputFormat, // Provider might use this or have its own defaults/capabilities
            providerOptions: providerOptions,
        };

        console.log(`Using TTS Provider: ${providerId}, Voice ID: ${voiceId}`);

        // 4. Call TTS Provider's generateSpeech method
        const synthesisResponse = await ttsProvider.generateSpeech(synthesisRequest);
        const { audioData, contentType } = synthesisResponse;

        // 5. Process and Save Audio (similar to before, but using data from provider)
        // Determine file extension from outputFormat or contentType
        let fileExtension = 'mp3'; // Default
        if (synthesisRequest.outputFormat?.startsWith('mp3')) {
            fileExtension = 'mp3';
        } else if (synthesisRequest.outputFormat?.startsWith('wav') || contentType === 'audio/wav') {
            fileExtension = 'wav';
        } // Add more mappings as needed

        const audioFileName = `guide_audio_${guideTextId}_${persona.persona_id}_${Date.now()}.${fileExtension}`;
        tempAudioFilePath = join(tmpdir(), audioFileName); // Save to OS temp directory

        writeFileSync(tempAudioFilePath, Buffer.from(audioData));
        console.log(`Temporary audio file saved to: ${tempAudioFilePath}`);

        const audioDuration = await getAudioDurationInSeconds(tempAudioFilePath); // get-audio-duration often needs a file path

        // The current endpoint seems to return temp file path.
        // Actual upload to Supabase Storage and DB record creation might be handled elsewhere or in a subsequent call.
        // If it were to be handled here, you'd add:
        // const { data: storageData, error: storageError } = await supabaseClient.storage
        //   .from(storageBucketName)
        //   .upload(audioFileName, readFileSync(tempAudioFilePath), { contentType: contentType, upsert: true });
        // ... and then insert into guide_audios table.

        return {
            message: `Audio generated successfully by ${providerId}.`,
            provider_id: providerId,
            audio_file_path: tempAudioFilePath, // Path to the temporary local file
            audio_duration: audioDuration,
            audio_file_name: audioFileName,
            content_type: contentType,
            output_format_requested: requestedOutputFormat // Return what was requested
        };

    } catch (error: any) {
        console.error('Error in /api/generate-audio:', error);
        // Clean up temp file if created
        if (tempAudioFilePath) {
            try {
                unlinkSync(tempAudioFilePath);
            } catch (cleanupError) {
                console.error('Error cleaning up temporary audio file:', cleanupError);
            }
        }
        // Check if it's a H3Error from createError, if so, rethrow it
        if (error.statusCode && error.statusMessage) {
             throw error;
        }
        // Otherwise, wrap it
        throw createError({
            statusCode: 500,
            statusMessage: `Internal Server Error: ${error?.message || 'Unknown error during audio generation.'}`
        });
    }
    // 'finally' block for cleanup is tricky with async event handlers if errors are thrown out.
    // Cleanup is handled in catch for now. Consider if temp file should persist on success for some reason.
});