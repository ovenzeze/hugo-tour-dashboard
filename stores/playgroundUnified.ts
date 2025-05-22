// stores/playgroundUnified.ts
import { defineStore } from 'pinia';
import type { PodcastCreateRequest, PodcastCreateResponse, ScriptSegment, SynthesisParams as ApiSynthesisParams } from '~/types/api/podcast';
import type { FullPodcastSettings } from '~/types/playground';
import { usePersonaCache } from '~/composables/usePersonaCache';

// Default values for synthesis parameters, can be adjusted
const DEFAULT_SYNTHESIS_PARAMS: ApiSynthesisParams = {
  temperature: 0.7,
  speed: 1.0,
  // ElevenLabs specific (provide sensible defaults or leave undefined)
  stability: 0.5,
  similarity_boost: 0.75,
  // Volcengine specific (provide sensible defaults or leave undefined)
  pitch: 0, // Assuming 0 is a neutral default for Volcengine pitch
  volume: 1.0, // Assuming 1.0 is a neutral default for Volcengine volume
};

export const usePlaygroundUnifiedStore = defineStore('playgroundUnified', {
  state: () => ({
    // UI form data, initialized with some defaults
    podcastSettings: {
      title: '',
      topic: '',
      numberOfSegments: 3, // Default, can be adjusted by UI
      style: '',
      keywords: [],
      hostPersonaId: undefined as number | undefined,
      guestPersonaIds: [] as number[],
      backgroundMusic: undefined as string | undefined,
      ttsProvider: 'elevenlabs' as 'elevenlabs' | 'volcengine',
    } as FullPodcastSettings,
    
    scriptContent: '', // Raw script text from the textarea
    
    synthesisParams: { ...DEFAULT_SYNTHESIS_PARAMS } as ApiSynthesisParams,
    
    parsedSegments: [] as ScriptSegment[], // Script parsed into segments with Persona IDs
    
    apiResponse: null as PodcastCreateResponse | null, // To store response from backend script processing
    synthesisApiResponse: null as any | null, // To store response from backend audio synthesis

    isLoading: false,
    currentStep: 1, // Or your default starting step
    error: null as string | null,

    // 新增状态属性
    audioUrl: null as string | null, // 当前音频URL (单段或预览)
    finalAudioUrl: null as string | null, // 最终合成的播客音频URL
    isSynthesizing: false, // 是否正在合成音频
    podcastId: null as string | number | null, // 当前播客ID
    createPodcastTrigger: 0, // 触发新播客创建的计数器，用于watch
    selectedPersonaIdForHighlighting: null as number | string | null, // 用于高亮显示的角色ID
    aiScriptGenerationStep: 0, // AI脚本生成当前步骤
    aiScriptGenerationStepText: '', // AI脚本生成步骤描述
    isValidating: false, // 是否正在验证脚本
    validationResult: null as any, // 脚本验证结果
  }),
  
  getters: {
    // Builds the request object for the backend API
    apiRequest(): PodcastCreateRequest | null {
      if (!this.podcastSettings.hostPersonaId) {
        console.warn('Host Persona ID is not set. Cannot build API request.');
        // Optionally set an error state here or handle it in the calling action
        return null; 
      }
      return {
        podcastTitle: this.podcastSettings.title || 'Untitled Podcast',
        script: this.parsedSegments,
        hostPersonaId: this.podcastSettings.hostPersonaId as number, // Assumed to be valid number by this point
        guestPersonaIds: this.podcastSettings.guestPersonaIds.filter(id => typeof id === 'number') as number[],
        language: this.determineLanguage(), // Needs implementation
        ttsProvider: this.podcastSettings.ttsProvider || 'elevenlabs',
        synthesisParams: this.synthesisParams,
        topic: this.podcastSettings.topic,
        keywords: this.podcastSettings.keywords,
        style: this.podcastSettings.style,
        // museumId, galleryId, objectId can be added if available in podcastSettings
      };
    },

    totalSelectedPersonas(): number[] {
      const ids = new Set<number>();
      if (this.podcastSettings.hostPersonaId) {
        ids.add(this.podcastSettings.hostPersonaId as number);
      }
      this.podcastSettings.guestPersonaIds.forEach(id => {
        if (typeof id === 'number') ids.add(id);
      });
      return Array.from(ids);
    }
  },
  
  actions: {
    updatePodcastSettings(settings: Partial<FullPodcastSettings>) {
      this.podcastSettings = {
        ...this.podcastSettings,
        ...settings,
        // Ensure guestPersonaIds remains an array of numbers if updated
        guestPersonaIds: settings.guestPersonaIds 
          ? settings.guestPersonaIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => typeof id === 'number') as number[] 
          : this.podcastSettings.guestPersonaIds,
        hostPersonaId: typeof settings.hostPersonaId === 'string' 
          ? parseInt(settings.hostPersonaId, 10) 
          : settings.hostPersonaId === undefined ? this.podcastSettings.hostPersonaId : settings.hostPersonaId
      };
    },
    
    updateScriptContent(content: string) {
      this.scriptContent = content;
      this.parseScript(); // Automatically parse when script content changes
    },
    
    updateSynthesisParams(params: Partial<ApiSynthesisParams>) {
      this.synthesisParams = {
        ...this.synthesisParams,
        ...params,
      };
    },
    
    // Parses the raw scriptContent into ScriptSegment objects
    parseScript() {
      if (!this.scriptContent.trim()) {
        this.parsedSegments = [];
        return;
      }
      
      const { getPersonaByName, fetchPersonas, personas } = usePersonaCache();
      // Ensure personas are loaded, if not, try to fetch them.
      // This is a simplified approach; a more robust solution might involve awaiting fetchPersonas if personas.value is empty.
      if (personas.value.length === 0) {
        console.warn('Personas not yet loaded. Attempting to fetch for script parsing...');
        fetchPersonas(); // Fire and forget, or await if critical for immediate parsing
        // If awaiting, this action would need to be async and UI should handle loading state
      }

      const lines = this.scriptContent.split('\n');
      const segments: ScriptSegment[] = [];
      let currentSpeakerName = '';
      let currentTextLines: string[] = [];

      const defaultPersonaId = this.podcastSettings.hostPersonaId || 
                               (this.podcastSettings.guestPersonaIds.length > 0 ? this.podcastSettings.guestPersonaIds[0] : undefined);

      for (const line of lines) {
        const speakerMatch = line.match(/^([^:]+):\s*(.*)$/); // Matches "Speaker Name: Text"
        
        if (speakerMatch) {
          // If there was a previous speaker, save their segment
          if (currentSpeakerName && currentTextLines.length > 0) {
            const speakerPersona = getPersonaByName(currentSpeakerName);
            segments.push({
              speaker: currentSpeakerName,
              // Use found persona ID, or fallback to host/first guest, or a placeholder if none
              speakerPersonaId: speakerPersona?.persona_id || defaultPersonaId || 0, // Fallback to 0 if no persona found/selected
              text: currentTextLines.join(' ').trim(),
            });
          }
          
          // Start new segment
          currentSpeakerName = speakerMatch[1].trim();
          currentTextLines = speakerMatch[2].trim() ? [speakerMatch[2].trim()] : [];
        } else if (currentSpeakerName) {
          // Continue current speaker's segment
          if (line.trim()) {
            currentTextLines.push(line.trim());
          }
        }
        // Ignore lines before the first speaker is defined
      }
      
      // Save the last segment after loop finishes
      if (currentSpeakerName && currentTextLines.length > 0) {
        const speakerPersona = getPersonaByName(currentSpeakerName);
        segments.push({
          speaker: currentSpeakerName,
          speakerPersonaId: speakerPersona?.persona_id || defaultPersonaId || 0, // Fallback
          text: currentTextLines.join(' ').trim(),
        });
      }
      
      this.parsedSegments = segments;
      if (segments.length === 0 && this.scriptContent.trim()) {
        console.warn('Script content provided, but no segments were parsed. Check script format.');
      }
    },
    
    // Placeholder for language determination logic
    determineLanguage(): string {
      // TODO: Implement robust language detection based on content or settings
      // For now, try to infer from host persona if available, else default to 'zh-CN' or 'en-US'
      const { getPersonaById, personas } = usePersonaCache();
      if (this.podcastSettings.hostPersonaId) {
         if (personas.value.length === 0) fetchPersonas(); // Ensure personas are available
        const hostPersona = getPersonaById(this.podcastSettings.hostPersonaId);
        if (hostPersona && hostPersona.language_support && hostPersona.language_support.length > 0) {
          return hostPersona.language_support[0]; // Take the first supported language of the host
        }
      }
      return 'zh-CN'; // Default language
    },
    
    // Action to process the script via backend API
    async generateScript() {
      this.isLoading = true;
      this.error = null;
      this.apiResponse = null;
      
      const requestBody = this.apiRequest;
      if (!requestBody) {
        this.error = 'Failed to build API request. Host persona might be missing.';
        this.isLoading = false;
        return null;
      }
      
      try {
        // Update UI to show generation progress
        this.aiScriptGenerationStep = 1;
        this.aiScriptGenerationStepText = '正在分析脚本内容...';
        
        // Call the script processing endpoint
        const response = await $fetch<PodcastCreateResponse>('/api/podcast/process/script', {
          method: 'POST',
          body: requestBody
        });
        
        this.aiScriptGenerationStep = 2;
        this.aiScriptGenerationStepText = '脚本处理完成';
        
        // Store the response
        this.apiResponse = response;
        
        // Update podcastId based on response
        if (response.podcastId) {
          this.podcastId = response.podcastId;
        }
        
        return response;
      } catch (error: any) {
        console.error('Error generating script:', error);
        this.error = error.message || '生成脚本失败';
        
        // Reset generation step UI
        this.aiScriptGenerationStep = 0;
        this.aiScriptGenerationStepText = '';
        
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // Synthesize audio for all script segments
    async synthesizeAudio(options: { validationResult?: any; podcastSettings?: any; speakerAssignments?: Record<string, any> } = {}) {
      if (!this.podcastId) {
        this.error = '缺少播客ID，无法合成音频。请先保存脚本。';
        return null;
      }
      
      this.isSynthesizing = true;
      this.error = null;
      
      try {
        // 使用传入的验证结果或从store中获取
        const validationResult = options.validationResult || this.validationResult;
        if (!validationResult || !validationResult.success) {
          throw new Error('脚本验证数据无效或缺失');
        }
        
        // 构建合成请求
        const synthesisRequest = {
          podcastId: this.podcastId,
          segments: validationResult.structuredData?.script || [],
          ttsProvider: this.podcastSettings.ttsProvider,
          synthesisParams: this.synthesisParams,
          speakerAssignments: options.speakerAssignments || {}
        };
        
        // 调用合成API
        const response = await $fetch('/api/podcast/process/synthesize', {
          method: 'POST',
          body: synthesisRequest
        });
        
        this.synthesisApiResponse = response;
        
        // 如果响应包含audioUrl，更新状态
        if (response && response.audioUrl) {
          this.audioUrl = response.audioUrl;
        }
        
        return response;
      } catch (error: any) {
        console.error('Error synthesizing audio:', error);
        this.error = error.message || '合成音频失败';
        throw error;
      } finally {
        this.isSynthesizing = false;
      }
    },
    
    // 预览所有音频片段
    async synthesizeAudioPreviewForAllSegments(
      validationResult: any, 
      podcastSettings: any, 
      speakerAssignments: Record<string, any>
    ) {
      if (!this.podcastId) {
        this.error = '缺少播客ID，无法预览音频。请先保存脚本。';
        return null;
      }
      
      if (!speakerAssignments || Object.keys(speakerAssignments).length === 0) {
        this.error = '缺少语音分配信息，无法预览音频。';
        return null;
      }
      
      try {
        // 构建预览请求
        const previewRequest = {
          podcastId: this.podcastId,
          segments: validationResult?.structuredData?.script || [],
          ttsProvider: podcastSettings.ttsProvider || this.podcastSettings.ttsProvider,
          synthesisParams: this.synthesisParams,
          speakerAssignments
        };
        
        // 调用预览API
        const response = await $fetch('/api/podcast/preview-segments', {
          method: 'POST',
          body: previewRequest
        });
        
        // 假设API返回了预览的音频URL
        if (response && response.previewUrl) {
          this.audioUrl = response.previewUrl;
        }
        
        return response;
      } catch (error: any) {
        console.error('Error previewing segments:', error);
        this.error = error.message || '预览音频失败';
        throw error;
      }
    },
    
    // 设置最终合成的音频URL
    setFinalAudioUrl(url: string) {
      this.finalAudioUrl = url;
      // 同时也更新当前audioUrl以便播放
      this.audioUrl = url;
    },
    
    // 合并所有音频片段
    async combineAudio() {
      if (!this.podcastId) {
        this.error = '缺少播客ID，无法合并音频。';
        return null;
      }
      
      try {
        const response = await $fetch('/api/podcast/combine-audio', {
          method: 'POST',
          body: {
            podcastId: this.podcastId
          }
        });
        
        if (response && response.audioUrl) {
          this.setFinalAudioUrl(response.audioUrl);
        }
        
        return response;
      } catch (error: any) {
        console.error('Error combining audio:', error);
        this.error = error.message || '合并音频失败';
        throw error;
      }
    },
    
    // 保存片段时间戳
    saveSegmentTimestamps(timestamps: any[]) {
      if (!this.podcastId || !timestamps || timestamps.length === 0) {
        return;
      }
      
      try {
        // 可以直接发送到后端保存，或者仅在前端处理
        console.log(`为播客ID ${this.podcastId} 保存了 ${timestamps.length} 个时间戳`);
        // 实际实现可能需要调用API或更新本地状态
      } catch (error) {
        console.error('Error saving timestamps:', error);
      }
    },
    
    // 选择主播角色
    selectHostPersona(personaId: number) {
      this.updatePodcastSettings({
        hostPersonaId: personaId
      });
      
      // 重新解析脚本以更新speakerPersonaId
      this.parseScript();
    },
    
    // 添加嘉宾角色
    addGuestPersona(personaId: number) {
      const guests = [...this.podcastSettings.guestPersonaIds];
      if (!guests.includes(personaId)) {
        guests.push(personaId);
        this.updatePodcastSettings({
          guestPersonaIds: guests
        });
      }
    },
    
    // 移除嘉宾角色
    removeGuestPersona(personaId: number) {
      const guests = this.podcastSettings.guestPersonaIds.filter(id => id !== personaId);
      this.updatePodcastSettings({
        guestPersonaIds: guests
      });
    },
    
    // 重置Playground状态
    resetPlaygroundState() {
      // 重置基本信息
      this.podcastSettings = {
        title: '',
        topic: '',
        numberOfSegments: 3,
        style: '',
        keywords: [],
        hostPersonaId: undefined,
        guestPersonaIds: [],
        backgroundMusic: undefined,
        ttsProvider: 'elevenlabs',
      } as FullPodcastSettings;
      
      // 重置脚本和段落
      this.scriptContent = '';
      this.parsedSegments = [];
      
      // 重置API响应和状态
      this.apiResponse = null;
      this.synthesisApiResponse = null;
      this.validationResult = null;
      
      // 重置音频相关
      this.audioUrl = null;
      this.finalAudioUrl = null;
      this.podcastId = null;
      
      // 重置UI状态
      this.isLoading = false;
      this.isSynthesizing = false;
      this.isValidating = false;
      this.error = null;
      this.aiScriptGenerationStep = 0;
      this.aiScriptGenerationStepText = '';
      this.selectedPersonaIdForHighlighting = null;
      this.currentStep = 1;
      
      // 增加触发器计数
      this.createPodcastTrigger++;
    },
    
    // 加载预设脚本
    loadPresetScript(presetIdentifier: string = 'default') {
      // 这里可以根据不同的预设标识符加载不同的脚本
      let presetScript = '';
      
      switch (presetIdentifier) {
        case 'ai_discussion':
          presetScript = 'Host: 欢迎来到我们的AI讨论播客。\nGuest: 很高兴能来参加这次讨论。\nHost: 今天我们将谈论人工智能的未来发展。';
          break;
        case 'interview':
          presetScript = 'Interviewer: 欢迎来到今天的访谈节目。\nGuest: 谢谢邀请，很高兴能来。\nInterviewer: 请问您能分享一下您的背景和经历吗？';
          break;
        case 'educational':
          presetScript = 'Teacher: 欢迎来到今天的教育播客。\nStudent: 很期待今天的学习。\nTeacher: 今天我们将学习一个全新的主题。';
          break;
        default:
          presetScript = 'Host: 欢迎来到我们的播客节目。\nGuest: 谢谢邀请，很高兴能来。\nHost: 让我们开始今天的讨论吧。';
      }
      
      // 更新脚本内容，这会自动触发parseScript
      this.updateScriptContent(presetScript);
      
      return presetScript;
    },
    
    // 清除错误状态
    clearError() {
      this.error = null;
    },
    
    // 验证当前脚本
    async validateCurrentScript() {
      if (!this.scriptContent.trim()) {
        this.error = '脚本内容为空，无法验证。';
        return null;
      }
      
      this.isValidating = true;
      this.error = null;
      
      try {
        // 确保脚本已解析为段落
        this.parseScript();
        
        if (this.parsedSegments.length === 0) {
          throw new Error('无法解析脚本内容，请检查格式是否正确。');
        }
        
        // 构建验证请求
        const validationRequest = {
          script: this.parsedSegments,
          podcastSettings: this.podcastSettings
        };
        
        // 调用验证API
        const validationResponse = await $fetch('/api/podcast/validate-script', {
          method: 'POST',
          body: validationRequest
        });
        
        // 保存验证结果
        this.validationResult = validationResponse;
        
        // 如果验证成功且返回了podcastId，保存它
        if (validationResponse.success && validationResponse.podcastId) {
          this.podcastId = validationResponse.podcastId;
        }
        
        return validationResponse;
      } catch (error: any) {
        console.error('Error validating script:', error);
        this.error = error.message || '验证脚本失败';
        this.validationResult = null;
        throw error;
      } finally {
        this.isValidating = false;
      }
    }
  }
}); 