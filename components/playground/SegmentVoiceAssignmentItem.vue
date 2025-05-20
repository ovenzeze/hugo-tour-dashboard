<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { PlayIcon, StopIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/vue/24/solid';
import type { SegmentState, PreviewableSegment } from '~/composables/useSegmentPreview';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface Props {
  segment: PreviewableSegment;
  segmentIndex: number;
  isPreviewingThisSegment: boolean;
  segmentState: SegmentState | undefined;
  audioUrl: string | null; // This is the specific audio URL for this segment's preview attempt
  isGlobalLoading: boolean; // To disable controls when something global is happening
  personaAvatarUrl?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits([
  'preview-segment', // Request to parent to generate/fetch audio and set isPreviewingThisSegment
  'audio-play',      // Inform parent that audio playback has started
  'audio-pause-or-end',// Inform parent that audio playback has paused or ended
]);

const audioPlayerElement = ref<HTMLAudioElement | null>(null);
const isPlaying = ref(false); // Local state reflecting if HTML audio element is playing

const currentSegmentState = computed(() => props.segmentState);
const status = computed(() => currentSegmentState.value?.status || 'idle');
const message = computed(() => currentSegmentState.value?.message || '');
const errorDetails = computed(() => currentSegmentState.value?.error || '');

// Use the audioUrl prop first, as it's the result of a specific preview attempt.
// Fallback to segment.audioUrl if needed, though parent should manage this via audioUrl prop.
const effectiveAudioUrl = computed(() => props.audioUrl || props.segment.audioUrl);

const handlePreviewClick = () => {
  if (status.value === 'loading' || props.isGlobalLoading || !props.segment.voiceId) return;
  
  if (isPlaying.value) {
    audioPlayerElement.value?.pause();
    // Parent will react via 'audio-pause-or-end' and likely set isPreviewingThisSegment to false
  } else {
    // Request parent to prepare and start preview for this segment.
    // Parent should then update isPreviewingThisSegment and audioUrl for this segment.
    emit('preview-segment'); 
  }
};

const onAudioPlay = () => {
  isPlaying.value = true;
  emit('audio-play');
};

const onAudioPause = () => {
  isPlaying.value = false;
  emit('audio-pause-or-end');
};

const onAudioEnded = () => {
  isPlaying.value = false;
  emit('audio-pause-or-end');
};

// Watch for changes in the parent's signal to preview this segment
watch(() => props.isPreviewingThisSegment, (shouldPreview) => {
  if (shouldPreview && effectiveAudioUrl.value) {
    if (audioPlayerElement.value && audioPlayerElement.value.src !== effectiveAudioUrl.value) {
      audioPlayerElement.value.src = effectiveAudioUrl.value;
      audioPlayerElement.value.load();
    }
    audioPlayerElement.value?.play().catch(e => console.error(`Error playing audio for segment ${props.segmentIndex}:`, e));
  } else if (!shouldPreview && isPlaying.value) {
    audioPlayerElement.value?.pause();
  }
});

// Watch for changes in the audio URL itself
watch(effectiveAudioUrl, (newUrl) => {
  if (newUrl && props.isPreviewingThisSegment) {
     if (audioPlayerElement.value && audioPlayerElement.value.src !== newUrl) {
      audioPlayerElement.value.src = newUrl;
      audioPlayerElement.value.load();
    }
    audioPlayerElement.value?.play().catch(e => console.error(`Error playing new audio URL for segment ${props.segmentIndex}:`, e));
  } else if (!newUrl && isPlaying.value) {
    audioPlayerElement.value?.pause();
    // isPlaying.value will be set to false by the 'pause' event handler
  }
});

onMounted(() => {
  // Ensure audio events are attached if player exists
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
    audioPlayerElement.value.src = ''; // Release audio source
  }
});

</script>

<template>
  <Card 
    class="mb-3 transition-all duration-300 ease-in-out" 
    :class="{
      'ring-2 ring-primary shadow-lg': isPreviewingThisSegment, 
      'opacity-70': isGlobalLoading && !isPreviewingThisSegment 
    }"
  >
    <CardContent class="p-4">
      <div class="flex flex-col sm:flex-row gap-4 items-start">
        <!-- Avatar and Speaker Info -->
        <div class="flex-shrink-0 flex flex-col items-center w-full sm:w-24">
          <Avatar class="w-16 h-16 mb-2 border-2" :class="{'border-primary': isPreviewingThisSegment}">
            <AvatarImage :src="personaAvatarUrl || undefined" :alt="segment.speakerTag" />
            <AvatarFallback>{{ segment.speakerTag.substring(0, 2).toUpperCase() }}</AvatarFallback>
          </Avatar>
          <div class="text-center">
            <p class="font-semibold text-sm text-foreground">{{ segment.speakerTag }}</p>
            <Badge variant="outline" class="text-xs mt-1 capitalize">{{ segment.roleType }}</Badge>
          </div>
        </div>

        <!-- Main Content: Text, Voice Info, Controls -->
        <div class="flex-grow space-y-3 w-full">
          <!-- Assigned Voice Information -->
          <div class="p-3 rounded-md bg-muted/50 border">
            <h4 class="text-xs font-medium text-muted-foreground mb-1">Assigned Voice:</h4>
            <div v-if="segment.voiceId && segment.assignedVoiceName">
              <p class="text-sm font-semibold">{{ segment.assignedVoiceName }}</p>
              <p class="text-xs text-muted-foreground">Provider: {{ segment.ttsProvider || 'N/A' }}</p>
            </div>
            <div v-else>
              <p class="text-sm text-destructive-foreground bg-destructive p-2 rounded-md">No voice assigned</p>
            </div>
          </div>
          
          <!-- Segment Text -->
          <div>
            <p class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{{ segment.currentText }}</p>
          </div>

          <!-- Controls and Status -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-dashed">
            <div class="flex items-center gap-2">
              <Button 
                @click="handlePreviewClick"
                :disabled="status === 'loading' || isGlobalLoading || !segment.voiceId"
                size="sm"
                variant="ghost"
                class="hover:bg-primary/10"
              >
                <component 
                  :is="isPlaying ? StopIcon : SpeakerWaveIcon" 
                  class="w-5 h-5 mr-2"
                  :class="{'text-primary animate-pulse': isPlaying, 'text-foreground': !isPlaying}"
                />
                {{ isPlaying ? 'Stop' : (status === 'loading' ? 'Loading...' : 'Preview') }}
              </Button>
              <audio ref="audioPlayerElement" class="hidden"></audio> <!-- src is managed dynamically -->
            </div>
            
            <div v-if="status === 'error'" class="text-xs text-destructive text-right">
              <TooltipProvider :delay-duration="200">
                <Tooltip>
                  <TooltipTrigger>
                    <span class="flex items-center"><SpeakerXMarkIcon class="w-4 h-4 mr-1"/> Error</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" class="max-w-xs">
                    <p class="text-xs">{{ message }}: {{ errorDetails }}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div v-else-if="status !== 'idle' && status !== 'loading' && message" class="text-xs text-muted-foreground text-right">
              {{ message }}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>