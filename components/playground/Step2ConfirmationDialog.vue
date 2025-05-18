<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Action</AlertDialogTitle>
        <AlertDialogDescription>
          There are still {{ pendingSegmentsCount }} segments that haven't been synthesized. Are you sure you want to proceed to generate the final podcast?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('update:open', false)">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="handleConfirm">Confirm</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
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
  open: boolean;
  pendingSegmentsCount: number;
}

defineProps<Props>();

const emit = defineEmits(['update:open', 'confirm']);

const handleConfirm = () => {
  emit('confirm');
  emit('update:open', false); // Close dialog on confirm
};
</script>