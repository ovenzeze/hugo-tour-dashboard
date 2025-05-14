import { defineEventHandler, readBody, createError } from 'h3'; // Corrected syntax error
// import { $fetch } from 'ofetch'; // No longer needed if using TTS provider directly
import { getTtsProvider } from '../../../services/tts/factory'; // Corrected import path
import type { VoiceSynthesisRequest, VoiceSynthesisWithTimestampsResponse } from '../../../services/tts/types'; // Corrected import path
import { useRuntimeConfig } from '#imports'; // For runtime config

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface RequestPayload {
  script?: { speaker: string; text: string }[];
  personas?: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
  // 新增支持前端发送的格式
  config?: {
    ttsProvider: string;
    speakerAssignments: Record<string, string>;
    segments: { speakerTag: string; text: string; timestamps?: any[] }[];
  };
  synthesisParams?: any;
  // 添加重试相关参数
  retrySegments?: number[]; // 需要重试的段落索引
  maxRetries?: number; // 最大重试次数
}

// 定义段落处理结果接口
interface SegmentResult {
  speaker: string;
  text: string;
  audio?: string; // Base64编码的音频
  timestamps?: any[];
  contentType?: string;
  error?: string; // 如果处理失败，包含错误信息
  retryCount?: number; // 已重试次数
  status: 'success' | 'failed' | 'skipped'; // 处理状态
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestPayload;
    const runtimeConfig = useRuntimeConfig(event);
    
    // 处理两种不同的数据格式
    let script: { speaker: string; text: string }[] = [];
    let personas: { hostPersona?: Persona; guestPersonas?: Persona[] } = {};
    let ttsProviderName = 'elevenlabs'; // 默认使用elevenlabs
    const maxRetries = body.maxRetries || 2; // 默认最大重试2次
    
    if (body.script && body.personas) {
      // 原始格式
      script = body.script;
      personas = body.personas;
    } else if (body.config) {
      // 新格式 - 从config中提取数据
      ttsProviderName = body.config.ttsProvider || 'elevenlabs';
      
      // 将segments转换为script格式
      script = body.config.segments.map(seg => ({
        speaker: seg.speakerTag,
        text: seg.text
      }));
      
      // 从speakerAssignments创建personas
      // 简化处理：将所有角色都作为guest处理
      const guestPersonas: Persona[] = [];
      
      for (const speakerTag in body.config.speakerAssignments) {
        const voiceId = body.config.speakerAssignments[speakerTag];
        if (voiceId) {
          guestPersonas.push({
            name: speakerTag,
            voice_model_identifier: voiceId
          });
        }
      }
      
      personas = {
        guestPersonas
      };
    }
    
    // 验证数据
    if (!script || !Array.isArray(script) || script.length === 0 || !personas) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "script" array and "personas" object are required.',
      });
    }

    const segmentResults: SegmentResult[] = [];
    // 使用指定的TTS提供商
    const ttsProvider = getTtsProvider(ttsProviderName, runtimeConfig); 

    if (!ttsProvider.generateSpeechWithTimestamps) {
      throw createError({
        statusCode: 501,
        statusMessage: 'The configured TTS provider does not support generating speech with timestamps.',
      });
    }

    // 确定需要处理的段落
    const segmentsToProcess = body.retrySegments && body.retrySegments.length > 0
      ? body.retrySegments.map(index => ({ index, segment: script[index] })).filter(item => item.segment)
      : script.map((segment, index) => ({ index, segment }));

    // 处理每个段落
    for (const { index, segment } of segmentsToProcess) {
      const { speaker, text } = segment;

      if (!speaker || !text) {
        console.warn('Skipping segment due to missing speaker or text:', segment);
        segmentResults[index] = {
          speaker: speaker || 'unknown',
          text: text || '',
          error: 'Missing speaker or text',
          status: 'skipped'
        };
        continue;
      }

      let voiceId = null;
      if (personas.hostPersona && personas.hostPersona.name === speaker) {
        voiceId = personas.hostPersona.voice_model_identifier;
      } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
        const guest = personas.guestPersonas.find(p => p.name === speaker);
        if (guest) {
          voiceId = guest.voice_model_identifier;
        }
      }

      if (!voiceId) {
        console.warn(`Could not find voiceId for speaker: ${speaker}. Skipping segment.`);
        segmentResults[index] = {
          speaker,
          text,
          error: `Voice ID for speaker ${speaker} not found.`,
          status: 'skipped'
        };
        continue;
      }

      console.log(`Generating audio with timestamps for speaker: ${speaker} with voiceId: ${voiceId} via TTS Provider`);

      // 获取当前重试次数
      const currentRetryCount = segmentResults[index]?.retryCount || 0;
      
      try {
        const synthesisRequest: VoiceSynthesisRequest = {
          text: text,
          voiceId: voiceId,
          // 如果有合成参数，可以添加到请求中
          ...(body.synthesisParams ? { providerOptions: body.synthesisParams } : {})
        };
        
        const ttsResult: VoiceSynthesisWithTimestampsResponse = await ttsProvider.generateSpeechWithTimestamps(synthesisRequest);
        
        let audioBase64: string | undefined = undefined;
        if (ttsResult.audioData) {
          // Convert ArrayBuffer to Base64 string
          audioBase64 = Buffer.from(ttsResult.audioData).toString('base64');
        }

        segmentResults[index] = {
          speaker,
          text,
          audio: audioBase64, 
          timestamps: ttsResult.timestamps,
          contentType: ttsResult.contentType,
          retryCount: currentRetryCount,
          status: 'success'
        };

      } catch (ttsError: any) {
        console.error(`Error generating TTS for speaker ${speaker}:`, ttsError.message || ttsError);
        
        // 检查是否可以重试
        if (currentRetryCount < maxRetries) {
          console.log(`Will retry segment ${index} for speaker ${speaker}, retry ${currentRetryCount + 1}/${maxRetries}`);
          segmentResults[index] = {
            speaker,
            text,
            error: `Failed to generate audio: ${ttsError.statusMessage || ttsError.message}`,
            retryCount: currentRetryCount + 1,
            status: 'failed'
          };
        } else {
          console.log(`Max retries (${maxRetries}) reached for segment ${index}, speaker ${speaker}`);
          segmentResults[index] = {
            speaker,
            text,
            error: `Failed after ${maxRetries} retries: ${ttsError.statusMessage || ttsError.message}`,
            retryCount: currentRetryCount,
            status: 'failed'
          };
        }
      }
    }

    // 统计处理结果
    const successCount = segmentResults.filter(seg => seg?.status === 'success').length;
    const failedCount = segmentResults.filter(seg => seg?.status === 'failed').length;
    const skippedCount = segmentResults.filter(seg => seg?.status === 'skipped').length;
    const totalCount = script.length;
    
    // 获取需要重试的段落索引
    const segmentsToRetry = segmentResults
      .map((seg, idx) => seg?.status === 'failed' && seg.retryCount < maxRetries ? idx : -1)
      .filter(idx => idx !== -1);

    return {
      segments: segmentResults,
      summary: {
        total: totalCount,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        canRetry: segmentsToRetry.length > 0,
        segmentsToRetry
      }
    };

  } catch (error: any) {
    console.error('Error in generate-timed-segments:', error.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate timed segments',
      data: error,
    });
  }
});
