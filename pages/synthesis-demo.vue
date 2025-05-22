<template>
  <div class="container mx-auto p-4 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6 text-center">实时音频合成演示</h1>
    
    <Card class="mb-6">
      <CardHeader>
        <CardTitle>合成控制</CardTitle>
        <CardDescription>
          点击下方按钮开始模拟音频合成过程，查看实时动画和进度更新效果
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex gap-4">
          <Button
            @click="startDemoSynthesis"
            :disabled="isProcessing"
            variant="default"
            class="flex-1"
          >
            <Icon v-if="isProcessing" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
            <Icon v-else name="ph:play-fill" class="w-4 h-4 mr-2" />
            {{ isProcessing ? '正在合成...' : '开始演示合成' }}
          </Button>
          
          <Button
            @click="resetDemo"
            variant="outline"
            :disabled="isProcessing"
          >
            <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
            重置演示
          </Button>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-medium">总进度:</span>
            <span class="ml-2">{{ progressData.completed }} / {{ progressData.total }}</span>
          </div>
          <div>
            <span class="font-medium">当前片段:</span>
            <span class="ml-2">{{ progressData.currentSegment !== undefined ? progressData.currentSegment + 1 : '-' }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 片段列表 -->
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">音频片段</h2>
      
      <div 
        v-for="(segment, index) in demoSegments" 
        :key="index"
        class="mb-3 transition-all duration-500 ease-in-out bg-transparent hover:bg-muted/30 relative overflow-hidden"
        :class="{
          'border-primary/30 shadow-md': segment.status === 'processing',
          'border-green-200 bg-green-50/30 dark:bg-green-950/20': segment.status === 'completed',
          'border-destructive/30 bg-destructive/5': segment.status === 'error'
        }"
      >
        <Card>
          <!-- Wave animation overlay for loading state -->
          <div
            v-if="segment.status === 'processing'"
            class="absolute inset-0 z-10 pointer-events-none overflow-hidden"
          >
            <div class="wave-animation absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10"></div>
            <div class="wave-bars absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 h-2 pb-1">
              <div v-for="i in 8" :key="i" class="wave-bar bg-primary/40 w-1 rounded-t" :style="{ animationDelay: `${i * 0.1}s` }"></div>
            </div>
          </div>

          <!-- Processing progress indicator -->
          <div
            v-if="segment.status === 'processing'"
            class="absolute top-2 right-2 z-20 bg-primary/10 backdrop-blur-sm rounded-full p-2"
          >
            <Icon name="ph:spinner-gap" class="w-4 h-4 animate-spin text-primary" />
          </div>

          <!-- Success indicator -->
          <div
            v-else-if="segment.status === 'completed'"
            class="absolute top-2 right-2 z-20 bg-green-100 dark:bg-green-950/40 rounded-full p-2"
          >
            <Icon name="ph:check-circle-fill" class="w-4 h-4 text-green-600" />
          </div>

          <CardContent class="p-4">
            <div class="flex flex-col sm:flex-row gap-4 items-start">
              <!-- Speaker Info -->
              <div class="flex-shrink-0 flex flex-col items-center w-full sm:w-auto sm:min-w-[8rem] text-center">
                <Avatar class="w-16 h-16 mb-2 border-2" :class="{'border-primary': segment.status === 'processing'}">
                  <AvatarFallback>{{ segment.speaker.substring(0, 2).toUpperCase() }}</AvatarFallback>
                </Avatar>
                <div class="space-y-1">
                  <p class="font-semibold text-sm text-foreground">{{ segment.speaker }}</p>
                  <Badge variant="outline" class="text-xs">演示角色</Badge>
                </div>
              </div>

              <!-- Main Content -->
              <div class="flex-grow space-y-3 w-full">
                <!-- Segment Text -->
                <div>
                  <p class="text-sm text-foreground leading-relaxed">{{ segment.text }}</p>
                </div>

                <!-- Controls and Status -->
                <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-dashed">
                  <div class="flex items-center gap-2">
                    <!-- Main action button -->
                    <Button
                      @click="playAudio(index)"
                      :disabled="segment.status !== 'completed'"
                      size="sm"
                      :variant="segment.status === 'completed' ? 'default' : 'ghost'"
                      class="hover:bg-primary/10 transition-all duration-300"
                      :class="{
                        'bg-primary/10 border-primary/20': segment.status === 'processing',
                        'bg-green-50 border-green-200 hover:bg-green-100 text-green-700': segment.status === 'completed',
                      }"
                    >
                      <Icon
                        v-if="segment.status === 'processing'"
                        name="ph:spinner-gap"
                        class="w-4 h-4 mr-2 animate-spin text-primary"
                      />
                      <Icon
                        v-else-if="segment.status === 'completed'"
                        name="ph:play-fill"
                        class="w-4 h-4 mr-2 text-green-600"
                      />
                      <Icon
                        v-else
                        name="ph:speaker-high-fill"
                        class="w-4 h-4 mr-2 text-muted-foreground"
                      />
                      
                      <span v-if="segment.status === 'processing'">合成中...</span>
                      <span v-else-if="segment.status === 'completed'">试听音频</span>
                      <span v-else>等待合成</span>
                    </Button>
                    
                    <!-- Progress indicator for synthesis -->
                    <div v-if="segment.status === 'processing'" class="flex flex-col gap-2 min-w-0">
                      <!-- Progress text with stage info -->
                      <div class="flex items-center gap-2 text-xs text-muted-foreground">
                        <div class="flex gap-0.5">
                          <div v-for="i in 3" :key="i" class="w-1 h-1 bg-primary rounded-full animate-bounce" :style="{ animationDelay: `${i * 0.2}s` }"></div>
                        </div>
                        <span class="truncate">{{ segment.stage || '正在处理音频...' }}</span>
                      </div>
                      
                      <!-- Progress bar -->
                      <div v-if="segment.progress > 0" class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div 
                          class="h-full bg-primary transition-all duration-300 ease-out"
                          :style="{ width: `${Math.min(100, Math.max(0, segment.progress))}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div v-if="segment.status === 'completed'" class="text-xs text-muted-foreground text-right">
                    音频已准备就绪
                  </div>
                  <div v-else-if="segment.status === 'error'" class="text-xs text-destructive text-right">
                    合成失败
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'vue-sonner';

definePageMeta({
  title: '实时音频合成演示'
});

const isProcessing = ref(false);
const demoInterval = ref<NodeJS.Timeout | null>(null);

const progressData = reactive({
  completed: 0,
  total: 8,
  currentSegment: undefined as number | undefined,
});

const demoSegments = reactive([
  { 
    status: 'waiting' as const, 
    speaker: 'Dr. Smith', 
    text: '欢迎收听我们关于人工智能及其对现代社会影响的播客。',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Sarah Chen', 
    text: '感谢邀请，Dr. Smith。我很兴奋能讨论这个引人入胜的话题。',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Dr. Smith', 
    text: '让我们从基础开始。什么是人工智能？',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Sarah Chen', 
    text: '人工智能指的是能够执行通常需要人类智能的任务的计算机系统。',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Dr. Smith', 
    text: '很好的定义。你能给我们举一些日常生活中AI的例子吗？',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Sarah Chen', 
    text: '当然！我们在推荐系统、语音助手和自动驾驶汽车中都能看到AI。',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Dr. Smith', 
    text: '当今AI发展面临的最大挑战是什么？',
    progress: 0,
    stage: '等待中'
  },
  { 
    status: 'waiting' as const, 
    speaker: 'Sarah Chen', 
    text: '主要挑战包括数据隐私、算法偏见，以及确保AI系统保持可控和有益。',
    progress: 0,
    stage: '等待中'
  }
]);

const synthesisStages = [
  '准备合成请求...',
  '发送到TTS服务...',
  '处理服务器响应...',
  '加载音频文件...',
  '音频准备就绪'
];

async function startDemoSynthesis() {
  if (isProcessing.value) return;
  
  isProcessing.value = true;
  progressData.completed = 0;
  progressData.currentSegment = 0;
  
  // 重置所有片段状态
  demoSegments.forEach(segment => {
    segment.status = 'waiting';
    segment.progress = 0;
    segment.stage = '等待中';
  });
  
  toast.info('开始演示音频合成过程');
  
  // 逐个处理每个片段
  for (let i = 0; i < demoSegments.length; i++) {
    progressData.currentSegment = i;
    const segment = demoSegments[i];
    
    // 标记当前片段为处理中
    segment.status = 'processing';
    segment.progress = 0;
    
    // 模拟合成过程的各个阶段
    for (let stage = 0; stage < synthesisStages.length; stage++) {
      segment.stage = synthesisStages[stage];
      segment.progress = (stage + 1) * 20; // 每个阶段20%进度
      
      // 等待一段时间以模拟处理
      await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 400));
      
      if (!isProcessing.value) return; // 如果被取消，退出
    }
    
    // 完成当前片段
    segment.status = 'completed';
    segment.progress = 100;
    segment.stage = '音频准备就绪';
    progressData.completed = i + 1;
    
    toast.success(`片段 ${i + 1} 合成完成`);
    
    // 短暂延迟再处理下一个片段
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  isProcessing.value = false;
  progressData.currentSegment = undefined;
  toast.success('所有音频片段合成完成！');
}

function resetDemo() {
  if (demoInterval.value) {
    clearInterval(demoInterval.value);
    demoInterval.value = null;
  }
  
  isProcessing.value = false;
  progressData.completed = 0;
  progressData.currentSegment = undefined;
  
  demoSegments.forEach(segment => {
    segment.status = 'waiting';
    segment.progress = 0;
    segment.stage = '等待中';
  });
  
  toast.info('演示已重置');
}

function playAudio(index: number) {
  const segment = demoSegments[index];
  if (segment.status !== 'completed') return;
  
  // 模拟播放音频
  toast.success(`正在播放：${segment.speaker} 的音频片段`);
}

// 页面卸载时清理
onUnmounted(() => {
  if (demoInterval.value) {
    clearInterval(demoInterval.value);
  }
});
</script>

<style scoped>
/* Wave animation for loading state */
@keyframes wave-flow {
  0% {
    transform: translateX(-100%);
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    transform: translateX(100%);
    opacity: 0.3;
  }
}

.wave-animation {
  animation: wave-flow 2s ease-in-out infinite;
}

/* Wave bars animation */
@keyframes wave-bar {
  0%, 100% {
    height: 0.25rem;
    opacity: 0.4;
  }
  50% {
    height: 0.75rem;
    opacity: 1;
  }
}

.wave-bar {
  animation: wave-bar 1.2s ease-in-out infinite;
  min-height: 0.25rem;
}

/* Smooth transitions for state changes */
.segment-card-transition {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
</style> 