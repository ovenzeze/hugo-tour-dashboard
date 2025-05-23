<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundScriptStore } from '@/stores/playgroundScriptStore';
import { usePlaygroundUIStore } from '@/stores/playgroundUIStore';
import { usePlaygroundProcessStore } from '@/stores/playgroundProcessStore';
import { usePlaygroundUnifiedStore } from '@/stores/playgroundUnified';
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
const unifiedStore = usePlaygroundUnifiedStore();

const { currentlyPreviewingSegmentIndex, finalAudioUrl: globalFinalAudioUrl } = storeToRefs(uiStore);
const { previewApiResponse, isSynthesizing: isGlobalSynthesizing, isLoading: generalIsLoading } = storeToRefs(processStore); // Renamed isGlobalLoading to avoid conflict with computed

const audioPlayerElement = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false);

// --- Computed properties for segment data ---
const currentSegmentData = computed<ScriptSegment | undefined>(() => {
  return unifiedStore.parsedSegments?.[props.segmentIndex];
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
    return { status: 'loading', message: 'Processing...', error: ''};
  }
  return { status: 'idle', message: 'Ready to preview', error: '' };
});

// effectiveAudioUrl 已在上面重新定义

const isPreviewingThisSegment = computed(() => currentlyPreviewingSegmentIndex.value === props.segmentIndex);

// isLoadingThisSegment should reflect if this specific segment is currently in the process of fetching/generating its preview.
// This might be true if isGlobalSynthesizing is true AND this segment is the one being targeted.
// 从 unified store 获取此片段的实时进度
const segmentProgress = computed(() => {
  return unifiedStore.segmentSynthesisProgress[props.segmentIndex] || {
    status: 'idle',
    progress: 0,
    stage: 'waiting'
  };
});

const isLoadingThisSegment = computed(() => {
  // 优先使用 unified store 的状态
  if (segmentProgress.value.status === 'loading') {
    return true;
  }
  
  // 如果 unified store 没有状态，回退到原来的逻辑
  return isGlobalSynthesizing.value && // Global flag indicating some synthesis is happening
    currentlyPreviewingSegmentIndex.value === props.segmentIndex && // This segment is targeted
    !effectiveAudioUrl.value && // And we don't have an audio URL yet
    !segmentPreviewResult.value?.error; // And there's no error reported for it yet
});

const status = computed(() => {
  const progressStatus = segmentProgress.value.status;
  if (progressStatus !== 'idle') {
    return progressStatus;
  }
  return isLoadingThisSegment.value ? 'loading' : segmentPreviewStatus.value.status;
});

const message = computed(() => {
  const progressStatus = segmentProgress.value.status;
  if (progressStatus === 'loading') {
    return segmentProgress.value.stage || 'Processing...';
  }
  if (progressStatus === 'success') {
    return 'Audio ready';
  }
  if (progressStatus === 'error') {
    return segmentProgress.value.error || 'Synthesis failed';
  }
  return isLoadingThisSegment.value ? 'Processing...' : segmentPreviewStatus.value.message;
});

const errorDetails = computed(() => {
  if (segmentProgress.value.status === 'error') {
    return segmentProgress.value.error;
  }
  return segmentPreviewStatus.value.error;
});

// 计算有效的音频URL，优先使用 unified store 的结果
const effectiveAudioUrl = computed(() => {
  if (segmentProgress.value.audioUrl) {
    return segmentProgress.value.audioUrl;
  }
  return segmentPreviewResult.value?.audioUrl || null;
});


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
    class="mb-3 transition-all duration-500 ease-in-out bg-transparent hover:bg-muted/30 relative overflow-hidden"
    :class="{
      'ring-2 ring-primary shadow-lg bg-muted/50': isPreviewingThisSegment,
      'opacity-70': generalIsLoading && !isPreviewingThisSegment,
      'border-primary/30 shadow-md': isLoadingThisSegment,
      'border-green-200 bg-green-50/30 dark:bg-green-950/20': status === 'success' && effectiveAudioUrl,
      'border-destructive/30 bg-destructive/5': status === 'error'
    }"
  >
    <!-- Wave animation overlay for loading state -->
    <div
      v-if="isLoadingThisSegment"
      class="absolute inset-0 z-10 pointer-events-none overflow-hidden"
    >
      <div class="wave-animation absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10"></div>
      <div class="wave-bars absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 h-2 pb-1">
        <div v-for="i in 8" :key="i" class="wave-bar bg-primary/40 w-1 rounded-t" :style="{ animationDelay: `${i * 0.1}s` }"></div>
      </div>
    </div>

    <!-- Processing progress indicator -->
    <div
      v-if="isLoadingThisSegment"
      class="absolute top-2 right-2 z-20 bg-primary/10 backdrop-blur-sm rounded-full p-2"
    >
      <Icon name="ph:spinner-gap" class="w-4 h-4 animate-spin text-primary" />
    </div>

    <!-- Success indicator -->
    <div
      v-else-if="status === 'success' && effectiveAudioUrl"
      class="absolute top-2 right-2 z-20 bg-green-100 dark:bg-green-950/40 rounded-full p-2"
    >
      <Icon name="ph:check-circle-fill" class="w-4 h-4 text-green-600" />
    </div>
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
              <!-- Main action button -->
              <Button
                @click="handlePreviewClick"
                :disabled="isLoadingThisSegment || (generalIsLoading && !isPreviewingThisSegment) || !voiceIdForSegment"
                size="sm"
                :variant="status === 'success' && effectiveAudioUrl ? 'default' : 'ghost'"
                class="hover:bg-primary/10 transition-all duration-300"
                :class="{
                  'bg-primary/10 border-primary/20': isLoadingThisSegment,
                  'bg-green-50 border-green-200 hover:bg-green-100 text-green-700': status === 'success' && effectiveAudioUrl && !isPlaying,
                  'bg-primary text-primary-foreground hover:bg-primary/90': isPlaying
                }"
              >
                <Icon
                  v-if="isLoadingThisSegment"
                  name="ph:spinner-gap"
                  class="w-4 h-4 mr-2 animate-spin text-primary"
                />
                <Icon
                  v-else-if="isPlaying"
                  name="ph:stop-fill"
                  class="w-4 h-4 mr-2 animate-pulse"
                />
                <Icon
                  v-else-if="status === 'success' && effectiveAudioUrl"
                  name="ph:play-fill"
                  class="w-4 h-4 mr-2 text-green-600"
                />
                <Icon
                  v-else-if="status === 'error'"
                  name="ph:arrow-clockwise"
                  class="w-4 h-4 mr-2 text-muted-foreground"
                />
                <Icon
                  v-else
                  name="ph:speaker-high-fill"
                  class="w-4 h-4 mr-2 text-muted-foreground"
                />
                
                <span v-if="isLoadingThisSegment">Synthesizing...</span>
                <span v-else-if="isPlaying">Stop</span>
                <span v-else-if="status === 'success' && effectiveAudioUrl">Play Audio</span>
                <span v-else-if="status === 'error'">Retry</span>
                <span v-else>Generate Preview</span>
              </Button>
              
              <!-- Progress indicator for synthesis -->
              <div v-if="isLoadingThisSegment" class="flex flex-col gap-2 min-w-0">
                <!-- Progress text with stage info -->
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <div class="flex gap-0.5">
                    <div v-for="i in 3" :key="i" class="w-1 h-1 bg-primary rounded-full animate-bounce" :style="{ animationDelay: `${i * 0.2}s` }"></div>
                  </div>
                  <span class="truncate">{{ segmentProgress.stage || 'Processing audio...' }}</span>
                </div>
                
                <!-- Progress bar -->
                <div v-if="segmentProgress.progress > 0" class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div 
                    class="h-full bg-primary transition-all duration-300 ease-out"
                    :style="{ width: `${Math.min(100, Math.max(0, segmentProgress.progress))}%` }"
                  ></div>
                </div>
              </div>
              
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

<style scoped>
/* Wave animation for loading state */
@keyframes wave-flow {
  0% {
    transform: translateX(-100%);
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    transform: translateX(100%);
    opacity: 0.3;
  }
}

.wave-animation {
  animation: wave-flow 2s ease-in-out infinite;
}

/* Wave bars animation */
@keyframes wave-bar {
  0%, 100% {
    height: 0.25rem;
    opacity: 0.4;
  }
  50% {
    height: 0.75rem;
    opacity: 1;
  }
}

.wave-bar {
  animation: wave-bar 1.2s ease-in-out infinite;
  min-height: 0.25rem;
}

/* Smooth transitions for state changes */
.segment-card-transition {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effects for audio controls */
.audio-control-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Success state glow effect */
.success-glow {
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
}

/* Processing state pulse effect */
.processing-pulse {
  animation: processing-pulse 2s ease-in-out infinite;
}

@keyframes processing-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
}
</style>