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
    isLoading: false, // AI脚本生成
    isSynthesizing: false, // 音频合成
    isValidating: false, // 脚本验证
    
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
    
    // 移除冲突的别名 getter，避免与 state 属性冲突
    // scriptContent: (state) => state?.scriptContent || '',  // 注释掉，因为与 state.scriptContent 冲突
    // audioUrl: (state) => state?.finalAudioUrl || null,     // 注释掉，因为可能造成混淆
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
      this.parseScript();
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
      
      // 1. 按名称查找persona
      const persona = personaCache.getPersonaByName(speaker);
      if (persona?.persona_id) {
        speakerPersonaId = persona.persona_id;
      } else {
        // 2. 使用主播作为fallback
        const hostId = settingsStore.getHostPersonaIdNumeric;
        if (hostId) {
          speakerPersonaId = hostId;
        } else {
          // 3. 使用第一个嘉宾作为fallback
          const guestIds = settingsStore.getGuestPersonaIdsNumeric;
          if (guestIds.length > 0) {
            speakerPersonaId = guestIds[0];
          } else {
            console.warn(`[playgroundUnified] No persona found for speaker: ${speaker}, and no fallback available`);
            return; // 跳过这个段落
          }
        }
      }
      
      segments.push({
        speaker,
        speakerPersonaId,
        text
      });
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
        
        // 智能语言检测：优先从主播角色检测，然后用户设置，最后默认值
        const detectedLanguage = this.detectLanguageFromPersona(settingsStore);
        const finalLanguage = detectedLanguage || settingsStore.podcastSettings.language || 'zh-CN';
        
        console.log('[playgroundUnified] Language detection:', {
          detected: detectedLanguage,
          userSetting: settingsStore.podcastSettings.language,
          final: finalLanguage
        });
        
        // 构建请求
        const requestBody: any = {
          podcastSettings: {
            title: settingsStore.podcastSettings.title || '未命名播客',
            topic: settingsStore.podcastSettings.topic || '通用主题',
            numberOfSegments: settingsStore.podcastSettings.numberOfSegments || 5,
            style: settingsStore.podcastSettings.style || 'conversational',
            keywords: settingsStore.podcastSettings.keywords?.join(', ') || '',
            language: finalLanguage,
          }
        };
        
        // 添加主播信息
        const hostId = settingsStore.getHostPersonaIdNumeric;
        if (hostId) {
          const hostPersona = personaCache.getPersonaById(hostId);
          if (hostPersona) {
            requestBody.hostPersona = {
              persona_id: hostPersona.persona_id,
              name: hostPersona.name,
              voice_model_identifier: hostPersona.voice_model_identifier || 'default_voice'
            };
          }
        }
        
        // 添加嘉宾信息
        const guestIds = settingsStore.getGuestPersonaIdsNumeric;
        if (guestIds.length > 0) {
          requestBody.guestPersonas = guestIds.map(id => {
            const persona = personaCache.getPersonaById(id);
            return persona ? {
              persona_id: persona.persona_id,
              name: persona.name,
              voice_model_identifier: persona.voice_model_identifier || 'default_voice'
            } : null;
          }).filter(Boolean);
        }
        
        console.log('[playgroundUnified] AI script request:', requestBody);
        
        this.aiScriptGenerationStep = 3;
        this.aiScriptGenerationStepText = 'Generating script with AI...';
        
        // 调用AI脚本生成API
        const response: any = await $fetch('/api/generate-script', {
          method: 'POST',
          body: requestBody,
        });
        
        console.log('[playgroundUnified] AI script response:', response);
        
        this.aiScriptGenerationStepText = 'Processing generated script...';
        
        // 处理响应
        if (response && Array.isArray(response.script) && response.script.length > 0) {
          // 转换为脚本内容格式 - 使用 speaker 字段而不是 name 字段
          const scriptContent = response.script
            .filter((segment: any) => {
              const speakerName = segment?.speaker || segment?.name; // 兼容两种字段
              return segment && speakerName && segment.text;
            })
            .map((segment: any) => {
              const speakerName = segment.speaker || segment.name; // 优先使用 speaker 字段
              return `${speakerName}: ${segment.text}`;
            })
            .join('\n');
          
          console.log('[playgroundUnified] Generated script content:', scriptContent);
          this.updateScriptContent(scriptContent);
          
          // 更新设置（如果AI提供了）
          if (response.podcastTitle) {
            settingsStore.setPodcastTitle(response.podcastTitle);
          }
          
          console.log('[playgroundUnified] AI script generation successful, script content updated');
          console.log('[playgroundUnified] Current script content after update:', this.scriptContent);
          return { success: true, message: '脚本生成成功！内容已更新到编辑器中。' };
        } else {
          throw new Error('AI返回的脚本格式无效');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] AI script generation failed:', err);
        this.error = `AI脚本生成失败: ${err.message || '未知错误'}`;
        return { success: false, message: this.error };
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
          throw new Error('脚本内容为空');
        }
        
        if (this.parsedSegments.length === 0) {
          throw new Error('脚本解析失败，没有有效的对话段落');
        }
        
        const settingsStore = usePlaygroundSettingsStore();
        const hostId = settingsStore.getHostPersonaIdNumeric;
        if (!hostId) {
          throw new Error('请选择主播角色');
        }
        
        // 构建API请求
        const apiRequest: PodcastCreateRequest = {
          podcastTitle: settingsStore.podcastSettings.title || `播客_${Date.now()}`,
          script: this.parsedSegments,
          hostPersonaId: hostId,
          guestPersonaIds: settingsStore.getGuestPersonaIdsNumeric,
          language: settingsStore.podcastSettings.language || 'zh-CN',
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
          
          return { success: true, message: 'Podcast创建成功，现在可以进行音频合成' };
        } else {
          throw new Error(response.message || 'Podcast创建失败');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] Validation failed:', err);
        this.error = err.message || '验证失败';
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
          throw new Error('Podcast ID缺失，请先验证脚本');
        }
        
        if (!this.validationResult?.preparedSegments) {
          throw new Error('没有准备好的段落数据，请先验证脚本');
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
            this.setCurrentStep(3);
            return { success: true, message: '音频合成完成！' };
          } else {
            // 同步模式：直接处理结果或使用模拟进度
            if (segmentCount <= 3) {
              // 对于简单合成，显示模拟进度以改善用户体验
              await this.simulateProgressForQuickSynthesis(segmentCount);
            }
            this.processSynthesisResults(response);
            this.isSynthesizing = false; // 确保在同步完成时重置状态
            // 同步任务完成后自动切换到步骤3
            this.setCurrentStep(3);
            console.log('[playgroundUnified] Audio synthesis completed synchronously');
            return { success: true, message: '音频合成成功！', response };
          }
        } else {
          throw new Error(response.message || '音频合成失败');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] Synthesis failed:', err);
        this.error = err.message || '音频合成失败';
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
            return { success: true, message: '音频合成完成' };
          } else if (status.status === 'failed') {
            console.error('[playgroundUnified] Async task failed:', status.error);
            this.error = status.error || '异步任务失败';
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
      throw new Error('任务执行超时，请稍后检查结果');
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

    // === 状态管理Actions ===
    
    setCurrentStep(step: number) {
      this.currentStep = step;
    },
    
    setFinalAudioUrl(url: string | null) {
      this.finalAudioUrl = url;
    },
    
    clearError() {
      this.error = null;
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

    // 重置状态
    resetPlaygroundState() {
      console.log('[playgroundUnified] resetPlaygroundState called');
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
    },

    // === 兼容性Actions（保留现有组件兼容性）===
    
    setSelectedPersonaIdForHighlighting(id: string | number | null) {
      this.selectedPersonaIdForHighlighting = id;
    },

    // 预设脚本加载
    loadPresetScript() {
      const presetScript = `主持人: 欢迎收听我们的播客节目！今天我们将讨论一个非常有趣的话题。
嘉宾: 谢谢邀请！我很高兴能参与这次讨论。
主持人: 首先，请您简单介绍一下自己的背景。
嘉宾: 当然。我在这个领域工作了很多年，积累了丰富的经验。
主持人: 太好了！那么让我们开始今天的话题吧。`;
      
      this.updateScriptContent(presetScript);
      console.log('[playgroundUnified] Preset script loaded');
    },

    // 智能脚本分析（用于用户自带脚本）
    async analyzeUserScript() {
      console.log('[playgroundUnified] analyzeUserScript started');
      this.isValidating = true;
      this.error = null;
      
      try {
        if (this.isScriptEmpty) {
          throw new Error('脚本内容为空，无法分析');
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
        
        if (response.success && response.data) {
          const analysisData = response.data;
          
          // 更新脚本内容（如果AI提供了格式化版本）
          if (analysisData.formattedScript && analysisData.formattedScript !== this.scriptContent) {
            console.log('[playgroundUnified] Updating script content with formatted version');
            this.updateScriptContent(analysisData.formattedScript);
          }
          
          // 根据分析结果更新设置
          if (analysisData.metadata) {
            const settingsStore = usePlaygroundSettingsStore();
            
            // 更新播客元信息
            if (analysisData.metadata.suggestedTitle) {
              settingsStore.setPodcastTitle(analysisData.metadata.suggestedTitle);
            }
            if (analysisData.metadata.suggestedTopic) {
              settingsStore.setPodcastTopic(analysisData.metadata.suggestedTopic);
            }
            if (analysisData.metadata.suggestedDescription) {
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
          return {
            success: true,
            message: '脚本分析成功！已自动提取说话者信息并优化设置。',
            data: analysisData
          };
        } else {
          throw new Error('脚本分析失败，请检查脚本格式');
        }
        
      } catch (err: any) {
        console.error('[playgroundUnified] Script analysis failed:', err);
        this.error = `脚本分析失败: ${err.message || '未知错误'}`;
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