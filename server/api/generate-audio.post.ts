import { serverSupabaseServiceRole } from '#supabase/server';
import type { Database } from '~/types/supabase';
import type { H3Event } from 'h3';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getTtsProvider } from '../services/tts/factory';
import type { VoiceSynthesisRequest } from '../services/tts/types';

interface PersonaWithTtsData {
    persona_id: number;
    name: string;
    voice_model_identifier?: string | null;
    tts_provider?: string | null;
}

// Define the type for inserting into guide_audios more explicitly
type GuideAudioInsert = Database['public']['Tables']['guide_audios']['Insert'];

export default defineEventHandler(async (event: H3Event) => {
    console.log('API Route /api/generate-audio (full refactor with storage, DB, metadata) called.');

    const supabaseClient = await serverSupabaseServiceRole<Database>(event);
    const runtimeConfig = useRuntimeConfig(event);
    const storageBucketName = runtimeConfig.public.supabaseStorageBucketName; // Corrected: Use the new config key

    let tempAudioFilePath: string | null = null;

    try {
        const body = await readBody(event);
        if (!body || typeof body.guide_text_id !== 'number') {
            throw createError({ statusCode: 400, statusMessage: 'Bad Request: Missing or invalid guide_text_id.' });
        }
        const guideTextId: number = body.guide_text_id;
        console.log(`Processing request for guide_text_id: ${guideTextId}`);

        // 1. Fetch Guide Text and associated Persona data
        const { data: textAndPersonaData, error: fetchError } = await supabaseClient
            .from('guide_texts')
            .select(`
                guide_text_id,
                transcript,
                language,
                persona_id,
                museum_id, 
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

        const { transcript, language, personas: personaRecord, museum_id } = textAndPersonaData;

        if (!personaRecord) {
             throw createError({ statusCode: 404, statusMessage: `Persona not found for guide text id ${guideTextId}.` });
        }
        const persona = personaRecord as PersonaWithTtsData;
        console.log(`Found text: "${transcript?.substring(0, 30)}...", Persona: ${persona.name}, Museum ID: ${museum_id}, Language: ${language}`);

        // 2. Determine TTS Provider and Voice
        const providerId = body.tts_provider || persona.tts_provider || 'elevenlabs';
        const ttsProvider = getTtsProvider(providerId, runtimeConfig);
        const voiceId = body.voice_id || persona.voice_model_identifier;
        if (!voiceId) {
            throw createError({ statusCode: 400, statusMessage: 'Voice ID is required (can be from persona or request body).' });
        }
        
        const modelId = body.model_id; // Optional, provider-specific
        const requestedOutputFormat = body.output_format || 'mp3_44100_128'; // Default or from request
        
        const providerOptions: Record<string, any> = {};
        if (providerId === 'elevenlabs') {
            providerOptions.stability = typeof body.stability === 'number' ? body.stability : 0.5;
            providerOptions.similarity_boost = typeof body.similarity_boost === 'number' ? body.similarity_boost : 0.75;
            providerOptions.style = typeof body.style === 'number' ? body.style : 0.0;
            providerOptions.use_speaker_boost = typeof body.use_speaker_boost === 'boolean' ? body.use_speaker_boost : true;
        }
        // Add other provider-specific options here if needed

        const synthesisRequest: VoiceSynthesisRequest = {
            text: transcript || '', // Ensure text is not null
            voiceId: voiceId,
            modelId: modelId,
            languageCode: language || undefined,
            outputFormat: requestedOutputFormat,
            providerOptions: providerOptions,
        };

        // 3. Generate Speech
        console.log(`Using TTS Provider: ${providerId}, Voice ID: ${voiceId}`);
        const synthesisResponse = await ttsProvider.generateSpeech(synthesisRequest);
        const { audioData, contentType } = synthesisResponse;

        let fileExtension = 'mp3'; // Default
        if (synthesisRequest.outputFormat?.includes('mp3')) fileExtension = 'mp3';
        else if (synthesisRequest.outputFormat?.includes('wav') || contentType === 'audio/wav') fileExtension = 'wav';
        // Add more mappings as needed based on provider output formats

        const audioFileName = `audio_${guideTextId}_p${persona.persona_id}_v${Date.now()}.${fileExtension}`;
        tempAudioFilePath = join(tmpdir(), audioFileName);
        writeFileSync(tempAudioFilePath, Buffer.from(audioData));
        console.log(`Temporary audio file saved to: ${tempAudioFilePath}`);

        const audioDuration = await getAudioDurationInSeconds(tempAudioFilePath);

        // 4. Upload to Supabase Storage
        const audioFileBuffer = readFileSync(tempAudioFilePath);
        const storagePath = `${museum_id || 'global'}/p${persona.persona_id}/${audioFileName}`;
        
        console.log(`Uploading to Supabase Storage at path: ${storagePath}`);
        const { data: storageUploadData, error: storageUploadError } = await supabaseClient.storage
            .from(storageBucketName)
            .upload(storagePath, audioFileBuffer, { 
                contentType: contentType, 
                upsert: false // Timestamp in filename should prevent most collisions
            });

        if (storageUploadError) {
            console.error('Error uploading to Supabase Storage:', storageUploadError);
            throw createError({ statusCode: 500, statusMessage: `Storage upload failed: ${storageUploadError.message}` });
        }
        console.log('Successfully uploaded to Supabase Storage:', storageUploadData?.path);

        // 5. Get Public URL
        const { data: publicUrlData } = supabaseClient.storage
            .from(storageBucketName)
            .getPublicUrl(storagePath);

        const publicAudioUrl = publicUrlData?.publicUrl || null;
        console.log('Public URL:', publicAudioUrl);

        // Critical check: If publicAudioUrl is null, we cannot proceed with DB insert as audio_url is non-nullable
        if (!publicAudioUrl) {
            // Attempt to delete the orphaned file from storage
            if (storagePath) {
                await supabaseClient.storage.from(storageBucketName).remove([storagePath]);
                console.log(`Cleaned up orphaned storage file due to missing public URL: ${storagePath}`)
            }
            throw createError({ statusCode: 500, statusMessage: 'Failed to get public URL for the uploaded audio file. Cannot save record.' });
        }

        // 6. Versioning logic for guide_audios
        const { data: existingAudios, error: existingAudiosError } = await supabaseClient
            .from('guide_audios')
            .select('version')
            .eq('guide_text_id', guideTextId)
            .eq('persona_id', persona.persona_id)
            .order('version', { ascending: false })
            .limit(1);

        if (existingAudiosError) {
            console.error('Error fetching existing audio versions:', existingAudiosError);
            throw createError({ statusCode: 500, statusMessage: 'Failed to check existing audio versions.' });
        }

        let newVersion = 1;
        if (existingAudios && existingAudios.length > 0 && typeof existingAudios[0].version === 'number') {
            newVersion = existingAudios[0].version + 1;
        }

        if (newVersion > 1) {
            const { error: updateOldVersionsError } = await supabaseClient
                .from('guide_audios')
                .update({ is_latest_version: false })
                .eq('guide_text_id', guideTextId)
                .eq('persona_id', persona.persona_id)
                .eq('is_latest_version', true);
            if (updateOldVersionsError) {
                console.error('Error updating old audio versions to not be latest:', updateOldVersionsError);
                // Log and continue, as this is not strictly critical for new audio creation
            }
        }

        // 7. Insert into guide_audios table
        const metadataToStore = {
            file_name: audioFileName,
            mime_type: contentType,
            tts_provider_id: providerId,
            voice_model_identifier: voiceId,
            requested_output_format: requestedOutputFormat,
            synthesis_settings: providerOptions,
            // You can add more relevant info from synthesisResponse if needed
        };

        const newGuideAudio: GuideAudioInsert = {
            guide_text_id: guideTextId,
            persona_id: persona.persona_id,
            audio_url: publicAudioUrl, // Store the public URL (now confirmed not null)
            duration_seconds: parseFloat(audioDuration.toFixed(3)),
            language: language || 'unknown', // Get from guide_text or default
            museum_id: museum_id, // Get from guide_text
            version: newVersion,
            is_latest_version: true,
            generated_at: new Date().toISOString(),
            metadata: metadataToStore as any, // Cast to any if Json type causes issues with deep objects
            // gallery_id and object_id are not directly available here, keep as null/default
        };

        const { data: insertedAudio, error: insertError } = await supabaseClient
            .from('guide_audios')
            .insert(newGuideAudio)
            .select('audio_guide_id, audio_url, duration_seconds, metadata') // Corrected: select audio_guide_id
            .single(); 

        if (insertError) {
            console.error('Error inserting into guide_audios:', insertError);
            // Attempt to delete the uploaded file if DB insert fails
            if (storagePath) {
                await supabaseClient.storage.from(storageBucketName).remove([storagePath]);
                console.log(`Attempted to clean up orphaned storage file: ${storagePath}`)
            }
            throw createError({ statusCode: 500, statusMessage: `Database insert failed: ${insertError.message}` });
        }
        if (!insertedAudio) {
            throw createError({ statusCode: 500, statusMessage: 'Failed to insert audio record or retrieve it after insert.' });
        }

        console.log('Audio record inserted into DB with ID:', insertedAudio.audio_guide_id); // Corrected: use audio_guide_id
        
        return {
            message: `Audio generated, uploaded, and recorded successfully for guide_text_id ${guideTextId}.`,
            guide_audio_id: insertedAudio.audio_guide_id, // Corrected: use audio_guide_id
            public_audio_url: insertedAudio.audio_url, 
            audio_duration: insertedAudio.duration_seconds,
            audio_file_name: audioFileName, // From metadata, for convenience
            // No Base64 data anymore
        };

    } catch (error: any) {
        console.error('Error in /api/generate-audio:', error);
        return createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal Server Error in audio generation.',
            data: error.data
        });
    } finally {
        // 8. Clean up temporary file
        if (tempAudioFilePath) {
            try {
                unlinkSync(tempAudioFilePath);
                console.log(`Temporary audio file ${tempAudioFilePath} deleted.`);
            } catch (cleanupError) {
                console.error(`Error deleting temporary file ${tempAudioFilePath}:`, cleanupError);
            }
        }
    }
});