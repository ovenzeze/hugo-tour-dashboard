<template>
  <AlertDialog :open="visible" @update:open="$emit('update:visible', $event)">
    <AlertDialogContent class="sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center">
          <Icon name="ph:waveform" class="mr-2 h-5 w-5 text-primary" />
          继续播客合成
        </AlertDialogTitle>
        <AlertDialogDescription>
          这个播客还有 <strong class="text-primary">{{ segmentCount }}</strong> 个片段需要继续后台合成。
          合成过程将在后台运行，您可以在Playground中查看进度。
        </AlertDialogDescription>
      </AlertDialogHeader>
      
      <div class="py-4">
        <div class="flex items-start space-x-3 text-sm text-muted-foreground">
          <Icon name="ph:info" class="h-4 w-4 mt-0.5 text-blue-500" />
          <div class="space-y-1">
            <p>• 合成过程预计需要 <strong>{{ estimatedTime }}</strong></p>
            <p>• 您可以在合成过程中继续编辑其他内容</p>
            <p>• 完成后会自动更新播客内容</p>
          </div>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">取消</AlertDialogCancel>
        <AlertDialogAction 
          @click="$emit('confirm')"
          class="bg-primary hover:bg-primary/90"
        >
          <Icon name="ph:play" class="mr-2 h-4 w-4" />
          开始合成
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  visible: boolean;
  segmentCount: number;
  podcastTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  podcastTitle: '未命名播客'
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'confirm': [];
  'cancel': [];
}>();

// 估算合成时间
const estimatedTime = computed(() => {
  const minutes = Math.ceil(props.segmentCount * 0.5); // 假设每个片段需要30秒
  if (minutes < 1) return '少于1分钟';
  if (minutes < 60) return `约${minutes}分钟`;
  return `约${Math.ceil(minutes / 60)}小时`;
});
</script> 