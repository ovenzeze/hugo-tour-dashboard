<template>
  <div class="h-screen bg-background flex flex-col overflow-hidden">
    <!-- Header - 固定高度 -->
    <div class="border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
      <div class="px-4 py-3 sm:py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" @click="goBack" class="flex-shrink-0">
              <Icon name="ph:arrow-left" class="w-5 h-5" />
            </Button>
            <div class="min-w-0">
              <h1 class="text-lg sm:text-2xl font-bold truncate">音频合成进度</h1>
              <p class="text-xs sm:text-sm text-muted-foreground truncate">{{ taskId }}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <!-- 复制进度链接按钮 - 移动端简化 -->
            <Button 
              variant="outline" 
              :size="$device.isMobile ? 'sm' : 'sm'"
              @click="copyProgressLink"
              :disabled="copyingLink"
              class="flex items-center gap-1 sm:gap-2"
            >
              <Icon 
                :name="copySuccess ? 'ph:check' : (copyingLink ? 'ph:spinner' : 'ph:link')" 
                :class="copyingLink ? 'animate-spin' : ''"
                class="w-4 h-4" 
              />
              <span class="hidden sm:inline">{{ copySuccess ? '已复制' : '复制链接' }}</span>
            </Button>
            
            <!-- 状态指示器 -->
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full flex-shrink-0"
                :class="{
                  'bg-yellow-500 animate-pulse': task?.status === 'pending',
                  'bg-blue-500 animate-pulse': task?.status === 'processing', 
                  'bg-green-500': task?.status === 'completed',
                  'bg-red-500': task?.status === 'failed',
                  'bg-gray-400': !task
                }"
              />
              <span class="text-xs sm:text-sm font-medium capitalize">
                {{ getStatusText(task?.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 移动端提示信息 -->
        <div v-if="task && ['pending', 'processing'].includes(task.status)" class="mt-2 sm:hidden">
          <div class="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded text-center">
            <Icon name="ph:info" class="w-3 h-3 inline mr-1" />
            可复制链接后离开页面查看进度
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 - 填充剩余空间且可滚动 -->
    <div class="flex-1 overflow-auto">
      <div class="px-4 py-4 sm:py-6 h-full">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex items-center justify-center h-full">
          <div class="text-center">
            <Icon name="ph:spinner" class="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p class="text-muted-foreground">正在加载合成进度...</p>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="flex items-center justify-center h-full">
          <div class="text-center">
            <Icon name="ph:warning-circle" class="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 class="text-xl font-semibold mb-2">加载失败</h2>
            <p class="text-muted-foreground mb-4">{{ error }}</p>
            <Button @click="fetchTask" variant="outline">
              <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </div>

        <!-- 任务不存在 -->
        <div v-else-if="!task" class="flex items-center justify-center h-full">
          <div class="text-center">
            <Icon name="ph:question-circle" class="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 class="text-xl font-semibold mb-2">任务不存在</h2>
            <p class="text-muted-foreground mb-4">未找到ID为 {{ taskId }} 的合成任务</p>
            <div class="space-y-3">
              <Button @click="goBack" variant="outline">返回</Button>
              <div class="text-xs text-muted-foreground max-w-md">
                <p>合成任务ID示例格式：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</p>
                <p>您可以从播客卡片的"继续合成"按钮获取有效的任务ID</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 任务详情和进度 - 全屏布局 -->
        <div v-else class="h-full flex flex-col gap-4 sm:gap-6">
          <!-- 播客信息 - 固定高度 -->
          <Card class="p-4 sm:p-6 flex-shrink-0">
            <div class="flex items-start justify-between mb-3 sm:mb-4">
              <div class="min-w-0 flex-1 mr-3">
                <h2 class="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 truncate">{{ podcast?.title || '未知播客' }}</h2>
                <p class="text-sm text-muted-foreground line-clamp-2">{{ podcast?.description || '正在合成播客音频...' }}</p>
              </div>
              <Badge :variant="getStatusVariant(task.status)" class="flex-shrink-0">
                {{ getStatusText(task.status) }}
              </Badge>
            </div>

            <!-- 整体进度条 -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>总体进度</span>
                <span class="font-medium">{{ Math.round(progressPercentage) }}%</span>
              </div>
              <Progress :value="progressPercentage" class="h-2 sm:h-3" />
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>{{ task.progress_completed }} / {{ task.progress_total }} 已完成</span>
                <span v-if="task.status === 'processing' && task.progress_current_segment" class="hidden sm:inline">
                  正在处理: 第{{ task.progress_current_segment }}段
                </span>
              </div>
            </div>
          </Card>

          <!-- 详细进度 - 填充剩余空间 -->
          <Card class="flex-1 min-h-0 flex flex-col">
            <div class="p-4 sm:p-6 pb-3 flex-shrink-0">
              <h3 class="text-lg font-semibold">段落合成详情</h3>
            </div>
            
            <div class="flex-1 overflow-auto px-4 sm:px-6">
              <div v-if="!segmentProgresses || segmentProgresses.length === 0" class="flex items-center justify-center h-full text-muted-foreground">
                <div class="text-center">
                  <Icon name="ph:file-audio" class="w-12 h-12 mx-auto mb-2" />
                  <p>暂无段落信息</p>
                </div>
              </div>

              <div v-else class="space-y-3 pb-4">
                <div 
                  v-for="(segment, index) in segmentProgresses" 
                  :key="index"
                  class="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card/50"
                >
                  <!-- 段落序号和状态图标 -->
                  <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-medium">
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
                    <Avatar class="w-8 h-8 sm:w-10 sm:h-10 border-2 border-background/50">
                      <AvatarImage 
                        v-if="segment.persona?.avatar_url" 
                        :src="segment.persona.avatar_url" 
                        :alt="segment.persona.name || segment.speaker || 'Speaker'"
                      />
                      <AvatarFallback class="text-xs font-semibold bg-primary/10">
                        {{ getInitials(segment.speaker || segment.persona?.name || 'S') }}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <!-- 段落信息 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <p class="text-sm font-medium truncate">
                        <span class="hidden sm:inline">段落 {{ index + 1 }}</span>
                        <span class="sm:hidden">{{ index + 1 }}</span>
                        <span v-if="segment.persona" class="text-muted-foreground ml-1">
                          {{ segment.persona.name }}
                        </span>
                        <span v-else-if="segment.speaker" class="text-muted-foreground ml-1">
                          {{ segment.speaker }}
                        </span>
                      </p>
                      <span class="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {{ getSegmentStatusText(segment.status) }}
                      </span>
                    </div>
                    
                    <p v-if="segment.text" class="text-xs text-muted-foreground line-clamp-2">
                      {{ segment.text }}
                    </p>

                    <!-- 段落进度条 -->
                    <div v-if="segment.status === 'processing'" class="mt-2">
                      <Progress :value="75" class="h-1" />
                    </div>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <Button
                      v-if="segment.status === 'completed' && segment.audioUrl"
                      variant="ghost"
                      size="sm"
                      @click="playAudio(segment.audioUrl)"
                    >
                      <Icon name="ph:play" class="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <!-- 错误信息 -->
          <Card v-if="task.status === 'failed' || task.error_message" class="p-4 sm:p-6 border-destructive flex-shrink-0">
            <div class="flex items-start gap-3">
              <Icon name="ph:warning" class="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h3 class="font-semibold text-destructive mb-2">合成失败</h3>
                <p class="text-sm text-muted-foreground">{{ task.error_message || '未知错误' }}</p>
              </div>
            </div>
          </Card>

          <!-- 完成操作 -->
          <Card v-if="task.status === 'completed'" class="p-4 sm:p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 flex-shrink-0">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-center gap-3">
                <Icon name="ph:check-circle" class="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 class="font-semibold text-green-800 dark:text-green-200">合成完成！</h3>
                  <p class="text-sm text-green-700 dark:text-green-300">所有音频段落已成功合成</p>
                </div>
              </div>
              <div class="flex gap-2">
                <Button @click="viewPodcast" variant="outline" size="sm">
                  查看播客
                </Button>
                <Button @click="downloadPodcast" size="sm">
                  <Icon name="ph:download" class="w-4 h-4 mr-2" />
                  下载
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <!-- 音频播放器 -->
    <audio ref="audioPlayer" @ended="currentPlayingUrl = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface SynthesisTask {
  task_id: string
  podcast_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress_completed: number
  progress_total: number
  progress_current_segment?: number
  error_message?: string
  results?: any
  created_at: string
  updated_at: string
}

interface Podcast {
  podcast_id: string
  title: string
  description?: string
}

interface SegmentProgress {
  status: 'waiting' | 'processing' | 'completed' | 'error'
  text?: string
  persona?: { name: string; avatar_url?: string }
  audioUrl?: string
}

const route = useRoute()
const router = useRouter()

const taskId = computed(() => route.params.taskId as string)

// 状态
const loading = ref(true)
const error = ref<string | null>(null)
const task = ref<SynthesisTask | null>(null)
const podcast = ref<Podcast | null>(null)
const segmentProgresses = ref<SegmentProgress[]>([])
const currentPlayingUrl = ref<string | null>(null)
const audioPlayer = ref<HTMLAudioElement>()

// 复制链接相关状态
const copyingLink = ref(false)
const copySuccess = ref(false)

// 轮询定时器
let pollInterval: NodeJS.Timeout | null = null

// 计算属性
const progressPercentage = computed(() => {
  if (!task.value) return 0
  return task.value.progress_total > 0 
    ? (task.value.progress_completed / task.value.progress_total) * 100 
    : 0
})

// 页面标题
useHead(() => ({
  title: task.value?.status === 'completed' 
    ? '合成完成 - Hugo Tour Dashboard'
    : '合成进度 - Hugo Tour Dashboard'
}))

// 获取任务详情
async function fetchTask() {
  try {
    loading.value = true
    error.value = null

    const response = await $fetch<{ task: SynthesisTask; podcast?: Podcast }>(`/api/podcast/synthesis-status/${taskId.value}`)
    
    task.value = response.task
    podcast.value = response.podcast || null

    // 如果有结果数据，解析段落进度
    if (task.value.results && Array.isArray(task.value.results.segments)) {
      segmentProgresses.value = task.value.results.segments
    }

  } catch (err: any) {
    console.error('Failed to fetch task:', err)
    error.value = err.data?.message || '获取任务信息失败'
  } finally {
    loading.value = false
  }
}

// 开始轮询
function startPolling() {
  // 如果任务还在进行中，每3秒轮询一次
  if (task.value && ['pending', 'processing'].includes(task.value.status)) {
    pollInterval = setInterval(() => {
      fetchTask()
    }, 3000)
  }
}

// 停止轮询
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// 状态文本映射
function getStatusText(status?: string): string {
  const statusMap = {
    pending: '等待中',
    processing: '合成中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status as keyof typeof statusMap] || '未知'
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap = {
    pending: 'secondary' as const,
    processing: 'default' as const,
    completed: 'outline' as const,
    failed: 'destructive' as const
  }
  return variantMap[status as keyof typeof variantMap] || 'secondary'
}

function getSegmentStatusText(status: string): string {
  const statusMap = {
    waiting: '等待',
    processing: '合成中',
    completed: '完成',
    error: '失败'
  }
  return statusMap[status as keyof typeof statusMap] || '未知'
}

// 播放音频
function playAudio(url: string) {
  if (audioPlayer.value) {
    audioPlayer.value.src = url
    audioPlayer.value.play()
    currentPlayingUrl.value = url
  }
}

// 返回上一页
function goBack() {
  router.back()
}

// 查看播客
function viewPodcast() {
  if (podcast.value) {
    router.push(`/podcasts`)
  }
}

// 下载播客
function downloadPodcast() {
  // TODO: 实现下载功能
  console.log('Download podcast:', task.value?.podcast_id)
}

// 获取姓名首字母
function getInitials(name: string): string {
  if (!name) return 'S'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// 复制进度链接
async function copyProgressLink() {
  if (copyingLink.value) return
  
  try {
    copyingLink.value = true
    
    // 构建当前页面的完整URL
    const currentUrl = window.location.href
    
    // 使用Clipboard API复制到剪贴板
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentUrl)
    } else {
      // 兜底方案：使用document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = currentUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
      } catch (err) {
        console.error('Failed to copy using execCommand:', err)
        throw new Error('复制失败')
      } finally {
        document.body.removeChild(textArea)
      }
    }
    
    // 显示成功状态
    copySuccess.value = true
    
    // 使用toast显示成功消息
    if (typeof window !== 'undefined' && window.$toast) {
      window.$toast.success('进度链接已复制', {
        description: '您可以分享此链接或保存以便稍后查看合成进度',
        duration: 3000
      })
    }
    
    // 3秒后重置状态
    setTimeout(() => {
      copySuccess.value = false
    }, 3000)
    
  } catch (err: any) {
    console.error('Failed to copy progress link:', err)
    
    // 显示错误消息
    if (typeof window !== 'undefined' && window.$toast) {
      window.$toast.error('复制失败', {
        description: err.message || '无法复制链接到剪贴板',
        duration: 3000
      })
    }
  } finally {
    copyingLink.value = false
  }
}

// 生命周期
onMounted(async () => {
  await fetchTask()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

// 监听任务状态变化，自动停止轮询
watch(() => task.value?.status, (newStatus) => {
  if (newStatus && ['completed', 'failed'].includes(newStatus)) {
    stopPolling()
  } else if (newStatus && ['pending', 'processing'].includes(newStatus)) {
    startPolling()
  }
})
</script> 