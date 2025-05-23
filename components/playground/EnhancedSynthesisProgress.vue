<!--
@description 增强版音频合成进度展示组件 - 使用主播头像，优化大屏小屏适配
-->

<template>
  <div class="synthesis-progress-wrapper w-full max-w-6xl mx-auto p-4 md:p-6">
    <!-- 主要进度区域 - 简化设计 -->
    <div class="bg-muted/20 rounded-3xl p-4 md:p-6 backdrop-blur-sm">
      
      <!-- 紧凑型顶部状态栏 -->
      <div class="flex items-center justify-between gap-3 mb-4 md:mb-6">
        <!-- 左侧状态信息 -->
        <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <div class="relative flex-shrink-0">
            <div class="w-8 h-8 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon 
                :name="isProcessing ? 'ph:waveform' : progressPercentage === 100 ? 'ph:check-circle' : 'ph:microphone'" 
                class="w-4 h-4 md:w-6 md:h-6"
                :class="isProcessing ? 'text-primary animate-pulse' : progressPercentage === 100 ? 'text-green-500' : 'text-muted-foreground'"
              />
            </div>
            <!-- 处理中的脉冲效果 -->
            <div v-if="isProcessing" class="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
          </div>
          
          <div class="flex-1 min-w-0">
            <h2 class="text-base md:text-lg font-bold text-foreground truncate">{{ statusText }}</h2>
            <p class="text-xs md:text-sm text-muted-foreground">
              {{ progressData.completed }}/{{ progressData.total }} segments
            </p>
          </div>
        </div>
        
        <!-- 右侧进度信息 -->
        <div class="text-center flex-shrink-0">
          <div class="text-xl md:text-2xl font-bold text-primary">{{ progressPercentage }}%</div>
          <div v-if="timeEstimate" class="text-xs text-muted-foreground">{{ timeEstimate }}</div>
        </div>
      </div>
      
      <!-- 紧凑型进度条 -->
      <div class="mb-4 md:mb-6">
        <div class="w-full bg-muted/50 rounded-full h-2 md:h-3 overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000 ease-out relative"
            :style="{ width: `${progressPercentage}%` }"
          >
            <!-- 进度条光效 -->
            <div v-if="isProcessing" class="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>
      
      <!-- 主播头像进度网格 - 单行滚动布局 -->
      <div class="space-y-3 md:space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm md:text-base font-semibold text-foreground">Speakers</h3>
          <Badge variant="outline" class="text-xs">
            {{ progressData.completed }}/{{ progressData.total }}
          </Badge>
        </div>
        
        <!-- 单行滚动容器 -->
        <div class="relative">
          <!-- 左侧渐变遮罩 -->
          <div 
            v-if="showScrollIndicators && canScrollLeft" 
            class="absolute left-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none rounded-l-2xl"
          />
          
          <!-- 右侧渐变遮罩 -->
          <div 
            v-if="showScrollIndicators && canScrollRight" 
            class="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none rounded-r-2xl"
          />
          
          <!-- 头像滚动区域 -->
          <div 
            ref="scrollContainer"
            class="flex overflow-x-auto gap-3 md:gap-4 py-2 px-1 scrollbar-hide scroll-smooth"
            @scroll="handleScroll"
            style="scrollbar-width: none; -ms-overflow-style: none;"
          >
            <div 
              v-for="(segment, index) in allDisplaySegments" 
              :key="index"
              class="relative group flex-shrink-0"
              :style="{ animationDelay: `${index * 50}ms` }"
            >
              <!-- 主播头像容器 - 单行优化 -->
              <div 
                class="relative rounded-xl md:rounded-2xl overflow-hidden transition-all duration-500 transform hover:scale-105"
                :class="[getSegmentContainerClass(segment), getAvatarSizeClass()]"
              >
                <!-- 头像背景 -->
                <div class="absolute inset-0 bg-muted/40" />
                
                <!-- 主播头像 -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <Avatar :class="getAvatarClass()">
                    <AvatarImage 
                      v-if="segment.persona?.avatar_url" 
                      :src="segment.persona.avatar_url" 
                      :alt="segment.speaker"
                    />
                    <AvatarFallback :class="[
                      'text-xs md:text-sm font-semibold',
                      segment.persona ? 'bg-primary/20' : 'bg-muted/40'
                    ]">
                      {{ getInitials(segment.speaker) }}
                    </AvatarFallback>
                  </Avatar>
                  
                  <!-- 如果没有匹配到persona，显示一个小图标 -->
                  <div v-if="!segment.persona" class="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-muted-foreground/60 rounded-full flex items-center justify-center">
                    <Icon name="ph:user" class="w-2 h-2 md:w-2.5 md:h-2.5 text-white" />
                  </div>
                </div>
                
                <!-- 状态覆盖层 -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <!-- 处理中动画 -->
                  <div v-if="segment.status === 'processing'" class="absolute inset-0">
                    <!-- 音频波形动画 -->
                    <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      <div 
                        v-for="i in 4" 
                        :key="i"
                        class="w-0.5 md:w-1 bg-white/80 rounded-full animate-pulse"
                        :style="{ 
                          height: `${6 + (i % 2) * 4}px`,
                          animationDelay: `${i * 0.15}s`,
                          animationDuration: '0.8s'
                        }"
                      />
                    </div>
                    
                    <!-- 处理中脉冲 -->
                    <div class="absolute inset-0 bg-primary/20 animate-pulse rounded-xl md:rounded-2xl" />
                  </div>
                  
                  <!-- 完成状态 -->
                  <div v-else-if="segment.status === 'completed'" class="absolute top-1 right-1">
                    <div class="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <Icon name="ph:check" class="w-2 h-2 md:w-2.5 md:h-2.5 text-white" />
                    </div>
                  </div>
                  
                  <!-- 错误状态 -->
                  <div v-else-if="segment.status === 'error'" class="absolute top-1 right-1">
                    <div class="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <Icon name="ph:x" class="w-2 h-2 md:w-2.5 md:h-2.5 text-white" />
                    </div>
                  </div>
                </div>
                
                <!-- 进度条（仅处理中显示） -->
                <div v-if="segment.status === 'processing' && segment.progress" class="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-xl md:rounded-b-2xl overflow-hidden">
                  <div 
                    class="h-full bg-white/80 transition-all duration-300"
                    :style="{ width: `${segment.progress}%` }"
                  />
                </div>
              </div>
              
              <!-- 主播名称 -->
              <div class="mt-2 text-center">
                <p class="text-xs md:text-sm font-medium text-foreground truncate max-w-[60px] md:max-w-[80px]">{{ segment.speaker }}</p>
                <p v-if="segment.status === 'processing'" class="text-xs text-primary animate-pulse">Processing</p>
                <p v-else-if="segment.status === 'completed'" class="text-xs text-green-600">Done</p>
                <p v-else-if="segment.status === 'error'" class="text-xs text-red-600">Error</p>
                <p v-else class="text-xs text-muted-foreground">Waiting</p>
              </div>
              
              <!-- 悬停提示 -->
              <div class="absolute -top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                <div class="bg-popover text-popover-foreground px-2 py-1 rounded-md text-xs whitespace-nowrap shadow-lg border">
                  <p class="font-medium">{{ segment.speaker }}</p>
                  <p class="text-muted-foreground truncate max-w-32">"{{ segment.text }}"</p>
                </div>
              </div>
            </div>
            
            <!-- 更多指示器 -->
            <div 
              v-if="hasHiddenSegments"
              class="relative flex-shrink-0 rounded-xl md:rounded-2xl bg-muted/30 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center transition-all duration-300 hover:bg-muted/50"
              :class="getAvatarSizeClass()"
            >
              <div class="text-center">
                <Icon name="ph:dots-three" class="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mx-auto mb-1" />
                <p class="text-xs text-muted-foreground">+{{ hiddenSegmentsCount }}</p>
              </div>
            </div>
          </div>
          
          <!-- 滚动控制按钮（桌面端） -->
          <div v-if="showScrollIndicators && !isMobile" class="hidden md:flex absolute top-1/2 -translate-y-1/2 left-2 right-2 justify-between pointer-events-none">
            <Button
              v-if="canScrollLeft"
              variant="ghost"
              size="sm"
              @click="scrollLeft"
              class="pointer-events-auto w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90"
            >
              <Icon name="ph:caret-left" class="w-4 h-4" />
            </Button>
            <div v-else class="w-8" />
            
            <Button
              v-if="canScrollRight"
              variant="ghost"
              size="sm"
              @click="scrollRight"
              class="pointer-events-auto w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90"
            >
              <Icon name="ph:caret-right" class="w-4 h-4" />
            </Button>
            <div v-else class="w-8" />
          </div>
        </div>
        
        <!-- 滚动提示（移动端） -->
        <div v-if="isMobile && hasHiddenSegments" class="text-center">
          <p class="text-xs text-muted-foreground">← Swipe to see more speakers →</p>
        </div>
      </div>
      
      <!-- 当前处理信息 - 紧凑设计 -->
      <div 
        v-if="currentSegmentInfo && isProcessing" 
        class="mt-4 md:mt-6 bg-primary/5 rounded-xl p-3 md:p-4"
      >
        <div class="flex items-center gap-3">
          <!-- 当前主播头像 -->
          <div class="relative flex-shrink-0">
            <Avatar class="w-10 h-10 md:w-12 md:h-12 border-2 border-primary/20">
              <AvatarImage 
                v-if="currentSegmentInfo.persona?.avatar_url" 
                :src="currentSegmentInfo.persona.avatar_url" 
                :alt="currentSegmentInfo.speaker"
              />
              <AvatarFallback class="text-xs md:text-sm font-semibold bg-primary/10">
                {{ getInitials(currentSegmentInfo.speaker) }}
              </AvatarFallback>
            </Avatar>
            
            <!-- 处理中指示器 -->
            <div class="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-primary rounded-full animate-pulse" />
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <h4 class="text-xs md:text-sm font-semibold text-foreground">Processing</h4>
              <Badge variant="secondary" class="text-xs">
                {{ (currentSegmentInfo.index || 0) + 1 }}/{{ progressData.total }}
              </Badge>
            </div>
            
            <p class="text-xs md:text-sm font-medium text-foreground mb-1 truncate">{{ currentSegmentInfo.speaker }}</p>
            <p class="text-xs text-muted-foreground line-clamp-1 italic mb-2">
              "{{ currentSegmentInfo.text }}"
            </p>
            
            <!-- 处理阶段 -->
            <div v-if="currentProcessingStage" class="flex items-center gap-2">
              <Icon name="ph:gear" class="w-3 h-3 text-primary animate-spin" />
              <span class="text-xs text-primary font-medium truncate">{{ currentProcessingStage }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 统计信息 -->
      <div v-if="isProcessing || progressPercentage === 100" class="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-3 md:p-4 bg-muted/20 rounded-xl">
          <Icon name="ph:clock" class="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mx-auto mb-1" />
          <p class="text-xs md:text-sm text-muted-foreground">Time</p>
          <p class="text-sm md:text-base font-semibold">{{ timeEstimate || 'Calculating...' }}</p>
        </div>
        
        <div class="text-center p-3 md:p-4 bg-muted/20 rounded-xl">
          <Icon name="ph:gauge" class="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mx-auto mb-1" />
          <p class="text-xs md:text-sm text-muted-foreground">Speed</p>
          <p class="text-sm md:text-base font-semibold">{{ processingSpeed || 'N/A' }}</p>
        </div>
        
        <div class="text-center p-3 md:p-4 bg-muted/20 rounded-xl">
          <Icon name="ph:users" class="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mx-auto mb-1" />
          <p class="text-xs md:text-sm text-muted-foreground">Speakers</p>
          <p class="text-sm md:text-base font-semibold">{{ uniqueSpeakersCount }}</p>
        </div>
        
        <div class="text-center p-3 md:p-4 bg-muted/20 rounded-xl">
          <Icon name="ph:waveform" class="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mx-auto mb-1" />
          <p class="text-xs md:text-sm text-muted-foreground">Quality</p>
          <p class="text-sm md:text-base font-semibold">HD Audio</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Persona {
  id: number;
  name: string;
  avatar_url?: string | null;
}

interface SegmentProgress {
  status: 'waiting' | 'processing' | 'completed' | 'error';
  speaker: string;
  text: string;
  progress?: number;
  persona?: Persona;
  error?: string;
}

interface ProgressData {
  completed: number;
  total: number;
  currentSegment?: number;
  segments?: SegmentProgress[];
}

interface Props {
  isProcessing: boolean;
  progressData: ProgressData;
  statusOverride?: string;
  showTimeEstimate?: boolean;
  personas?: Persona[];
  showScrollIndicators?: boolean;
  isMobile?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showTimeEstimate: true,
  personas: () => [],
  showScrollIndicators: true,
  isMobile: false
});

// 响应式显示的最大段数
const maxDisplaySegments = computed(() => {
  if (typeof window === 'undefined') return 20;
  const width = window.innerWidth;
  if (width < 640) return 12; // 小屏
  if (width < 1024) return 18; // 中屏
  return 30; // 大屏
});

// 计算属性
const progressPercentage = computed(() => {
  if (props.progressData.total === 0) return 0;
  return Math.round((props.progressData.completed / props.progressData.total) * 100);
});

const statusText = computed(() => {
  if (props.statusOverride) return props.statusOverride;
  
  if (!props.isProcessing) {
    if (progressPercentage.value === 100) {
      return 'Synthesis Complete!';
    }
    return 'Ready to Synthesize';
  }
  
  if (progressPercentage.value === 0) {
    return 'Initializing Audio Synthesis...';
  } else if (progressPercentage.value < 50) {
    return 'Synthesizing Audio...';
  } else if (progressPercentage.value < 90) {
    return 'Processing Audio Segments...';
  } else {
    return 'Finalizing Audio...';
  }
});

// 获取要显示的段落（包含persona信息）
const displaySegments = computed(() => {
  const segments: SegmentProgress[] = [];
  const total = Math.min(props.progressData.total, maxDisplaySegments.value);
  const completed = props.progressData.completed;
  const currentSegment = props.progressData.currentSegment;
  
  // 如果有segments数据，使用它
  if (props.progressData.segments && props.progressData.segments.length > 0) {
    return props.progressData.segments.slice(0, maxDisplaySegments.value).map(segment => ({
      ...segment,
      // 优先使用已有的persona，否则通过ID查找
      persona: segment.persona || findPersonaByName(segment.speaker)
    }));
  }
  
  // 否则创建占位符段落
  for (let i = 0; i < total; i++) {
    let status: SegmentProgress['status'] = 'waiting';
    
    if (i < completed) {
      status = 'completed';
    } else if (i === currentSegment && props.isProcessing) {
      status = 'processing';
    }
    
    const speakerName = `Speaker ${i + 1}`;
    segments.push({
      status,
      speaker: speakerName,
      text: `Segment ${i + 1} content`,
      persona: findPersonaByName(speakerName)
    });
  }
  
  return segments;
});

const currentSegmentInfo = computed(() => {
  if (!props.isProcessing || props.progressData.currentSegment === undefined) {
    return null;
  }
  
  const currentIndex = props.progressData.currentSegment;
  const segments = displaySegments.value;
  
  if (currentIndex >= 0 && currentIndex < segments.length) {
    return {
      index: currentIndex,
      speaker: segments[currentIndex].speaker,
      text: segments[currentIndex].text,
      persona: segments[currentIndex].persona
    };
  }
  
  return null;
});

const timeEstimate = computed(() => {
  if (!props.showTimeEstimate || !props.isProcessing) return null;
  
  const remaining = props.progressData.total - props.progressData.completed;
  if (remaining <= 0) return null;
  
  const estimatedSeconds = remaining * 12; // 每段约12秒
  
  if (estimatedSeconds < 60) {
    return `~${estimatedSeconds}s`;
  } else {
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes}m`;
  }
});

const processingSpeed = computed(() => {
  if (!props.isProcessing || props.progressData.completed === 0) return null;
  return '4.2/min'; // 示例处理速度
});

const currentProcessingStage = computed(() => {
  if (!props.isProcessing || !currentSegmentInfo.value) return null;
  
  const stages = [
    'Analyzing text content',
    'Generating voice audio', 
    'Processing audio quality',
    'Optimizing output',
    'Finalizing segment'
  ];
  
  const currentIndex = currentSegmentInfo.value.index || 0;
  const stageIndex = currentIndex % stages.length;
  return stages[stageIndex];
});

const uniqueSpeakersCount = computed(() => {
  const speakers = new Set(displaySegments.value.map(s => s.speaker));
  return speakers.size;
});

// 辅助函数
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function findPersonaByName(speakerName: string): Persona | undefined {
  return props.personas?.find(p => p.name === speakerName);
}

function getSegmentContainerClass(segment: SegmentProgress): string {
  const baseClass = 'transition-all duration-500 transform hover:scale-105';
  
  switch (segment.status) {
    case 'processing':
      return `${baseClass} bg-primary/10 scale-105 animate-pulse`;
    case 'completed':
      return `${baseClass} bg-green-50/50 dark:bg-green-950/20`;
    case 'error':
      return `${baseClass} bg-red-50/50 dark:bg-red-950/20`;
    default:
      return `${baseClass} bg-muted/20 hover:bg-muted/30`;
  }
}

const scrollContainer = ref(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const hasHiddenSegments = ref(false);
const hiddenSegmentsCount = ref(0);

function handleScroll() {
  if (scrollContainer.value) {
    const container = scrollContainer.value;
    canScrollLeft.value = container.scrollLeft > 0;
    canScrollRight.value = container.scrollLeft < container.scrollWidth - container.clientWidth;
  }
}

function scrollLeft() {
  if (scrollContainer.value) {
    const container = scrollContainer.value;
    container.scrollLeft -= container.clientWidth;
  }
}

function scrollRight() {
  if (scrollContainer.value) {
    const container = scrollContainer.value;
    container.scrollLeft += container.clientWidth;
  }
}

const allDisplaySegments = computed(() => {
  const segments = displaySegments.value;
  const total = Math.min(segments.length, maxDisplaySegments.value);
  const hiddenSegments = segments.slice(total);
  
  hasHiddenSegments.value = hiddenSegments.length > 0;
  hiddenSegmentsCount.value = hiddenSegments.length;
  
  return segments.slice(0, total);
});

const getAvatarSizeClass = () => {
  // 单行布局的紧凑尺寸
  return 'w-16 h-20 md:w-20 md:h-24';
};

const getAvatarClass = () => {
  // 头像本身的尺寸
  return 'w-10 h-10 md:w-12 md:h-12 border-2 border-background/50';
};
</script>

<style scoped>
.synthesis-progress-wrapper {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 音频波形动画 */
@keyframes audioWave {
  0%, 100% { 
    height: 6px; 
    opacity: 0.6; 
  }
  50% { 
    height: 12px; 
    opacity: 1; 
  }
}

/* 段落显示动画 */
.grid > div {
  animation: segmentReveal 0.5s ease-out forwards;
}

@keyframes segmentReveal {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 响应式优化 */
@media (max-width: 640px) {
  .synthesis-progress-wrapper {
    padding: 1rem;
  }
}

/* 文本截断 */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 