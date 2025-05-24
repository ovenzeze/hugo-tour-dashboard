<template>
  <Card class="group relative overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 flex flex-col h-full bg-gradient-to-br from-background/95 via-background/90 to-background/85 backdrop-blur-xl border-border/50 hover:border-primary/30 p-0">
    <!-- Header Section - 无背景，无padding -->
    <div class="px-6 pt-6 pb-4">
      <div class="flex items-start gap-4">
        <!-- Avatar Section -->
        <div class="relative">
          <Avatar class="h-16 w-16 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 shadow-lg">
            <AvatarImage 
              v-if="persona.avatar_url" 
              :src="persona.avatar_url" 
              :alt="persona.name"
              class="object-cover" 
            />
            <AvatarFallback class="bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-lg font-semibold border border-primary/20">
              {{ getInitials(persona.name) }}
            </AvatarFallback>
          </Avatar>
          
          <!-- Status Indicator with glassmorphism -->
          <div class="absolute -bottom-1 -right-1">
            <Badge :variant="getStatusVariant(persona.status)" class="text-xs px-1.5 py-0.5 h-auto backdrop-blur-sm bg-background/80 border-border/60 shadow-sm">
              <Icon :name="getStatusIcon(persona.status)" class="h-3 w-3 mr-1" />
              {{ getStatusLabel(persona.status) }}
            </Badge>
          </div>
        </div>
        
        <!-- Title and Recommendation Section -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold leading-tight truncate group-hover:text-primary transition-colors drop-shadow-sm">
                {{ persona.name }}
              </h3>
              
              <!-- Recommendation Badges with enhanced glassmorphism -->
              <div class="flex gap-2 mt-2">
                <Badge 
                  v-if="persona.is_recommended_host"
                  variant="secondary"
                  class="text-xs px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-700 border-blue-300/50 dark:from-blue-400/20 dark:to-blue-500/10 dark:text-blue-300 dark:border-blue-600/50 backdrop-blur-sm shadow-sm"
                >
                  <Icon name="ph:microphone-bold" class="h-3 w-3 mr-1" />
                  推荐主持
                </Badge>
                <Badge 
                  v-if="persona.is_recommended_guest"
                  variant="secondary"
                  class="text-xs px-2 py-1 bg-gradient-to-r from-green-500/20 to-green-600/10 text-green-700 border-green-300/50 dark:from-green-400/20 dark:to-green-500/10 dark:text-green-300 dark:border-green-600/50 backdrop-blur-sm shadow-sm"
                >
                  <Icon name="ph:users-bold" class="h-3 w-3 mr-1" />
                  推荐嘉宾
                </Badge>
              </div>
              
              <!-- Priority Display with subtle glow -->
              <div v-if="(persona.is_recommended_host || persona.is_recommended_guest) && persona.recommended_priority" class="mt-1">
                <div class="flex items-center gap-1 text-xs text-muted-foreground/80">
                  <Icon name="ph:star-fill" class="h-3 w-3 text-amber-500/70" />
                  <span class="drop-shadow-sm">优先级: {{ persona.recommended_priority }}</span>
                </div>
              </div>
            </div>
            
            <!-- Actions Menu with glassmorphism -->
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="sm" class="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm bg-background/60 hover:bg-background/80 border border-border/30">
                  <Icon name="ph:dots-three-vertical-bold" class="h-4 w-4" />
                  <span class="sr-only">打开菜单</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56 backdrop-blur-xl bg-background/95 border-border/50">
                <DropdownMenuItem @click="$emit('edit', persona.persona_id)" class="cursor-pointer hover:bg-primary/10 transition-colors">
                  <Icon name="ph:pencil-simple-bold" class="mr-2 h-4 w-4" />
                  <span>编辑</span>
                </DropdownMenuItem>
                <DropdownMenuItem @click="$emit('view-details', persona.persona_id)" class="cursor-pointer hover:bg-primary/10 transition-colors">
                  <Icon name="ph:eye-bold" class="mr-2 h-4 w-4" />
                  <span>查看详情</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator class="bg-border/30" />
                
                <!-- Recommendation Controls -->
                <DropdownMenuLabel class="text-xs text-muted-foreground">推荐设置</DropdownMenuLabel>
                <DropdownMenuItem 
                  @click="toggleRecommendation('host')"
                  class="cursor-pointer transition-colors"
                  :class="{ 'bg-blue-500/10 hover:bg-blue-500/20': persona.is_recommended_host }"
                >
                  <Icon 
                    :name="persona.is_recommended_host ? 'ph:check-square-bold' : 'ph:square-bold'" 
                    class="mr-2 h-4 w-4 transition-colors" 
                    :class="{ 'text-blue-600': persona.is_recommended_host }"
                  />
                  <span>推荐为主持人</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  @click="toggleRecommendation('guest')"
                  class="cursor-pointer transition-colors"
                  :class="{ 'bg-green-500/10 hover:bg-green-500/20': persona.is_recommended_guest }"
                >
                  <Icon 
                    :name="persona.is_recommended_guest ? 'ph:check-square-bold' : 'ph:square-bold'" 
                    class="mr-2 h-4 w-4 transition-colors"
                    :class="{ 'text-green-600': persona.is_recommended_guest }"
                  />
                  <span>推荐为嘉宾</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator class="bg-border/30" />
                <DropdownMenuItem 
                  @click="$emit('delete', persona.persona_id)" 
                  class="cursor-pointer text-destructive hover:text-destructive-foreground hover:bg-destructive/20 transition-colors"
                >
                  <Icon name="ph:trash-bold" class="mr-2 h-4 w-4" />
                  <span>删除</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Section - 无背景，统一间距 -->
    <div class="flex-1 space-y-4 px-6">
      <!-- Description -->
      <div v-if="persona.description">
        <div class="flex items-center gap-2 mb-2">
          <Icon name="ph:info-bold" class="h-4 w-4 text-primary/70" />
          <span class="text-sm font-medium text-foreground/90">描述</span>
        </div>
        <p class="text-sm text-muted-foreground/90 leading-relaxed line-clamp-3">
          {{ persona.description }}
        </p>
      </div>

      <!-- Voice Description -->
      <div v-if="persona.voice_description">
        <div class="flex items-center gap-2 mb-2">
          <Icon name="ph:microphone-bold" class="h-4 w-4 text-primary/70" />
          <span class="text-sm font-medium text-foreground/90">语音特征</span>
        </div>
        <p class="text-sm text-muted-foreground/90 leading-relaxed line-clamp-2">
          {{ persona.voice_description }}
        </p>
      </div>

      <!-- Technical Info Grid with glassmorphism cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <!-- TTS Provider -->
        <div v-if="persona.tts_provider" class="bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 backdrop-blur-sm rounded-lg p-3 border border-border/30 shadow-sm">
          <div class="flex items-center gap-2 mb-1">
            <Icon name="ph:speaker-high-bold" class="h-4 w-4 text-primary/70" />
            <span class="text-xs font-medium text-foreground/90">TTS 提供商</span>
          </div>
          <p class="text-sm font-medium capitalize">{{ persona.tts_provider }}</p>
        </div>
        
        <!-- Languages -->
        <div v-if="persona.language_support && persona.language_support.length > 0" class="bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 backdrop-blur-sm rounded-lg p-3 border border-border/30 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="ph:translate-bold" class="h-4 w-4 text-primary/70" />
            <span class="text-xs font-medium text-foreground/90">支持语言</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <Badge 
              v-for="lang in persona.language_support.slice(0, 3)" 
              :key="lang"
              variant="outline" 
              class="text-xs px-2 py-1 bg-background/60 border-border/40 backdrop-blur-sm"
            >
              {{ formatLanguage(lang) }}
            </Badge>
            <Badge 
              v-if="persona.language_support.length > 3"
              variant="outline" 
              class="text-xs px-2 py-1 bg-background/60 border-border/40 backdrop-blur-sm text-muted-foreground"
            >
              +{{ persona.language_support.length - 3 }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Audio Preview Section -->
    <div v-if="shouldShowAudioSection" class="px-6 pt-2 pb-4">
      <div class="bg-gradient-to-br from-muted/30 via-muted/20 to-muted/10 backdrop-blur-sm rounded-lg p-3 border border-border/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Icon name="ph:waveform-bold" class="h-4 w-4 text-primary/70" />
            <span class="text-sm font-medium text-foreground/90">语音试听</span>
            <Badge v-if="previewSample" variant="outline" class="text-xs px-1.5 py-0.5 bg-background/60 border-border/40 backdrop-blur-sm">
              {{ formatDuration(previewSample.duration_ms) }}
            </Badge>
          </div>
          
          <Button
            v-if="!isLoadingAudio"
            @click="handleAudioPreview"
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
            :class="{ 'text-primary': isPlayingAudio }"
            :disabled="!hasAudioPreview"
          >
            <Icon 
              :name="isPlayingAudio ? 'ph:pause-circle-bold' : 'ph:play-circle-bold'" 
              class="h-5 w-5 transition-all duration-200" 
            />
          </Button>
          
          <div v-else class="h-8 w-8 flex items-center justify-center">
            <Icon name="ph:spinner-bold" class="h-4 w-4 animate-spin text-primary/70" />
          </div>
        </div>
        
        <!-- Audio sample info -->
        <div v-if="previewSample && !isLoadingAudio" class="mt-2 text-xs text-muted-foreground/80">
          <p class="line-clamp-2 leading-relaxed">
            "{{ previewSample.segment_text.slice(0, 100) }}{{ previewSample.segment_text.length > 100 ? '...' : '' }}"
          </p>
          <div v-if="previewSample.podcast_title" class="mt-1 flex items-center gap-1">
            <Icon name="ph:microphone-bold" class="h-3 w-3" />
            <span>来自播客：{{ previewSample.podcast_title }}</span>
          </div>
        </div>
        
        <!-- No audio message -->
        <div v-else-if="!isLoadingAudio && !hasAudioPreview" class="mt-1 text-xs text-muted-foreground/60">
          暂无语音样本
        </div>
      </div>
    </div>

    <!-- Footer Section - 无背景，只保留边框分隔 -->
    <div class="px-6 pb-6 pt-4 border-t border-border/30">
      <div class="flex justify-between items-center text-xs text-muted-foreground/80">
        <div v-if="persona.created_at" class="flex items-center gap-1">
          <Icon name="ph:calendar-plus-bold" class="h-3 w-3" />
          <span>{{ formatDate(persona.created_at) }}</span>
        </div>
        <div v-if="persona.updated_at" class="flex items-center gap-1">
          <Icon name="ph:clock-counter-clockwise-bold" class="h-3 w-3" />
          <span>{{ formatDate(persona.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Loading overlay with enhanced glassmorphism -->
    <div v-if="isUpdatingRecommendation" class="absolute inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center">
      <div class="bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-xl border border-border/50 rounded-lg p-4 shadow-2xl">
        <div class="flex items-center gap-2">
          <Icon name="ph:spinner-bold" class="h-4 w-4 animate-spin text-primary" />
          <span class="text-sm">更新推荐设置...</span>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { toast } from 'vue-sonner';
import type { ApiPersona } from '~/pages/personas/index.vue';
import { usePersonaAudioPreview } from '~/composables/usePersonaAudioPreview';

const props = defineProps<{
  persona: ApiPersona;
}>();

const emit = defineEmits<{
  edit: [personaId: number];
  delete: [personaId: number];
  'view-details': [personaId: number];
  updated: [persona: ApiPersona];
}>();

const isUpdatingRecommendation = ref(false);

// Audio preview functionality
const audioPreview = usePersonaAudioPreview();
const hasAudioPreview = computed(() => audioPreview.hasAudioSamples(props.persona.persona_id));
const isLoadingAudio = computed(() => audioPreview.isLoading(props.persona.persona_id));
const isPlayingAudio = computed(() => audioPreview.isPlaying(props.persona.persona_id));
const previewSample = computed(() => audioPreview.getPreviewSample(props.persona.persona_id));

// Show audio section if persona has voice config or if we're loading/have samples
const shouldShowAudioSection = computed(() => {
  const hasVoiceConfig = props.persona.voice_model_identifier && props.persona.tts_provider;
  return hasVoiceConfig && (hasAudioPreview.value || isLoadingAudio.value);
});

/**
 * Get initials from persona name
 */
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Format language codes to readable names
 */
const formatLanguage = (lang: string) => {
  const langMap: Record<string, string> = {
    'zh': '中文',
    'zh-CN': '中文',
    'zh-TW': '繁中',
    'en': 'English',
    'en-US': 'English',
    'en-GB': 'English (UK)',
    'ja': '日本語',
    'ja-JP': '日本語',
    'ko': '한국어',
    'ko-KR': '한국어',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский'
  };
  return langMap[lang] || lang.toUpperCase();
};

/**
 * Format date string to localized format
 */
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Get badge variant based on persona status
 */
const getStatusVariant = (status: 'active' | 'inactive' | 'deprecated') => {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'deprecated':
      return 'destructive';
    default:
      return 'secondary';
  }
};

/**
 * Get icon name based on persona status
 */
const getStatusIcon = (status: 'active' | 'inactive' | 'deprecated') => {
  switch (status) {
    case 'active':
      return 'ph:check-circle-bold';
    case 'inactive':
      return 'ph:pause-circle-bold';
    case 'deprecated':
      return 'ph:x-circle-bold';
    default:
      return 'ph:question-mark-bold';
  }
};

/**
 * Get status label based on persona status
 */
const getStatusLabel = (status: 'active' | 'inactive' | 'deprecated') => {
  switch (status) {
    case 'active':
      return '活跃';
    case 'inactive':
      return '暂停';
    case 'deprecated':
      return '弃用';
    default:
      return '未知';
  }
};

/**
 * Handle audio preview playback
 */
const handleAudioPreview = async () => {
  try {
    await audioPreview.toggleAudioPlayback(props.persona.persona_id);
  } catch (error) {
    console.error('Failed to play audio preview:', error);
    toast.error('播放语音试听失败');
  }
};

/**
 * Format duration for display
 */
const formatDuration = (durationMs?: number): string => {
  if (!durationMs) return '';
  
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
};

/**
 * Toggle recommendation setting
 */
const toggleRecommendation = async (type: 'host' | 'guest') => {
  if (isUpdatingRecommendation.value) return;

  isUpdatingRecommendation.value = true;
  
  try {
    const field = type === 'host' ? 'is_recommended_host' : 'is_recommended_guest';
    const currentValue = props.persona[field];
    const newValue = !currentValue;
    
    const updates: Partial<ApiPersona> = {
      [field]: newValue
    };
    
    // If setting as recommended and no priority exists, set default priority
    if (newValue && !props.persona.recommended_priority) {
      updates.recommended_priority = type === 'host' ? 10 : 20;
    }

    const response = await $fetch(`/api/personas/${props.persona.persona_id}`, {
      method: 'PUT',
      body: updates
    }) as ApiPersona;

    if (response) {
      emit('updated', response);
      const actionText = newValue ? '设置' : '取消';
      const roleText = type === 'host' ? '主持人' : '嘉宾';
      toast.success(`成功${actionText}推荐为${roleText}`);
    }
  } catch (error: any) {
    console.error(`Failed to toggle ${type} recommendation:`, error);
    toast.error(`更新推荐设置失败: ${error.message}`);
  } finally {
    isUpdatingRecommendation.value = false;
  }
};

/**
 * Initialize audio data when component mounts
 */
onMounted(async () => {
  // Only fetch audio samples if persona is active and has voice configuration
  if (props.persona.status === 'active' && 
      props.persona.voice_model_identifier && 
      props.persona.tts_provider) {
    try {
      await audioPreview.fetchAudioSamples(props.persona.persona_id);
    } catch (error) {
      // Silent fail - audio preview is optional
      console.debug('Failed to preload audio samples:', error);
    }
  }
});

/**
 * Cleanup when component unmounts
 */
onBeforeUnmount(() => {
  // Stop any playing audio and clear cache for this persona
  audioPreview.clearPersonaCache(props.persona.persona_id);
});
</script>