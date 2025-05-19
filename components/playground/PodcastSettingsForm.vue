<template>
  <div class="space-y-6 p-4">
    <div>
      <Label for="podcastTitle" class="text-base font-semibold">Title</Label>
      <Input
        id="podcastTitle"
        v-model="editableSettings.title"
        placeholder="e.g., The Future of AI"
        class="mt-2" />
    </div>

    <div>
      <Label for="podcastTopic" class="text-base font-semibold">Topic / Instructions</Label>
      <Textarea
        id="podcastTopic"
        v-model="editableSettings.topic"
        placeholder="Describe in detail what you want the podcast to cover..."
        class="mt-2 min-h-[120px]" />
    </div>

    <div class="space-y-8 pt-4">
      <div>
        <Label for="hostPersonaUnified" class="text-base font-semibold">Host Character</Label>
        <UnifiedPersonaSelector
          id="hostPersonaUnified"
          v-model="editableSettings.hostPersonaId"
          :personas="props.personas"
          :selection-mode="'single'"
          class="mt-3"
        ></UnifiedPersonaSelector>
      </div>

      <div>
        <Label for="guestPersonasUnified" class="text-base font-semibold">Guest Characters</Label>
        <UnifiedPersonaSelector
          id="guestPersonasUnified"
          v-model="editableSettings.guestPersonaIds"
          :personas="availableGuestPersonas"
          :selection-mode="'multiple'"
          class="mt-3"
        ></UnifiedPersonaSelector>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-6">
      <div>
        <Label for="podcastSegments" class="text-sm font-medium">Number of Segments</Label>
        <Input
          id="podcastSegments"
          type="number"
          v-model.number="editableSettings.numberOfSegments"
          placeholder="e.g., 3"
          class="mt-2 appearance-none hide-spin"
          min="1"
          max="10"
          inputmode="numeric" />
      </div>

      <div>
        <Label for="podcastStyle" class="text-sm font-medium">Style / Tone</Label>
        <Input
          id="podcastStyle"
          v-model="editableSettings.style"
          placeholder="e.g., Casual, Educational, Storytelling"
          class="mt-2" />
      </div>

      <div>
        <Label for="podcastKeywords" class="text-sm font-medium">Keywords</Label>
        <Input
          id="podcastKeywords"
          v-model="keywordsForInput"
          placeholder="Comma-separated, e.g., AI, ML, Future Tech"
          class="mt-2" />
      </div>
       <div>
        <Label for="backgroundMusic" class="text-sm font-medium">Background(Optional)</Label>
        <Input
          id="backgroundMusic"
          v-model="editableSettings.backgroundMusic"
          placeholder="Theme or style, e.g., Upbeat, Chill Tech"
          class="mt-2" />
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { Skeleton } from '@/components/ui/skeleton';
import UnifiedPersonaSelector from '@/components/UnifiedPersonaSelector.vue';
import type { Persona } from '@/stores/playgroundPersona';
import type { FullPodcastSettings } from '@/stores/playgroundSettings';

const props = defineProps<{
  modelValue: FullPodcastSettings;
  personas: Persona[];
  personasLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FullPodcastSettings): void;
}>();

const keywordsForInput = computed<string>({
  get: () => {
    if (Array.isArray(props.modelValue.keywords)) {
      return props.modelValue.keywords.join(', ');
    }
    return '';
  },
  set: (newValue) => {
    const newKeywordsArray = newValue.split(',').map(k => k.trim()).filter(k => k);
    emit('update:modelValue', { ...props.modelValue, keywords: newKeywordsArray });
  }
});

const editableSettings = computed({
  get: () => {
    return {
      ...props.modelValue,
    };
  },
  set: (value) => {
    const newSettings = { ...props.modelValue, ...value };

    const processedValue = {
      ...newSettings,
      numberOfSegments: Number(newSettings.numberOfSegments) || 1,
      hostPersonaId: newSettings.hostPersonaId ? Number(newSettings.hostPersonaId) : undefined,
      guestPersonaIds: Array.isArray(newSettings.guestPersonaIds)
        ? newSettings.guestPersonaIds
          .map((id: string | number | undefined) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0)
        : [],
      keywords: Array.isArray(newSettings.keywords)
                ? newSettings.keywords
                : (typeof newSettings.keywords === 'string'
                    ? newSettings.keywords.split(',').map(k => k.trim()).filter(k => k)
                    : [])
    };
    
    emit('update:modelValue', processedValue);
  }
});

const availableGuestPersonas = computed(() => {
  if (!props.personas) return [];
  return props.personas.filter(p => String(p.persona_id) !== String(editableSettings.value.hostPersonaId));
});

watch(() => props.modelValue.hostPersonaId, (newHostId: number | string | undefined) => {
  const numericNewHostId = Number(newHostId);
  if (Array.isArray(editableSettings.value.guestPersonaIds) && editableSettings.value.guestPersonaIds.includes(numericNewHostId)) {
    const updatedGuests = editableSettings.value.guestPersonaIds
      .map((id: string | number | undefined) => Number(id))
      .filter((id: number) => !isNaN(id) && id !== numericNewHostId);
    emit('update:modelValue', { ...editableSettings.value, guestPersonaIds: updatedGuests });
  }
});

watch(() => props.personas, (loadedPersonas) => {
  if (loadedPersonas && loadedPersonas.length > 0) {
    const currentModel = props.modelValue;
    let newHostId = currentModel.hostPersonaId ? String(currentModel.hostPersonaId) : undefined;
    let newGuestIds = Array.isArray(currentModel.guestPersonaIds) && currentModel.guestPersonaIds.length > 0
                      ? currentModel.guestPersonaIds.map(id => String(id))
                      : [];

    let needsUpdate = false;

    if (!newHostId && loadedPersonas.length > 0) {
      const defaultHost = loadedPersonas[0];
      if (defaultHost && typeof defaultHost.persona_id !== 'undefined') {
        newHostId = String(defaultHost.persona_id);
        needsUpdate = true;
      }
    }

    if (newGuestIds.length === 0 && newHostId && loadedPersonas.length > 0) {
      const potentialGuest = loadedPersonas.find(p => p && typeof p.persona_id !== 'undefined' && String(p.persona_id) !== newHostId);
      if (potentialGuest) {
        newGuestIds = [String(potentialGuest.persona_id)];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      emit('update:modelValue', {
        ...currentModel,
        hostPersonaId: newHostId ? Number(newHostId) : undefined,
        guestPersonaIds: newGuestIds.map(id => Number(id)),
      });
    }
  }
}, { immediate: true, deep: true });

</script>

<style scoped>
.hide-spin::-webkit-outer-spin-button,
.hide-spin::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.hide-spin[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
