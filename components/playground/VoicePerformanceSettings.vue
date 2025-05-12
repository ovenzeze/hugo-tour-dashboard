<template>
  <div class="grid grid-cols-1 gap-x-6 gap-y-4">
    <div class="space-y-2 p-4 border rounded-md bg-muted/30">
      <h3 class="text-sm font-medium text-muted-foreground">Selected Personas (Read-only)</h3>
      <div v-if="selectedHostPersona" class="text-sm">
        <strong>Host:</strong> {{ selectedHostPersona.name }}
      </div>
      <div v-if="selectedGuestPersonas.length > 0" class="text-sm">
        <strong>Guests:</strong>
        <ul>
          <li v-for="guest in selectedGuestPersonas" :key="guest.persona_id">- {{ guest.name }}</li>
        </ul>
      </div>
      <div v-if="!selectedHostPersona && selectedGuestPersonas.length === 0" class="text-sm text-muted-foreground">
        No personas selected in the previous step.
      </div>
    </div>


    <!-- Synthesis Parameters from playgroundStore -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Voice Temperature ({{ playgroundStore.synthesisParams.temperature.toFixed(1) }})</Label>
        <HoverCard>
          <HoverCardTrigger as-child>
            <Button variant="ghost" size="icon">
              <HelpCircle class="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p class="text-sm">Controls the degree of voice variation. Higher values produce more variation, while lower values result in more stable output.</p>
          </HoverCardContent>
        </HoverCard>
      </div>
      <Slider
        :model-value="playgroundStore.synthesisParams.temperatureArray"
        @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ temperature: value[0] }) }"
        :min="0"
        :max="1"
        :step="0.1"
      />
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Speech Rate ({{ playgroundStore.synthesisParams.speed.toFixed(1) }}x)</Label>
        <HoverCard>
          <HoverCardTrigger as-child>
            <Button variant="ghost" size="icon">
              <HelpCircle class="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p class="text-sm">Adjust the playback speed of the voice. 1.0 is normal speed, greater than 1.0 speeds up, less than 1.0 slows down.</p>
          </HoverCardContent>
        </HoverCard>
      </div>
      <Slider
        :model-value="playgroundStore.synthesisParams.speedArray"
        @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ speed: value[0] }) }"
        :min="0.5"
        :max="2"
        :step="0.1"
      />
    </div>

    <div class="space-y-2">
      <Label for="performanceTaskType">Performance Task Type</Label>
      <Select v-model="performanceTaskType">
        <SelectTrigger id="performanceTaskType" class="w-full">
          <SelectValue placeholder="Select task type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="monologue">Monologue (Single Speaker)</SelectItem>
            <SelectItem value="dialogue">Dialogue (Multiple Speakers)</SelectItem>
            <SelectItem value="narration">Narration</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label for="ttsProvider">TTS Provider</Label>
      <Select v-model="ttsProvider" @change="onProviderChange">
        <SelectTrigger id="ttsProvider" class="w-full">
          <SelectValue placeholder="Select TTS provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
            <SelectItem value="azure">Azure TTS</SelectItem>
            <SelectItem value="openai_tts">OpenAI TTS</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div v-if="ttsProvider" class="space-y-2">
      <Label for="selectedVoice">Voice</Label>
      <Select v-model="selectedVoice" :disabled="isLoadingVoices || availableVoices.length === 0">
        <SelectTrigger id="selectedVoice">
          <SelectValue :placeholder="isLoadingVoices ? 'Loading voices...' : (availableVoices.length === 0 ? 'No voices available' : 'Select voice')" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="voice in availableVoices" :key="voice.id" :value="voice.id">{{ voice.name }}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
       <p v-if="isLoadingVoices" class="text-sm text-muted-foreground flex items-center"><Loader2 class="w-4 h-4 mr-2 animate-spin"/> Fetching voices...</p>
    </div>

    <div v-if="performanceTaskType === 'dialogue' && speakersInScript.length" class="space-y-4">
      <h4 class="text-base font-medium">Speaker Assignment</h4>
      <div v-for="speaker in speakersInScript" :key="speaker" class="p-4 border rounded-md space-y-2 bg-muted/50">
        <p class="font-semibold">Speaker: {{ speaker }}</p>
        <Label :for="`speaker-voice-${speaker}`" class="text-sm text-muted-foreground">Assign Voice:</Label>
        <Select v-model="speakerAssignments[speaker]" :disabled="isLoadingVoices || availableVoices.length === 0">
          <SelectTrigger :id="`speaker-voice-${speaker}`">
            <SelectValue :placeholder="isLoadingVoices ? 'Loading voices...' : (availableVoices.length === 0 ? 'No voices available' : 'Select voice for ' + speaker)" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="voice in availableVoices" :key="voice.id" :value="voice.id">{{ voice.name }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- New Section: Script Breakdown -->
    <div v-if="performanceTaskType === 'dialogue' && parsedScriptSegments.length > 0" class="space-y-4">
      <h4 class="text-base font-medium">Script Breakdown & Preview</h4>
      <div v-for="(segment, index) in parsedScriptSegments" :key="`segment-${index}`" class="p-4 border rounded-md space-y-3 bg-muted/40">
        <div class="flex justify-between items-center">
          <p class="text-sm font-semibold">Segment {{ index + 1 }}: <span class="font-bold text-primary">{{ segment.speakerTag }}</span></p>
          <!-- Add Preview Button -->
          <Button
            size="sm"
            variant="outline"
            :disabled="!speakerAssignments[segment.speakerTag] || isPreviewingSegment === index"
            @click="previewSegment(segment, index)"
          >
            <Loader2 v-if="isPreviewingSegment === index" class="w-3.5 h-3.5 mr-1 animate-spin" />
            <Play v-else class="w-3.5 h-3.5 mr-1" />
            {{ isPreviewingSegment === index ? 'Generating...' : 'Preview' }}
          </Button>
        </div>
        
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">Text:</Label>
          <p class="text-sm p-2 border rounded bg-background/50 max-h-28 overflow-y-auto">{{ segment.text }}</p>
        </div>

        <div class="grid grid-cols-2 gap-x-4">
          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Assigned Voice:</Label>
            <p class="text-sm font-medium">{{ speakerAssignments[segment.speakerTag] ? getVoiceNameById(speakerAssignments[segment.speakerTag]) : 'Not Assigned' }}</p>
          </div>
          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Associated Persona:</Label>
            <p class="text-sm font-medium">{{ getPersonaForSpeaker(segment.speakerTag)?.name || 'None' }}</p>
          </div>
        </div>
        
        <!-- Add preview audio player -->
        <div v-if="segmentPreviews[index]?.audioUrl" class="mt-2">
          <audio :src="segmentPreviews[index].audioUrl" controls class="w-full h-8" />
        </div>
      </div>
    </div>
  </div>

  <!-- 在组件底部添加预览和确认区域 -->
  <div class="flex flex-col space-y-4 mt-6 pt-4 border-t">
    <div class="flex justify-between">
      <h3 class="text-base font-medium">全局预览和提交</h3>
      <Button
        variant="outline"
        size="sm"
        :disabled="!canProceed || Object.keys(segmentPreviews).length === 0"
        @click="previewAll"
      >
        <Play class="w-4 h-4 mr-2" />
        预览全部
      </Button>
    </div>
    
    <div v-if="combinedPreviewUrl" class="border rounded-md p-4 bg-muted/30">
      <p class="text-sm font-medium mb-2">完整音频预览:</p>
      <audio :src="combinedPreviewUrl" controls class="w-full" />
    </div>
    
    <div class="flex justify-end gap-3">
      <Button
        variant="secondary"
        @click="$emit('back')"
      >
        上一步
      </Button>
      <Button
        @click="submitWithTimestamps"
        :disabled="!canProceed"
      >
        下一步：音频合成
        <ArrowRight class="w-4 h-4 ml-2" />
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits, defineExpose } from 'vue';
import { Label } from '../../components/ui/label/index.js';
import { Textarea } from '../../components/ui/textarea/index.js';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select/index.js';
import { Loader2 } from 'lucide-vue-next';
import { usePlaygroundStore, type Persona } from '../../stores/playground.js';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../components/ui/hover-card/index.js';
import { Button } from '../../components/ui/button/index.js';
import { HelpCircle } from 'lucide-vue-next';
import { Slider } from '../../components/ui/slider/index.js';
import { Play, ArrowRight } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const props = defineProps<{ scriptContent: string }>();
const emit = defineEmits(['update:scriptContent', 'next', 'back']);

const playgroundStore = usePlaygroundStore();

const performanceTaskType = ref('');
const ttsProvider = ref('');
const availableVoices = ref<{id: string, name: string}[]>([]);
const selectedVoice = ref('');
const isLoadingVoices = ref(false);
const speakerAssignments = ref<Record<string, string>>({});

// 预览状态管理
const isPreviewingSegment = ref<number | null>(null);
const segmentPreviews = ref<Record<number, { audioUrl: string, timestamps?: any[] }>>({});

const selectedHostPersona = computed<Persona | undefined>(() => {
  if (!playgroundStore.podcastSettings.hostPersonaId) return undefined;
  return playgroundStore.personas.find((p: Persona) => p.persona_id === Number(playgroundStore.podcastSettings.hostPersonaId));
});

const selectedGuestPersonas = computed<Persona[]>(() => {
  if (!playgroundStore.podcastSettings.guestPersonaIds || playgroundStore.podcastSettings.guestPersonaIds.length === 0) return [];
  return playgroundStore.podcastSettings.guestPersonaIds
    .map((id: string | number | undefined) => playgroundStore.personas.find((p: Persona) => p.persona_id === Number(id)))
    .filter((p: Persona | undefined): p is Persona => p !== undefined);
});

const mockVoices = {
  elevenlabs: [{id: 'el_voice1', name: 'ElevenLabs - Rachel'}, {id: 'el_voice2', name: 'ElevenLabs - Adam'}],
  azure: [{id: 'az_voice1', name: 'Azure - Jenny (Neural)'}, {id: 'az_voice2', name: 'Azure - Guy (Neural)'}],
  openai_tts: [{id: 'oa_voice1', name: 'OpenAI - Nova'}, {id: 'oa_voice2', name: 'OpenAI - Alloy'}]
};

// Helper for @change on TTS Provider select because v-model might not update early enough for the watch
const onProviderChange = (value: string) => {
  ttsProvider.value = value;
};

watch(ttsProvider, async (newProvider) => {
  if (!newProvider) {
    availableVoices.value = [];
    selectedVoice.value = '';
    return;
  }
  isLoadingVoices.value = true;
  selectedVoice.value = ''; // Reset selected voice when provider changes
  Object.keys(speakerAssignments.value).forEach(key => speakerAssignments.value[key] = ''); // Reset speaker assignments
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
  availableVoices.value = mockVoices[newProvider as keyof typeof mockVoices] || [];
  isLoadingVoices.value = false;
  // selectedVoice.value = availableVoices.value.length > 0 ? availableVoices.value[0].id : ''; 
}, { immediate: false }); // immediate false to avoid running on init if ttsProvider has initial value

const speakersInScript = computed(() => {
  if (props.scriptContent && performanceTaskType.value === 'dialogue') {
    const speakerPattern = /^([A-Za-z0-9_]+):/gm;
    const matches = [...props.scriptContent.matchAll(speakerPattern)];
    const uniqueSpeakers = [...new Set(matches.map(match => match[1]))];
    uniqueSpeakers.forEach(speaker => {
      if (!(speaker in speakerAssignments.value)) {
        speakerAssignments.value[speaker] = '';
      }
    });
    // Clean up assignments for speakers no longer in script
    Object.keys(speakerAssignments.value).forEach(assignedSpeaker => {
      if (!uniqueSpeakers.includes(assignedSpeaker)) {
        delete speakerAssignments.value[assignedSpeaker];
      }
    });
    return uniqueSpeakers;
  }
  return [];
});

const parsedScriptSegments = computed(() => {
  if (props.scriptContent && performanceTaskType.value === 'dialogue') {
    const segments: { speakerTag: string, text: string }[] = [];
    const script = props.scriptContent.trim();
    if (!script) return [];

    // Regex to capture speaker and their lines until the next speaker or end of script
    const segmentPattern = /^([A-Za-z0-9_]+):\\s*([\\s\\S]*?)(?=(?:^[A-Za-z0-9_]+:|$))/gm;
    let match;
    while ((match = segmentPattern.exec(script)) !== null) {
      const speakerTag = match[1];
      const text = match[2].trim();
      if (text) { // Only add if there's actual text
        segments.push({ speakerTag, text });
      }
    }
    return segments;
  }
  return [];
});

const getVoiceNameById = (voiceId: string) => {
  const voice = availableVoices.value.find(v => v.id === voiceId);
  return voice ? voice.name : 'N/A';
};

const getPersonaForSpeaker = (speakerTag: string): Persona | undefined => {
  if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
    return selectedHostPersona.value;
  }
  return selectedGuestPersonas.value.find(p => p.name === speakerTag);
};

const canProceed = computed(() => {
  if (!performanceTaskType.value || !ttsProvider.value || isLoadingVoices.value) return false;
  if (performanceTaskType.value === 'dialogue') {
    if (speakersInScript.value.length === 0) return false; // Must have speakers for dialogue
    return parsedScriptSegments.value.every(seg => speakerAssignments.value[seg.speakerTag] && availableVoices.value.some(v => v.id === speakerAssignments.value[seg.speakerTag]));
  }
  return !!selectedVoice.value && availableVoices.value.some(v => v.id === selectedVoice.value);
});

// 添加这些状态管理变量
const combinedPreviewUrl = ref<string | null>(null);

// 预览单个片段的方法
async function previewSegment(segment: { speakerTag: string, text: string }, index: number) {
  if (!segment.text || !speakerAssignments.value[segment.speakerTag]) return;
  
  isPreviewingSegment.value = index;
  try {
    // 获取语音ID
    const voiceId = speakerAssignments.value[segment.speakerTag];
    
    // 调用带时间戳的TTS API
    const response = await fetch('/api/elevenlabs/tts-with-timestamps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: segment.text,
        voiceId,
        modelId: 'eleven_multilingual_v2', // 可以根据实际情况调整或设置为可配置项
        voiceSettings: {
          stability: playgroundStore.synthesisParams.temperature,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true
        },
        optimizeStreamingLatency: 3
      })
    });
    
    if (!response.ok) {
      throw new Error('预览音频生成失败');
    }
    
    const data = await response.json();
    
    // 创建临时音频URL - 使用浏览器兼容的方式处理base64数据
    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // 保存预览结果
    segmentPreviews.value[index] = {
      audioUrl,
      timestamps: data.timestamps
    };
    
  } catch (error) {
    console.error('预览生成失败:', error);
    toast.error('预览生成失败，请重试');
  } finally {
    isPreviewingSegment.value = null;
  }
}

// 预览全部的方法
async function previewAll() {
  const previewKeys = Object.keys(segmentPreviews.value);
  if (previewKeys.length === 0) {
    toast.error("Please preview at least one segment first.");
    return;
  }
  
  if (previewKeys.length === 1) {
    // 如果只有一个片段，直接使用它
    const firstKey = previewKeys[0];
    combinedPreviewUrl.value = segmentPreviews.value[Number(firstKey)].audioUrl;
    toast.info("Only one segment previewed. Showing that segment.");
    return;
  }
  
  try {
    toast.info("Combining audio segments...");
    
    // 按照索引顺序排序预览片段
    const sortedKeys = previewKeys.map(Number).sort((a, b) => a - b);
    
    // 创建一个新的AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const audioBuffers: AudioBuffer[] = [];
    
    // 加载所有音频片段
    for (const key of sortedKeys) {
      const audioUrl = segmentPreviews.value[key].audioUrl;
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.push(audioBuffer);
    }
    
    // 计算合并后的总长度
    const totalLength = audioBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
    
    // 创建一个新的AudioBuffer来存储合并后的音频
    const combinedBuffer = audioContext.createBuffer(
      audioBuffers[0].numberOfChannels,
      totalLength,
      audioBuffers[0].sampleRate
    );
    
    // 合并音频片段
    let offset = 0;
    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i];
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        combinedBuffer.copyToChannel(channelData, channel, offset);
      }
      offset += buffer.length;
    }
    
    // 将合并后的AudioBuffer转换为Blob
    const offlineContext = new OfflineAudioContext(
      combinedBuffer.numberOfChannels,
      combinedBuffer.length,
      combinedBuffer.sampleRate
    );
    const source = offlineContext.createBufferSource();
    source.buffer = combinedBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = await audioBufferToWav(renderedBuffer);
    
    // 创建URL并设置
    combinedPreviewUrl.value = URL.createObjectURL(wavBlob);
    toast.success("Combined preview created successfully!");
  } catch (error) {
    console.error('Error combining audio segments:', error);
    toast.error("Failed to combine audio segments. Using first segment instead.");
    const firstKey = previewKeys[0];
    combinedPreviewUrl.value = segmentPreviews.value[Number(firstKey)].audioUrl;
  }
}

// 辅助函数：将AudioBuffer转换为WAV格式的Blob
function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve) => {
    const numOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numOfChannels * 2;
    const sampleRate = buffer.sampleRate;
    const wavDataView = new DataView(new ArrayBuffer(44 + length));
    
    // RIFF标识符
    writeString(wavDataView, 0, 'RIFF');
    // 文件长度
    wavDataView.setUint32(4, 36 + length, true);
    // WAVE标识符
    writeString(wavDataView, 8, 'WAVE');
    // fmt子块标识符
    writeString(wavDataView, 12, 'fmt ');
    // 子块1大小
    wavDataView.setUint32(16, 16, true);
    // 音频格式（PCM）
    wavDataView.setUint16(20, 1, true);
    // 通道数
    wavDataView.setUint16(22, numOfChannels, true);
    // 采样率
    wavDataView.setUint32(24, sampleRate, true);
    // 字节率
    wavDataView.setUint32(28, sampleRate * numOfChannels * 2, true);
    // 块对齐
    wavDataView.setUint16(32, numOfChannels * 2, true);
    // 每个样本的位数
    wavDataView.setUint16(34, 16, true);
    // data子块标识符
    writeString(wavDataView, 36, 'data');
    // 数据长度
    wavDataView.setUint32(40, length, true);
    
    // 写入PCM数据
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        wavDataView.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    resolve(new Blob([wavDataView], { type: 'audio/wav' }));
  });
}

// 辅助函数：将字符串写入DataView
function writeString(dataView: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    dataView.setUint8(offset + i, str.charCodeAt(i));
  }
}

// 提交带时间戳的配置
function submitWithTimestamps() {
  if (!canProceed.value) return;
  
  // 获取基础配置
  const baseConfig = {
    taskType: performanceTaskType.value,
    provider: ttsProvider.value,
    script: props.scriptContent,
    availableVoices: availableVoices.value,
  };
  
  // 整合时间戳信息
  const configWithTimestamps = {
    ...baseConfig,
    segments: Object.entries(speakerAssignments.value).map(([speakerTag, voiceId]) => {
      // 找到对应的segment索引
      const segmentIndex = parsedScriptSegments.value.findIndex(s => s.speakerTag === speakerTag);
      const segmentPreview = segmentIndex >= 0 ? segmentPreviews.value[segmentIndex] : undefined;
      
      let personaId: number | undefined = undefined;
      if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
        personaId = selectedHostPersona.value.persona_id;
      } else {
        const guestPersona = selectedGuestPersonas.value.find(p => p.name === speakerTag);
        if (guestPersona) {
          personaId = guestPersona.persona_id;
        }
      }
      
      return {
        speakerTag,
        voiceId,
        text: parsedScriptSegments.value.find(s => s.speakerTag === speakerTag)?.text || '',
        personaId,
        timestamps: segmentPreview?.timestamps || []
      };
    }),
    useTimestamps: true // 标记使用时间戳功能
  };
  
  emit('next', configWithTimestamps);
}

// Expose performance config and validation state
defineExpose({
  getPerformanceConfig: () => {
    if (!canProceed.value) return null;

    const baseConfig = {
      taskType: performanceTaskType.value,
      provider: ttsProvider.value,
      script: props.scriptContent, // Keep full script for general context if needed
      availableVoices: availableVoices.value, // Useful for the consumer
    };

    if (performanceTaskType.value === 'dialogue') {
      const segments: { speakerTag: string, voiceId: string, text: string, personaId?: number }[] = [];
      const script = props.scriptContent.trim();
      if (!script) return { ...baseConfig, segments: [] }; // Handle empty script

      // Regex to capture speaker and their lines until the next speaker or end of script
      // Matches "SPEAKER_TAG:" followed by text. Handles multi-line text for a single speaker.
      const segmentPattern = /^([A-Za-z0-9_]+):\s*([\s\S]*?)(?=(?:^[A-Za-z0-9_]+:|$))/gm;
      let match;
      
      while ((match = segmentPattern.exec(script)) !== null) {
        const speakerTag = match[1];
        const text = match[2].trim();
        const voiceId = speakerAssignments.value[speakerTag];

        if (text && voiceId) { // Only add segment if there's text and an assigned voice
          let personaId: number | undefined = undefined;
          
          // Try to match speakerTag with selected personas
          if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
            personaId = selectedHostPersona.value.persona_id;
          } else {
            const guestPersona = selectedGuestPersonas.value.find(p => p.name === speakerTag);
            if (guestPersona) {
              personaId = guestPersona.persona_id;
            }
          }
          
          segments.push({
            speakerTag,
            voiceId,
            text,
            personaId,
          });
        }
      }
      
      return {
        ...baseConfig, // Includes taskType, provider, full script, availableVoices
        assignments: { ...speakerAssignments.value }, // Keep original assignments map as well
        segments, // The newly parsed segments
      };
    } else {
      // Monologue or other types
      return {
        ...baseConfig,
        voice: selectedVoice.value,
      };
    }
  },
  isFormValid: canProceed
});

watch(performanceTaskType, (newType) => {
  // Reset voice/assignments when task type changes
  selectedVoice.value = '';
  speakerAssignments.value = {}; 
});

</script>
