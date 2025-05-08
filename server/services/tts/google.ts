import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import type {
    TextToSpeechProvider,
    VoiceSynthesisRequest,
    VoiceSynthesisResponse,
    VoiceModel,
} from './types';

// Helper to map Google's SSML gender to a simpler string
function mapSsmlGender(
    ssmlGender?: protos.google.cloud.texttospeech.v1.SsmlVoiceGender | keyof typeof protos.google.cloud.texttospeech.v1.SsmlVoiceGender | null | undefined
): string | undefined {
    if (!ssmlGender) return undefined;

    // Handle both enum values (numbers) and string keys
    if (typeof ssmlGender === 'string') {
        switch (ssmlGender) {
            case 'MALE': return 'male';
            case 'FEMALE': return 'female';
            case 'NEUTRAL': return 'neutral';
            // case 'SSML_VOICE_GENDER_UNSPECIFIED': return undefined; // Or a specific string like 'unspecified'
            default: return undefined;
        }
    } else { // It's an enum number
        switch (ssmlGender) {
            case protos.google.cloud.texttospeech.v1.SsmlVoiceGender.MALE: return 'male';
            case protos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE: return 'female';
            case protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL: return 'neutral';
            // case protos.google.cloud.texttospeech.v1.SsmlVoiceGender.SSML_VOICE_GENDER_UNSPECIFIED: return undefined;
            default: return undefined;
        }
    }
}

export class GoogleCloudTTSProvider implements TextToSpeechProvider {
    private client: TextToSpeechClient;
    public readonly providerId = 'google';

    constructor() { // runtimeConfig removed for now, can be added back if validateConfig is implemented
        this.client = new TextToSpeechClient();
        console.log('GoogleCloudTTSProvider initialized.');
    }

    async generateSpeech(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse> {
        console.log(`GoogleCloudTTSProvider: generateSpeech called with voiceId: ${request.voiceId}, text length: ${request.text.length}`);
        
        const synthesisInput: protos.google.cloud.texttospeech.v1.ISynthesisInput = { text: request.text };
        
        const languageCode = request.languageCode || this.extractLanguageCodeFromVoiceId(request.voiceId) || 'en-US';
        const voiceSelection: protos.google.cloud.texttospeech.v1.IVoiceSelectionParams = {
            languageCode: languageCode,
            name: request.voiceId,
        };
        
        let audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding = protos.google.cloud.texttospeech.v1.AudioEncoding.MP3;
        let contentType = 'audio/mpeg';

        if (request.outputFormat) {
            const formatLower = request.outputFormat.toLowerCase();
            if (formatLower === 'ogg_opus' || formatLower === 'opus') {
                audioEncoding = protos.google.cloud.texttospeech.v1.AudioEncoding.OGG_OPUS;
                contentType = 'audio/ogg; codecs=opus';
            } else if (formatLower === 'linear16' || formatLower === 'pcm') {
                audioEncoding = protos.google.cloud.texttospeech.v1.AudioEncoding.LINEAR16;
                // For LINEAR16, Google's default sample rate might vary. 
                // If a specific rate is needed, it should be set in audioConfig or derived from voice model metadata.
                // Example: contentType = 'audio/l16; rate=24000'; // Assuming 24kHz, adjust if necessary
                contentType = 'audio/wav'; // LINEAR16 is raw PCM, often wrapped in WAV for easier playback
            } else if (formatLower === 'mp3'){
                audioEncoding = protos.google.cloud.texttospeech.v1.AudioEncoding.MP3;
                contentType = 'audio/mpeg';
            }
        }

        const audioConfig: protos.google.cloud.texttospeech.v1.IAudioConfig = {
            audioEncoding: audioEncoding,
        };

        if (request.providerOptions) {
            if (typeof request.providerOptions.speakingRate === 'number') {
                audioConfig.speakingRate = request.providerOptions.speakingRate;
            }
            if (typeof request.providerOptions.pitch === 'number') {
                audioConfig.pitch = request.providerOptions.pitch;
            }
            if (Array.isArray(request.providerOptions.effectsProfileId)) {
                audioConfig.effectsProfileId = request.providerOptions.effectsProfileId;
            }
            if (typeof request.providerOptions.sampleRateHertz === 'number') {
                 audioConfig.sampleRateHertz = request.providerOptions.sampleRateHertz;
            }
        }

        const apiRequest: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
            input: synthesisInput,
            voice: voiceSelection,
            audioConfig: audioConfig,
        };

        try {
            const [response] = await this.client.synthesizeSpeech(apiRequest);
            if (!response.audioContent) {
                throw new Error('Google TTS API did not return audio content.');
            }

            // Ensure audioContent is treated as Buffer to access .buffer property
            const audioBuffer = response.audioContent instanceof Buffer 
                ? response.audioContent 
                : Buffer.from(response.audioContent as Uint8Array);
            
            const audioData: ArrayBuffer = audioBuffer.buffer.slice(
                audioBuffer.byteOffset,
                audioBuffer.byteOffset + audioBuffer.byteLength
            );
            
            console.log(`GoogleCloudTTSProvider: Speech synthesized successfully, audio size: ${audioData.byteLength} bytes`);

            return {
                audioData,
                contentType,
                // durationSeconds is not directly provided by Google TTS API for MP3/OGG_OPUS.
                // It could be calculated client-side or with a library if strictly needed.
            };
        } catch (error: any) {
            console.error('GoogleCloudTTSProvider: Error during speech synthesis', error.details || error.message || error);
            throw new Error(`Google TTS generation failed: ${error.message}`);
        }
    }

    async listVoices(languageCode?: string): Promise<VoiceModel[]> {
        console.log(`GoogleCloudTTSProvider: listVoices called, languageCode: ${languageCode}`);
        try {
            const [response] = await this.client.listVoices({ languageCode });
            const voices = response.voices || [];
            
            return voices
                .filter(voice => voice.name && voice.languageCodes && voice.languageCodes.length > 0)
                .map((voice: protos.google.cloud.texttospeech.v1.IVoice): VoiceModel => ({
                    id: voice.name!,
                    name: `${voice.name} (${mapSsmlGender(voice.ssmlGender) || 'N/A'}, ${voice.naturalSampleRateHertz}Hz)`,
                    gender: mapSsmlGender(voice.ssmlGender),
                    languageCodes: voice.languageCodes!,
                    provider: this.providerId,
                    providerMetadata: {
                        naturalSampleRateHertz: voice.naturalSampleRateHertz,
                        ssmlGender: voice.ssmlGender, // keep original for reference if needed
                    },
                }));
        } catch (error: any) {
            console.error('GoogleCloudTTSProvider: Error listing voices', error.details || error.message || error);
            throw new Error(`Failed to list Google TTS voices: ${error.message}`);
        }
    }

    private extractLanguageCodeFromVoiceId(voiceId: string): string | null {
        const parts = voiceId.split('-');
        if (parts.length >= 2) {
            return `${parts[0]}-${parts[1]}`;
        }
        return null;
    }
}
