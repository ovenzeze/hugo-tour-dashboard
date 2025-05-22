<template>
  <div class="space-y-6">
    <!-- Podcast Information Summary -->
    <div class="rounded-lg border p-4 space-y-2 bg-muted/10">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-medium">Podcast Information</h3>
        <Badge variant="outline" class="bg-primary/10">{{ podcastIdForComposables || 'No ID' }}</Badge>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="font-medium">Title:</span> {{ podcastInfo.title || 'N/A' }}</div>
        <div><span class="font-medium">Host:</span> {{ podcastInfo.hostName || 'N/A' }}</div>
        <div><span class="font-medium">Guests:</span> {{ podcastInfo.guestNames?.join(', ') || 'None' }}</div>
        <div><span class="font-medium">Language:</span> {{ podcastInfo.language || 'English' }}</div>
      </div>
    </div>

    <!-- Status and Preparation Section -->
    <div class="space-y-4">
      <!-- Timeline Status -->
      <div class="rounded-lg border p-4 space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-medium">Timeline Status</h3>
          <Badge :variant="timelineManager.isTimelineGenerated.value ? 'default' : 'outline'" :class="timelineManager.isTimelineGenerated.value ? 'bg-primary/20' : ''">
            {{ timelineManager.isTimelineGenerated.value ? 'Generated' : 'Not Generated' }}
          </Badge>
        </div>
        
        <div v-if="timelineManager.isTimelineGenerated.value" class="text-sm space-y-1">
          <p><span class="font-medium">Segments:</span> {{ timelineManager.timelineData.value.length }}</p>
          <p><span class="font-medium">Estimated Duration:</span> {{ timelineManager.formatDuration(timelineManager.totalDuration.value) }}</p>
        </div>
        
        <div class="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            @click="timelineManager.generateTimeline"
            :disabled="timelineManager.isGeneratingTimeline.value || !podcastIdForComposables || segmentsManager.segmentsLoading.value"
          >
            <Icon name="ph:spinner" v-if="timelineManager.isGeneratingTimeline.value" class="w-4 h-4 mr-2 animate-spin" />
            <Icon name="ph:chart-line" v-else class="w-4 h-4 mr-2" />
            {{ timelineManager.isTimelineGenerated.value ? 'Update Timeline' : 'Generate Timeline' }}
          </Button>
          
          <Button
            v-if="timelineManager.timelineUrl.value"
            variant="ghost"
            size="sm"
            @click.prevent="timelineManager.handleViewTimelineJSON(timelineManager.timelineUrl.value)"
          >
            <Icon name="ph:file-json" class="w-4 h-4 mr-2" />
            View JSON
          </Button>
        </div>
      </div>

      <!-- Audio Segments Synthesis Status -->
      <div class="rounded-lg border p-4 space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-medium">Audio Segments Status</h3>
          <Badge variant="default" :class="segmentsManager.isAllSegmentsSynthesized.value ? 'bg-primary/20' : 'bg-muted'">
            {{ segmentsManager.synthesizedCount.value }} / {{ segmentsManager.totalSegments.value }} Synthesized
          </Badge>
        </div>
        
        <div class="flex flex-wrap gap-2 mb-3">
          <Button 
            variant="outline" 
            size="sm"
            @click="segmentsManager.handleSynthesizeAllSegments"
            :disabled="segmentsManager.isProcessingSegments.value || segmentsManager.segmentsLoading.value || !timelineManager.isTimelineGenerated.value"
          >
            <Icon name="ph:spinner" v-if="segmentsManager.isProcessingSegments.value" class="w-4 h-4 mr-2 animate-spin" />
            <Icon name="ph:broadcast" v-else class="w-4 h-4 mr-2" />
            Synthesize All
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            @click="segmentsManager.handleSynthesizeFailedSegments"
            :disabled="segmentsManager.isProcessingSegments.value || segmentsManager.segmentsLoading.value || !segmentsManager.hasFailedSegments.value || !timelineManager.isTimelineGenerated.value"
          >
            <Icon name="ph:arrows-clockwise" class="w-4 h-4 mr-2" />
            Retry Failed
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            @click="segmentsManager.refreshSegmentsStatus"
            :disabled="segmentsManager.segmentsLoading.value"
          >
            <Icon name="ph:spinner" v-if="segmentsManager.segmentsLoading.value" class="w-4 h-4 mr-2 animate-spin" />
            <Icon name="ph:arrow-counter-clockwise" v-else class="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>
        
        <!-- Segments List -->
        <div v-if="segmentsManager.segmentsLoading.value" class="flex justify-center py-8">
          <Icon name="ph:spinner" class="w-8 h-8 animate-spin text-primary" />
        </div>
        
        <div v-else-if="segmentsManager.segments.value.length === 0" class="text-center py-6 text-muted-foreground">
          No segments found. Please generate the timeline first.
        </div>
        
        <ScrollArea v-else class="h-[300px] w-full pr-4">
          <div class="space-y-2">
            <div 
              v-for="(segment, index) in segmentsManager.segments.value" 
              :key="segment.id || index"
              class="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/30 transition-colors"
            >
              <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                <Icon 
                  v-if="segment.status === 'success'" 
                  name="ph:check-circle" 
                  class="w-6 h-6 text-green-500" 
                />
                <Icon 
                  v-else-if="segment.status === 'processing'" 
                  name="ph:spinner" 
                  class="w-6 h-6 animate-spin text-primary" 
                />
                <Icon 
                  v-else-if="segment.status === 'failed'" 
                  name="ph:x-circle" 
                  class="w-6 h-6 text-destructive" 
                />
                <Icon 
                  v-else 
                  name="ph:clock" 
                  class="w-6 h-6 text-muted-foreground" 
                />
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center">
                  <Badge variant="outline" class="mr-2">{{ index + 1 }}</Badge>
                  <p class="font-medium text-sm truncate">{{ segment.speakerName }}</p>
                </div>
                <p class="text-xs text-muted-foreground truncate">{{ segment.text.substring(0, 100) }}</p>
              </div>
              
              <Button 
                v-if="segment.status !== 'success' && segment.status !== 'processing'"
                variant="ghost" 
                size="icon"
                @click="segmentsManager.handleSynthesizeSingleSegment(segment, index)"
                :disabled="segmentsManager.isProcessingSegments.value" 
              >
                <Icon name="ph:arrows-clockwise" class="w-4 h-4" />
              </Button>
              <Button 
                v-if="segment.status === 'success' && segment.audioUrl"
                variant="ghost" 
                size="icon"
                @click.prevent="audioPlayer.handlePlayFileWithoutRedirect(segment.audioUrl)"
              >
                <Icon name="ph:play" class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>

    <!-- Final Synthesis Control Section -->
    <div class="space-y-3">
      <div class="space-y-2">
        <Label>Output Filename</Label>
        <Input 
          v-model="finalizationManager.localOutputFilename.value" 
          placeholder="podcast_output.mp3"
          :disabled="finalizationManager.isProcessingFinal.value"
        />
      </div>
      
      <div class="flex flex-col gap-3 mt-4">
        <Button 
          @click="handleMergeAndEmit" 
          :disabled="!finalizationManager.canMergeFinalAudio.value || finalizationManager.isProcessingFinal.value"
          class="w-full"
        >
          <Icon name="ph:spinner" v-if="finalizationManager.isProcessingFinal.value" class="w-5 h-5 mr-2 animate-spin" />
          <Icon name="ph:broadcast" v-else class="w-5 h-5 mr-2" />
          {{ finalizationManager.isProcessingFinal.value ? 'Merging...' : 'Synthesize Final Podcast' }}
        </Button>
        
        <div v-if="!finalizationManager.canMergeFinalAudio.value && !segmentsManager.segmentsLoading.value" class="text-sm text-muted-foreground text-center">
          <span v-if="!timelineManager.isTimelineGenerated.value">Please generate the timeline first</span>
          <span v-else-if="segmentsManager.synthesizedCount.value < segmentsManager.totalSegments.value * 0.9">At least 90% of segments must be synthesized</span>
        </div>
      </div>
    </div>

    <!-- Results Display Section -->
    <div v-if="finalizationManager.finalAudioUrl.value" class="space-y-2 pt-3 border-t">
      <div class="flex justify-between items-center">
        <Label>Final Podcast</Label>
        <Button
          variant="outline"
          size="sm"
          @click="handleDownloadClick"
        >
          <Icon name="ph:download-simple" class="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
      <div class="rounded-lg border bg-card p-4">
        <audio :src="finalizationManager.finalAudioUrl.value" controls class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, toRef, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';

// Composables
import { usePodcastInfo } from '~/composables/podcast/usePodcastInfo';
import { usePodcastTimeline } from '~/composables/podcast/usePodcastTimeline';
import { usePodcastSegments } from '~/composables/podcast/usePodcastSegments';
import { usePodcastFinalization } from '~/composables/podcast/usePodcastFinalization';
import { usePodcastAudioPlayer } from '~/composables/podcast/usePodcastAudioPlayer';

// Define Props and Emits (some will be removed or changed)
const props = defineProps<{
  // podcastId will come from store
  // modelValue (finalAudioUrl) will come from store
  outputFilename?: string; // This might still be useful if parent wants to suggest initial name
  disabled?: boolean; // General disabled state
}>()

const emit = defineEmits<{
  // 'update:modelValue': [value: string]; // Will be handled by store action
  'update:outputFilename': [value: string]; // May keep if parent needs to know filename changes
  'download': []; // Download button is now internal
  // 'synthesize': []; // Synthesize actions are now internal via composables/stores
}>()

const processStore = usePlaygroundProcessStore();
const uiStore = usePlaygroundUIStore();
const settingsStore = usePlaygroundSettingsStore();


const { podcastId: storePodcastId } = storeToRefs(processStore);
const { finalAudioUrl: storeFinalAudioUrl } = storeToRefs(uiStore);
const { podcastSettings } = storeToRefs(settingsStore);

// Computed ref to ensure the type passed to composables is Ref<string | undefined>
const podcastIdForComposables = computed<string | undefined>(() => {
  const id = storePodcastId.value;
  if (id === null || id === undefined) {
    return undefined;
  }
  return String(id); // Ensure it's a string
});

// Instantiate Composables, passing reactive store values or refs
const { podcastInfo } = usePodcastInfo(podcastIdForComposables);

const timelineManager = usePodcastTimeline(podcastIdForComposables, async () => {
  if (segmentsManager) {
    await segmentsManager.refreshSegmentsStatus();
  }
});

const segmentsManager = usePodcastSegments(
  podcastIdForComposables,
  timelineManager.isTimelineGenerated
);

// For finalizationManager, outputFilename and finalAudioUrl need to sync with stores
// We pass the store's finalAudioUrl ref to the composable.
// The composable's localOutputFilename can be initialized by props.outputFilename or a default.
const initialOutputFilename = computed(() => props.outputFilename || podcastSettings.value.title?.replace(/\s+/g, '_') + '.mp3' || 'podcast_audio.mp3');

const finalizationManager = usePodcastFinalization(
  podcastIdForComposables,
  timelineManager.isTimelineGenerated,
  segmentsManager.synthesizedCount,
  segmentsManager.totalSegments
  // initialOutputFilename and storeFinalAudioUrl are no longer passed directly;
  // the composable now gets them from the settingsStore and uiStore respectively.
);

const audioPlayer = usePodcastAudioPlayer();

// Watch for changes in localOutputFilename from the composable to emit update (if prop still used)
// Or, if outputFilename is managed in a store, update the store here.
watch(finalizationManager.localOutputFilename, (newName) => {
  // Example: if outputFilename were in settingsStore
  // if (newName !== settingsStore.podcastSettings.outputFilename) {
  //   settingsStore.updatePodcastSettings({ outputFilename: newName });
  // }
  // For now, if parent still uses v-model:outputFilename
  if (props.outputFilename !== undefined && newName !== props.outputFilename) {
    emit('update:outputFilename', newName);
  }
});

// handleMergeAndEmit now directly calls the composable method,
// which should internally update the uiStore's finalAudioUrl via its passed ref or by calling an action.
const handleMergeAndEmit = async () => {
  await finalizationManager.handleMergeAudio(
    (url: string) => { // onSuccess callback from composable
      uiStore.setFinalAudioUrl(url); // Update the store
    }
    // onFailure is handled in composable
  );
};

const handleDownloadClick = () => {
  if (storeFinalAudioUrl.value) {
    const link = document.createElement('a');
    link.href = storeFinalAudioUrl.value;
    link.download = finalizationManager.localOutputFilename.value || 'podcast_audio.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

</script>

<style scoped>
.audio-link {
  text-decoration: none;
}
</style>