<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundScriptStore } from '@/stores/playgroundScriptStore';
import { usePlaygroundUIStore } from '@/stores/playgroundUIStore';
import { usePlaygroundProcessStore } from '@/stores/playgroundProcessStore';
import type { ScriptSegment } from '@/types/api/podcast';
import type { Persona } from '@/types/persona';
import type { AssignedVoicePerformance } from '@/stores/playgroundUIStore';

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface Props {
  segmentIndex: number;
}

const props = defineProps<Props>();

const scriptStore = usePlaygroundScriptStore();
const uiStore = usePlaygroundUIStore();
const processStore = usePlaygroundProcessStore();

const { currentlyPreviewingSegmentIndex, finalAudioUrl: globalFinalAudioUrl } = storeToRefs(uiStore);
const { previewApiResponse, isSynthesizing: isGlobalSynthesizing, isLoading: generalIsLoading } = storeToRefs(processStore); // Renamed isGlobalLoading to avoid conflict with computed

const audioPlayerElement = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);

// --- Computed properties for segment data ---
const currentSegmentData = computed<ScriptSegment | undefined>(() => {
  return scriptStore.parsedSegments[props.segmentIndex];
});

const assignedPerformanceDetails = computed<AssignedVoicePerformance | undefined>(() => {
  const speakerTag = currentSegmentData.value?.speaker;
  if (!speakerTag) return undefined;
  return uiStore.assignedVoicePerformances[speakerTag]; // Accessing getter
});

const personaForSegment = computed<Persona | undefined>(() => {
  const personaId = assignedPerformanceDetails.value?.persona_id;
  if (personaId === undefined) return undefined;
  return uiStore.availableVoices.find(p => p.persona_id === personaId); // Accessing getter
});

const avatarSrc = computed(() => personaForSegment.value?.avatar_url || "");
const speakerTagDisplay = computed(() => currentSegmentData.value?.speaker || 'N/A');
// roleTypeDisplay needs to be derived, perhaps from speakerTag or a future field in ScriptSegment/AssignedVoicePerformance
const roleTypeDisplay = computed(() => {
    // Placeholder logic: Try to infer from speaker tag or default
    if (currentSegmentData.value?.speaker?.toLowerCase().includes('host')) return 'Host';
    if (currentSegmentData.value?.speaker?.toLowerCase().includes('guest')) return 'Guest';
    return currentSegmentData.value?.speaker ? 'Speaker' : 'N/A';
});
const personaLanguageDisplay = computed(() => personaForSegment.value?.language_support?.join(', ') || '');
const voiceNameDisplay = computed(() => assignedPerformanceDetails.value?.persona_name || 'No voice assigned');
const ttsProviderDisplay = computed(() => assignedPerformanceDetails.value?.tts_provider || '');
const segmentTextDisplay = computed(() => currentSegmentData.value?.text || '');
const voiceIdForSegment = computed(() => assignedPerformanceDetails.value?.voice_id || assignedPerformanceDetails.value?.voice_model_identifier);

const personaMatchStatusDisplay = computed(() => {
  const segment = currentSegmentData.value as (ScriptSegment & { personaMatchStatus?: 'exact' | 'fallback' | 'none' });
  return segment?.personaMatchStatus || 'none'; // Default to 'none' if not present
});

// --- Computed properties for preview state ---
const segmentPreviewResult = computed(() => {
  return previewApiResponse.value?.segmentPreviews?.find(p => p.segmentIndex === props.segmentIndex);
});

const segmentPreviewStatus = computed(() => {
  const current = segmentPreviewResult.value;
  if (!current) return { status: 'idle', message: '', error: '' };
  if (current.error) return { status: 'error', message: 'Preview Error', error: current.error };
  if (current.audioUrl) return { status: 'success', message: 'Preview Ready', error: '' };
  // Add a check for active synthesis for this specific segment if possible, otherwise rely on global synthesizing flag
  // For now, if no error and no URL, but global synthesizing is on for this segment, it's loading.
  if (isGlobalSynthesizing.value && currentlyPreviewingSegmentIndex.value === props.segmentIndex) {
    return { status: 'loading', message: 'Generating...', error: ''};
  }
  return { status: 'idle', message: 'Ready to preview', error: '' };
});

const effectiveAudioUrl = computed(() => segmentPreviewResult.value?.audioUrl || null);

const isPreviewingThisSegment = computed(() => currentlyPreviewingSegmentIndex.value === props.segmentIndex);

// isLoadingThisSegment should reflect if this specific segment is currently in the process of fetching/generating its preview.
// This might be true if isGlobalSynthesizing is true AND this segment is the one being targeted.
const isLoadingThisSegment = computed(() =>
  isGlobalSynthesizing.value && // Global flag indicating some synthesis is happening
  currentlyPreviewingSegmentIndex.value === props.segmentIndex && // This segment is targeted
  !effectiveAudioUrl.value && // And we don't have an audio URL yet
  !segmentPreviewResult.value?.error // And there's no error reported for it yet
);

const status = computed(() => isLoadingThisSegment.value ? 'loading' : segmentPreviewStatus.value.status);
const message = computed(() => isLoadingThisSegment.value ? 'Generating...' : segmentPreviewStatus.value.message);
const errorDetails = computed(() => segmentPreviewStatus.value.error);


const handlePreviewClick = async () => {
  // Use generalIsLoading for global operations not specific to this segment's preview
  if (isLoadingThisSegment.value || generalIsLoading.value || !voiceIdForSegment.value) return;

  if (isPlaying.value) {
    audioPlayerElement.value?.pause();
     // When stopping, we might want to clear it as the "currently previewing"
    if(isPreviewingThisSegment.value) {
        uiStore.setCurrentlyPreviewingSegmentIndex(null);
    }
  } else {
    uiStore.setCurrentlyPreviewingSegmentIndex(props.segmentIndex); // Set this segment as the one being previewed
    if (effectiveAudioUrl.value && status.value === 'success') {
      // Audio already available, just play (watcher will handle it)
    } else {
      // Request new preview generation for all segments (as per current store action)
      // The store action will set isGlobalSynthesizing
      try {
        await processStore.synthesizeAudioPreviewForAllSegments();
      } catch (e) {
        console.error(`Error requesting preview for segment ${props.segmentIndex}:`, e);
        uiStore.setCurrentlyPreviewingSegmentIndex(null); // Clear on error
      }
    }
  }
};

const onAudioPlay = () => { isPlaying.value = true; };
const onAudioPause = () => {
  isPlaying.value = false;
  // Do not nullify currentlyPreviewingSegmentIndex here, allow re-play without re-fetching if paused.
};
const onAudioEnded = () => {
  isPlaying.value = false;
  if (currentlyPreviewingSegmentIndex.value === props.segmentIndex) {
    uiStore.setCurrentlyPreviewingSegmentIndex(null); // Reset previewing state on end
  }
};

watch(effectiveAudioUrl, (newUrl) => {
  if (newUrl && isPreviewingThisSegment.value) { // isPreviewingThisSegment ensures we only auto-play the active one
    if (audioPlayerElement.value) {
      if (audioPlayerElement.value.src !== newUrl) {
        audioPlayerElement.value.src = newUrl;
        audioPlayerElement.value.load();
      }
      // Check if it was already playing or if it's a new URL for the active segment
      audioPlayerElement.value.play().catch(e => console.error(`Error playing audio for segment ${props.segmentIndex}:`, e));
    }
  } else if (!newUrl && isPlaying.value) { // If URL becomes null (e.g. reset) and it was playing
    audioPlayerElement.value?.pause();
  }
});

// Watcher to handle play/pause when isPreviewingThisSegment changes externally
// or when effectiveAudioUrl becomes available for the active segment.
watch([isPreviewingThisSegment, effectiveAudioUrl], ([shouldBePreviewing, url]) => {
    if (shouldBePreviewing && url) {
        if (audioPlayerElement.value) {
            if (audioPlayerElement.value.src !== url) {
                audioPlayerElement.value.src = url;
                audioPlayerElement.value.load();
            }
            if (!isPlaying.value) { // Only play if not already playing
                 audioPlayerElement.value.play().catch(e => console.error(`Error playing audio for segment ${props.segmentIndex} from watcher:`, e));
            }
        }
    } else if (!shouldBePreviewing && isPlaying.value) {
        audioPlayerElement.value?.pause();
    }
}, { deep: true });


onMounted(() => {
  if (audioPlayerElement.value) {
    audioPlayerElement.value.addEventListener('play', onAudioPlay);
    audioPlayerElement.value.addEventListener('pause', onAudioPause);
    audioPlayerElement.value.addEventListener('ended', onAudioEnded);
  }
});

onBeforeUnmount(() => {
  if (audioPlayerElement.value) {
    audioPlayerElement.value.removeEventListener('play', onAudioPlay);
    audioPlayerElement.value.removeEventListener('pause', onAudioPause);
    audioPlayerElement.value.removeEventListener('ended', onAudioEnded);
    audioPlayerElement.value.pause();
    audioPlayerElement.value.src = '';
  }
});

</script>

<template>
  <Card
    v-if="currentSegmentData"
    class="mb-3 transition-all duration-300 ease-in-out bg-transparent hover:bg-muted/30"
    :class="{
      'ring-2 ring-primary shadow-lg bg-muted/50': isPreviewingThisSegment,
      'opacity-70': generalIsLoading && !isPreviewingThisSegment // Use renamed generalIsLoading, remove .value for template
    }"
  >
    <CardContent class="p-4">
      <div class="flex flex-col sm:flex-row gap-4 items-start">
        <!-- Avatar and Speaker Info -->
        <div class="flex-shrink-0 flex flex-col items-center w-full sm:w-auto sm:min-w-[8rem] text-center">
          <Avatar class="w-16 h-16 mb-2 border-2" :class="{'border-primary': isPreviewingThisSegment}">
            <AvatarImage :src="avatarSrc" :alt="speakerTagDisplay" />
            <AvatarFallback>{{ speakerTagDisplay.substring(0, 2).toUpperCase() }}</AvatarFallback>
          </Avatar>
          <div class="space-y-1">
            <p class="font-semibold text-sm text-foreground">{{ speakerTagDisplay }}</p>
            <Badge variant="outline" class="text-xs capitalize">{{ roleTypeDisplay }}</Badge>
            <Badge v-if="personaLanguageDisplay" variant="secondary" class="text-xs capitalize block">{{ personaLanguageDisplay }}</Badge>
          </div>
        </div>

        <!-- Main Content: Text, Voice Info, Controls -->
        <div class="flex-grow space-y-3 w-full">
          <!-- Assigned Voice Information -->
          <div class="mb-2 text-sm">
            <div v-if="voiceIdForSegment" class="flex items-center gap-1.5">
              <span class="font-semibold">{{ voiceNameDisplay }}</span>
              <span v-if="ttsProviderDisplay" class="text-xs text-muted-foreground">({{ ttsProviderDisplay }})</span>
              
              <TooltipProvider v-if="personaMatchStatusDisplay !== 'exact'">
                <Tooltip :delay-duration="100">
                  <TooltipTrigger>
                    <Icon
                      v-if="personaMatchStatusDisplay === 'fallback'"
                      name="ph:warning-circle-fill"
                      class="w-4 h-4 text-amber-500"
                    />
                    <Icon
                      v-else-if="personaMatchStatusDisplay === 'none' && voiceIdForSegment"
                      name="ph:question-fill"
                      class="w-4 h-4 text-orange-500"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p v-if="personaMatchStatusDisplay === 'fallback'" class="text-xs">
                      Original speaker tag not found in personas. Using fallback voice.
                    </p>
                    <p v-else-if="personaMatchStatusDisplay === 'none' && voiceIdForSegment" class="text-xs">
                      Voice assigned, but original speaker tag match status unknown.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
               <Icon
                v-else-if="personaMatchStatusDisplay === 'exact'"
                name="ph:check-circle-fill"
                class="w-4 h-4 text-green-600"
              />
            </div>
            <div v-else>
              <p class="text-destructive font-medium flex items-center gap-1">
                <Icon name="ph:x-circle-fill" class="w-4 h-4" />
                No voice assigned
              </p>
            </div>
          </div>

          <!-- Segment Text -->
          <div>
            <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ segmentTextDisplay }}</p>
          </div>

          <!-- Controls and Status -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-dashed">
            <div class="flex items-center gap-2">
              <Button
                @click="handlePreviewClick"
                :disabled="isLoadingThisSegment || generalIsLoading || !voiceIdForSegment"
                size="sm"
                variant="ghost"
                class="hover:bg-primary/10"
              >
                <Icon
                  :name="isPlaying ? 'ph:stop-fill' : 'ph:speaker-high-fill'"
                  class="w-5 h-5 mr-2"
                  :class="{'text-primary animate-pulse': isPlaying, 'text-foreground': !isPlaying}"
                />
                {{ isPlaying ? 'Stop' : (isLoadingThisSegment ? 'Loading...' : (status === 'success' && effectiveAudioUrl ? 'Play' : 'Preview')) }}
              </Button>
              <audio ref="audioPlayerElement" class="hidden"></audio>
            </div>

            <div v-if="status === 'error'" class="text-xs text-destructive text-right">
              <TooltipProvider :delay-duration="200">
                <Tooltip>
                  <TooltipTrigger>
                    <span class="flex items-center"><Icon name="ph:speaker-x-fill" class="w-4 h-4 mr-1"/> Error</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" class="max-w-xs">
                    <p class="text-xs">{{ message }} {{ errorDetails ? `- ${errorDetails}` : '' }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div v-else-if="status === 'success' && effectiveAudioUrl && !isPlaying" class="text-xs text-muted-foreground text-right">
              Preview ready.
            </div>
             <div v-else-if="status === 'pending' || (status === 'idle' && !effectiveAudioUrl)" class="text-xs text-muted-foreground text-right">
              Click Preview.
            </div>
            <div v-else-if="message && status !== 'loading' && status !== 'success'" class="text-xs text-muted-foreground text-right">
              {{ message }}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
  <div v-else class="p-4 text-sm text-muted-foreground">Segment data not available.</div>
</template>