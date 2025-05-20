<template>
  <div 
    class="border rounded-md p-3"
    :class="{'bg-blue-50/20 dark:bg-blue-900/5': segment.roleType === 'host', 
             'bg-green-50/20 dark:bg-green-900/5': segment.roleType === 'guest'}">
    
    <!-- Speaker Info and Controls -->
    <div class="flex justify-between items-center mb-2">
      <div class="flex items-center gap-2">
        <Badge 
          :variant="segment.roleType === 'host' ? 'default' : 'secondary'"
          class="uppercase text-xs font-semibold px-2 py-0.5"
        >
          {{ segment.roleType === 'host' ? 'Host' : 'Guest' }}
        </Badge>
        
        <div class="flex items-center gap-2">
          <div v-if="segment.persona?.avatar_url" class="w-6 h-6 rounded-full overflow-hidden">
            <img :src="segment.persona.avatar_url" class="w-full h-full object-cover" alt="Avatar" />
          </div>
          <div v-else class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
            {{ segment.speakerTag.charAt(0).toUpperCase() }}
          </div>
          
          <span class="font-medium">{{ segment.speakerTag }}</span>
        </div>
      </div>
      
      <!-- Voice Selection -->
      <div class="flex items-center gap-2">
        <Select
          :model-value="speakerAssignment"
          disabled
        >
          <SelectTrigger :id="`speaker-voice-${segment.speakerTag}-${segmentIndex}`" class="h-8 text-sm w-36">
            <SelectValue :placeholder="voiceSelectionPlaceholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel v-if="speakerAssignment && availableVoices.find(v => v.id === speakerAssignment)" class="text-xs py-1 flex items-center font-semibold">
                <Icon name="ph:speaker-high-duotone" class="h-3 w-3 text-primary mr-1" /> Assigned Voice
              </SelectLabel>
              <SelectItem v-if="speakerAssignment && availableVoices.find(v => v.id === speakerAssignment)" :key="speakerAssignment" :value="speakerAssignment">
                {{ availableVoices.find(v => v.id === speakerAssignment)?.name || 'Assigned Voice' }}
              </SelectItem>
              <!-- Fallback if no voices are available but an assignment exists (e.g. from persona but provider has no voices) -->
              <SelectItem v-else-if="speakerAssignment" :key="speakerAssignment" :value="speakerAssignment">
                {{ segment.assignedVoiceName || 'Assigned Voice (Unavailable)' }} 
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <!-- Generate Button -->
        <Button
          size="sm"
          variant="outline"
          :disabled="!speakerAssignment || props.isGlobalLoading || isPreviewingThisSegment || segmentState?.status === 'loading'"
          @click="emit('preview-segment')"
          class="w-auto px-2 py-1 h-8"
        >
          <Icon v-if="props.isGlobalLoading || isPreviewingThisSegment || segmentState?.status === 'loading'" name="ph:spinner" class="w-3 h-3 mr-1.5 animate-spin" />
          <Icon v-else name="ph:sparkle" class="w-3 h-3 mr-1.5" />
          {{ previewButtonText }}
        </Button>
      </div>
    </div>
    
    <!-- Text Content -->
    <div class="text-sm text-muted-foreground mb-2">
      {{ segment.text }}
    </div>
    
    <!-- Status and Audio Player -->
    <div class="flex flex-col gap-1">
      <div v-if="segmentState" class="text-xs flex items-center gap-2">
        <Icon v-if="segmentState.status === 'loading'" name="ph:spinner" class="w-3 h-3 animate-spin" />
        <Icon v-else-if="segmentState.status === 'success'" name="ph:check-circle" class="w-3 h-3 text-green-500" />
        <Icon v-else-if="segmentState.status === 'error'" name="ph:alert-circle" class="w-3 h-3 text-red-500" />
        <span :class="{
          'text-muted-foreground': segmentState.status === 'idle',
          'text-blue-500': segmentState.status === 'loading',
          'text-green-500': segmentState.status === 'success',
          'text-red-500': segmentState.status === 'error'
        }">{{ segmentState.message }}</span>
      </div>
      
      <div v-if="audioUrl">
        <audio 
          :src="audioUrl" 
          controls
          class="w-full h-7 rounded"
          :ref="audioPlayerRef"
          @play="emit('audio-play')"
          @pause="emit('audio-pause-or-end')"
          @ended="emit('audio-pause-or-end')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

interface Voice {
  id: string;
  name: string;
  personaId?: number | null;
  description?: string | null;
  avatarUrl?: string | null;
}

interface SegmentState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  error?: string;
  audioUrl?: string;
}

// Using any for segment for now, should be typed properly from parent later
// Typically this would come from playgroundStore types or a defined interface for enhancedScriptSegments
interface SegmentData {
  roleType: 'host' | 'guest';
  persona?: { avatar_url?: string | null };
  speakerTag: string;
  validationVoiceId?: string | null;
  assignedVoiceName?: string; // Added for fallback display
  text: string;
  // ... other properties from enhancedScriptSegments
}

const props = defineProps<{
  segment: SegmentData;
  segmentIndex: number;
  speakerAssignment?: string | null; // The voice_id assigned to this segment's speakerTag
  availableVoices: Voice[];
  isLoadingVoices: boolean;
  isPreviewingThisSegment: boolean;
  segmentState?: SegmentState | null;
  audioUrl?: string | null; // URL for the preview audio of this segment
  isGlobalLoading?: boolean; // Added new prop
}>();

const emit = defineEmits<{
  (e: 'update:speakerAssignment', value: string | undefined): void;
  (e: 'preview-segment'): void;
  (e: 'audio-play'): void;
  (e: 'audio-pause-or-end'): void;
}>();

const audioPlayerRef = ref<HTMLAudioElement | null>(null);

const voiceSelectionPlaceholder = computed(() => {
  if (props.isLoadingVoices) return 'Loading Voices...';
  if (props.availableVoices.length === 0) return 'No Voices Available';
  if (props.segment.validationVoiceId) return 'Recommended Voice Available';
  return 'Select Voice';
});

const previewButtonText = computed(() => {
  if (props.isGlobalLoading) return 'Generating All...';
  if (props.isPreviewingThisSegment || props.segmentState?.status === 'loading') return 'Generating...';
  return props.audioUrl ? 'Re-preview' : 'Preview';
});

// Expose the audio player element if needed by parent
defineExpose({ audioPlayerElement: audioPlayerRef });
</script> 