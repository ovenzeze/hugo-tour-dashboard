<template>
  <div class="flex flex-col md:flex-row gap-4 flex-1 p-4 bg-background h-full">
    <!-- Left Form Area, Scrolls Independently -->
    <Card class="md:w-1/3 w-full p-4 flex-shrink-0 bg-muted/60 border-none shadow-md overflow-y-auto h-full">
      <PodcastSettingsForm
        :model-value="podcastSettings"
        :personas="personasForForm"
        :personas-loading="personasLoading"
        @update:model-value="emit('update:podcastSettings', $event)"
      />
    </Card>
    <!-- Right Script Editing Area, Scrolls Independently -->
    <Card class="flex-1 min-h-[240px] flex flex-col bg-background border-none shadow-md overflow-y-auto h-full">
      <template v-if="isScriptGenerating || isValidating">
        <div class="flex flex-col items-center justify-center h-full">
          <Icon name="ph:spinner" class="h-12 w-12 animate-spin text-primary mb-4" />
          <p class="text-center text-lg font-medium">
            {{ isScriptGenerating ? 'Standardizing Script...' : 'Validating Script...' }}
          </p>
          <p class="text-center text-sm text-muted-foreground mt-2">
            {{ isScriptGenerating ? 'Processing and saving script...' : 'Checking script format and content.' }}
          </p>
        </div>
      </template>
      <Textarea
        v-else-if="!selectedPersonaIdForHighlighting"
        :model-value="mainEditorContent"
        placeholder="Script will appear here after generation..."
        class="flex-1 w-full h-full resize-none min-h-[200px] rounded-lg border border-input bg-background p-4 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition placeholder:text-muted-foreground"
        @update:model-value="emit('update:mainEditorContent', $event)"
      />
      <div
        v-else
        class="flex-1 w-full h-full overflow-y-auto p-4 text-sm"
        v-html="highlightedScript"
      ></div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
// Icon is auto-imported
import PodcastSettingsForm from './PodcastSettingsForm.vue';
// Import types expected by PodcastSettingsForm
import type { FullPodcastSettings, Persona } from '~/types/playground';

interface Props {
  podcastSettings: FullPodcastSettings; // Use FullPodcastSettings from ~/types/playground
  personasForForm: Persona[]; // Use Persona from ~/types/playground
  personasLoading: boolean;
  isScriptGenerating: boolean;
  isValidating: boolean;
  mainEditorContent: string;
  selectedPersonaIdForHighlighting: number | null;
  highlightedScript: string;
}

defineProps<Props>();

const emit = defineEmits(['update:podcastSettings', 'update:mainEditorContent']);
</script>
