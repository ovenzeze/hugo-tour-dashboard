<template>
  <div class="space-y-6">
    <!-- API Selector -->
    <div class="space-y-2">
      <Label for="api-select-panel" class="font-semibold">Select TTS API Provider</Label>
      <Select id="api-select-panel" :model-value="selectedApiProvider" @update:model-value="emit('update:selectedApiProvider', $event)">
        <SelectTrigger>
          <SelectValue placeholder="Select API Provider..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
            <SelectItem value="volcengine">Volcengine</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <!-- Text Input -->
    <div class="space-y-2">
      <Label for="tts-input-text-panel" class="font-semibold">Input Text</Label>
      <Textarea
        id="tts-input-text-panel"
        :model-value="inputText"
        @update:model-value="emit('update:inputText', $event)"
        placeholder="Enter text to synthesize..."
        class="min-h-[120px] w-full p-3 border border-input rounded-md shadow-sm focus:ring-primary focus:border-primary bg-background text-foreground placeholder:text-muted-foreground"
        rows="6"
      />
    </div>

    <!-- Preset Texts Buttons -->
    <div class="space-y-2">
      <Label class="font-semibold">Preset Texts</Label>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="preset in presetTexts"
          :key="preset.label"
          variant="outline"
          size="sm"
          @click="emit('update:inputText', preset.value)"
        >
          {{ preset.label }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Preset {
  label: string;
  value: string;
}

interface Props {
  selectedApiProvider: string;
  inputText: string;
  presetTexts: Preset[];
}

defineProps<Props>();

const emit = defineEmits(['update:selectedApiProvider', 'update:inputText']);
</script>