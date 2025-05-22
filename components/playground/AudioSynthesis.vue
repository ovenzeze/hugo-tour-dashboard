<!--
@description Enhanced audio synthesis component with advanced controls and better UX
-->

<template>
  <div class="space-y-6">
    <!-- Script Preview -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Script Preview</Label>
        <Badge variant="outline" class="text-xs">Read-only</Badge>
      </div>
      <!-- <ScrollArea class="h-[200px] w-full rounded-md border p-4">
        <pre class="text-sm font-mono whitespace-pre-wrap">{{ scriptContent }}</pre>
      </ScrollArea> -->
    </div>

    <!-- Synthesis Controls -->
    <div class="space-y-4">
      <div class="space-y-2">
        <Label>Output Filename</Label>
        <Input 
          v-model="localOutputFilename"
          placeholder="podcast_output.mp3"
          :disabled="isLoading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Voice Temperature ({{ synthesisParamsForTemplate.temperature }})</Label>
          <HoverCard>
            <HoverCardTrigger>
              <Button variant="ghost" size="icon">
                <HelpCircle class="h-4 w-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <p class="text-sm">Controls the degree of voice variation. Higher values produce more variation, while lower values result in more stable output.</p>
            </HoverCardContent>
          </HoverCard>
        </div>
        <Slider
          v-model="temperatureForSlider"
          :min="0"
          :max="1"
          :step="0.1"
          :disabled="isLoading"
        />
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label>Speech Rate ({{ synthesisParamsForTemplate.speed }}x)</Label>
          <HoverCard>
            <HoverCardTrigger>
              <Button variant="ghost" size="icon">
                <HelpCircle class="h-4 w-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <p class="text-sm">Adjust the playback speed of the voice. 1.0 is normal speed, greater than 1.0 speeds up, less than 1.0 slows down.</p>
            </HoverCardContent>
          </HoverCard>
        </div>
        <Slider
          v-model="speedForSlider"
          :min="0.5"
          :max="2"
          :step="0.1"
          :disabled="isLoading"
        />
      </div>
    </div>

    <!-- Add timestamp information display area -->
    <div v-if="podcastSettings.useTimestamps" class="mt-4 border-t pt-4">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium">Timestamp Information Visualization</h4>
        <Badge variant="outline">Beta</Badge>
      </div>

      <div class="mt-2 p-3 bg-muted rounded-md text-xs">
        <p>Timestamp data imported from Step 2 will be used for advanced audio processing</p>
      </div>

      <!-- Can add a switch to control whether to use timestamps -->
      <div class="mt-3 flex items-center space-x-2">
        <Checkbox
          id="use-timestamps"
          v-model:checked="useTimestampsForSynthesis"
          :disabled="isLoading"
        />
        <Label for="use-timestamps">Use pre-generated timestamp data</Label>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <Button
        @click="handleSynthesize"
        :disabled="isLoading || !scriptContent?.trim()"
      >
        <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
        <RadioTower v-else class="w-4 h-4 mr-2" />
        {{ isLoading ? 'Processing...' : 'Generate Audio' }}
      </Button>
      <Button
        v-if="finalAudioUrl"
        variant="outline"
        @click="handleDownload"
        :disabled="isLoading"
      >
        <Download class="w-4 h-4 mr-2" />
        Download Audio
      </Button>
    </div>

    <!-- Audio Player -->
    <div v-if="finalAudioUrl" class="space-y-2">
      <Label>Podcast Audio</Label>
      <div class="rounded-lg border bg-card p-4">
        <audio :src="finalAudioUrl" controls class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';

// Assuming UI components are auto-imported by Nuxt or correctly pathed
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { RadioTower, Download, Loader2, HelpCircle } from 'lucide-vue-next';

const uiStore = usePlaygroundUIStore();
const scriptStore = usePlaygroundScriptStore();
const settingsStore = usePlaygroundSettingsStore();
const processStore = usePlaygroundProcessStore();

const { finalAudioUrl } = storeToRefs(uiStore); // Was modelValue
const { scriptContent } = storeToRefs(scriptStore);
const { synthesisParams: storeSynthesisParams, podcastSettings } = storeToRefs(settingsStore); // podcastSettings for useTimestamps from settings
const { isSynthesizing, isCombining, error: processError } = storeToRefs(processStore);

const isLoading = computed(() => isSynthesizing.value || isCombining.value);
// const disabled = computed(() => /* some logic based on store states */ false); // Placeholder for disabled logic

// Local state for UI, synced with store
const localOutputFilename = ref(podcastSettings.value.title ? `${podcastSettings.value.title.replace(/\s+/g, '_')}.mp3` : 'podcast_output.mp3');
watch(localOutputFilename, (newValue) => {
  // Potentially update a field in settingsStore if outputFilename needs to be persisted globally
  // settingsStore.updatePodcastSettings({ outputFilename: newValue }); // Example
});
watch(() => podcastSettings.value.title, (newTitle) => {
    if (newTitle && !localOutputFilename.value.startsWith(newTitle.replace(/\s+/g, '_'))) {
        localOutputFilename.value = `${newTitle.replace(/\s+/g, '_')}.mp3`;
    } else if (!newTitle && localOutputFilename.value !== 'podcast_output.mp3') {
        localOutputFilename.value = 'podcast_output.mp3';
    }
});


// Computed properties to bridge Slider's array model with store's single number values
const temperatureForSlider = computed({
  get: () => [storeSynthesisParams.value.temperature ?? 0.7],
  set: (val) => settingsStore.updateSynthesisParams({ temperature: val[0] })
});

const speedForSlider = computed({
  get: () => [storeSynthesisParams.value.speed ?? 1.0],
  set: (val) => settingsStore.updateSynthesisParams({ speed: val[0] })
});

// Assuming useTimestamps is part of podcastSettings or a new specific store state
// For now, let's assume it's a setting in podcastSettings.
const useTimestampsForSynthesis = computed({
    get: () => podcastSettings.value.useTimestamps ?? true, // Default to true if not set
    set: (val) => settingsStore.updatePodcastSettings({ useTimestamps: val })
});


const handleSynthesize = async () => {
  if (!scriptContent.value?.trim()) {
    processStore.error = "Script content is empty. Cannot synthesize.";
    return;
  }
  if (isLoading.value) return;

  try {
    // The synthesizeAudio action in processStore should internally get all necessary params
    // from settingsStore and scriptStore.
    const response = await processStore.synthesizeAudio();
    if (response?.success && response.finalAudioUrl) {
      uiStore.setFinalAudioUrl(response.finalAudioUrl);
      // Optionally move to next step or indicate completion
    } else if (response?.success && response.segmentResults && !response.finalAudioUrl) {
        // Segments synthesized, try to combine
        const combineResponse = await processStore.combineAudio();
        if (combineResponse?.success && combineResponse.audioUrl) {
            uiStore.setFinalAudioUrl(combineResponse.audioUrl);
        } else {
            processStore.error = combineResponse?.message || "Failed to combine audio segments.";
        }
    }
    // Error is handled within processStore actions
  } catch (e) {
    console.error("Synthesis process failed:", e);
    // Error should be set in processStore
  }
};

const handleDownload = () => {
  if (finalAudioUrl.value) {
    const link = document.createElement('a');
    link.href = finalAudioUrl.value;
    link.download = localOutputFilename.value || 'podcast_audio.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Expose synthesisParams for template binding (temperature and speed directly)
const synthesisParamsForTemplate = computed(() => ({
    temperature: storeSynthesisParams.value.temperature ?? 0.7,
    speed: storeSynthesisParams.value.speed ?? 1.0,
    // Arrays are handled by temperatureForSlider, speedForSlider for the slider components
    temperatureArray: temperatureForSlider.value,
    speedArray: speedForSlider.value,
}));

</script>