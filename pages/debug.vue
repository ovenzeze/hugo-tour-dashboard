<template>
  <div class="py-6"
       v-motion
       :initial="{ opacity: 0 }"
       :enter="{ opacity: 1, transition: { duration: 300 } }">

    <!-- TTS Debug Section - 新增！ -->
    <div class="mb-6">
      <button 
        @click="toggleTTS = !toggleTTS" 
        class="flex items-center justify-between w-full p-3 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 rounded-lg mb-2 transition-all"
      >
        <span class="font-semibold flex items-center">
          <Icon name="ph:speaker-high" class="mr-2 w-5 h-5" />
          TTS调试工具
        </span>
        <Icon :name="toggleTTS ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleTTS" class="space-y-6 p-6 border rounded-lg bg-white shadow-sm">
          <!-- TTS Provider Selection -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-foreground border-b pb-2">语音合成配置</h3>
            
            <!-- API Provider Selection -->
            <div class="space-y-2">
              <Label for="api-select" class="font-semibold">选择TTS提供商</Label>
              <Select id="api-select" v-model="selectedApiProvider">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="选择API提供商..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="volcengine">火山引擎 (Volcengine)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <!-- Text Input -->
            <div class="space-y-2">
              <Label for="tts-input-text" class="font-semibold">输入文本</Label>
              <Textarea
                id="tts-input-text"
                v-model="inputText"
                placeholder="输入要合成的文本..."
                class="min-h-[120px] w-full"
                rows="4"
              />
            </div>

            <!-- Preset Texts -->
            <div class="space-y-2">
              <Label class="font-semibold">预设文本</Label>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="preset in presetTexts"
                  :key="preset.label"
                  variant="outline"
                  size="sm"
                  @click="() => inputText = preset.value"
                >
                  {{ preset.label }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Provider-specific Configuration -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-foreground border-b pb-2">参数配置</h3>
            
            <!-- ElevenLabs Config -->
            <div v-if="selectedApiProvider === 'elevenlabs'" class="space-y-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <h4 class="font-semibold text-blue-800">ElevenLabs 设置</h4>
              <div>
                <Label for="el-voice-select">选择声音</Label>
                <Select id="el-voice-select" v-model="elevenLabsConfig.voiceId">
                  <SelectTrigger>
                    <SelectValue placeholder="选择ElevenLabs声音..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-if="elevenLabsVoices.length === 0" :value="'_loading_voices_'" disabled>
                        加载声音中...
                      </SelectItem>
                      <SelectItem v-for="voice in elevenLabsVoices" :key="voice.voice_id" :value="voice.voice_id">
                        {{ voice.name }} ({{ voice.category }})
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>稳定性 ({{ elevenLabsConfig.voiceSettings.stability.toFixed(2) }})</Label>
                <Slider
                  :model-value="[elevenLabsConfig.voiceSettings.stability]"
                  @update:model-value="val => { if (val && val.length > 0) elevenLabsConfig.voiceSettings.stability = val[0] }"
                  :min="0" :max="1" :step="0.05" class="my-2"
                />
              </div>
              <div>
                <Label>相似度增强 ({{ elevenLabsConfig.voiceSettings.similarity_boost.toFixed(2) }})</Label>
                <Slider
                  :model-value="[elevenLabsConfig.voiceSettings.similarity_boost]"
                  @update:model-value="val => { if (val && val.length > 0) elevenLabsConfig.voiceSettings.similarity_boost = val[0] }"
                  :min="0" :max="1" :step="0.05" class="my-2"
                />
              </div>
            </div>

            <!-- Volcengine Config -->
            <div v-if="selectedApiProvider === 'volcengine'" class="space-y-4 p-4 border border-green-200 bg-green-50 rounded-lg">
              <h4 class="font-semibold text-green-800">火山引擎设置</h4>
              <div>
                <Label for="volc-persona-select">选择角色 (获取音色)</Label>
                <Select id="volc-persona-select" v-model="selectedPersonaIdForVolcengine">
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem :value="'_select_persona_placeholder_'" disabled>
                        {{ personaCache.personasLoading ? '加载角色中...' : (personas.length === 0 ? '无可用角色' : '选择角色') }}
                      </SelectItem>
                      <SelectItem v-for="persona in personas" :key="persona.persona_id" :value="persona.persona_id">
                        {{ persona.name }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <Label>语速 ({{ volcengineConfig.speedRatio.toFixed(1) }})</Label>
                  <Slider
                    :model-value="[volcengineConfig.speedRatio]"
                    @update:model-value="val => { if (val && val.length > 0) volcengineConfig.speedRatio = val[0] }"
                    :min="0.5" :max="2.0" :step="0.1" class="my-2"
                  />
                </div>
                <div>
                  <Label>音量 ({{ volcengineConfig.volumeRatio.toFixed(1) }})</Label>
                  <Slider
                    :model-value="[volcengineConfig.volumeRatio]"
                    @update:model-value="val => { if (val && val.length > 0) volcengineConfig.volumeRatio = val[0] }"
                    :min="0.1" :max="3.0" :step="0.1" class="my-2"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <Label>情感类型</Label>
                  <Select v-model="volcengineConfig.emotion">
                    <SelectTrigger>
                      <SelectValue placeholder="选择情感..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="happy">开心</SelectItem>
                        <SelectItem value="sad">悲伤</SelectItem>
                        <SelectItem value="angry">愤怒</SelectItem>
                        <SelectItem value="neutral">中性</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>情绪强度 ({{ volcengineConfig.emotionScale.toFixed(1) }})</Label>
                  <Slider
                    :model-value="[volcengineConfig.emotionScale]"
                    @update:model-value="val => { if (val && val.length > 0) volcengineConfig.emotionScale = val[0] }"
                    :min="1" :max="5" :step="0.1" class="my-2"
                  />
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <Switch v-model:checked="volcengineConfig.enableEmotion" />
                <Label>启用情感功能</Label>
              </div>
            </div>
          </div>

          <!-- Synthesis Controls -->
          <div class="space-y-4">
            <div class="flex justify-center">
              <Button @click="handleTTSSynthesize" :disabled="ttsLoading || !isTTSConfigValid" size="lg" class="min-w-[150px]">
                <Icon v-if="!ttsLoading" name="ph:play-circle" class="mr-2 h-5 w-5" />
                <Icon v-else name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
                {{ ttsLoading ? '合成中...' : '开始合成' }}
              </Button>
            </div>

            <!-- Status Message -->
            <Alert v-if="ttsStatusMessage" :variant="ttsIsError ? 'destructive' : 'default'">
              <Icon :name="ttsIsError ? 'ph:warning-circle' : 'ph:info'" class="h-4 w-4" />
              <AlertTitle>{{ ttsIsError ? '错误' : '状态' }}</AlertTitle>
              <AlertDescription>{{ ttsStatusMessage }}</AlertDescription>
            </Alert>

            <!-- Audio Player -->
            <div v-if="audioSrc" class="space-y-3 p-4 border rounded-lg bg-slate-50">
              <Label class="font-semibold">播放生成的音频</Label>
              <audio controls :src="audioSrc" class="w-full">
                您的浏览器不支持音频播放
              </audio>
              <Button @click="clearAudio" variant="outline" size="sm">清除音频</Button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Debug Tools Section -->
    <div class="mb-6">
      <button 
        @click="toggleTools = !toggleTools" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold flex items-center">
          <Icon name="ph:wrench" class="mr-2 w-5 h-5" />
          系统调试工具
        </span>
        <Icon :name="toggleTools ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleTools" class="space-y-4 p-4 rounded-lg">
          <!-- Safari Guide Popup Debug -->
          <section class="p-4 border border-amber-300 bg-amber-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-amber-800">Safari引导弹窗</h2>
            <p class="text-sm text-gray-700 mb-3">
              重置Safari引导弹窗，提示用户将应用添加到主屏幕
            </p>
            <button
              @click="resetGuidePopup"
              class="px-4 py-2 bg-amber-800 text-white rounded hover:bg-amber-700 transition text-sm flex items-center"
            >
              <Icon name="ph:arrow-counter-clockwise" class="mr-2 w-4 h-4" />
              重置Safari引导弹窗
            </button>
          </section>
          
          <!-- Tour Store Debug -->
          <section class="p-4 border border-blue-300 bg-blue-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-blue-800">Tour Store</h2>
            <p class="text-sm text-gray-700 mb-3">
              重置tour store状态到初始值
            </p>
            <button
              @click="clearStoreState"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center"
            >
              <Icon name="ph:database" class="mr-2 w-4 h-4" />
              重置Tour Store
            </button>
          </section>
          
          <!-- Voice Navigation Debug -->
          <section class="p-4 border border-green-300 bg-green-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-green-800">语音导航</h2>
            <p class="text-sm text-gray-700 mb-3">
              测试语音合成功能
            </p>
            <button
              @click="testSpeak"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm flex items-center"
            >
              <Icon name="ph:speaker-high" class="mr-2 w-4 h-4" />
              测试语音
            </button>
          </section>
          
          <!-- Notification Debug -->
          <section class="p-4 border border-purple-300 bg-purple-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-purple-800">通知系统</h2>
            <p class="text-sm text-gray-700 mb-3">
              测试通知系统功能
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                @click="testNotification"
                class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition text-sm flex items-center"
              >
                <Icon name="ph:bell" class="mr-2 w-4 h-4" />
                默认通知
              </button>
              <button
                @click="() => toast.success('成功', {
                  description: '您的内容已保存',
                  duration: 4000
                })"
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm flex items-center"
              >
                <Icon name="ph:check-circle" class="mr-2 w-4 h-4" />
                成功通知
              </button>
              <button
                @click="() => toast.error('错误', {
                  description: '请检查您的输入并重试',
                  duration: 4000
                })"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center"
              >
                <Icon name="ph:x-circle" class="mr-2 w-4 h-4" />
                错误通知
              </button>
              <button
                @click="() => toast.info('信息', {
                  description: '有新消息需要查看',
                  duration: 4000
                })"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center"
              >
                <Icon name="ph:info" class="mr-2 w-4 h-4" />
                信息通知
              </button>
              <button
                @click="() => toast.warning('警告', {
                  description: '此操作可能导致数据丢失',
                  duration: 4000
                })"
                class="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-sm flex items-center"
              >
                <Icon name="ph:warning" class="mr-2 w-4 h-4" />
                警告通知
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </div>

    <!-- Environment Info -->
    <div class="mb-6">
      <button 
        @click="toggleEnv = !toggleEnv" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold flex items-center">
          <Icon name="ph:gear" class="mr-2 w-5 h-5" />
          环境信息
        </span>
        <Icon :name="toggleEnv ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleEnv" class="p-4 border rounded-lg">
          <div class="bg-gray-50 p-4 rounded-lg text-sm border">
            <pre>模式: {{ runtimeConfig.public.NODE_ENV || 'N/A' }}</pre>
            <pre>SSR: {{ isSSR ? '启用' : '禁用' }}</pre>
            <pre>PWA模式: {{ isPwa ? '是' : '否' }}</pre>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Store State -->
    <div class="mb-6">
      <button 
        @click="toggleStore = !toggleStore" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold flex items-center">
          <Icon name="ph:database" class="mr-2 w-5 h-5" />
          Tour Store状态
        </span>
        <Icon :name="toggleStore ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleStore" class="p-4 border rounded-lg">
          <div class="bg-gray-50 p-4 rounded-lg text-sm border max-h-60 overflow-auto">
            <pre>{{ JSON.stringify(tourStoreState, null, 2) }}</pre>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Voice Navigation State -->
    <div class="mb-6">
      <button 
        @click="toggleVoice = !toggleVoice" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold flex items-center">
          <Icon name="ph:microphone" class="mr-2 w-5 h-5" />
          语音导航状态
        </span>
        <Icon :name="toggleVoice ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleVoice" class="p-4 border rounded-lg">
          <div class="bg-gray-50 p-4 rounded-lg text-sm border">
            <pre>监听中: {{ voiceNavState?.isListening?.value || '否' }}</pre>
            <pre>朗读中: {{ voiceNavState?.isSpeaking?.value || '否' }}</pre>
            <pre>转录内容: {{ voiceNavState?.transcript?.value || '无' }}</pre>
            <pre>识别状态: {{ voiceNavState?.isListening?.value ? '活跃' : '非活跃' }}</pre>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTourStore } from '~/stores/tourStore'
import { useVoiceNavigation } from '~/composables/useVoiceNavigation'
import { usePwa } from '~/composables/usePwa'
import { usePersonaCache } from '~/composables/usePersonaCache'
import type { Persona } from '~/types/persona'
import { ref, computed, onMounted, watch, reactive, getCurrentInstance } from 'vue' 
import { toast } from 'vue-sonner'

// Shadcn-vue component imports
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

// Define page meta for title
definePageMeta({
  title: '调试工具'
})

// Toggle states for collapsible sections
const toggleTools = ref(true)  // Open by default
const toggleEnv = ref(false)
const toggleStore = ref(false)
const toggleVoice = ref(false)
const toggleTTS = ref(false)

const runtimeConfig = useRuntimeConfig()
const tourStore = useTourStore()
const voiceNavState = useVoiceNavigation()
const { isPwa } = usePwa()

// Check if running on server or client
const isSSR = computed(() => process.server)

// Get reactive store state
const tourStoreState = computed(() => tourStore.$state)

// --- TTS Debug State ---
const selectedApiProvider = ref<string>('volcengine')
const inputText = ref<string>('床前明月光，疑是地上霜。举头望明月，低头思故乡。')

const presetTexts = [
  { label: '静夜思', value: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
  { label: '登鹳雀楼', value: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。' },
  { label: '春晓', value: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。' },
  { label: '中文测试', value: '你好世界，这是一段用于测试语音合成的文本。' },
  { label: 'English Test', value: 'The quick brown fox jumps over the lazy dog.' },
]

const ttsLoading = ref<boolean>(false)
const ttsStatusMessage = ref<string>('')
const ttsIsError = ref<boolean>(false)
const audioSrc = ref<string | null>(null)

// ElevenLabs specific state
const elevenLabsVoices = ref<any[]>([])
const elevenLabsConfig = ref({
  voiceId: undefined as string | undefined,
  modelId: '' as string | undefined,
  voiceSettings: {
    stability: 0.75,
    similarity_boost: 0.75,
  },
})

// Volcengine specific state
const volcengineConfig = ref({
  encoding: 'mp3',
  speedRatio: 1.0,
  volumeRatio: 1.0,
  pitchRatio: 1.0,
  enableTimestamps: true,
  emotion: 'happy',
  enableEmotion: true,
  emotionScale: 4.5,
  loudnessRatio: 1.2
})

// Persona cache for Volcengine
const personaCache = usePersonaCache()
const personas = computed(() => personaCache.personas.value)
const selectedPersonaIdForVolcengine = ref<number | null>(null)
const selectedVolcenginePersona = computed<Persona | undefined>(() => {
  return personas.value.find(p => p.persona_id === selectedPersonaIdForVolcengine.value)
})

// TTS Configuration validation
const isTTSConfigValid = computed(() => {
  if (selectedApiProvider.value === 'elevenlabs') {
    return !!elevenLabsConfig.value.voiceId
  } else if (selectedApiProvider.value === 'volcengine') {
    return !!selectedPersonaIdForVolcengine.value && !!selectedVolcenginePersona.value?.voice_model_identifier
  }
  return false
})

// API endpoint computation
const apiEndpoint = computed(() => {
  if (selectedApiProvider.value === 'elevenlabs') {
    return '/api/elevenlabs/timing'
  } else if (selectedApiProvider.value === 'volcengine') {
    return '/api/tts/volcengine'
  }
  return ''
})

// --- TTS Methods ---
const fetchElevenLabsVoices = async () => {
  ttsLoading.value = true
  ttsStatusMessage.value = '加载ElevenLabs声音中...'
  ttsIsError.value = false
  try {
    const response = await $fetch<{ success: boolean, voices: any[] }>('/api/elevenlabs/voices', {
      method: 'GET',
    })

    if (response && response.success) {
      elevenLabsVoices.value = response.voices
      if (response.voices.length > 0 && !elevenLabsConfig.value.voiceId) {
        const defaultVoice = response.voices.find((v: any) => v.name?.toLowerCase().includes('default') || v.name?.toLowerCase().includes('rachel')) || response.voices[0]
        if (defaultVoice) elevenLabsConfig.value.voiceId = defaultVoice.voice_id
      }
      ttsStatusMessage.value = elevenLabsVoices.value.length > 0 ? 'ElevenLabs声音加载完成' : '未找到ElevenLabs声音'
    } else {
      throw new Error((response as any)?.message || '获取声音失败')
    }
  } catch (e: any) {
    console.error('获取ElevenLabs声音异常:', e)
    const errorMessage = e.data?.message || e.data?.error || (e.response?._data as any)?.message || (e.response?._data as any)?.error || e.message || '未知错误'
    ttsStatusMessage.value = `加载ElevenLabs声音错误: ${errorMessage}`
    ttsIsError.value = true
    elevenLabsVoices.value = []
  } finally {
    ttsLoading.value = false
  }
}

const handleTTSSynthesize = async () => {
  if (!inputText.value.trim()) {
    ttsStatusMessage.value = '请输入要合成的文本'
    ttsIsError.value = true
    return
  }
  if (!apiEndpoint.value) {
    ttsStatusMessage.value = '请选择API提供商'
    ttsIsError.value = true
    return
  }
  if (!isTTSConfigValid.value) {
    ttsStatusMessage.value = '请完成API配置'
    ttsIsError.value = true
    return
  }

  ttsLoading.value = true
  ttsIsError.value = false
  ttsStatusMessage.value = '合成中...'
  if (audioSrc.value) URL.revokeObjectURL(audioSrc.value)
  audioSrc.value = null

  let payload: any = { text: inputText.value }

  if (selectedApiProvider.value === 'elevenlabs') {
    payload.voiceId = elevenLabsConfig.value.voiceId
    if (elevenLabsConfig.value.modelId) payload.modelId = elevenLabsConfig.value.modelId
    payload.voiceSettings = elevenLabsConfig.value.voiceSettings
  } else if (selectedApiProvider.value === 'volcengine') {
    const volcengineVoiceIdentifierFromPersona = selectedVolcenginePersona.value?.voice_model_identifier
    payload.voiceType = volcengineVoiceIdentifierFromPersona
    payload.encoding = volcengineConfig.value.encoding
    payload.speedRatio = volcengineConfig.value.speedRatio
    payload.volumeRatio = volcengineConfig.value.volumeRatio
    payload.pitchRatio = volcengineConfig.value.pitchRatio
    payload.enableTimestamps = volcengineConfig.value.enableTimestamps
    payload.emotion = volcengineConfig.value.emotion
    payload.enableEmotion = volcengineConfig.value.enableEmotion
    payload.emotionScale = volcengineConfig.value.emotionScale
    payload.loudnessRatio = volcengineConfig.value.loudnessRatio
  }

  try {
    const response = await $fetch.raw(apiEndpoint.value, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    })

    const responseData = response._data

    if (response.status >= 200 && response.status < 300) {
      ttsStatusMessage.value = '合成成功！'
      ttsIsError.value = false
      let audioBlob: Blob | null = null

      if (selectedApiProvider.value === 'elevenlabs' && responseData?.audio?.data) {
        audioBlob = new Blob([new Uint8Array(responseData.audio.data)], { type: 'audio/mpeg' })
      } else if (selectedApiProvider.value === 'volcengine' && responseData?.audioBuffer) {
        if (responseData.audioBuffer instanceof ArrayBuffer) {
          audioBlob = new Blob([new Uint8Array(responseData.audioBuffer)], { type: `audio/${volcengineConfig.value.encoding || 'mpeg'}` })
        } else {
          const audioDataValues = Object.values(responseData.audioBuffer as any)
          if (audioDataValues.every(val => typeof val === 'number')) {
            audioBlob = new Blob([new Uint8Array(audioDataValues as number[])], { type: `audio/${volcengineConfig.value.encoding || 'mpeg'}` })
          } else {
            throw new Error('收到的audioBuffer不是可处理的ArrayBuffer或字节对象')
          }
        }
      } else if (responseData?.error || responseData?.message) {
        throw new Error(responseData.error || responseData.message)
      } else if (response.headers.get('content-type')?.startsWith('audio/')) {
        audioBlob = await response.blob()
      }
      
      if (audioBlob && audioBlob.size > 0) {
        audioSrc.value = URL.createObjectURL(audioBlob)
      } else {
        throw new Error('响应中没有有效的音频数据')
      }
    } else {
      const errorBodyText = responseData ? JSON.stringify(responseData) : (await response.text() || '无错误内容')
      throw new Error(`API错误 ${response.status}: ${response.statusText} - ${errorBodyText}`)
    }
  } catch (e: any) {
    console.error('合成API调用失败:', e)
    ttsIsError.value = true
    ttsStatusMessage.value = `合成失败: ${e.data?.statusMessage || e.data?.message || e.message || '未知错误'}`
  } finally {
    ttsLoading.value = false
  }
}

const clearAudio = () => {
  if (audioSrc.value) URL.revokeObjectURL(audioSrc.value)
  audioSrc.value = null
  ttsStatusMessage.value = '音频已清除'
  ttsIsError.value = false
}

// --- Existing Debug Tools Methods ---
const resetGuidePopup = () => {
  localStorage.removeItem('hasShownGuidePopup')
  toast.success('Safari引导弹窗已重置', { 
      description: '标记已清除。刷新Safari重新查看提示。',
      duration: 4000
  });
}

const store = useTourStore()

const clearStoreState = () => {
  store.$reset() // Use Pinia's $reset method
  alert('Tour store状态已重置')
}

const testSpeak = () => {
  voiceNavState.speak('这是语音导航测试')
}

const testNotification = () => {
  console.log('测试通知...');
  toast('默认通知标题', {
    description: '这是默认通知的描述文本',
    duration: 4000
  });
}

// Watch for API provider changes
watch(selectedApiProvider, async (newProvider, oldProvider) => {
  if (newProvider === oldProvider) return

  ttsStatusMessage.value = `切换到${newProvider}API`
  ttsIsError.value = false

  if (newProvider === 'elevenlabs') {
    if (elevenLabsVoices.value.length === 0) {
      await fetchElevenLabsVoices()
    }
  } else if (newProvider === 'volcengine') {
    if (personas.value.length === 0 && !personaCache.personasLoading) {
      await personaCache.fetchPersonas()
    }
  }
}, { immediate: false })

// Initialize on mount
onMounted(async () => {
  console.log('[Debug] 组件已挂载。初始API提供商:', selectedApiProvider.value)
  if (selectedApiProvider.value === 'elevenlabs') {
    if (elevenLabsVoices.value.length === 0) {
      await fetchElevenLabsVoices()
    }
  } else if (selectedApiProvider.value === 'volcengine') {
    if (personas.value.length === 0 && !personaCache.personasLoading) {
      await personaCache.fetchPersonas()
    }
  }
})
</script>

<style scoped>
/* Slide transition for collapsible sections */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
  max-height: 1000px; /* Adjust max-height based on content */
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  margin-bottom: 0;
  border-width: 0;
}

/* Style for debug pre blocks */
pre {
  white-space: pre-wrap;       /* CSS 3 */
  white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
  white-space: -pre-wrap;      /* Opera 4-6 */
  white-space: -o-pre-wrap;    /* Opera 7 */
  word-wrap: break-word;       /* Internet Explorer 5.5+ */
  font-family: 'Courier New', Courier, monospace; /* Monospaced font */
  font-size: 0.8rem; /* Slightly smaller font */
}

/* TTS Debug section styles */
.text-foreground {
  color: var(--foreground);
}

.bg-background {
  background-color: var(--background);
}

.border-border {
  border-color: var(--border);
}

/* Custom gradient for TTS section */
.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}

.from-blue-100 {
  --tw-gradient-from: rgb(219 234 254);
  --tw-gradient-to: rgb(219 234 254 / 0);
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);
}

.to-indigo-100 {
  --tw-gradient-to: rgb(224 231 255);
}

.hover\:from-blue-200:hover {
  --tw-gradient-from: rgb(191 219 254);
  --tw-gradient-to: rgb(191 219 254 / 0);
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);
}

.hover\:to-indigo-200:hover {
  --tw-gradient-to: rgb(199 210 254);
}

/* Grid layout for configurations */
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

/* Responsive design improvements */
@media (max-width: 768px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
  
  .flex-wrap {
    flex-wrap: wrap;
  }
}
</style>