<template>
  <div class="w-full flex items-center gap-2 py-2">
    <Badge :variant="variantMap[status]">
      {{ statusText[status] }}
    </Badge>
    <Progress v-if="showProgress" :value="progressValue" class="flex-1 h-2" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/components/ui/badge/Badge.vue';
import Progress from '@/components/ui/progress/Progress.vue';

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (val: string) => [
      'idle', 'generatingScript', 'generatingAudio', 'generatingSegments', 'editingSegments', 'mixing', 'done'
    ].includes(val)
  },
  progressValue: {
    type: Number,
    default: 0
  }
});

const statusText = {
  idle: 'Waiting',
  generatingScript: 'Generating Script',
  generatingAudio: 'Generating Audio',
  generatingSegments: 'Creating Segments',
  editingSegments: 'Editing Segments',
  mixing: 'Mixing Audio',
  done: 'Completed'
};

const variantMap = {
  idle: 'secondary',
  generatingScript: 'default',
  generatingAudio: 'default',
  generatingSegments: 'default',
  editingSegments: 'outline',
  mixing: 'default',
  done: 'success'
};

const showProgress = computed(() => props.status !== 'idle' && props.status !== 'done');
</script>

<style scoped>
</style>
