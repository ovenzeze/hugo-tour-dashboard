<!--
@description Enhanced audio synthesis component with advanced controls and better UX
-->

<template>
  <div class="space-y-6">
    <!-- Script Preview -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Script Preview</Label>
        <Badge variant="outline" class="text-xs">Read-only</Badge>
      </div>
      <!-- <ScrollArea class="h-[200px] w-full rounded-md border p-4">
        <pre class="text-sm font-mono whitespace-pre-wrap">{{ scriptContent }}</pre>
      </ScrollArea> -->
    </div>

    <!-- Synthesis Controls -->
    <div class="space-y-4">
      <div class="space-y-2">
        <Label>Output Filename</Label>
        <Input 
          v-model="localOutputFilename" 
          placeholder="podcast_output.mp3"
          :disabled="disabled || isLoading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Voice Temperature ({{ synthesisParams.temperature }})</Label>
          <HoverCard>
            <HoverCardTrigger>
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
          v-model="synthesisParams.temperatureArray"
          :min="0"
          :max="1"
          :step="0.1"
          :disabled="disabled || isLoading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Speech Rate ({{ synthesisParams.speed }}x)</Label>
          <HoverCard>
            <HoverCardTrigger>
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
          v-model="synthesisParams.speedArray"
          :min="0.5"
          :max="2"
          :step="0.1"
          :disabled="disabled || isLoading"
        />
      </div>
    </div>

    <!-- Add timestamp information display area -->
    <div v-if="props.performanceConfig?.useTimestamps" class="mt-4 border-t pt-4">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium">Timestamp Information Visualization</h4>
        <Badge variant="outline">Beta</Badge>
      </div>
      
      <div class="mt-2 p-3 bg-muted rounded-md text-xs">
        <p>Timestamp data imported from Step 2 will be used for advanced audio processing</p>
      </div>
      
      <!-- Can add a switch to control whether to use timestamps -->
      <div class="mt-3 flex items-center space-x-2">
        <Checkbox
          id="use-timestamps"
          v-model:checked="useTimestampsForSynthesis"
        />
        <Label for="use-timestamps">Use pre-generated timestamp data</Label>
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
        {{ isLoading ? 'Generating...' : 'Generate Audio' }}
      </Button>
      <Button 
        v-if="modelValue" 
        variant="outline" 
        @click="$emit('download')"
        :disabled="isLoading"
      >
        <Download class="w-4 h-4 mr-2" />
        Download Audio
      </Button>
    </div>

    <!-- Audio Player -->
    <div v-if="modelValue" class="space-y-2">
      <Label>Podcast Audio</Label>
      <div class="rounded-lg border bg-card p-4">
        <audio :src="modelValue" controls class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '../../components/ui/button/index.js'
import { Input } from '../../components/ui/input/index.js'
import { Label } from '../../components/ui/label/index.js'
import { Badge } from '../../components/ui/badge/index.js'
import { Slider } from '../../components/ui/slider/index.js'
import { Checkbox } from '../../components/ui/checkbox/index.js' // Added Checkbox
import { ScrollArea } from '../../components/ui/scroll-area/index.js'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../components/ui/hover-card/index.js'
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
  performanceConfig?: { // Added performanceConfig
    useTimestamps?: boolean
    segments?: any[] // Define more specifically if needed
    // other properties from VoicePerformanceSettings...
  }
  isLoading?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:outputFilename': [value: string]
  'synthesize': [payload: {
    useTimestamps: boolean,
    synthesisParams?: any,
    performanceConfig?: any
  }] // Extended synthesize event payload
  'download': []
}>()

const localOutputFilename = ref('')

watch(() => localOutputFilename.value, (newValue) => {
  emit('update:outputFilename', newValue)
})

const useTimestampsForSynthesis = ref(true); // Added this ref

const handleSynthesize = () => {
  if (!props.scriptContent?.trim()) return;
  
  // 检查是否有时间戳数据并且用户选择使用
  const useTimestamps = !!(props.performanceConfig?.useTimestamps && useTimestampsForSynthesis.value);
  
  // 发送合成请求时包含时间戳数据和其他必要参数
  emit('synthesize', {
    useTimestamps,
    synthesisParams: props.synthesisParams,
    performanceConfig: props.performanceConfig
  });
}
</script>