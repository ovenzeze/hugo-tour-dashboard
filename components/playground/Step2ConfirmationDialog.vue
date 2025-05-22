<template>
  <AlertDialog :open="isDialogVisible" @update:open="uiStore.setStep2ConfirmationDialogVisible($event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Action</AlertDialogTitle>
        <AlertDialogDescription>
          There are still {{ pendingSegmentsCountComputed }} segments that haven't been synthesized or have failed. Are you sure you want to proceed to generate the final podcast?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="handleConfirm">Confirm</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundUIStore } from '@/stores/playgroundUIStore';
import { usePlaygroundProcessStore } from '@/stores/playgroundProcessStore'; // To get segment statuses
import { usePlaygroundScriptStore } from '@/stores/playgroundScriptStore'; // To get total segments from parsed script

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

const uiStore = usePlaygroundUIStore();
const processStore = usePlaygroundProcessStore();
const scriptStore = usePlaygroundScriptStore();

const { isStep2ConfirmationDialogVisible: isDialogVisible } = storeToRefs(uiStore);
const { previewApiResponse } = storeToRefs(processStore);
const { parsedSegments } = storeToRefs(scriptStore);

const pendingSegmentsCountComputed = computed(() => {
  const totalSegments = parsedSegments.value.length;
  if (totalSegments === 0) return 0;

  const synthesizedOrSuccessfulPreviews = previewApiResponse.value?.segmentPreviews?.filter(p => p.audioUrl && !p.error).length || 0;
  
  // A more accurate count would be total segments minus those successfully synthesized.
  // If previewApiResponse doesn't cover all segments or only reflects last preview attempt,
  // this logic might need refinement based on how segment synthesis status is truly tracked.
  // For now, assuming previewApiResponse.segmentPreviews gives status for all relevant segments.
  
  // Let's count segments that are NOT successful (no audioUrl or has error)
  let pendingCount = 0;
  for (let i = 0; i < totalSegments; i++) {
    const preview = previewApiResponse.value?.segmentPreviews?.find(p => p.segmentIndex === i);
    if (!preview || !preview.audioUrl || preview.error) {
      pendingCount++;
    }
  }
  return pendingCount;
});

const emit = defineEmits(['confirm']); // Removed 'update:open'

const handleCancel = () => {
  uiStore.setStep2ConfirmationDialogVisible(false);
};

const handleConfirm = () => {
  emit('confirm');
  uiStore.setStep2ConfirmationDialogVisible(false);
};
</script>