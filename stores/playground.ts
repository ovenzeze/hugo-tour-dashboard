"use strict";

import { defineStore } from 'pinia';
import { toast } from 'vue-sonner';
// @ts-ignore - Nuxt 自动导入，IDE 可能会显示错误但实际运行没问题
import type { Database, Tables } from '~/types/supabase';
import type { ValidateScriptResponse } from '~/composables/useScriptValidator';

// Define Persona type based on your Supabase types
// If Persona is already globally defined or imported from a central types file, use that.
// For now, deriving from Tables<'personas'>.
export type Persona = Tables<'personas'>;

export interface SynthesisParams {
  temperature: number;
  speed: number;
  temperatureArray: number[]; // For slider binding
  speedArray: number[];     // For slider binding
}

export interface FullPodcastSettings {
  title: string;
  topic: string;
  numberOfSegments: number;
  style: string;
  keywords: string;
  hostPersonaId: number | string | undefined; // Allow string for initial prop, store as number
  guestPersonaIds: (number | string | undefined)[]; // Allow string for initial prop, store as number
  backgroundMusic: string | undefined;
  elevenLabsProjectId: string | undefined;
  language: string | undefined; // Added language field
  museumId: number | undefined; // Added museumId field
  galleryId: number | undefined; // Added galleryId field
  objectId: number | undefined; // Added objectId field
}

export interface PlaygroundState {
  personas: Persona[];
  personasLoading: boolean;
  createPodcast: boolean;
  selectedProvider: string | undefined;
  textToSynthesize: string;
  podcastId: string | null; // 新增: 存储当前播客ID

  podcastSettings: FullPodcastSettings;

  synthesisParams: SynthesisParams;
  outputFilename: string; // New state for output filename
  isGeneratingScript: boolean;
  scriptGenerationError: string | null;
  isSynthesizing: boolean;
  synthesisError: string | null;
  audioUrl: string | null;
  isPlaying: boolean;
  currentPreviewAbortController: AbortController | null;
  isStreamingPreview: boolean;
  streamingPreviewError: string | null;
  selectedPersonaIdForHighlighting: number | null; // New state for selected persona for script highlighting
  segmentTimestamps: any[]; // Added for timestamp data
  isValidatingScript: boolean;
  validationError: string | null;
  validationResult: ValidateScriptResponse | null;
}

const defaultSynthesisParams: SynthesisParams = {
  temperature: 0.7,
  speed: 1.0,
  temperatureArray: [0.7],
  speedArray: [1.0],
};

const defaultPodcastSettings: FullPodcastSettings = {
  title: 'AI: The Next Frontier',
  topic: 'Discussing the future of AI and its impact on various industries.',
  numberOfSegments: 3,
  style: 'Informative discussion',
  keywords: 'AI, artificial intelligence, machine learning, deep learning, future tech',
  hostPersonaId: undefined,
  guestPersonaIds: [],
  backgroundMusic: undefined,
  elevenLabsProjectId: undefined,
  language: undefined,
  museumId: undefined,
  galleryId: undefined,
  objectId: undefined,
};

export const usePlaygroundStore = defineStore('playground', {
  state: (): PlaygroundState => {
    const initialHostPersonaId = 1;
    const initialGuestPersonaIds = [2];
    const hostScriptLine = '您好，欢迎来到预设的第二步测试环境。';
    const guestScriptLine = '我已经准备好进行语音配置了。';
    const testPodcastTitle = '第二步直接测试';
    const testLanguage = 'zh';

    return {
      personas: [],
      personasLoading: false,
      createPodcast: false,
      selectedProvider: 'elevenlabs',
      textToSynthesize: `Host: ${hostScriptLine}
Guest: ${guestScriptLine}`,
      podcastSettings: {
        ...defaultPodcastSettings,
        title: testPodcastTitle,
        topic: '直接进行语音配置和预览',
        language: testLanguage,
        hostPersonaId: initialHostPersonaId,
        guestPersonaIds: initialGuestPersonaIds,
      },
      synthesisParams: { ...defaultSynthesisParams },
      outputFilename: 'synthesis_output.mp3',
      isGeneratingScript: false,
      scriptGenerationError: null,
      isSynthesizing: false,
      synthesisError: null,
      audioUrl: null,
      isPlaying: false,
      currentPreviewAbortController: null,
      isStreamingPreview: false,
      streamingPreviewError: null,
      selectedPersonaIdForHighlighting: null,
      segmentTimestamps: [],
      isValidatingScript: false,
      validationError: null,
      validationResult: {
        success: true,
        structuredData: {
          podcastTitle: testPodcastTitle,
          language: testLanguage,
          script: [
            { name: 'Host', role: 'host', text: hostScriptLine },
            { name: 'Guest', role: 'guest', text: guestScriptLine },
          ],
          voiceMap: {
            'Host': { personaId: initialHostPersonaId, voice_model_identifier: 'placeholder-voice-host' },
            'Guest': { personaId: initialGuestPersonaIds[0], voice_model_identifier: 'placeholder-voice-guest' },
          },
        },
        error: undefined,
        message: '脚本已为第二步测试预先通过验证。',
      },
      podcastId: null, // 新增: 存储当前播客ID
    };
  },

  getters: {
    canGeneratePodcastScript(state): boolean {
      if (!state.createPodcast) {
        return !!(state.podcastSettings.title &&
                  state.podcastSettings.topic &&
                  state.podcastSettings.hostPersonaId &&
                  state.podcastSettings.guestPersonaIds.length > 0 &&
                  state.textToSynthesize);
      }
      const hostId = state.podcastSettings.hostPersonaId;
      const hasHostId = hostId !== null && hostId !== undefined && hostId !== '' && Number(hostId) > 0;
      const guestIds = Array.isArray(state.podcastSettings.guestPersonaIds) ? state.podcastSettings.guestPersonaIds : [];
      const hasGuests = guestIds.length > 0 && guestIds.some(id => {
        const numId = Number(id);
        return id !== null && id !== undefined && id !== '' && !isNaN(numId) && numId > 0;
      });
      const hasTopic = !!state.podcastSettings.topic?.trim();
      const hasTitle = !!state.podcastSettings.title?.trim();
      return !!(state.createPodcast && hasTopic && hasTitle && hasHostId && hasGuests);
    }
  },

  actions: {
    async fetchPersonas() {
      if (this.personasLoading) return;
      this.personasLoading = true;
      try {
        const data = await $fetch<Persona[]>('/api/personas?active=true', {
          headers: { 'Content-Type': 'application/json' },
        } as any);
        this.personas = data;
        // console.log('获取到的 personas:', data);

        if (this.personas.length === 0) {
          toast.info('No available personas found.', {
            description: 'Please create or activate some personas first.',
          });
        } else {
          if (!this.createPodcast && this.validationResult?.structuredData) { // Ensure validationResult and structuredData exist
            const settings = this.podcastSettings;
            const validationVoiceMap = this.validationResult.structuredData.voiceMap;
            const validationStructuredData = this.validationResult.structuredData;

            // Update podcastTitle and language in validationResult if needed from settings
            if (validationStructuredData.podcastTitle !== settings.title) {
              validationStructuredData.podcastTitle = settings.title;
            }
            if (settings.language !== undefined && validationStructuredData.language !== settings.language) {
              validationStructuredData.language = settings.language;
            } else if (settings.language === undefined && validationStructuredData.language === undefined) {
              validationStructuredData.language = 'en';
            }

            const hostPersonaIdToFind = Number(settings.hostPersonaId);
            const actualHostPersona = this.personas.find(p => p.persona_id === hostPersonaIdToFind);

            if (actualHostPersona) {
              settings.hostPersonaId = actualHostPersona.persona_id;
              if (validationVoiceMap?.['Host']) {
                validationVoiceMap['Host'].personaId = actualHostPersona.persona_id;
                if (actualHostPersona.voice_model_identifier) {
                  validationVoiceMap['Host'].voice_model_identifier = actualHostPersona.voice_model_identifier;
                }
              }
            } else if (this.personas[0]?.persona_id) {
              settings.hostPersonaId = this.personas[0].persona_id;
              if (validationVoiceMap?.['Host']) {
                validationVoiceMap['Host'].personaId = this.personas[0].persona_id;
                if (this.personas[0].voice_model_identifier) {
                  validationVoiceMap['Host'].voice_model_identifier = this.personas[0].voice_model_identifier;
                }
              }
            }

            if (settings.guestPersonaIds.length > 0) {
              const guestPersonaIdToFind = Number(settings.guestPersonaIds[0]);
              const actualGuestPersona = this.personas.find(p => p.persona_id === guestPersonaIdToFind);

              if (actualGuestPersona) {
                settings.guestPersonaIds = [actualGuestPersona.persona_id];
                if (validationVoiceMap?.['Guest']) {
                  validationVoiceMap['Guest'].personaId = Number(actualGuestPersona.persona_id);
                  if (actualGuestPersona.voice_model_identifier) {
                    validationVoiceMap['Guest'].voice_model_identifier = actualGuestPersona.voice_model_identifier;
                  }
                }
              } else if (this.personas.length > 1) {
                const hostId = Number(settings.hostPersonaId);
                const fallbackGuest = this.personas.find(p => p.persona_id !== hostId);
                if (fallbackGuest?.persona_id) {
                  settings.guestPersonaIds = [fallbackGuest.persona_id];
                  if (validationVoiceMap?.['Guest']) {
                    validationVoiceMap['Guest'].personaId = Number(fallbackGuest.persona_id);
                    if (fallbackGuest.voice_model_identifier) {
                      validationVoiceMap['Guest'].voice_model_identifier = fallbackGuest.voice_model_identifier;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch personas:', error);
        toast.error('Failed to load personas', {
          description: error.data?.message || error.message || 'Unknown error',
        });
        this.personas = [];
      }
      this.personasLoading = false;
    },

    usePresetScript() {
      // 预设的脚本内容
      const presetScript = `Host: Welcome to 'AI: The Next Frontier,' the podcast where we explore the cutting-edge advancements in artificial intelligence and their transformative potential. I'm your host, Cybo, and joining me today is Elliot, a contemplative artist with a keen interest in the intersection of AI and creativity. Elliot, great to have you here!
Guest: Thanks for having me, Cybo. It's always exciting to discuss how AI is reshaping not just technology, but also art, culture, and even the way we think about human expression.
Host: Absolutely! Let's dive right in. AI, machine learning, and deep learning are no longer just buzzwords—they're driving real change across industries. From healthcare to finance, and even entertainment, the applications seem endless. Elliot, as someone who works in the arts, how do you see AI influencing creative fields?
Guest: It's fascinating, really. AI tools like generative adversarial networks (GANs) and language models are enabling artists to explore new forms of creativity. For instance, AI can generate music, paintings, or even poetry. But it also raises questions: Is AI truly creative, or is it just mimicking human patterns? And how do we define authorship in such collaborations?
Host: Those are profound questions. It seems like AI is blurring the lines between tool and creator. Beyond the arts, industries like healthcare are leveraging AI for diagnostics and personalized treatment plans. Do you think AI's role in such critical fields will be more readily accepted compared to its role in creative domains?
Guest: I think so. In healthcare, AI's ability to analyze vast amounts of data quickly can save lives, so the benefits are more tangible. But in creative fields, the emotional and subjective aspects make the adoption more nuanced. People might resist AI-generated art because it challenges traditional notions of human uniqueness and emotion.
Host: That makes sense. Speaking of adoption, what do you think are the biggest challenges AI faces as it becomes more integrated into our daily lives? Ethical concerns, bias in algorithms, or something else?
Guest: All of those are critical, but I'd add transparency to the list. If people don't understand how AI makes decisions—whether it's approving a loan or recommending a song—they won't trust it. And without trust, widespread adoption will be difficult. Ethical frameworks and explainable AI are going to be key.
Host: Well said. As we wrap up, Elliot, what's one thing you hope listeners take away from our discussion today?
Guest: I hope they see AI not as a replacement for human ingenuity, but as a collaborator that can amplify our potential—whether in art, science, or everyday life. The future of AI is what we make of it, and that's both exciting and responsibility-laden.
Host: Couldn't agree more. Thanks for joining us, Elliot, and thank you to our listeners for tuning in to 'AI: The Next Frontier.' Stay curious, and we'll see you next time!`;

      this.textToSynthesize = presetScript;
      toast.success('已加载预设脚本', {
        description: '预设脚本已加载到编辑器中。',
      });
    },

    updateSelectedProvider(providerId: string | undefined) {
      this.selectedProvider = providerId;
    },

    updateElevenLabsProjectId(projectId: string) {
      this.podcastSettings.elevenLabsProjectId = projectId;
    },

    updateFullPodcastSettings(settings: Partial<FullPodcastSettings>) {
      console.log('更新设置前:', {
        current: this.podcastSettings,
        new: settings
      });

      const parsePersonaId = (id: string | number | undefined): number | undefined => {
        if (id === undefined || id === null || id === '') return undefined;
        const numId = Number(id);
        return isNaN(numId) ? undefined : numId;
      };

      const processedSettings = { ...settings };

      // 特殊处理 hostPersonaId
      if (settings.hostPersonaId !== undefined) {
        const parsedId = parsePersonaId(settings.hostPersonaId);
        console.log('解析 hostPersonaId:', {
          原始值: settings.hostPersonaId,
          解析后: parsedId,
          类型: typeof parsedId
        });
        processedSettings.hostPersonaId = parsedId;
      }

      // 特殊处理 guestPersonaIds
      if (settings.guestPersonaIds !== undefined) {
        // 确保 guestPersonaIds 是数组
        const guestIds = Array.isArray(settings.guestPersonaIds) ? settings.guestPersonaIds : [];

        console.log('原始 guestPersonaIds:', {
          值: guestIds,
          类型: typeof guestIds,
          是数组: Array.isArray(guestIds),
          长度: guestIds.length
        });

        // 处理每个 ID
        const parsedIds = guestIds
          .map(id => {
            const parsedId = parsePersonaId(id);
            console.log('解析 guestPersonaId:', {
              原始值: id,
              解析后: parsedId,
              类型: typeof parsedId
            });
            return parsedId;
          })
          .filter(id => id !== undefined) as number[];

        console.log('处理后的 guestPersonaIds:', {
          值: parsedIds,
          类型: typeof parsedIds,
          是数组: Array.isArray(parsedIds),
          长度: parsedIds.length
        });

        // 确保至少保留一个有效的嘉宾 ID
        if (parsedIds.length === 0 && this.personas.length > 1) {
          // 找一个不是主持人的角色作为嘉宾
          const hostId = Number(processedSettings.hostPersonaId || this.podcastSettings.hostPersonaId);
          for (const persona of this.personas) {
            if (persona.persona_id !== hostId) {
              parsedIds.push(persona.persona_id);
              console.log('自动添加默认嘉宾:', persona.persona_id);
              break;
            }
          }
        }

        processedSettings.guestPersonaIds = parsedIds;
      }

      // 应用更新后的设置
      this.podcastSettings = { ...this.podcastSettings, ...processedSettings };

      console.log('更新设置后:', {
        hostPersonaId: this.podcastSettings.hostPersonaId,
        guestPersonaIds: this.podcastSettings.guestPersonaIds,
        typeHost: typeof this.podcastSettings.hostPersonaId,
        typeGuests: Array.isArray(this.podcastSettings.guestPersonaIds) ?
                    this.podcastSettings.guestPersonaIds.map(id => typeof id) :
                    'not an array'
      });

      // 确保 guestPersonaIds 是数组
      if (!Array.isArray(this.podcastSettings.guestPersonaIds)) {
        this.podcastSettings.guestPersonaIds = [];
        console.log('修正 guestPersonaIds 为空数组');
      }
    },

    async validateScript(): Promise<{ success: boolean; data?: any; error?: string }> {
      // 使用 useScriptValidator 中的方法进行验证
      // 由于 composable 需要在 setup 上下文中使用，我们不能直接在 store 中使用它
      // 所以我们在这里实现一个简化版本，或者在组件中使用 composable

      if (this.isValidatingScript) {
        return { success: false, error: '验证已在进行中' };
      }

      this.isValidatingScript = true;
      this.validationError = null;
      this.validationResult = null;

      try {
        // 验证基本设置
        if (!this.podcastSettings?.title) {
          toast.error('请设置播客标题');
          return { success: false, error: '请设置播客标题' };
        }

        if (!this.podcastSettings?.hostPersonaId) {
          toast.error('请选择主持人');
          return { success: false, error: '请选择主持人' };
        }

        if (!this.textToSynthesize) {
          toast.error('脚本内容为空');
          return { success: false, error: '脚本内容为空' };
        }

        // 获取主持人信息
        const hostId = Number(this.podcastSettings.hostPersonaId);
        const hostPersona = this.personas.find((p) => p.persona_id === hostId);

        if (!hostPersona) {
          toast.error('所选主持人未找到');
          return { success: false, error: '所选主持人未找到' };
        }

        // 获取嘉宾信息
        const guestIds = this.podcastSettings.guestPersonaIds
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);

        const guestPersonas = guestIds
          .map(id => this.personas.find(p => p.persona_id === id))
          .filter(p => p !== undefined) as any[];

        if (guestPersonas.length === 0) {
          toast.error('请至少选择一位嘉宾');
          return { success: false, error: '请至少选择一位嘉宾' };
        }

        // 解析脚本
        const scriptSegments = this.parseScriptToSegments(this.textToSynthesize);

        if (scriptSegments.length === 0) {
          toast.error('无法解析脚本。请确保格式为"说话者: 文本内容"');
          return { success: false, error: '无法解析脚本' };
        }

        // 构建请求体
        const requestBody = {
          title: this.podcastSettings.title,
          rawScript: this.textToSynthesize,
          personas: {
            hostPersona: {
              id: hostPersona.persona_id,
              name: hostPersona.name,
              voice_model_identifier: hostPersona.voice_model_identifier || ''
            },
            guestPersonas: guestPersonas.map(persona => ({
              id: persona.persona_id,
              name: persona.name,
              voice_model_identifier: persona.voice_model_identifier || ''
            }))
          },
          preferences: {
            style: this.podcastSettings.style || '对话式',
            language: 'en-US',
            keywords: this.podcastSettings.keywords || '',
            numberOfSegments: this.podcastSettings.numberOfSegments || 3,
            backgroundMusic: this.podcastSettings.backgroundMusic
          }
        };

        console.log('[DEBUG] Store API request body (validation):', JSON.stringify(requestBody, null, 2));

        // 调用API
        const response = await $fetch<ValidateScriptResponse>('/api/podcast/process/validate', {
          method: 'POST',
          body: requestBody
        } as any);

        console.log('[DEBUG] Store API response (validation):', response);

        this.validationResult = response;

        if (response.success) {
          toast.success('脚本验证通过');
          return { success: true, data: response.structuredData };
        } else {
          const errorMsg = response.error || response.message || '验证失败';
          toast.error(`验证失败: ${errorMsg}`);
          this.validationError = errorMsg;
          return { success: false, error: errorMsg };
        }
      } catch (err: any) {
        console.error('[ERROR] Store API request failed (validation):', err);
        const errorMessage = err.data?.message || err.message || '服务器错误';
        toast.error(`请求错误: ${errorMessage}`);
        this.validationError = errorMessage;
        return { success: false, error: errorMessage };
      } finally {
        this.isValidatingScript = false;
      }
    },

    parseScriptToSegments(content: string) {
      if (!content) return [];

      return content
        .split('\n')
        .map(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex <= 0) return null; // 无效行

          const speaker = line.substring(0, colonIndex).trim();
          const text = line.substring(colonIndex + 1).trim();

          return { speaker, text };
        })
        .filter(segment => segment && segment.speaker && segment.text);
    },

    async generateScript() {
      if (this.isGeneratingScript) return;

      // 添加调试信息，检查哪个条件未满足
      console.log('生成脚本校验状态:', {
        createPodcast: this.createPodcast,
        topic: this.podcastSettings.topic,
        title: this.podcastSettings.title,
        hostPersonaId: this.podcastSettings.hostPersonaId,
        hostPersonaIdType: typeof this.podcastSettings.hostPersonaId,
        guestPersonaIds: this.podcastSettings.guestPersonaIds,
        guestPersonaIdsTypes: Array.isArray(this.podcastSettings.guestPersonaIds) ?
                             this.podcastSettings.guestPersonaIds.map(id => typeof id) :
                             'not an array',
        canGenerate: this.canGeneratePodcastScript
      });

      // 确保 guestPersonaIds 是数组
      if (!Array.isArray(this.podcastSettings.guestPersonaIds)) {
        this.podcastSettings.guestPersonaIds = [];
        console.log('修正 guestPersonaIds 为空数组');
      }

      // 如果没有嘉宾，尝试添加一个默认嘉宾
      if (this.podcastSettings.guestPersonaIds.length === 0 && this.personas.length > 1) {
        const hostId = Number(this.podcastSettings.hostPersonaId);
        for (const persona of this.personas) {
          if (persona.persona_id !== hostId) {
            this.podcastSettings.guestPersonaIds.push(persona.persona_id);
            console.log('自动添加默认嘉宾:', persona.persona_id);
            break;
          }
        }
      }

      if (!this.canGeneratePodcastScript) { // Added safety check based on getter
        toast.warning("缺少生成脚本所需的必填字段", {
          description: "请确保已填写标题、主题、主持人和至少一位嘉宾。",
        });
        return;
      }

      this.isGeneratingScript = true;
      this.scriptGenerationError = null;

      try {
        // 确保 hostPersonaId 是有效的数字
        const hostId = Number(this.podcastSettings.hostPersonaId);
        if (isNaN(hostId) || hostId <= 0) {
          throw new Error('主持人 ID 无效');
        }

        // 确保 guestPersonaIds 中至少有一个有效的数字
        const guestIds = (this.podcastSettings.guestPersonaIds || [])
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0);

        if (guestIds.length === 0) {
          // 如果没有有效的嘉宾，尝试自动选择一个
          for (const persona of this.personas) {
            if (persona.persona_id !== hostId) {
              guestIds.push(persona.persona_id);
              console.log('自动添加嘉宾:', persona.persona_id);
              break;
            }
          }

          // 如果仍然没有嘉宾，则报错
          if (guestIds.length === 0) {
            throw new Error('没有有效的嘉宾 ID，请至少选择一位嘉宾');
          }

          // 更新 podcastSettings 中的 guestPersonaIds
          this.podcastSettings.guestPersonaIds = guestIds;
        }

        console.log('处理后的 ID:', { hostId, guestIds });

        const hostPersona = this.personas.find((p: Persona) => p.persona_id === hostId);
        const guestPersonas = guestIds.map(id => this.personas.find((p: Persona) => p.persona_id === id));

        console.log('找到的 personas:', {
          hostPersona,
          guestPersonas,
          allPersonas: this.personas.map((p: Persona) => ({ id: p.persona_id, name: p.name }))
        });

        if (!hostPersona?.voice_model_identifier || guestPersonas.some((g: Persona | undefined) => !g?.voice_model_identifier)) {
          throw new Error('主持人或嘉宾缺少语音模型标识符');
        }

        const speakerMapping = {
          host: { persona_id: hostId, voice_id: hostPersona.voice_model_identifier },
          guests: guestPersonas.map((guest, index) => ({
            persona_id: guestIds[index],
            voice_id: guest!.voice_model_identifier!
          }))
        };

        // 构建完整的 Prompt
        const hostName = hostPersona.name || '主持人';
        const guestNames = guestPersonas.map(g => g?.name || '嘉宾').join('、');

        // 拼接所有信息为一个完整的 Prompt
        const fullPrompt = `
标题：${this.podcastSettings.title}
主题：${this.podcastSettings.topic}
格式：播客对话
主持人：${hostName}
嘉宾：${guestNames}
风格：${this.podcastSettings.style || '自然对话'}
关键词：${this.podcastSettings.keywords || ''}
分段数：${this.podcastSettings.numberOfSegments || 3}
背景音乐：${this.podcastSettings.backgroundMusic || '无'}

请生成一个完整的播客脚本，包含主持人和嘉宾之间的对话。脚本应该清晰标明每个说话者的名字，并且内容要围绕主题展开，符合指定的风格和关键词。
        `.trim();

        console.log('准备发送请求 (generateScript action):', {
          fullPrompt,
          topic: this.podcastSettings.topic,
          persona_id: hostId
        });

        console.log('>>> [generateScript] ABOUT TO CALL $fetch for /api/generate-script');
        // @ts-ignore - Nuxt 自动导入的 $fetch. Keeping @ts-ignore for now as the type issue might be project-specific.
        const response = await $fetch<{ script: string }>('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, // Explicitly add Content-Type
          body: {
            user_instruction: fullPrompt,
            podcastSettings: {
              ...this.podcastSettings,
              hostPersonaId: hostId,
              guestPersonaIds: guestIds
            },
          },
        } as any);
        console.log('<<< [generateScript] $fetch for /api/generate-script COMPLETED. Response:', response);

        this.textToSynthesize = response.script;
        toast.success('脚本生成成功！', {
          description: '脚本已经可以在编辑器中查看。',
        });
      } catch (error: any) {
        console.error('!!! [generateScript] ERROR caught:', error);
        console.log('Raw error object in catch block:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        const errorMessage = error.data?.message || error.data?.statusMessage || error.message || '脚本生成过程中发生未知错误。';
        this.scriptGenerationError = errorMessage;
        toast.error('脚本生成失败', { description: errorMessage });
      } finally {
        this.isGeneratingScript = false;
      }
    },

    async startStreamingPreview(): Promise<Response | undefined> {
      if (!this.textToSynthesize.trim()) {
        toast.error('No content to preview.', {description: 'Please generate a script first.'});
        return;
      }
      const hostId = Number(this.podcastSettings.hostPersonaId);
      const hostPersona = this.personas.find((p: Persona) => p.persona_id === hostId);
      if (!hostPersona?.voice_model_identifier) {
        toast.error('Host persona has no voice model set.');
        return;
      }
      this.isStreamingPreview = true;
      this.streamingPreviewError = null;

      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
      }
      this.currentPreviewAbortController = new AbortController();

      try {
        // @ts-ignore - Nuxt 自动导入的 $fetch
        const response = await $fetch.raw('/api/tts/stream-preview', {
          method: 'POST',
          body: {
            text: this.textToSynthesize,
            voice_id: hostPersona.voice_model_identifier,
          },
          signal: this.currentPreviewAbortController.signal,
        } as any);
        return response;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('预览已被用户中止');
          toast.info('预览已中止');
        } else {
          console.error('预览失败:', error);
          const errorMessage = error.data?.message || error.message || '预览过程中发生未知错误';
          this.streamingPreviewError = errorMessage;
          toast.error('预览失败', { description: errorMessage });
        }
        this.isStreamingPreview = false;
        this.currentPreviewAbortController = null;
        return undefined;
      }
    },

    stopStreamingPreview() {
      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
        this.currentPreviewAbortController = null;
      }
      this.isStreamingPreview = false;
    },

    resetPlaygroundState() {
      this.createPodcast = true;
      this.selectedProvider = 'elevenlabs';
      this.textToSynthesize = '';
      this.podcastSettings = { ...defaultPodcastSettings };
      this.synthesisParams = { ...defaultSynthesisParams };
      this.outputFilename = 'synthesis_output.mp3';
      this.scriptGenerationError = null;
      this.synthesisError = null;
      this.audioUrl = null;
      this.isGeneratingScript = false;
      this.isSynthesizing = false;
      this.podcastId = null; // 重置podcastId
      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
        this.currentPreviewAbortController = null;
      }
      this.isStreamingPreview = false;
      this.streamingPreviewError = null;
      this.selectedPersonaIdForHighlighting = null;
      this.segmentTimestamps = [];
      this.isValidatingScript = false;
      this.validationError = null;
      this.validationResult = null;

      toast.info('已重置，准备创建新播客。');
      if (process.client) {
        localStorage.removeItem('playgroundState');
      }
    },

    setCreatePodcastMode(isPodcast: boolean) {
      this.createPodcast = isPodcast;
      this.resetPlaygroundState(); // Call existing reset or a more specific one
    },

    updateOutputFilename(filename: string) {
      this.outputFilename = filename;
    },

    updateSynthesisParams(params: Partial<SynthesisParams>) {
      this.synthesisParams = {
        ...this.synthesisParams,
        ...params,
        // Ensure arrays are updated if single values are passed
        temperatureArray: params.temperature !== undefined ? [params.temperature] : this.synthesisParams.temperatureArray,
        speedArray: params.speed !== undefined ? [params.speed] : this.synthesisParams.speedArray,
      };
    },

    // 保存时间戳数据的方法
    saveSegmentTimestamps(timestamps: any[]) {
      this.segmentTimestamps = timestamps;
    },

    async synthesizePodcastAudio(options: { useTimestamps?: boolean } = {}) {
      const { useTimestamps = false } = options;

      if (this.isSynthesizing) return;
      if (!this.textToSynthesize.trim()) {
        toast.error('Script is empty.', { description: 'Please generate or write a script before synthesizing.' });
        return;
      }

      this.isSynthesizing = true;
      this.synthesisError = null;
      this.audioUrl = null;

      try {
        let response;
        if (useTimestamps && this.segmentTimestamps.length > 0) {
          // 调用支持时间戳的音频合成API
          // @ts-ignore - Nuxt 自动导入的 $fetch
          response = await $fetch<{ audioUrl: string; filename?: string }>('/api/synthesize-podcast-with-timestamps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script: this.textToSynthesize, // Or segments if your backend expects that
              podcastSettings: this.podcastSettings,
              synthesisParams: this.synthesisParams,
              provider: this.selectedProvider,
              timestamps: this.segmentTimestamps
            })
          } as any);
          toast.info('Synthesizing with timestamps...');
        } else {
          // 原有的音频合成逻辑...
          // @ts-ignore - Nuxt 自动导入的 $fetch
          response = await $fetch<{ audioUrl: string; filename?: string }>('/api/tts/podcast', { // Example endpoint
            method: 'POST',
            body: {
              script: this.textToSynthesize,
              podcastSettings: this.podcastSettings,
              synthesisParams: this.synthesisParams,
              provider: this.selectedProvider,
            },
          } as any);
        }

        this.audioUrl = response.audioUrl;
        if(response.filename) this.outputFilename = response.filename;
        toast.success('Podcast audio synthesized successfully!');

      } catch (error: any) {
        console.error('Podcast audio synthesis failed:', error);
        const errorMessage = error.data?.message || error.message || 'Unknown synthesis error.';
        this.synthesisError = errorMessage;
        toast.error('Podcast Synthesis Failed', { description: errorMessage });
      } finally {
        this.isSynthesizing = false;
      }
    },

    setSelectedPersonaForHighlighting(personaId: number | null) {
      this.selectedPersonaIdForHighlighting = personaId;
    },

    saveStateToLocalStorage() {
      if (process.client) {
        localStorage.setItem('playgroundState', JSON.stringify(this.$state));
      }
    }
  },
});
