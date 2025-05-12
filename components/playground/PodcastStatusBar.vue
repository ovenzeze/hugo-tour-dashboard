<template>
  <div class="w-full flex items-center gap-4 py-2">
    <div class="flex items-center gap-2">
      <Badge :variant="variantMap[status]">
        {{ statusText[status] }}
      </Badge>
      <span v-if="showProgress" class="text-xs text-muted-foreground">
        {{ progressText }}
      </span>
    </div>
    <Progress 
      v-if="showProgress" 
      :value="progressValue" 
      class="flex-1 h-2"
      :class="{'animate-pulse': isAnimated}"
    />
  </div>
</template>

<script setup lang="ts">

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (val: string) => [
      'idle',
      'generatingScript',
      'generatingAudio',
      'generatingSegments',
      'editingSegments',
      'mixing',
      'done'
    ].includes(val)
  },
  progressValue: {
    type: Number,
    default: 0
  }
})

const statusText = {
  idle: 'Waiting to Start',
  generatingScript: 'Generating Script',
  generatingAudio: 'Generating Audio',
  generatingSegments: 'Creating Segments',
  editingSegments: 'Editing Segments',
  mixing: 'Mixing Audio',
  done: 'Completed'
}

const variantMap = {
  idle: 'secondary',
  generatingScript: 'default',
  generatingAudio: 'default',
  generatingSegments: 'default',
  editingSegments: 'outline',
  mixing: 'default',
  done: 'success'
}

const showProgress = computed(() => props.status !== 'idle' && props.status !== 'done')

const isAnimated = computed(() => {
  return ['generatingScript', 'generatingAudio', 'generatingSegments', 'mixing'].includes(props.status)
})

const progressText = computed(() => {
  if (props.progressValue === 0) return 'Preparing...'
  return `${Math.round(props.progressValue)}%`
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
