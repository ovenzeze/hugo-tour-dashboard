<template>
  <Dialog :open="visible" @update:open="emit('update:visible', $event)">
    <DialogContent class="w-[95vw] max-w-none h-[90vh] p-0 gap-0">
      <!-- Header -->
      <DialogHeader class="p-4 pb-2 border-b">
        <div class="flex items-center justify-between">
          <DialogTitle class="text-lg font-semibold">Edit Script</DialogTitle>
          <Button variant="ghost" size="sm" @click="close">
            <Icon name="ph:x" class="w-4 h-4" />
          </Button>
        </div>
        <p class="text-sm text-muted-foreground">
          Format: Speaker: Content on each line
        </p>
      </DialogHeader>

      <!-- Main Editor Area -->
      <div class="flex-1 p-4 overflow-hidden">
        <Textarea
          v-model="localContent"
          placeholder="Host: Welcome to our podcast!
Guest: Thank you for having me.
Host: Let's dive into today's topic..."
          class="w-full h-full resize-none border-none focus-visible:ring-0 text-base leading-relaxed"
          @keydown="handleKeyDown"
        />
      </div>

      <!-- Footer Actions -->
      <div class="border-t p-4 flex gap-2">
        <Button variant="outline" @click="insertTemplate" class="flex-1">
          <Icon name="ph:plus" class="w-4 h-4 mr-2" />
          Template
        </Button>
        <Button variant="outline" @click="clear" class="flex-1">
          <Icon name="ph:trash" class="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button @click="save" class="flex-1">
          <Icon name="ph:check" class="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  visible: boolean;
  content: string;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'save', content: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localContent = ref('');

// Watch for content changes
watch(() => props.content, (newContent) => {
  localContent.value = newContent;
}, { immediate: true });

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    localContent.value = props.content;
  }
});

const close = () => {
  emit('update:visible', false);
};

const save = () => {
  emit('save', localContent.value);
  close();
};

const clear = () => {
  localContent.value = '';
};

const insertTemplate = () => {
  const template = `Host: Welcome to our podcast show!
Guest: Thank you for having me, I'm excited to discuss today's topic.
Host: Let's dive into our conversation.
Guest: Absolutely, I think this is a fascinating subject.`;
  
  if (localContent.value.trim()) {
    localContent.value += '\n\n' + template;
  } else {
    localContent.value = template;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  // Enhanced mobile typing experience
  if (event.key === 'Enter' && event.ctrlKey) {
    // Ctrl+Enter to save
    save();
  }
};
</script> 