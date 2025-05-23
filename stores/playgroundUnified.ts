// stores/playgroundUnified.ts
import { defineStore } from 'pinia';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { ScriptSegment, PodcastCreateRequest, PodcastCreateResponse } from '~/types/api/podcast';
import type { FullPodcastSettings } from '~/types/playground';

export const usePlaygroundUnifiedStore = defineStore('playgroundUnified', {
  state: () => ({
    // 核心状态 - MVP版本
    currentStep: 1,
    scriptContent: '',
    parsedSegments: [] as ScriptSegment[],
    podcastId: null as string | number | null,
    finalAudioUrl: null as string | null,
    
    // 加载状态
    isLoading: false, // AI script generation
    isSynthesizing: false, // audio synthesis
    isValidating: false, // script validation
    
    // 错误状态
    error: null as string | null,
    
    // 进度状态
    synthesisProgress: null as { completed: number; total: number; percentage: number; currentSegment?: number } | null,
    
    // 单个片段合成进度状态
    segmentSynthesisProgress: {} as Record<number, { 
      status: 'idle' | 'loading' | 'success' | 'error'; 
      progress: number; 
      stage: string; 
      audioUrl?: string;
      error?: string;
    }>,
    
    // AI生成相关（保留兼容性）
    aiScriptGenerationStep: 0,
    aiScriptGenerationStepText: '',
    
    // 其他状态（从mock保留）
    validationResult: null as any,
    podcastSettingsSnapshot: {} as Partial<FullPodcastSettings>,
    selectedPersonaIdForHighlighting: null as string | number | null,
    
    // 内部状态（非响应式）
    _analyzeScriptTimer: null as NodeJS.Timeout | null,

    // === 新增：Modal状态管理 ===
    showSynthesisModal: false,
    podcastNameForModal: 'Untitled Podcast',
    synthesisStatusForModal: 'confirm' as 'confirm' | 'processing' | 'success' | 'error',
    confirmDataForModal: { estimatedCost: 'Calculating...', estimatedTime: 'Calculating...' },
    processingDataForModal: { progress: 0, currentStage: 'Initializing...', remainingTime: 'Calculating...' },
    successDataForModal: { podcastDuration: 'N/A', fileSize: 'N/A' },
    errorDataForModal: { errorMessage: 'An unknown error occurred' },
  }),

  getters: {
    // 基础getters（添加安全检查）
    isScriptEmpty: (state): boolean => !state?.scriptContent?.trim(),
    hasValidScript: (state): boolean => (state?.parsedSegments?.length || 0) > 0 && !state?.error,
    canProceedToStep2: (state): boolean => !!(state?.scriptContent?.trim()) && (state?.parsedSegments?.length || 0) > 0,
    canSynthesize: (state): boolean => !!state?.podcastId && (state?.parsedSegments?.length || 0) > 0,
    canGenerateAi: (state): boolean => true, // Always allow AI generation
    
    // 兼容性getters（保持与现有组件的兼容，添加安全检查）
    currentScriptContent: (state) => state?.scriptContent || '',
    currentAudioUrl: (state) => state?.finalAudioUrl || null,
    isCurrentlyLoading: (state) => state?.isLoading || false,
    currentPlaygroundStep: (state) => state?.currentStep || 1,
    currentAiScriptStep: (state) => state?.aiScriptGenerationStep || 0,
    currentAiScriptStepText: (state) => state?.aiScriptGenerationStepText || '',
    isCurrentlySynthesizing: (state) => state?.isSynthesizing || false,
    currentPodcastId: (state) => state?.podcastId || null,
    currentValidationResult: (state) => state?.validationResult || null,
    currentPodcastSettingsSnapshot: (state) => state?.podcastSettingsSnapshot || {},
    currentError: (state) => state?.error || null,
    currentSelectedPersonaIdForHighlighting: (state) => state?.selectedPersonaIdForHighlighting || null,
    
    // === 新增：便捷getters ===
    isProcessing: (state) => state.isLoading || state.isSynthesizing || state.isValidating,
    canGoToStep2: (state) => state.currentStep === 1 && !!(state?.scriptContent?.trim()) && (state?.parsedSegments?.length || 0) > 0,
    canGoToStep3: (state) => state.currentStep === 2,
    canDownloadAudio: (state) => !!state.finalAudioUrl,
  },

  actions: {
    // === 核心Actions - MVP版本 ===
    
    // 1. 脚本管理
    updateScriptContent(content: string) {
      console.log('[playgroundUnified] updateScriptContent called');
      // 使用 $patch 方法更安全地更新状态
      this.$patch({
        scriptContent: content,
        error: null
      });
      
      // 先进行基本解析
      this.parseScript();
      
      // 检测是否是用户输入的脚本内容（而不是AI生成的空白内容）
      if (this.shouldAnalyzeUserScript(content)) {
        console.log('[playgroundUnified] User script detected, triggering intelligent analysis...');
        // 延迟执行分析，避免频繁调用
        this.debounceAnalyzeUserScript();
      }
    },

    // 判断是否应该分析用户脚本
    shouldAnalyzeUserScript(content: string): boolean {
      // 如果是空内容，不需要分析
      if (!content || !content.trim()) {
        return false;
      }
      
      // 如果当前正在AI生成过程中，不要分析（避免干扰AI生成）
      if (this.isLoading || this.aiScriptGenerationStep > 0) {
        return false;
      }
      
      // 检查内容是否包含对话格式（说话者：内容）
      const hasDialogueFormat = /^[^:：]+[：:].+$/m.test(content);
      
      // 内容长度足够且包含对话格式才进行分析
      return content.trim().length > 50 && hasDialogueFormat;
    },

    // 防抖的用户脚本分析
    debounceAnalyzeUserScript() {
      // 清除之前的定时器
      if (this._analyzeScriptTimer) {
        clearTimeout(this._analyzeScriptTimer);
      }
      
      // 设置新的延迟分析
      this._analyzeScriptTimer = setTimeout(async () => {
        try {
          await this.analyzeUserScript();
        } catch (error) {
          console.error('[playgroundUnified] Auto-analysis failed:', error);
          // 分析失败不影响用户继续使用，只是没有智能优化而已
        }
      }, 1500); // 1.5秒延迟，给用户时间完成输入
    },

    // 2. 脚本解析（简化版）
    parseScript() {
      console.log('[playgroundUnified] parseScript called');
      if (!this.scriptContent.trim()) {
        this.parsedSegments = [];
        return;
      }

      const personaCache = usePersonaCache();
      const settingsStore = usePlaygroundSettingsStore();
      const segments: ScriptSegment[] = [];
      
      const lines = this.scriptContent.split('\n');
      let currentSpeaker = '';
      let currentText = '';
      
      for (const line of lines) {
        const speakerMatch = line.match(/^(.+?):\s*(.*)$/);
        if (speakerMatch) {
          // 保存上一个段落
          if (currentSpeaker && currentText.trim()) {
            this.addParsedSegment(segments, currentSpeaker, currentText.trim(), personaCache, settingsStore);
          }
          
          // 开始新段落
          currentSpeaker = speakerMatch[1].trim();
          currentText = speakerMatch[2].trim();
        } else if (currentSpeaker && line.trim()) {
          // 继续当前段落
          currentText += ' ' + line.trim();
        }
      }
      
      // 保存最后一个段落
      if (currentSpeaker && currentText.trim()) {
        this.addParsedSegment(segments, currentSpeaker, currentText.trim(), personaCache, settingsStore);
      }
      
      this.parsedSegments = segments;
      console.log(`[playgroundUnified] Parsed ${segments.length} segments`);
    },

    // 辅助方法：添加解析的段落
    addParsedSegment(segments: ScriptSegment[], speaker: string, text: string, personaCache: any, settingsStore: any) {
      let speakerPersonaId: number;
      let personaMatchStatus: 'exact' | 'fallback' | 'none' = 'none';
      
      // 1. 按名称查找persona
      const persona = personaCache.getPersonaByName(speaker);
      console.log(`[playgroundUnified] Looking for persona for speaker "${speaker}":`, persona);
      
      if (persona?.persona_id) {
        speakerPersonaId = persona.persona_id;
        personaMatchStatus = 'exact';
        console.log(`[playgroundUnified] Exact match found for "${speaker}": ${persona.name} (ID: ${persona.persona_id})`);
      } else {
        // 2. 智能匹配：根据speaker角色类型分配合适的persona
        const hostPersonaId = settingsStore.getHostPersonaIdNumeric;
        const hostPersona = hostPersonaId ? personaCache.getPersonaById(hostPersonaId) : null;
        const guestPersonaIds = settingsStore.getGuestPersonaIdsNumeric;
        const guestPersonas = guestPersonaIds.map((id: number) => personaCache.getPersonaById(id)).filter((p: any) => p !== undefined);
        
        // 检查speaker名称是否暗示主持人角色
        const speakerLower = speaker.toLowerCase();
        const isLikelyHost = speakerLower.includes('host') || 
                            speakerLower.includes('smith') || // 从生成的脚本看Smith是host
                            speakerLower.includes('主持') ||
                            segments.length === 0; // 第一个speaker通常是主持人
        
        if (isLikelyHost && hostPersona) {
          speakerPersonaId = hostPersona.persona_id;
          personaMatchStatus = 'fallback';
          console.log(`[playgroundUnified] Host fallback for "${speaker}": ${hostPersona.name} (ID: ${hostPersona.persona_id})`);
        } else if (guestPersonas.length > 0) {
          // 为不同的guest speakers循环分配guest personas
          const guestIndex = Math.max(0, segments.length - (isLikelyHost ? 1 : 0)) % guestPersonas.length;
          speakerPersonaId = guestPersonas[guestIndex].persona_id;
          personaMatchStatus = 'fallback';
          console.log(`[playgroundUnified] Guest fallback for "${speaker}": ${guestPersonas[guestIndex].name} (ID: ${speakerPersonaId})`);
        } else if (hostPersona) {
          // 最后fallback到host
          speakerPersonaId = hostPersona.persona_id;
          personaMatchStatus = 'fallback';
          console.log(`[playgroundUnified] Final host fallback for "${speaker}": ${hostPersona.name} (ID: ${hostPersona.persona_id})`);
        } else {
          console.warn(`[playgroundUnified] No persona found for speaker: ${speaker}, and no fallback available`);
          return; // 跳过这个段落
        }
      }
      
      segments.push({
        speaker,
        speakerPersonaId,
        text,
        personaMatchStatus // 添加匹配状态用于调试和UI显示
      } as ScriptSegment & { personaMatchStatus: 'exact' | 'fallback' | 'none' });
    },

    // === 新增：步骤管理 ===
    async goToStep(step: number) {
      // 验证步骤切换条件
      if (step < 1 || step > 3) return false;
      
      if (step === 2 && !this.canGoToStep2) {
        throw new Error('Please complete script writing and validation first');
      }
      
      // 如果从步骤1跳到步骤2，需要先验证
      if (this.currentStep === 1 && step === 2) {
        const result = await this.validateAndCreatePodcast();
        if (!result.success) {
          throw new Error(result.message || 'Script validation failed');
        }
      }
      
      this.currentStep = step;
      return true;
    },

    async goToNextStep() {
      if (this.currentStep < 3) {
        await this.goToStep(this.currentStep + 1);
      }
    },

    goToPreviousStep() {
      if (this.currentStep > 1) {
        this.currentStep = this.currentStep - 1;
      }
    },

    // === 新增：Modal管理 ===
    showSynthesisModalAction() {
      this.showSynthesisModal = true;
      this.synthesisStatusForModal = 'confirm';
    },

    hideSynthesisModal() {
      this.showSynthesisModal = false;
    },

    setSynthesisModalStatus(status: 'confirm' | 'processing' | 'success' | 'error') {
      this.synthesisStatusForModal = status;
    },

    updateModalProcessingData(data: { progress?: number; currentStage?: string; remainingTime?: string }) {
      this.$patch({
        processingDataForModal: {
          ...this.processingDataForModal,
          ...data
        }
      });
    },

    // === 核心业务方法 ===





    // 重置状态
    resetPlaygroundState() {
      // 清理定时器
      if (this._analyzeScriptTimer) {
        clearTimeout(this._analyzeScriptTimer);
        this._analyzeScriptTimer = null;
      }
      
      this.currentStep = 1;
      this.scriptContent = '';
      this.parsedSegments = [];
      this.podcastId = null;
      this.finalAudioUrl = null;
      this.isLoading = false;
      this.isSynthesizing = false;
      this.isValidating = false;
      this.error = null;
      this.synthesisProgress = null;
      this.segmentSynthesisProgress = {};
      this.aiScriptGenerationStep = 0;
      this.aiScriptGenerationStepText = '';
      this.validationResult = null;
      this.podcastSettingsSnapshot = {};
      this.selectedPersonaIdForHighlighting = null;
      this.showSynthesisModal = false;
      this.synthesisStatusForModal = 'confirm';
    },

    // 3. AI脚本生成（简化版）
    async generateAiScript() {
      console.log('[playgroundUnified] generateAiScript started');
      this.isLoading = true;
      this.error = null;
      
      // 设置进度状态
      this.aiScriptGenerationStep = 1;
      this.aiScriptGenerationStepText = 'Analyzing podcast settings...';
      
      try {
        const settingsStore = usePlaygroundSettingsStore();
        const personaCache = usePersonaCache();
        
        // 确保personas已加载
        if (personaCache.personas.value.length === 0) {
          this.aiScriptGenerationStepText = 'Loading persona data...';
          await personaCache.fetchPersonas();
        }
        
        this.aiScriptGenerationStep = 2;
        this.aiScriptGenerationStepText = 'Preparing AI generation request...';
        
        // 🎯 语言优先级：用户手动选择 > 默认值，persona检测仅用于参考
        const userSelectedLanguage = settingsStore.podcastSettings.language;
        const detectedLanguage = this.detectLanguageFromPersona(settingsStore);
        
        // 用户手动选择的语言具有绝对优先级
        const finalLanguage = userSelectedLanguage || 'en-US';
        
        console.log('[playgroundUnified] Language detection:', {
          userSelected: userSelectedLanguage,
          detectedFromPersona: detectedLanguage,
          finalLanguage: finalLanguage,
          note: userSelectedLanguage ? 'Using user selection (highest priority)' : 'Using default en-US'
        });
        
        // 构建请求 - 修复persona传递格式
        const hostPersonaId = settingsStore.podcastSettings.hostPersonaId || settingsStore.getHostPersonaIdNumeric;
        const hostPersona = hostPersonaId ? personaCache.getPersonaById(hostPersonaId) : null;
        const guestPersonaIds = settingsStore.podcastSettings.guestPersonaIds?.length ? 
          settingsStore.podcastSettings.guestPersonaIds.map(id => Number(id)).filter(id => !isNaN(id)) :
          settingsStore.getGuestPersonaIdsNumeric;
        const guestPersonas = guestPersonaIds.map((id: number) => personaCache.getPersonaById(id)).filter((p: any) => p !== undefined);

        const requestBody: any = {
          podcastSettings: {
            title: settingsStore.podcastSettings.title || 'Untitled Podcast',
            topic: settingsStore.podcastSettings.topic || 'General Topic',
            numberOfSegments: settingsStore.podcastSettings.numberOfSegments || 5,
            language: finalLanguage,
            style: settingsStore.podcastSettings.style || 'conversational',
            keywords: settingsStore.podcastSettings.keywords?.join(', ') || ''
          }
        };

        // 确保根据语言自动选择合适的personas
        console.log('[playgroundUnified] Available personas:', personaCache.personas.value.map(p => ({ id: p.persona_id, name: p.name, lang: p.language_support })));
        
        // 根据语言过滤personas（用于自动选择的候选）
        const languageCompatiblePersonas = personaCache.personas.value.filter(persona => {
          if (!persona.language_support || persona.language_support.length === 0) {
            return true; // 如果没有语言限制，认为兼容
          }
          return persona.language_support.some(lang => 
            lang.toLowerCase().includes(finalLanguage.toLowerCase()) ||
            lang.toLowerCase() === finalLanguage.toLowerCase()
          );
        });
        
        console.log('[playgroundUnified] Language compatible personas for', finalLanguage, ':', languageCompatiblePersonas.map(p => p.name));
        
        // 处理主播角色选择 - 优先使用用户手动选择
        if (!hostPersona) {
          // 用户未选择主播，进行自动选择
          const autoHostPersona = languageCompatiblePersonas.find(p => 
            p.name.toLowerCase().includes('host') || 
            p.name.toLowerCase().includes('主持')
          ) || languageCompatiblePersonas[0];
          
          if (autoHostPersona) {
            console.log('[playgroundUnified] Auto-selecting host persona (user had no selection):', autoHostPersona.name);
            settingsStore.updatePodcastSettings({ hostPersonaId: autoHostPersona.persona_id });
            requestBody.hostPersona = autoHostPersona;
          }
        } else {
          // 用户已手动选择主播，尊重用户选择
          console.log('[playgroundUnified] Using user-selected host persona:', hostPersona.name);
          requestBody.hostPersona = hostPersona;
          
          // 如果用户选择的角色不支持当前语言，给出提示但不强制替换
          const isHostLanguageCompatible = !hostPersona.language_support || 
            hostPersona.language_support.length === 0 ||
            hostPersona.language_support.some(lang => 
              lang.toLowerCase().includes(finalLanguage.toLowerCase()) ||
              lang.toLowerCase() === finalLanguage.toLowerCase()
            );
          
          if (!isHostLanguageCompatible) {
            console.warn(`[playgroundUnified] Warning: Selected host persona "${hostPersona.name}" may not fully support language "${finalLanguage}", but respecting user choice`);
          }
        }
        
        // 处理嘉宾角色选择 - 优先使用用户手动选择
        if (guestPersonas.length === 0) {
          // 用户未选择嘉宾，进行自动选择
          const availableGuests = languageCompatiblePersonas.filter(p => 
            (!requestBody.hostPersona || p.persona_id !== requestBody.hostPersona.persona_id) &&
            (p.name.toLowerCase().includes('guest') || 
             p.name.toLowerCase().includes('嘉宾') ||
             !p.name.toLowerCase().includes('host') && !p.name.toLowerCase().includes('主持'))
          );
          
          // 选择2-3个guest personas
          const selectedGuests = availableGuests.slice(0, Math.min(3, availableGuests.length));
          if (selectedGuests.length > 0) {
            console.log('[playgroundUnified] Auto-selecting guest personas (user had no selection):', selectedGuests.map(p => p.name));
            settingsStore.updatePodcastSettings({ guestPersonaIds: selectedGuests.map(p => p.persona_id) });
            requestBody.guestPersonas = selectedGuests;
          }
        } else {
          // 用户已手动选择嘉宾，尊重用户选择
          console.log('[playgroundUnified] Using user-selected guest personas:', guestPersonas.filter(p => p).map(p => p!.name));
          requestBody.guestPersonas = guestPersonas;
          
          // 检查嘉宾语言兼容性，给出提示但不强制替换
          const incompatibleGuests = guestPersonas.filter(guest => {
            if (!guest) return false;
            const isLanguageCompatible = !guest.language_support || 
              guest.language_support.length === 0 ||
              guest.language_support.some(lang => 
                lang.toLowerCase().includes(finalLanguage.toLowerCase()) ||
                lang.toLowerCase() === finalLanguage.toLowerCase()
              );
            return !isLanguageCompatible;
          });
          
          if (incompatibleGuests.length > 0) {
            console.warn(`[playgroundUnified] Warning: Some selected guest personas may not fully support language "${finalLanguage}":`, incompatibleGuests.filter(g => g).map(g => g!.name), 'but respecting user choice');
          }
        }

        this.aiScriptGenerationStep = 3;
        this.aiScriptGenerationStepText = 'Generating AI script...';

        console.log('[playgroundUnified] Sending request to /api/generate-script:', requestBody);

        // 调用API - 修复路径
        const response = await $fetch('/api/generate-script', {
          method: 'POST',
          body: requestBody
        });

        this.aiScriptGenerationStep = 4;
        this.aiScriptGenerationStepText = 'Processing generated script...';

        console.log('[playgroundUnified] AI response received:', response);

        // 处理AI响应 - response 直接是解析后的数据，不需要 .data
        if ((response as any)?.script && Array.isArray((response as any).script)) {
          // 将AI生成的segments转换为脚本文本格式
          const scriptContent = (response as any).script
            .filter((segment: any) => {
              const speakerName = segment?.speaker || segment?.name;
              return segment && 
                     typeof speakerName === 'string' && speakerName.trim() &&
                     typeof segment.text === 'string' && segment.text.trim();
            })
            .map((segment: any) => {
              const speakerName = segment.speaker || segment.name;
              return `${speakerName}: ${segment.text}`;
            })
            .join('\n');

          if (!scriptContent.trim()) {
            throw new Error('Generated AI script content is empty after processing');
          }

          console.log('[playgroundUnified] Processed script content:', scriptContent);
          this.updateScriptContent(scriptContent);
          
          // 更新播客设置
          if ((response as any).podcastTitle) {
            const settingsStore = usePlaygroundSettingsStore();
            settingsStore.setPodcastTitle((response as any).podcastTitle);
          }
          
          this.aiScriptGenerationStep = 0;
          this.aiScriptGenerationStepText = '';
          
          return {
            success: true,
            message: 'AI script generated successfully!'
          };
        } else {
          console.error('[playgroundUnified] Invalid AI response format:', response);
          throw new Error('Invalid AI response format or empty script content');
        }
        
      } catch (error: any) {
        console.error('[playgroundUnified] AI script generation error:', error);
        
        // 提供更详细的错误信息
        let errorMessage = 'Generation failed';
        if (error.response?.status) {
          errorMessage = `Server error (${error.response.status})`;
        } else if (error.message?.includes('fetch')) {
          errorMessage = 'Network connection error, please check your connection and try again';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.error = errorMessage;
        
        return {
          success: false,
          message: errorMessage
        };
      } finally {
        this.isLoading = false;
        this.aiScriptGenerationStep = 0;
        this.aiScriptGenerationStepText = '';
      }
    },

    // 4. 脚本验证和Podcast创建（简化版）
    async validateAndCreatePodcast() {
      console.log('[playgroundUnified] validateAndCreatePodcast started');
      this.isValidating = true;
      this.error = null;
      
      try {
        // 基本验证
        if (this.isScriptEmpty) {
          throw new Error('Script content is empty');
        }
        
        if (this.parsedSegments.length === 0) {
          throw new Error('Script parsing failed, no valid dialogue segments found');
        }
        
        const settingsStore = usePlaygroundSettingsStore();
        const hostId = settingsStore.getHostPersonaIdNumeric;
        if (!hostId) {
          throw new Error('Please select a host persona');
        }
        
        // 构建API请求
        const apiRequest: PodcastCreateRequest = {
          podcastTitle: settingsStore.podcastSettings.title || `播客_${Date.now()}`,
          script: this.parsedSegments,
          hostPersonaId: hostId,
          guestPersonaIds: settingsStore.getGuestPersonaIdsNumeric,
          language: settingsStore.podcastSettings.language || 'en-US',
          ttsProvider: settingsStore.podcastSettings.ttsProvider || 'elevenlabs',
          synthesisParams: settingsStore.synthesisParams,
          topic: settingsStore.podcastSettings.topic,
          keywords: settingsStore.podcastSettings.keywords || [],
          style: settingsStore.podcastSettings.style || 'conversational',
        };
        
        console.log('[playgroundUnified] Creating podcast with request:', apiRequest);
        
        // 调用脚本处理API
        const response = await $fetch('/api/podcast/process/script', {
          method: 'POST',
          body: apiRequest,
        }) as PodcastCreateResponse;
        
        console.log('[playgroundUnified] Script processing response:', response);
        
        if (response.success && response.podcastId) {
          this.podcastId = response.podcastId;
          this.validationResult = response;
          console.log('[playgroundUnified] Podcast created successfully:', response.podcastId);
          
          // 📸 生成封面图片
          try {
            const settingsStore = usePlaygroundSettingsStore();
            const podcastTitle = settingsStore.podcastSettings.title || 'Untitled Podcast';
            const podcastTopic = settingsStore.podcastSettings.topic || '';
            
            // 动态导入封面生成功能
            const { usePodcastCoverGenerator } = await import('~/composables/usePodcastCoverGenerator');
            const { generateAndSavePodcastCover } = usePodcastCoverGenerator();
            
            // 异步生成封面，不阻塞主流程
            generateAndSavePodcastCover(
              String(response.podcastId),
              podcastTitle,
              podcastTopic
            ).then(() => {
              console.log(`[playgroundUnified] Cover generation initiated for podcast ${response.podcastId}`);
            }).catch(coverError => {
              console.error(`[playgroundUnified] Cover generation failed for podcast ${response.podcastId}:`, coverError);
            });
          } catch (coverError) {
            console.error('[playgroundUnified] Failed to import cover generator:', coverError);
          }
          
          return { success: true, message: 'Podcast created successfully, now you can proceed with audio synthesis' };
        } else {
          throw new Error(response.message || 'Podcast creation failed');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] Validation failed:', err);
        this.error = err.message || 'Validation failed';
        return { success: false, message: this.error };
      } finally {
        this.isValidating = false;
      }
    },

    // 5. 音频合成（支持异步任务）
    async synthesizeAudio() {
      console.log('[playgroundUnified] synthesizeAudio started');
      this.isSynthesizing = true;
      this.error = null;
      
      // Initialize progress tracking
      const totalSegments = this.parsedSegments?.length || 0;
      this.synthesisProgress = {
        completed: 0,
        total: totalSegments,
        percentage: 0,
        currentSegment: 0
      };
      
      try {
        if (!this.podcastId) {
          throw new Error('Podcast ID is missing, please validate the script first');
        }
        
        if (!this.validationResult?.preparedSegments) {
          throw new Error('No prepared segment data found, please validate the script first');
        }
        
        const settingsStore = usePlaygroundSettingsStore();
        const segmentCount = this.validationResult.preparedSegments.length;
        
        // 构建合成请求
        const synthesisRequest = {
          podcastId: this.podcastId,
          segments: this.validationResult.preparedSegments,
          globalTtsProvider: settingsStore.podcastSettings.ttsProvider || 'volcengine',
          globalSynthesisParams: settingsStore.synthesisParams,
          // 自动选择异步模式（超过3个segments）
          async: segmentCount > 3,
        };
        
        console.log('[playgroundUnified] Synthesis request:', synthesisRequest);
        
        // 调用合成API
        const response: any = await $fetch('/api/podcast/process/synthesize', {
          method: 'POST',
          body: synthesisRequest,
        });
        
        console.log('[playgroundUnified] Synthesis response:', response);
        
        if (response.success) {
          if (response.taskId) {
            // 异步模式：开始监控任务状态
            console.log('[playgroundUnified] Starting async task monitoring:', response.taskId);
            await this.monitorAsyncTask(response.taskId);
            // 异步任务完成后自动切换到步骤3
            this.currentStep = 3;
            return { success: true, message: 'Audio synthesis completed!' };
          } else {
            // 同步模式：直接处理结果或使用模拟进度
            if (segmentCount <= 3) {
              // 对于简单合成，显示模拟进度以改善用户体验
              await this.simulateProgressForQuickSynthesis(segmentCount);
            }
            this.processSynthesisResults(response);
            this.isSynthesizing = false; // 确保在同步完成时重置状态
            // 同步任务完成后自动切换到步骤3
            this.currentStep = 3;
            console.log('[playgroundUnified] Audio synthesis completed synchronously');
            return { success: true, message: 'Audio synthesis successful!', response };
          }
        } else {
          throw new Error(response.message || 'Audio synthesis failed');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] Synthesis failed:', err);
        this.error = err.message || 'Audio synthesis failed';
        this.isSynthesizing = false;
        this.synthesisProgress = null;
        return { success: false, message: this.error };
      }
    },

    // 模拟快速合成的进度更新
    async simulateProgressForQuickSynthesis(totalSegments: number) {
      const updateInterval = 800; // 每800ms更新一次
      const totalSteps = totalSegments * 2; // 每个segment有2个步骤
      
      for (let step = 1; step <= totalSteps; step++) {
        const currentSegment = Math.floor((step - 1) / 2);
        const isProcessingComplete = step % 2 === 0;
        
        this.synthesisProgress = {
          completed: isProcessingComplete ? currentSegment + 1 : currentSegment,
          total: totalSegments,
          percentage: Math.round((step / totalSteps) * 100),
          currentSegment: isProcessingComplete ? undefined : currentSegment
        };
        
        console.log('[playgroundUnified] Simulated progress update:', this.synthesisProgress);
        
        // 等待一段时间再继续
        if (step < totalSteps) {
          await new Promise(resolve => setTimeout(resolve, updateInterval));
        }
      }
    },

    // 监控异步任务状态
    async monitorAsyncTask(taskId: string) {
      const pollInterval = 2000; // 2秒查询一次
      const maxPollTime = 10 * 60 * 1000; // 最大等待10分钟
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxPollTime) {
        try {
          const status: any = await $fetch(`/api/podcast/synthesis-status/${taskId}`);
          console.log('[playgroundUnified] Task status:', status);
          
          // 更新进度（可以在UI中显示）
          if (status.progress) {
            this.synthesisProgress = {
              ...status.progress,
              percentage: Math.round((status.progress.completed / status.progress.total) * 100)
            };
          }
          
          if (status.status === 'completed') {
            console.log('[playgroundUnified] Async task completed successfully');
            // Set final progress
            this.synthesisProgress = {
              completed: this.synthesisProgress?.total || 0,
              total: this.synthesisProgress?.total || 0,
              percentage: 100,
              currentSegment: undefined
            };
            this.processSynthesisResults(status.results);
            this.isSynthesizing = false;
            return { success: true, message: 'Audio synthesis completed' };
          } else if (status.status === 'failed') {
            console.error('[playgroundUnified] Async task failed:', status.error);
            this.error = status.error || 'Async task failed';
            this.isSynthesizing = false;
            this.synthesisProgress = null; // Reset progress on failure
            throw new Error(this.error || 'Task failed');
          }
          
          // 继续等待
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (error: any) {
          console.error('[playgroundUnified] Error checking task status:', error);
          break;
        }
      }
      
      // 超时处理
      this.isSynthesizing = false;
      throw new Error('Task execution timed out, please check results later');
    },

    // 处理合成结果
    processSynthesisResults(results: any) {
      if (results.finalAudioUrl) {
        this.finalAudioUrl = results.finalAudioUrl;
      } else if (results.generatedSegments?.some((s: any) => s.audioFileUrl)) {
        // 如果只有段落音频，保存第一个作为预览
        const firstSegment = results.generatedSegments.find((s: any) => s.audioFileUrl);
        if (firstSegment) {
          this.finalAudioUrl = firstSegment.audioFileUrl;
        }
        console.log('[playgroundUnified] Segments synthesized, using first segment as preview');
      }
    },



    // 管理单个片段合成进度
    updateSegmentProgress(segmentIndex: number, update: Partial<{ 
      status: 'idle' | 'loading' | 'success' | 'error'; 
      progress: number; 
      stage: string; 
      audioUrl?: string;
      error?: string;
    }>) {
      const current = this.segmentSynthesisProgress[segmentIndex] || {
        status: 'idle',
        progress: 0,
        stage: 'waiting',
      };
      
      this.segmentSynthesisProgress[segmentIndex] = {
        ...current,
        ...update
      };
    },

    // 批量更新片段状态
    initializeSegmentProgress(totalSegments: number) {
      for (let i = 0; i < totalSegments; i++) {
        this.segmentSynthesisProgress[i] = {
          status: 'idle',
          progress: 0,
          stage: 'waiting'
        };
      }
    },

    // 清除片段进度
    clearSegmentProgress() {
      this.segmentSynthesisProgress = {};
    },

    // 清除错误
    clearError() {
      this.error = null;
    },

    // === 兼容性Actions（保留现有组件兼容性）===
    
    setSelectedPersonaIdForHighlighting(id: string | number | null) {
      this.selectedPersonaIdForHighlighting = id;
    },

    // 预设脚本加载
    loadPresetScript() {
      const presetScript = `Host: Welcome to our podcast show! Today we'll be discussing a very interesting topic.
Guest: Thank you for having me! I'm excited to participate in this discussion.
Host: First, could you briefly introduce your background?
Guest: Of course. I've been working in this field for many years and have accumulated rich experience.
Host: Great! Let's start today's topic then.`;
      
      this.updateScriptContent(presetScript);
      console.log('[playgroundUnified] Preset script loaded');
    },

    // 智能脚本分析（用于用户自带脚本）
    async analyzeUserScript() {
      console.log('[playgroundUnified] analyzeUserScript started');
      this.isValidating = true;
      this.error = null;
      
      // 在客户端显示分析开始通知
      if (typeof window !== 'undefined') {
        const { toast } = await import('vue-sonner');
        toast.info('🧠 智能分析脚本中...', {
          description: '正在提取说话者信息并生成元数据',
          duration: 2000,
        });
      }
      
      try {
        if (this.isScriptEmpty) {
          throw new Error('Script content is empty, cannot analyze');
        }
        
        console.log('[playgroundUnified] Calling script analysis API...');
        
        // 调用脚本分析API
        const response = await $fetch('/api/ai/analyze-script', {
          method: 'POST',
          body: {
            scriptContent: this.scriptContent
          }
        });
        
        console.log('[playgroundUnified] Script analysis response:', response);
        
        if ((response as any).success && (response as any).data) {
          const analysisData = (response as any).data;
          
          // 更新脚本内容（如果AI提供了格式化版本）
          if (analysisData.formattedScript && analysisData.formattedScript !== this.scriptContent) {
            console.log('[playgroundUnified] Updating script content with formatted version');
            this.updateScriptContent(analysisData.formattedScript);
          }
          
          // 根据分析结果更新设置
          if (analysisData.metadata) {
            const settingsStore = usePlaygroundSettingsStore();
            
            // 更新播客元信息（仅在当前为空或默认值时更新，尊重用户已有设置）
            if (analysisData.metadata.suggestedTitle && (!settingsStore.podcastSettings.title || settingsStore.podcastSettings.title.trim() === '')) {
              console.log('[playgroundUnified] Auto-setting podcast title:', analysisData.metadata.suggestedTitle);
              settingsStore.setPodcastTitle(analysisData.metadata.suggestedTitle);
            }
            if (analysisData.metadata.suggestedTopic && (!settingsStore.podcastSettings.topic || settingsStore.podcastSettings.topic.trim() === '')) {
              console.log('[playgroundUnified] Auto-setting podcast topic:', analysisData.metadata.suggestedTopic);
              settingsStore.setPodcastTopic(analysisData.metadata.suggestedTopic);
            }
            if (analysisData.metadata.suggestedDescription && (!settingsStore.podcastSettings.topic || settingsStore.podcastSettings.topic.trim() === '')) {
              console.log('[playgroundUnified] Auto-setting podcast description:', analysisData.metadata.suggestedDescription);
              settingsStore.setPodcastDescription(analysisData.metadata.suggestedDescription);
            }
            
            // 更新语言设置
            if (analysisData.language) {
              const languageCode = analysisData.language === 'zh' ? 'zh-CN' : 
                                 analysisData.language === 'en' ? 'en-US' : 
                                 analysisData.language;
              settingsStore.setPodcastLanguage(languageCode);
            }
          }
          
          // 自动分配合适的persona（基于分析结果）
          if (analysisData.speakers && analysisData.speakers.length > 0) {
            await this.autoAssignPersonasFromAnalysis(analysisData.speakers, analysisData.language);
          }
          
          console.log('[playgroundUnified] Script analysis successful');
          
          // 在客户端显示成功通知
          if (typeof window !== 'undefined') {
            const { toast } = await import('vue-sonner');
            toast.success('🎯 脚本智能分析完成', {
              description: '已自动提取说话者信息并优化播客设置',
              duration: 4000,
            });
          }
          
          return {
            success: true,
            message: 'Script analysis successful! Automatic speaker information extraction and setting optimization completed.',
            data: analysisData
          };
        } else {
          throw new Error('Script analysis failed, please check script format');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] Script analysis failed:', err);
        this.error = `Script analysis failed: ${err.message || 'Unknown error'}`;
        return { success: false, message: this.error };
      } finally {
        this.isValidating = false;
      }
    },

    // 根据分析结果自动分配合适的persona
    async autoAssignPersonasFromAnalysis(speakers: any[], detectedLanguage: string) {
      console.log('[playgroundUnified] Auto-assigning personas based on analysis...');
      const personaCache = usePersonaCache();
      const settingsStore = usePlaygroundSettingsStore();
      
      // 确保personas已加载
      if (personaCache.personas.value.length === 0) {
        await personaCache.fetchPersonas();
      }
      
      const availablePersonas = personaCache.personas.value;
      
      // 过滤出支持检测语言的personas
      const languageCompatiblePersonas = availablePersonas.filter(persona => {
        if (!persona.language_support || persona.language_support.length === 0) {
          return true; // 如果没有语言限制，认为兼容
        }
        
        // 检查是否支持检测到的语言
        const langCode = detectedLanguage === 'zh' ? 'zh-CN' : 
                        detectedLanguage === 'en' ? 'en-US' : 
                        detectedLanguage;
        
        return persona.language_support.some(lang => 
          lang.toLowerCase().includes(detectedLanguage.toLowerCase()) ||
          lang.toLowerCase().includes(langCode.toLowerCase())
        );
      });
      
      console.log('[playgroundUnified] Language compatible personas:', languageCompatiblePersonas.length);
      
      // 查找主持人角色
      const hostSpeaker = speakers.find(speaker => 
        speaker.role?.toLowerCase().includes('host') ||
        speaker.role?.toLowerCase().includes('主持') ||
        speaker.name?.toLowerCase().includes('host') ||
        speaker.name?.toLowerCase().includes('主持')
      ) || speakers[0]; // 如果没有找到主持人，使用第一个说话者
      
      if (hostSpeaker) {
        // 为主持人分配persona
        const hostPersona = this.findBestPersonaMatch(hostSpeaker, languageCompatiblePersonas, 'host');
        if (hostPersona) {
          settingsStore.setHostPersona(hostPersona.persona_id);
          console.log('[playgroundUnified] Assigned host persona:', hostPersona.name);
        }
      }
      
      // 查找嘉宾角色
      const guestSpeakers = speakers.filter(speaker => 
        speaker !== hostSpeaker && (
          speaker.role?.toLowerCase().includes('guest') ||
          speaker.role?.toLowerCase().includes('嘉宾') ||
          speaker.role?.toLowerCase().includes('participant') ||
          speaker.role?.toLowerCase().includes('参与')
        )
      );
      
      // 为嘉宾分配personas
      const guestPersonaIds: number[] = [];
      for (const guestSpeaker of guestSpeakers.slice(0, 3)) { // 最多3个嘉宾
        const guestPersona = this.findBestPersonaMatch(guestSpeaker, languageCompatiblePersonas, 'guest');
        if (guestPersona && !guestPersonaIds.includes(guestPersona.persona_id)) {
          guestPersonaIds.push(guestPersona.persona_id);
          console.log('[playgroundUnified] Assigned guest persona:', guestPersona.name);
        }
      }
      
      if (guestPersonaIds.length > 0) {
        settingsStore.setGuestPersonas(guestPersonaIds);
      }
      
      console.log('[playgroundUnified] Auto-assignment completed');
    },

    // 寻找最佳匹配的persona
    findBestPersonaMatch(speaker: any, availablePersonas: any[], preferredRole: 'host' | 'guest') {
      // 1. 优先根据角色匹配
      let candidates = availablePersonas.filter(persona => {
        const personaName = persona.name?.toLowerCase() || '';
        const personaDesc = persona.description?.toLowerCase() || '';
        
        if (preferredRole === 'host') {
          return personaName.includes('host') || personaName.includes('主持') ||
                 personaDesc.includes('host') || personaDesc.includes('主持');
        } else {
          return personaName.includes('guest') || personaName.includes('嘉宾') ||
                 personaDesc.includes('guest') || personaDesc.includes('嘉宾') ||
                 (!personaName.includes('host') && !personaName.includes('主持'));
        }
      });
      
      // 2. 如果角色匹配失败，从所有可用personas中选择
      if (candidates.length === 0) {
        candidates = availablePersonas;
      }
      
      // 3. 优先选择有语音模型的persona
      const withVoiceModel = candidates.filter(persona => 
        persona.voice_model_identifier && persona.voice_model_identifier.trim()
      );
      
      if (withVoiceModel.length > 0) {
        return withVoiceModel[0];
      }
      
      // 4. 返回第一个可用的persona
      return candidates[0] || null;
    },

    // 🔧 智能语言检测 (根据主播角色检测，优先级：language_support > voice_model_identifier推断)
    detectLanguageFromPersona(settingsStore: any): string | null {
      const personaCache = usePersonaCache();
      const hostId = settingsStore.getHostPersonaIdNumeric;
      
      if (hostId) {
        const hostPersona = personaCache.getPersonaById(hostId);
        if (hostPersona) {
          // 1. 优先使用 language_support 字段（更准确）
          if (hostPersona.language_support && Array.isArray(hostPersona.language_support) && hostPersona.language_support.length > 0) {
            const supportedLang = hostPersona.language_support[0]; // 使用第一个支持的语言
            console.log('[playgroundUnified] Detected language from persona language_support:', supportedLang, 'for persona:', hostPersona.name);
            return supportedLang;
          }
          
          // 2. 从 voice_model_identifier 推断（备用方法）
          if (hostPersona.voice_model_identifier) {
            const voiceId = hostPersona.voice_model_identifier.toLowerCase();
            
            if (voiceId.includes('zh') || voiceId.includes('chinese') || voiceId.includes('mandarin')) {
              console.log('[playgroundUnified] Detected Chinese from voice_model_identifier:', hostPersona.name);
              return 'zh-CN';
            } else if (voiceId.includes('en') || voiceId.includes('english')) {
              console.log('[playgroundUnified] Detected English from voice_model_identifier:', hostPersona.name);
              return 'en-US';
            } else if (voiceId.includes('ja') || voiceId.includes('japanese')) {
              console.log('[playgroundUnified] Detected Japanese from voice_model_identifier:', hostPersona.name);
              return 'ja-JP';
            } else if (voiceId.includes('ko') || voiceId.includes('korean')) {
              console.log('[playgroundUnified] Detected Korean from voice_model_identifier:', hostPersona.name);
              return 'ko-KR';
            }
          }
          
          console.log('[playgroundUnified] Could not detect language from persona:', hostPersona.name);
        }
      }
      
      // 返回null表示无法检测，让调用者决定fallback
      console.log('[playgroundUnified] No language detected from persona');
      return null;
    },
  },
});