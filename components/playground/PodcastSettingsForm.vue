<template>
  <div class="space-y-6 p-4">
    <!-- Top Row: Language and Number of Segments -->
    <div class="grid md:grid-cols-2 gap-x-6 gap-y-5">
      <!-- Podcast Language -->
      <div class="flex items-center gap-3">
        <TooltipProvider :delay-duration="100">
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="ph:globe-simple-bold" class="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Podcast Language</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select v-model="podcastLanguageValue" class="w-48">
          <SelectTrigger class="flex-grow w-48 overflow-hidden">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="lang in SUPPORTED_LANGUAGES"
              :key="lang.code"
              :value="lang.code">
              {{ lang.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Number of Segments -->
      <div class="flex items-center gap-3">
        <TooltipProvider :delay-duration="100">
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="ph:stack-bold" class="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Number of Segments</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select v-model.number="editableSettings.numberOfSegments">
          <SelectTrigger class="flex-grow">
            <SelectValue placeholder="Select segments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in segmentOptions"
              :key="option"
              :value="option">
              {{ option }} segments
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Title -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:text-t-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Podcast Title</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Input
        id="podcastTitle"
        v-model="editableSettings.title"
        placeholder="Enter the title for your podcast, e.g., The Future of AI"
        class="flex-grow"
      />
    </div>

    <!-- User Instructions / Topic -->
    <div class="flex items-start gap-3"> 
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground pt-2.5">
              <Icon name="ph:lightbulb-filament-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>User Instructions / Podcast Topic</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Textarea
        id="podcastTopic"
        v-model="editableSettings.topic"
        placeholder="Describe in detail what the podcast should cover: main points, questions for guests, desired tone, etc."
        class="min-h-[100px] flex-grow"
      />
    </div>

    <!-- Host Character -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:user-sound-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Host Character</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <UnifiedPersonaSelector
        id="hostPersonaUnified"
        v-model="editableSettings.hostPersonaId"
        :personas="props.personas"
        :selection-mode="'single'"
        placeholder="Select Host Persona"
        class="flex-grow"
      />
    </div>

    <!-- Guest Characters -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:users-three-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Guest Characters (Select one or more)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <UnifiedPersonaSelector
        id="guestPersonasUnified"
        v-model="editableSettings.guestPersonaIds"
        :personas="availableGuestPersonas"
        :selection-mode="'multiple'"
        placeholder="Select Guest Persona(s) (Optional)"
        class="flex-grow"
      />
    </div>
    
    <!-- Advanced Options -->
    <div class="pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4 ml-1">Advanced Options</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <!-- Style / Tone -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:palette-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Style / Tone</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="podcastStyle"
            v-model="editableSettings.style"
            placeholder="e.g., Casual, Educational"
            class="flex-grow"
          />
        </div>

        <!-- Keywords -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:tag-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Keywords (comma-separated)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="podcastKeywords"
            v-model="keywordsForInput"
            placeholder="e.g., AI, Future Tech"
            class="flex-grow"
          />
        </div>

        <!-- Background Music -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:music-notes-simple-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Background Music (Optional)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="backgroundMusic"
            v-model="editableSettings.backgroundMusic"
            placeholder="Theme or style, e.g., Upbeat"
            class="flex-grow"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { Skeleton } from '@/components/ui/skeleton';
// import UnifiedPersonaSelector from '@/components/UnifiedPersonaSelector.vue'; // Commented out old selector
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input'; 
import { Textarea } from '@/components/ui/textarea'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; 
import { Button } from '@/components/ui/button';
import type { Persona } from '@/stores/playgroundPersona';
import type { FullPodcastSettings } from '@/stores/playgroundSettings';
import { SUPPORTED_LANGUAGES } from '@/stores/playgroundSettings';

const segmentOptions = ref([5, 10, 20, 30, 40, 50]);

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

const podcastLanguageValue = computed({
  get: () => props.modelValue.language,
  set: (newValue) => {
    if (newValue !== props.modelValue.language) {
      emit('update:modelValue', { ...props.modelValue, language: newValue });
    }
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

    const getProcessedKeywords = (): string[] => {
      const keywordsValue = newSettings.keywords;
      if (Array.isArray(keywordsValue)) {
        return keywordsValue;
      } 
      if (typeof keywordsValue === 'string') {
        return keywordsValue.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
      return [];
    };

    const processedValue = {
      ...newSettings,
      numberOfSegments: Number(newSettings.numberOfSegments) || 1,
      hostPersonaId: newSettings.hostPersonaId ? Number(newSettings.hostPersonaId) : undefined,
      guestPersonaIds: Array.isArray(newSettings.guestPersonaIds)
        ? newSettings.guestPersonaIds
          .map((id: string | number | undefined) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0)
        : [],
      keywords: getProcessedKeywords(),
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

.hide-spin[type=number] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield;
}
</style>
