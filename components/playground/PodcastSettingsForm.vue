<template>
  <div class="space-y-6 p-4">
    <!-- Top Row: Language and Number of Segments -->
    <div class="grid md:grid-cols-2 gap-x-6 gap-y-5">
      <!-- Podcast Language -->
      <div class="flex items-center gap-3">
        <TooltipProvider :delay-duration="100">
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="ph:globe-simple-bold" class="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Podcast Language</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select v-model="podcastLanguageValue" class="w-48">
          <SelectTrigger class="flex-grow w-48 overflow-hidden">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="lang in SUPPORTED_LANGUAGES"
              :key="lang.code"
              :value="lang.code">
              {{ lang.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Number of Segments -->
      <div class="flex items-center gap-3">
        <TooltipProvider :delay-duration="100">
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="ph:stack-bold" class="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Number of Segments</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div class="flex w-full gap-2">
          <Input
            type="number"
            :value="segmentCountValue"
            @input="handleSegmentCountInput"
            min="1"
            max="100"
            class="flex-grow hide-spin"
            是placeholder="Enter number of segments"
          />
          <Select :value="segmentCountValue" @update:value="handleSegmentCountSelect" class="w-24">
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in segmentOptions"
                :key="option"
                :value="option">
                {{ option }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- Title -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:text-t-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Podcast Title</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Input
        id="podcastTitle"
        v-model="editableSettings.title"
        placeholder="Enter the title for your podcast, e.g., The Future of AI"
        class="flex-grow"
      />
    </div>

    <!-- User Instructions / Topic -->
    <div class="flex items-start gap-3"> 
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground pt-2.5">
              <Icon name="ph:lightbulb-filament-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>User Instructions / Podcast Topic</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Textarea
        id="podcastTopic"
        v-model="editableSettings.topic"
        placeholder="Describe in detail what the podcast should cover: main points, questions for guests, desired tone, etc."
        class="min-h-[100px] flex-grow"
      />
    </div>

    <!-- Host Character -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:user-sound-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Host Character</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <UnifiedPersonaSelector
        id="hostPersonaUnified"
        v-model="editableSettings.hostPersonaId"
        :personas="availableHostPersonas"
        :selection-mode="'single'"
        placeholder="Select Host Persona"
        class="flex-grow"
      />
    </div>

    <!-- Guest Characters -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:users-three-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Guest Characters (Select one or more)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <UnifiedPersonaSelector
        id="guestPersonasUnified"
        v-model="editableSettings.guestPersonaIds"
        :personas="availableGuestPersonas"
        :selection-mode="'multiple'"
        placeholder="Select Guest Persona(s) (Optional)"
        class="flex-grow"
      />
    </div>
    
    <!-- Advanced Options -->
    <div class="pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4 ml-1">Advanced Options</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <!-- Style / Tone -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:palette-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Style / Tone</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="podcastStyle"
            v-model="editableSettings.style"
            placeholder="e.g., Casual, Educational"
            class="flex-grow"
          />
        </div>

        <!-- Keywords -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:tag-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Keywords (comma-separated)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="podcastKeywords"
            v-model="keywordsForInput"
            placeholder="e.g., AI, Future Tech"
            class="flex-grow"
          />
        </div>

        <!-- Background Music -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:music-notes-simple-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Background Music (Optional)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="backgroundMusic"
            v-model="editableSettings.backgroundMusic"
            placeholder="Theme or style, e.g., Upbeat"
            class="flex-grow"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { Skeleton } from '@/components/ui/skeleton';
import UnifiedPersonaSelector from '@/components/UnifiedPersonaSelector.vue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; 
import { Button } from '@/components/ui/button';
import type { Persona } from '@/stores/playgroundPersona';
import { usePlaygroundSettingsStore } from '@/stores/playgroundSettings';
import type { FullPodcastSettings } from '@/stores/playgroundSettings';
import { SUPPORTED_LANGUAGES } from '@/stores/playgroundSettings';

const segmentOptions = ref([5, 10, 20, 30, 40, 50]);

const props = defineProps<{
  modelValue: FullPodcastSettings;
  personas: Persona[];
  personasLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FullPodcastSettings): void;
}>();

const keywordsForInput = computed<string>({
  get: () => {
    if (Array.isArray(props.modelValue.keywords)) {
      return props.modelValue.keywords.join(', ');
    }
    return '';
  },
  set: (newValue) => {
    const newKeywordsArray = newValue.split(',').map(k => k.trim()).filter(k => k);
    emit('update:modelValue', { ...props.modelValue, keywords: newKeywordsArray });
  }
});

const podcastLanguageValue = computed({
  get: () => props.modelValue.language,
  set: (newValue) => {
    if (newValue !== props.modelValue.language) {
      emit('update:modelValue', { ...props.modelValue, language: newValue });
    }
  }
});

// 使用ref来存储segment数量，而不是直接绑定到editableSettings
const segmentCountValue = ref(props.modelValue.numberOfSegments || 10);

// 处理输入框的输入事件
function handleSegmentCountInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = parseInt(target.value);
  
  // 验证并更新值
  if (!isNaN(value) && value > 0 && value <= 100) {
    segmentCountValue.value = value;
    updateSegmentCount(value);
  } else if (target.value === '') {
    // 如果输入框为空，不做任何操作
  } else {
    console.warn('[PodcastSettingsForm] 无效的segment数量:', target.value);
  }
}

// 处理下拉框的选择事件
function handleSegmentCountSelect(value: number) {
  console.log('[PodcastSettingsForm] 下拉框选择的segment数量:', value);
  segmentCountValue.value = value;
  
  // 添加更多日志，确保值被正确更新
  console.log('[PodcastSettingsForm] 更新前的segmentCountValue:', segmentCountValue.value);
  console.log('[PodcastSettingsForm] 更新前的props.modelValue.numberOfSegments:', props.modelValue.numberOfSegments);
  
  // 直接更新store，确保值被正确设置
  const settingsStore = usePlaygroundSettingsStore();
  console.log('[PodcastSettingsForm] 直接更新store前的numberOfSegments:', settingsStore.podcastSettings.numberOfSegments);
  
  // 强制更新store中的值
  settingsStore.$patch((state) => {
    state.podcastSettings.numberOfSegments = value;
  });
  
  console.log('[PodcastSettingsForm] 直接更新store后的numberOfSegments:', settingsStore.podcastSettings.numberOfSegments);
  
  // 然后再调用updateSegmentCount
  updateSegmentCount(value);
}

// 更新segment数量到父组件
function updateSegmentCount(value: number) {
  console.log('[PodcastSettingsForm] 更新segment数量:', value);
  
  // 直接更新props.modelValue的numberOfSegments属性
  const updatedSettings = {
    ...props.modelValue,
    numberOfSegments: value
  };
  
  console.log('[PodcastSettingsForm] 发送更新事件，更新后的设置:', JSON.stringify(updatedSettings, null, 2));
  
  // 发送更新事件
  emit('update:modelValue', updatedSettings);
  
  // 直接修改store中的值，确保更新生效
  const settingsStore = usePlaygroundSettingsStore();
  console.log('[PodcastSettingsForm] 直接更新store中的numberOfSegments:', value);
  settingsStore.updateFullPodcastSettings({ numberOfSegments: value });
}

// 监听props.modelValue.numberOfSegments的变化，同步到本地ref
watch(() => props.modelValue.numberOfSegments, (newValue) => {
  if (newValue !== segmentCountValue.value) {
    segmentCountValue.value = newValue || 10;
  }
}, { immediate: true });

const editableSettings = computed({
  get: () => {
    return {
      ...props.modelValue,
    };
  },
  set: (value) => {
    const newSettings = { ...props.modelValue, ...value };

    const getProcessedKeywords = (): string[] => {
      // 使用类型断言明确指定keywordsValue的可能类型
      const keywordsValue = newSettings.keywords as string[] | string | undefined;
      
      if (Array.isArray(keywordsValue)) {
        return keywordsValue;
      } 
      
      if (typeof keywordsValue === 'string') {
        return keywordsValue.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
      
      return [];
    };
    
    const processedValue = {
      ...newSettings,
      // 不在这里处理numberOfSegments，而是使用专门的函数
      hostPersonaId: newSettings.hostPersonaId ? Number(newSettings.hostPersonaId) : undefined,
      guestPersonaIds: Array.isArray(newSettings.guestPersonaIds)
        ? newSettings.guestPersonaIds
          .map((id: string | number | undefined) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0)
        : [],
      keywords: getProcessedKeywords(),
    };
    
    // 添加日志，查看最终发送的值
    console.log('[PodcastSettingsForm] 发送更新:', JSON.stringify(processedValue, null, 2));
    
    emit('update:modelValue', processedValue);
  }
});

// 根据当前选择的语言过滤可用的主持人人物
const availableHostPersonas = computed(() => {
  if (!props.personas || props.personas.length === 0) return [];
  
  // 如果当前选择的语言是英文，先尝试过滤支持英文的人物
  const currentLanguage = editableSettings.value.language;
  if (currentLanguage === 'en') {
    // 尝试找出支持英文的人物
    const englishSupportingPersonas = props.personas.filter(p => 
      p.language_support && 
      Array.isArray(p.language_support) && 
      p.language_support.includes('en')
    );
    
    // 如果找到了支持英文的人物，则返回这些人物
    if (englishSupportingPersonas.length > 0) {
      console.log(`Found ${englishSupportingPersonas.length} personas supporting English`);
      return englishSupportingPersonas;
    }
    
    // 如果没有找到支持英文的人物，则返回所有人物作为备选
    console.log('No personas explicitly supporting English found, returning all personas as fallback');
  }
  
  // 如果不是英文或没有选择语言，或者没有找到支持英文的人物，则显示所有人物
  return props.personas;
});

const availableGuestPersonas = computed(() => {
  if (!props.personas || props.personas.length === 0) return [];
  
  // 首先过滤掉已选为主持人的人物
  let filteredPersonas = props.personas.filter(p => String(p.persona_id) !== String(editableSettings.value.hostPersonaId));
  
  // 如果当前选择的语言是英文，先尝试过滤支持英文的人物
  const currentLanguage = editableSettings.value.language;
  if (currentLanguage === 'en') {
    // 尝试找出支持英文的人物
    const englishSupportingPersonas = filteredPersonas.filter(p => 
      p.language_support && 
      Array.isArray(p.language_support) && 
      p.language_support.includes('en')
    );
    
    // 如果找到了支持英文的人物，则返回这些人物
    if (englishSupportingPersonas.length > 0) {
      console.log(`Found ${englishSupportingPersonas.length} guest personas supporting English`);
      return englishSupportingPersonas;
    }
    
    // 如果没有找到支持英文的人物，则返回所有人物作为备选
    console.log('No guest personas explicitly supporting English found, returning all filtered personas as fallback');
  }
  
  return filteredPersonas;
});

watch(() => props.modelValue.hostPersonaId, (newHostId: number | string | undefined) => {
  const numericNewHostId = Number(newHostId);
  if (Array.isArray(editableSettings.value.guestPersonaIds) && editableSettings.value.guestPersonaIds.includes(numericNewHostId)) {
    const updatedGuests = editableSettings.value.guestPersonaIds
      .map((id: string | number | undefined) => Number(id))
      .filter((id: number) => !isNaN(id) && id !== numericNewHostId);
    emit('update:modelValue', { ...editableSettings.value, guestPersonaIds: updatedGuests });
  }
});

// 监听语言变化，检查已选择人物的语言支持情况
watch(() => editableSettings.value.language, (newLanguage: string | undefined) => {
  if (newLanguage === 'en') {
    console.log('Language changed to English, checking persona language support');
    
    // 先检查是否有任何支持英文的人物
    const englishSupportingPersonas = props.personas.filter(p => 
      p.language_support && 
      Array.isArray(p.language_support) && 
      p.language_support.includes('en')
    );
    
    // 如果有支持英文的人物，才进行严格过滤
    if (englishSupportingPersonas.length > 0) {
      console.log(`Found ${englishSupportingPersonas.length} personas supporting English, will filter selections`);
      
      // 检查主持人是否支持英文
      const hostPersona = props.personas.find(p => String(p.persona_id) === String(editableSettings.value.hostPersonaId));
      if (hostPersona && (!hostPersona.language_support || !Array.isArray(hostPersona.language_support) || !hostPersona.language_support.includes('en'))) {
        console.log(`Current host persona ${hostPersona.name} does not support English, resetting selection`);
        // 如果主持人不支持英文，则重置主持人选择
        editableSettings.value.hostPersonaId = undefined;
      }
      
      // 检查嘉宾是否支持英文
      if (editableSettings.value.guestPersonaIds && editableSettings.value.guestPersonaIds.length > 0) {
        const newGuestIds = editableSettings.value.guestPersonaIds.filter(guestId => {
          const guestPersona = props.personas.find(p => String(p.persona_id) === String(guestId));
          return guestPersona && guestPersona.language_support && Array.isArray(guestPersona.language_support) && guestPersona.language_support.includes('en');
        });
        
        if (newGuestIds.length !== editableSettings.value.guestPersonaIds.length) {
          console.log(`Some guest personas do not support English, filtering guest selections`);
          editableSettings.value.guestPersonaIds = newGuestIds;
        }
      }
    } else {
      console.log('No personas explicitly supporting English found, keeping current selections');
      // 如果没有找到支持英文的人物，则保留当前选择
    }
    
    // 更新表单值
    emit('update:modelValue', { ...editableSettings.value });
  }
});

watch(() => props.personas, (loadedPersonas) => {
  if (loadedPersonas && loadedPersonas.length > 0) {
    const currentModel = props.modelValue;
    let newHostId = currentModel.hostPersonaId ? String(currentModel.hostPersonaId) : undefined;
    let newGuestIds = Array.isArray(currentModel.guestPersonaIds) && currentModel.guestPersonaIds.length > 0
                      ? currentModel.guestPersonaIds.map(id => String(id))
                      : [];

    let needsUpdate = false;

    if (!newHostId && loadedPersonas.length > 0) {
      const defaultHost = loadedPersonas[0];
      if (defaultHost && typeof defaultHost.persona_id !== 'undefined') {
        newHostId = String(defaultHost.persona_id);
        needsUpdate = true;
      }
    }

    if (newGuestIds.length === 0 && newHostId && loadedPersonas.length > 0) {
      const potentialGuest = loadedPersonas.find(p => p && typeof p.persona_id !== 'undefined' && String(p.persona_id) !== newHostId);
      if (potentialGuest) {
        newGuestIds = [String(potentialGuest.persona_id)];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      emit('update:modelValue', {
        ...currentModel,
        hostPersonaId: newHostId ? Number(newHostId) : undefined,
        guestPersonaIds: newGuestIds.map(id => Number(id)),
      });
    }
  }
}, { immediate: true, deep: true });

</script>

<style scoped>
.hide-spin::-webkit-outer-spin-button,
.hide-spin::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.hide-spin[type=number] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield;
}
</style>
