<!--
@description Enhanced audio synthesis component with advanced controls and better UX
-->

<template>
  <div class="space-y-6">
    <!-- Script Preview -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>脚本预览</Label>
        <Badge variant="outline" class="text-xs">只读</Badge>
      </div>
      <!-- <ScrollArea class="h-[200px] w-full rounded-md border p-4">
        <pre class="text-sm font-mono whitespace-pre-wrap">{{ scriptContent }}</pre>
      </ScrollArea> -->
    </div>

    <!-- Synthesis Controls -->
    <div class="space-y-4">
      <div class="space-y-2">
        <Label>输出文件名</Label>
        <Input 
          v-model="localOutputFilename" 
          placeholder="podcast_output.mp3"
          :disabled="disabled || isLoading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>语音温度 ({{ synthesisParams.temperature }})</Label>
          <HoverCard>
            <HoverCardTrigger>
              <Button variant="ghost" size="icon">
                <HelpCircle class="h-4 w-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <p class="text-sm">控制语音的变化程度。较高的值会产生更多变化，较低的值会产生更稳定的输出。</p>
            </HoverCardContent>
          </HoverCard>
        </div>
        <Slider
          v-model="synthesisParams.temperatureArray"
          :min="0"
          :max="1"
          :step="0.1"
          :disabled="disabled || isLoading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>语速 ({{ synthesisParams.speed }}x)</Label>
          <HoverCard>
            <HoverCardTrigger>
              <Button variant="ghost" size="icon">
                <HelpCircle class="h-4 w-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <p class="text-sm">调整语音的播放速度。1.0 是正常速度，大于 1.0 加快，小于 1.0 减慢。</p>
            </HoverCardContent>
          </HoverCard>
        </div>
        <Slider
          v-model="synthesisParams.speedArray"
          :min="0.5"
          :max="2"
          :step="0.1"
          :disabled="disabled || isLoading"
        />
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <Button 
        @click="handleSynthesize" 
        :disabled="disabled || isLoading || !scriptContent?.trim()"
      >
        <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
        <RadioTower v-else class="w-4 h-4 mr-2" />
        {{ isLoading ? '生成中...' : '生成音频' }}
      </Button>
      <Button 
        v-if="modelValue" 
        variant="outline" 
        @click="$emit('download')"
        :disabled="isLoading"
      >
        <Download class="w-4 h-4 mr-2" />
        下载音频
      </Button>
    </div>

    <!-- Audio Player -->
    <div v-if="modelValue" class="space-y-2">
      <Label>播客音频</Label>
      <div class="rounded-lg border bg-card p-4">
        <audio :src="modelValue" controls class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { RadioTower, Download, Loader2, HelpCircle } from 'lucide-vue-next'

const props = defineProps<{
  modelValue?: string // 音频 URL
  scriptContent: string
  synthesisParams: {
    temperature: number
    speed: number
    temperatureArray: number[]
    speedArray: number[]
  }
  isLoading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:outputFilename', value: string): void
  (e: 'synthesize'): void
  (e: 'download'): void
}>()

const localOutputFilename = ref('')

watch(() => localOutputFilename.value, (newValue) => {
  emit('update:outputFilename', newValue)
})

const handleSynthesize = () => {
  if (!props.scriptContent?.trim()) return
  emit('synthesize')
}
</script> 