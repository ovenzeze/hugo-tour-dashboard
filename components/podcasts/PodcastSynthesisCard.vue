<!--
@description 播客合成动画展示卡片 - 集成合成进度动画和片段详细信息展示
用于替换现有的PodcastDetailDrawer组件，提供更好的合成过程可视化体验
-->

<template>
  <div class="podcast-synthesis-card w-full min-w-0">
    <!-- 卡片头部 - 播客基本信息 -->
    <Card class="mb-6 overflow-hidden">
      <div class="relative">
        <!-- 背景图片 -->
        <div 
          v-if="podcast?.cover_image_url"
          class="absolute inset-0 bg-center bg-cover"
          :style="{ backgroundImage: `url(${podcast.cover_image_url})` }"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />
        </div>
        
        <!-- 内容区域 -->
        <div class="relative z-10 p-6">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1 min-w-0 mr-4">
              <h2 class="text-2xl font-bold font-serif mb-2 truncate" 
                  :class="podcast?.cover_image_url ? 'text-white' : 'text-foreground'">
                {{ podcast?.title || 'Unknown Podcast' }}
              </h2>
              <p class="text-sm font-serif mb-3 line-clamp-2" 
                 :class="podcast?.cover_image_url ? 'text-white/80' : 'text-muted-foreground'">
                {{ podcast?.topic || 'No description available' }}
              </p>
              
              <!-- 播客统计信息 -->
              <div class="flex items-center gap-4 text-sm">
                <div class="flex items-center gap-1">
                  <Icon name="ph:list-bullets" class="w-4 h-4" 
                        :class="podcast?.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                  <span :class="podcast?.cover_image_url ? 'text-white/90' : 'text-foreground'">
                    {{ totalSegments }} segments
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <Icon name="ph:clock" class="w-4 h-4" 
                        :class="podcast?.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                  <span :class="podcast?.cover_image_url ? 'text-white/90' : 'text-foreground'">
                    {{ formatDuration(totalDuration) }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <Icon name="ph:calendar" class="w-4 h-4" 
                        :class="podcast?.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                  <span :class="podcast?.cover_image_url ? 'text-white/90' : 'text-foreground'">
                    {{ formatDate(podcast?.created_at) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 状态徽章 -->
            <div class="flex flex-col items-end gap-2">
              <Badge :variant="getStatusVariant(overallStatus)" 
                     class="font-medium">
                {{ getStatusText(overallStatus) }}
              </Badge>
              <div class="text-right">
                <div class="text-2xl font-bold" 
                     :class="podcast?.cover_image_url ? 'text-white' : 'text-primary'">
                  {{ Math.round(progressPercentage) }}%
                </div>
                <div class="text-xs" 
                     :class="podcast?.cover_image_url ? 'text-white/70' : 'text-muted-foreground'">
                  Complete
                </div>
              </div>
            </div>
          </div>
          
          <!-- 整体进度条 -->
          <div class="space-y-2">
            <div class="flex justify-between items-center text-sm">
              <span :class="podcast?.cover_image_url ? 'text-white/90' : 'text-foreground'">
                Synthesis Progress
              </span>
              <span :class="podcast?.cover_image_url ? 'text-white/70' : 'text-muted-foreground'">
                {{ synthesizedCount }} / {{ totalSegments }} segments
              </span>
            </div>
            <Progress 
              :value="progressPercentage" 
              class="h-3 bg-white/20"
              :class="podcast?.cover_image_url ? '[&>div]:bg-white' : ''"
            />
          </div>
        </div>
      </div>
    </Card>

    <!-- 合成进度动画区域 -->
    <Card v-if="isProcessing || synthesizedCount < totalSegments || currentSynthesisProgress" class="mb-6">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon 
                  :name="isProcessing ? 'ph:waveform' : 'ph:microphone'" 
                  class="w-6 h-6"
                  :class="isProcessing ? 'text-primary animate-pulse' : 'text-muted-foreground'"
                />
              </div>
              <div v-if="isProcessing" class="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
            <div>
                          <h3 class="text-lg font-semibold font-serif">
              {{ (isProcessing || currentSynthesisProgress) ? 'Synthesizing Audio...' : 'Ready to Synthesize' }}
            </h3>
              <p class="text-sm text-muted-foreground font-serif">
                <span v-if="currentSynthesisProgress">
                  Processing segment {{ (currentSynthesisProgress.currentSegment || 0) + 1 }} of {{ currentSynthesisProgress.totalSegments }}
                  ({{ currentSynthesisProgress.progress }}% complete)
                </span>
                <span v-else-if="isProcessing">
                  Processing segment {{ (currentSegment || 0) + 1 }} of {{ totalSegments }}
                </span>
                <span v-else>
                  Click to start synthesis
                </span>
              </p>
            </div>
          </div>
          
          <!-- 时间估算 -->
          <div v-if="(isProcessing || currentSynthesisProgress) && (timeEstimate || currentSynthesisProgress)" class="text-right">
            <div class="text-sm font-medium">
              <span v-if="currentSynthesisProgress">
                {{ Math.round((100 - currentSynthesisProgress.progress) / 100 * 120) }}s
              </span>
              <span v-else>{{ timeEstimate }}</span>
            </div>
            <div class="text-xs text-muted-foreground">remaining</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <!-- 主播头像时间轴 -->
        <div class="relative">
          <!-- 滚动容器 -->
          <div 
            ref="scrollContainer"
            class="flex gap-2 md:gap-3 lg:gap-4 overflow-x-auto pb-4 scroll-smooth"
            @scroll="handleScroll"
          >
            <div 
              v-for="(segment, index) in displaySegments" 
              :key="index"
              class="relative flex-shrink-0 group"
              :style="{ animationDelay: `${index * 50}ms` }"
            >
              <!-- 主播头像容器 -->
              <div 
                class="relative w-14 h-18 sm:w-16 sm:h-20 md:w-18 md:h-22 lg:w-20 lg:h-24 rounded-2xl overflow-hidden transition-all duration-500 transform hover:scale-105 flex-shrink-0"
                :class="getSegmentContainerClass(segment)"
              >
                <!-- 头像背景 -->
                <div class="absolute inset-0 bg-muted/40" />
                
                <!-- 主播头像 -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <Avatar class="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12 border-2 border-background/50">
                    <AvatarImage 
                      v-if="segment.persona?.avatar_url" 
                      :src="segment.persona.avatar_url" 
                      :alt="segment.speaker"
                    />
                    <AvatarFallback class="text-sm font-semibold bg-primary/20">
                      {{ getInitials(segment.speaker) }}
                    </AvatarFallback>
                  </Avatar>
                  
                  <!-- 如果没有匹配到persona，显示一个小图标 -->
                  <div v-if="!segment.persona" class="absolute bottom-1 right-1 w-4 h-4 bg-muted-foreground/60 rounded-full flex items-center justify-center">
                    <Icon name="ph:user" class="w-2.5 h-2.5 text-white" />
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
                        class="w-1 bg-white/80 rounded-full animate-pulse"
                        :style="{ 
                          height: `${8 + (i % 2) * 6}px`,
                          animationDelay: `${i * 0.15}s`,
                          animationDuration: '0.8s'
                        }"
                      />
                    </div>
                    
                    <!-- 处理中脉冲 -->
                    <div class="absolute inset-0 bg-primary/20 animate-pulse rounded-2xl" />
                  </div>
                  
                  <!-- 完成状态 -->
                  <div v-else-if="segment.status === 'completed'" class="absolute top-1 right-1">
                    <div class="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <Icon name="ph:check" class="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  
                  <!-- 错误状态 -->
                  <div v-else-if="segment.status === 'error'" class="absolute top-1 right-1">
                    <div class="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <Icon name="ph:x" class="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                </div>
                
                <!-- 进度条（仅处理中显示） -->
                <div v-if="segment.status === 'processing' && segment.progress" class="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-2xl overflow-hidden">
                  <div 
                    class="h-full bg-white/80 transition-all duration-300"
                    :style="{ width: `${segment.progress}%` }"
                  />
                </div>
              </div>
              
              <!-- 主播名称和状态 -->
              <div class="mt-2 text-center">
                <p class="text-xs sm:text-xs md:text-sm lg:text-sm font-medium font-serif text-foreground truncate max-w-[56px] sm:max-w-[64px] md:max-w-[72px] lg:max-w-[80px]">{{ segment.speaker }}</p>
                <p v-if="segment.status === 'processing'" class="text-xs text-primary animate-pulse">Processing</p>
                <p v-else-if="segment.status === 'completed'" class="text-xs text-green-600">Done</p>
                <p v-else-if="segment.status === 'error'" class="text-xs text-red-600">Error</p>
                <p v-else class="text-xs text-muted-foreground">Waiting</p>
              </div>
              
              <!-- 悬停提示 -->
              <div class="absolute -top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                <div class="bg-popover text-popover-foreground px-3 py-2 rounded-md text-xs whitespace-nowrap shadow-lg border max-w-48">
                  <p class="font-medium font-serif">{{ segment.speaker }}</p>
                  <p class="text-muted-foreground font-serif truncate">"{{ segment.text }}"</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 滚动指示器 -->
          <div v-if="showScrollIndicators" class="flex justify-center gap-2 mt-2">
            <Button
              v-if="canScrollLeft"
              variant="ghost"
              size="sm"
              @click="scrollLeft"
              class="h-8 w-8 p-0"
            >
              <Icon name="ph:caret-left" class="w-4 h-4" />
            </Button>
            <Button
              v-if="canScrollRight"
              variant="ghost"
              size="sm"
              @click="scrollRight"
              class="h-8 w-8 p-0"
            >
              <Icon name="ph:caret-right" class="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <!-- 当前处理信息 -->
        <div 
          v-if="currentProcessingInfo && isProcessing" 
          class="mt-6 bg-primary/5 rounded-xl p-3 md:p-4"
        >
          <div class="flex items-center gap-2 md:gap-3">
            <!-- 当前主播头像 -->
            <div class="relative flex-shrink-0">
              <Avatar class="w-12 h-12 border-2 border-primary/20">
                <AvatarImage 
                  v-if="currentProcessingInfo.persona?.avatar_url" 
                  :src="currentProcessingInfo.persona.avatar_url" 
                  :alt="currentProcessingInfo.speaker"
                />
                <AvatarFallback class="text-sm font-semibold bg-primary/10">
                  {{ getInitials(currentProcessingInfo.speaker) }}
                </AvatarFallback>
              </Avatar>
              
              <!-- 处理中指示器 -->
              <div class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse" />
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-semibold text-foreground">Currently Processing</h4>
                <Badge variant="secondary" class="text-xs">
                  {{ (currentSegment || 0) + 1 }} / {{ totalSegments }}
                </Badge>
              </div>
              
              <p class="text-sm font-medium font-serif text-foreground mb-1 truncate">{{ currentProcessingInfo.speaker }}</p>
              <p class="text-xs text-muted-foreground font-serif line-clamp-1 italic mb-2">
                "{{ currentProcessingInfo.text }}"
              </p>
              
              <!-- 处理阶段 -->
              <div v-if="currentProcessingStage" class="flex items-center gap-2">
                <Icon name="ph:gear" class="w-3 h-3 text-primary animate-spin" />
                <span class="text-xs text-primary font-medium truncate">{{ currentProcessingStage }}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 片段详细信息列表 -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold font-serif">Segment Details</h3>
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="text-xs">
              {{ synthesizedCount }} / {{ totalSegments }} Ready
            </Badge>
            <Button 
              v-if="synthesizedCount < totalSegments"
              variant="default" 
              size="sm"
              @click="handleSynthesizeAll"
              :disabled="isProcessing || !!currentSynthesisProgress"
            >
              <Icon 
                :name="(isProcessing || currentSynthesisProgress) ? 'ph:spinner' : 'ph:arrow-clockwise'" 
                class="w-4 h-4 mr-2"
                :class="(isProcessing || currentSynthesisProgress) ? 'animate-spin' : ''"
              />
              <span v-if="currentSynthesisProgress">
                Synthesizing... ({{ currentSynthesisProgress.progress }}%)
              </span>
              <span v-else-if="isProcessing">
                Synthesizing...
              </span>
              <span v-else>
                Synthesize Missing ({{ totalSegments - synthesizedCount }})
              </span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div class="space-y-2 md:space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
          <div 
            v-for="(segment, index) in allSegments" 
            :key="index"
            class="flex items-center gap-2 md:gap-4 p-3 md:p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
          >
            <!-- 段落序号和状态图标 -->
            <div class="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs md:text-sm font-medium">
                {{ index + 1 }}
              </div>
              <div 
                class="w-3 h-3 rounded-full flex-shrink-0"
                :class="{
                  'bg-gray-400': segment.status === 'waiting',
                  'bg-blue-500 animate-pulse': segment.status === 'processing',
                  'bg-green-500': segment.status === 'completed',
                  'bg-red-500': segment.status === 'error'
                }"
              />
            </div>

            <!-- 角色头像 -->
            <div class="flex-shrink-0">
              <Avatar class="w-8 h-8 md:w-10 md:h-10 border-2 border-background/50">
                <AvatarImage 
                  v-if="segment.persona?.avatar_url" 
                  :src="segment.persona.avatar_url" 
                  :alt="segment.speaker"
                />
                <AvatarFallback class="text-xs font-semibold bg-primary/10">
                  {{ getInitials(segment.speaker) }}
                </AvatarFallback>
              </Avatar>
            </div>

            <!-- 段落信息 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <p class="text-sm font-medium font-serif truncate">
                  {{ segment.speaker }}
                  <span v-if="segment.persona" class="text-muted-foreground ml-1 font-serif">
                    ({{ segment.persona.name }})
                  </span>
                </p>
                <span class="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {{ getSegmentStatusText(segment.status) }}
                </span>
              </div>
              
                              <p class="text-xs text-muted-foreground font-serif line-clamp-2 mb-2">
                  {{ segment.text }}
                </p>

              <!-- 段落进度条 -->
              <div v-if="segment.status === 'processing'" class="mb-2">
                <Progress :value="segment.progress || 50" class="h-1" />
              </div>
              
              <!-- 音频信息 -->
              <div v-if="segment.status === 'completed' && segment.audioUrl" class="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon name="ph:file-audio" class="w-3 h-3" />
                <span>Audio ready</span>
                <span v-if="segment.duration">• {{ formatDuration(segment.duration) }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- 播放按钮 -->
              <Button
                v-if="segment.status === 'completed' && segment.audioUrl"
                variant="ghost"
                size="sm"
                @click="playAudio(segment.audioUrl, index)"
                :disabled="isPlayingSegment === index"
              >
                <Icon 
                  :name="isPlayingSegment === index ? 'ph:stop' : 'ph:play'" 
                  class="w-4 h-4" 
                />
              </Button>
              
              <!-- 重新合成按钮 -->
              <Button
                v-if="segment.status === 'error'"
                variant="ghost"
                size="sm"
                @click="handleResynthesizeSegment(index)"
                :disabled="isProcessing"
              >
                <Icon name="ph:arrow-clockwise" class="w-4 h-4" />
              </Button>
              
              <!-- 下载按钮 -->
              <Button
                v-if="segment.status === 'completed' && segment.audioUrl"
                variant="ghost"
                size="sm"
                @click="downloadAudio(segment.audioUrl, segment.speaker, index)"
              >
                <Icon name="ph:download-simple" class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 操作按钮区域 -->
    <div class="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex items-center gap-2 md:gap-3">
        <Button variant="outline" @click="emit('close')">
          <Icon name="ph:x" class="w-4 h-4 mr-2" />
          Close
        </Button>
        
        <!-- 智能合成按钮 - 只合成失败或未完成的片段 -->
        <Button 
          v-if="totalSegments > synthesizedCount"
          variant="default"
          @click="handleSynthesizeAll"
          :disabled="isProcessing || !!currentSynthesisProgress"
        >
          <Icon 
            :name="(isProcessing || currentSynthesisProgress) ? 'ph:spinner' : 'ph:arrow-clockwise'" 
            class="w-4 h-4 mr-2"
            :class="(isProcessing || currentSynthesisProgress) ? 'animate-spin' : ''"
          />
          <span v-if="currentSynthesisProgress">
            Synthesizing... ({{ currentSynthesisProgress.progress }}%)
          </span>
          <span v-else-if="isProcessing">
            Synthesizing...
          </span>
          <span v-else>
            Synthesize Missing ({{ totalSegments - synthesizedCount }})
          </span>
        </Button>
        
        <Button 
          v-if="synthesizedCount > 0"
          variant="default"
          @click="handleDownloadAll"
          :disabled="audioMerger.isProcessing.value || !audioMerger.isSupported.value"
        >
          <Icon 
            :name="audioMerger.isProcessing.value ? 'ph:spinner' : 'ph:download-simple'" 
            class="w-4 h-4 mr-2"
            :class="audioMerger.isProcessing.value ? 'animate-spin' : ''"
          />
          {{ audioMerger.isProcessing.value ? 'Merging...' : 'Download All (Merge Audio)' }}
        </Button>
      </div>
      
      <div class="flex items-center gap-2 md:gap-3 flex-wrap">
        <Button 
          v-if="synthesizedCount > 0"
          variant="outline"
          @click="handlePreviewPodcast"
        >
          <Icon name="ph:play-circle" class="w-4 h-4 mr-2" />
          Preview Podcast
        </Button>
        
        <Button 
          v-if="synthesizedCount === totalSegments"
          variant="default"
          @click="handlePublishPodcast"
        >
          <Icon name="ph:share" class="w-4 h-4 mr-2" />
          Publish
        </Button>
      </div>
    </div>

    <!-- 实时合成进度显示 -->
    <div v-if="currentSynthesisProgress" class="mt-4 p-4 bg-primary/5 rounded-lg border">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Synthesis Progress</span>
          <span class="text-xs text-muted-foreground">
            {{ currentSynthesisProgress.progress }}% Complete
          </span>
        </div>
        
        <Progress :value="currentSynthesisProgress.progress" class="h-2" />
        
        <div class="text-xs text-muted-foreground">
          Processing segment {{ (currentSynthesisProgress.currentSegment || 0) + 1 }} of {{ currentSynthesisProgress.totalSegments }}
        </div>
      </div>
    </div>

    <!-- 音频合并进度显示 -->
    <div v-if="audioMerger.isProcessing.value" class="mt-4 p-4 bg-muted/50 rounded-lg">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Audio Merging Progress</span>
          <span class="text-xs text-muted-foreground">
            {{ audioMerger.currentSegmentIndex.value + 1 }} / {{ audioMerger.totalSegments.value }}
          </span>
        </div>
        
        <Progress :value="audioMerger.currentProgress.value" class="h-2" />
        
        <div class="text-xs text-muted-foreground truncate">
          {{ audioMerger.currentSegmentText.value }}
        </div>
      </div>
    </div>

    <!-- 隐藏的音频播放器 -->
    <audio ref="audioPlayer" class="hidden" @ended="handleAudioEnded" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { Database } from '~/types/supabase';
import type { Persona } from '~/types/persona';

// UI Components
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Types
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'];
type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
};
type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
};

interface SegmentProgress {
  status: 'waiting' | 'processing' | 'completed' | 'error';
  speaker: string;
  text: string;
  progress?: number;
  persona?: Persona;
  error?: string;
  audioUrl?: string | null;
  duration?: number;
}

interface Props {
  podcast: Podcast | null;
  isProcessing?: boolean;
  currentSegment?: number;
  personas?: Persona[];
  synthesisProgress?: {
    completed: number;
    total: number;
    currentSegment?: number;
    segments?: SegmentProgress[];
  };
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  personas: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'synthesize-all'): void;
  (e: 'resynthesize-segment', segmentIndex: number): void;
  (e: 'preview-podcast'): void;
  (e: 'download-all'): void;
  (e: 'publish-podcast'): void;
}>();

// Refs
const scrollContainer = ref<HTMLElement | null>(null);
const audioPlayer = ref<HTMLAudioElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const isPlayingSegment = ref<number | null>(null);

// 音频合并功能
const audioMerger = usePodcastAudioMerger();

// 合成进度跟踪
const { synthesisState } = usePodcastDatabase();

// Computed properties
const totalSegments = computed(() => {
  return props.podcast?.podcast_segments?.length || 0;
});

const allSegments = computed<SegmentProgress[]>(() => {
  if (!props.podcast?.podcast_segments) return [];
  
  return props.podcast.podcast_segments.map((segment, index) => {
    const audioUrl = getAudioUrl(segment);
    const duration = getSegmentDuration(segment);
    
    return {
      status: audioUrl ? 'completed' : 'waiting',
      speaker: segment.speaker || `Speaker ${index + 1}`,
      text: segment.text || 'No text available',
      persona: findPersonaByName(segment.speaker),
      audioUrl,
      duration,
      progress: audioUrl ? 100 : 0
    };
  });
});

const displaySegments = computed(() => {
  // 如果有合成进度数据，使用它
  if (props.synthesisProgress?.segments) {
    return props.synthesisProgress.segments.slice(0, 30);
  }
  
  // 否则使用现有片段数据
  return allSegments.value.slice(0, 30);
});

const synthesizedCount = computed(() => {
  return allSegments.value.filter(s => s.status === 'completed').length;
});

const progressPercentage = computed(() => {
  if (totalSegments.value === 0) return 0;
  return (synthesizedCount.value / totalSegments.value) * 100;
});

const overallStatus = computed(() => {
  // 检查是否正在合成当前播客
  const isCurrentPodcastSynthesizing = synthesisState.value.isProcessing && 
    synthesisState.value.podcastId === props.podcast?.podcast_id;
    
  if (props.isProcessing || isCurrentPodcastSynthesizing) return 'processing';
  if (synthesizedCount.value === totalSegments.value) return 'completed';
  if (synthesizedCount.value > 0) return 'partial';
  return 'pending';
});

// 当前播客的合成进度
const currentSynthesisProgress = computed(() => {
  const isCurrentPodcast = synthesisState.value.podcastId === props.podcast?.podcast_id;
  if (!isCurrentPodcast || !synthesisState.value.isProcessing) {
    return null;
  }
  
  return {
    progress: synthesisState.value.progress,
    currentSegment: synthesisState.value.currentSegment,
    totalSegments: synthesisState.value.totalSegments
  };
});

const totalDuration = computed(() => {
  return allSegments.value.reduce((total, segment) => {
    return total + (segment.duration || 0);
  }, 0);
});

const currentProcessingInfo = computed(() => {
  if (!props.isProcessing || props.currentSegment === undefined) {
    return null;
  }
  
  const segment = allSegments.value[props.currentSegment];
  return segment ? {
    index: props.currentSegment,
    speaker: segment.speaker,
    text: segment.text,
    persona: segment.persona
  } : null;
});

const timeEstimate = computed(() => {
  if (!props.isProcessing) return null;
  
  const remaining = totalSegments.value - synthesizedCount.value;
  if (remaining <= 0) return null;
  
  const estimatedSeconds = remaining * 12; // 每段约12秒
  
  if (estimatedSeconds < 60) {
    return `~${estimatedSeconds}s`;
  } else {
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes}m`;
  }
});

const currentProcessingStage = computed(() => {
  if (!props.isProcessing || !currentProcessingInfo.value) return null;
  
  const stages = [
    'Analyzing text content',
    'Generating voice audio', 
    'Processing audio quality',
    'Optimizing output',
    'Finalizing segment'
  ];
  
  const currentIndex = currentProcessingInfo.value.index || 0;
  const stageIndex = currentIndex % stages.length;
  return stages[stageIndex];
});

const showScrollIndicators = computed(() => {
  return displaySegments.value.length > 15;
});

// Methods
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function findPersonaByName(speakerName?: string | null): Persona | undefined {
  if (!speakerName) return undefined;
  return props.personas?.find(p => p.name === speakerName);
}

function getSegmentContainerClass(segment: SegmentProgress): string {
  const baseClass = 'transition-all duration-500';
  
  switch (segment.status) {
    case 'processing':
      return `${baseClass} bg-primary/10 scale-105`;
    case 'completed':
      return `${baseClass} bg-green-50/50 dark:bg-green-950/20`;
    case 'error':
      return `${baseClass} bg-red-50/50 dark:bg-red-950/20`;
    default:
      return `${baseClass} bg-muted/20 hover:bg-muted/30`;
  }
}

function getAudioUrl(segment: Segment): string | null {
  if (!segment.segment_audios || segment.segment_audios.length === 0) {
    return null;
  }
  
  // 优先获取final版本
  const finalAudio = segment.segment_audios.find(audio => 
    audio.version_tag === 'final' && audio.audio_url
  );
  if (finalAudio) {
    return finalAudio.audio_url;
  }
  
  // 回退到任何可用的音频URL
  const anyPlayableAudio = segment.segment_audios.find(audio => audio.audio_url);
  return anyPlayableAudio?.audio_url || null;
}

function getSegmentDuration(segment: Segment): number {
  if (!segment.segment_audios || segment.segment_audios.length === 0) {
    return 0;
  }
  
  // segment_audios表目前没有duration_ms字段，返回默认值
  // TODO: 如果需要duration，可以从音频文件元数据获取或添加到数据库
  return 0;
}

function formatDuration(durationMs: number): string {
  if (!durationMs) return '0:00';
  
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getStatusText(status: string): string {
  const statusMap = {
    pending: 'Pending',
    processing: 'Processing',
    partial: 'In Progress',
    completed: 'Completed',
    error: 'Error'
  };
  return statusMap[status as keyof typeof statusMap] || 'Unknown';
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap = {
    pending: 'secondary' as const,
    processing: 'default' as const,
    partial: 'outline' as const,
    completed: 'outline' as const,
    error: 'destructive' as const
  };
  return variantMap[status as keyof typeof variantMap] || 'secondary';
}

function getSegmentStatusText(status: string): string {
  const statusMap = {
    waiting: 'Waiting',
    processing: 'Processing',
    completed: 'Ready',
    error: 'Error'
  };
  return statusMap[status as keyof typeof statusMap] || 'Unknown';
}

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
    container.scrollLeft -= container.clientWidth / 2;
  }
}

function scrollRight() {
  if (scrollContainer.value) {
    const container = scrollContainer.value;
    container.scrollLeft += container.clientWidth / 2;
  }
}

function playAudio(audioUrl: string, segmentIndex: number) {
  if (!audioPlayer.value) return;
  
  // 如果当前正在播放同一个片段，停止播放
  if (isPlayingSegment.value === segmentIndex) {
    audioPlayer.value.pause();
    isPlayingSegment.value = null;
    return;
  }
  
  // 播放新的音频
  audioPlayer.value.src = audioUrl;
  audioPlayer.value.play();
  isPlayingSegment.value = segmentIndex;
}

function handleAudioEnded() {
  isPlayingSegment.value = null;
}

function downloadAudio(audioUrl: string, speaker: string, index: number) {
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = `segment_${index + 1}_${speaker}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleSynthesizeAll() {
  emit('synthesize-all');
}

function handleResynthesizeSegment(segmentIndex: number) {
  if (!props.podcast?.podcast_segments || !props.podcast.podcast_segments[segmentIndex]) {
    console.error('Invalid segment index:', segmentIndex);
    return;
  }
  
  const segment = props.podcast.podcast_segments[segmentIndex];
  const segmentId = segment.segment_text_id;
  
  if (!segmentId) {
    console.error('Segment missing segment_text_id');
    return;
  }
  
  // 直接调用数据库函数
  const { resynthesizeSegment } = usePodcastDatabase();
  resynthesizeSegment(segmentId, props.podcast?.podcast_id);
}

function handlePreviewPodcast() {
  emit('preview-podcast');
}

async function handleDownloadAll() {
  if (!props.podcast) return;
  
  // 使用音频合并功能下载
  await audioMerger.mergePodcastAudio(props.podcast);
}

function handlePublishPodcast() {
  emit('publish-podcast');
}

// Lifecycle
onMounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查
  }
});

onBeforeUnmount(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll);
  }
  
  if (audioPlayer.value) {
    audioPlayer.value.pause();
  }
});

// Watch for scroll container changes
watch(() => displaySegments.value.length, () => {
  if (scrollContainer.value) {
    handleScroll();
  }
});
</script>

<style scoped>
/* 音频波形动画 */
@keyframes audioWave {
  0%, 100% { 
    height: 8px; 
    opacity: 0.6; 
  }
  50% { 
    height: 14px; 
    opacity: 1; 
  }
}

/* 段落显示动画 */
.podcast-synthesis-card > * {
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

/* 滚动条样式 */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

/* 平滑滚动 */
.scroll-smooth {
  scroll-behavior: smooth;
}
</style> 