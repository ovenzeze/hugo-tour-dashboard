<template>
  <div class="space-y-8">
    <!-- 单选或多选模式，根据props决定 -->
    <div>
      <PersonaSelector
        v-model="selectedValue"
        :personas="personas"
        :multiple="multiple"
        :label="multiple ? 'Select Multiple Personas' : 'Select a Persona'"
        placeholder="Search persona..."
        :description="multiple ? 'Please select multiple personas as guests' : 'Please select a persona as host'"
        :filterable="true"
        :disabled="disabled"
      />
      
      <!-- 显示选中的值 -->
      <div class="mt-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-md">
        <p class="text-sm font-medium mb-2">当前选中值:</p>
        <pre class="text-xs overflow-auto p-2 bg-white dark:bg-zinc-900 rounded border">{{ JSON.stringify(selectedValue, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

// 定义组件属性
const props = withDefaults(defineProps<{
  multiple?: boolean;
  disabled?: boolean;
}>(), {
  multiple: false,
  disabled: false
});

// 根据多选/单选模式设置不同的初始值
const selectedValue = ref<number | number[] | null>(props.multiple ? [] : null);

// 导入ApiPersona类型
import type { ApiPersona } from '~/pages/personas/index.vue';

// 模拟的角色数据
const personas = ref<ApiPersona[]>([
  {
    persona_id: 1,
    name: 'Historian',
    description: 'Focuses on historical events and cultural background',
    avatar_url: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    is_active: true,
    system_prompt: 'You are a professional historian, skilled at explaining historical events and cultural backgrounds.',
    voice_settings: JSON.stringify({ stability: 0.5, similarity_boost: 0.8 }),
    voice_description: 'Deep and steady male voice',
    tts_provider: 'elevenlabs',
    language_support: ['en-US', 'zh-CN'],
    voice_model_identifier: 'historical-voice-1'
  },
  {
    persona_id: 2,
    name: 'Art Critic',
    description: 'Provides professional analysis and evaluation of artworks',
    avatar_url: null,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    is_active: true,
    system_prompt: 'You are a professional art critic, skilled at analyzing and evaluating artworks.',
    voice_settings: JSON.stringify({ stability: 0.7, similarity_boost: 0.7 }),
    voice_description: 'Elegant female voice',
    tts_provider: 'elevenlabs',
    language_support: ['en-US', 'zh-CN', 'fr-FR'],
    voice_model_identifier: 'art-critic-voice-1'
  },
  {
    persona_id: 3,
    name: 'Tech Expert',
    description: 'Explains technology development and innovation trends',
    avatar_url: null,
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
    is_active: true,
    system_prompt: 'You are a tech expert, skilled at explaining technology development and innovation trends.',
    voice_settings: JSON.stringify({ stability: 0.6, similarity_boost: 0.6 }),
    voice_description: 'Clear male voice',
    tts_provider: 'elevenlabs',
    language_support: ['en-US', 'zh-CN'],
    voice_model_identifier: 'tech-expert-voice-1'
  },
  {
    persona_id: 4,
    name: 'Culture Scholar',
    description: 'Studies different cultural backgrounds and traditions',
    avatar_url: null,
    created_at: '2023-01-04T00:00:00Z',
    updated_at: '2023-01-04T00:00:00Z',
    is_active: true,
    system_prompt: 'You are a culture scholar, skilled at studying different cultural backgrounds and traditions.',
    voice_settings: JSON.stringify({ stability: 0.8, similarity_boost: 0.5 }),
    voice_description: 'Gentle female voice',
    tts_provider: 'elevenlabs',
    language_support: ['en-US', 'zh-CN', 'ja-JP'],
    voice_model_identifier: 'culture-scholar-voice-1'
  },
  {
    persona_id: 5,
    name: 'Travel Guide',
    description: 'Provides travel advice and attraction introductions',
    avatar_url: null,
    created_at: '2023-01-05T00:00:00Z',
    updated_at: '2023-01-05T00:00:00Z',
    is_active: true,
    system_prompt: 'You are a travel guide, skilled at providing travel advice and introducing attractions.',
    voice_settings: JSON.stringify({ stability: 0.4, similarity_boost: 0.9 }),
    voice_description: 'Energetic male voice',
    tts_provider: 'elevenlabs',
    language_support: ['en-US', 'zh-CN', 'es-ES'],
    voice_model_identifier: 'travel-guide-voice-1'
  }
]);

// 监听多选模式变化，重置选中值
watch(() => props.multiple, (newValue) => {
  selectedValue.value = newValue ? [] : null;
});

// 监听禁用状态变化
watch(() => props.disabled, () => {
  // 可以在这里添加禁用状态变化时的逻辑
});
</script>
