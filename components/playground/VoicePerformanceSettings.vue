<template>
  <div class="space-y-4">
    <!-- Top Control Bar -->
    <div class="flex items-center justify-between p-3 border rounded-md bg-muted/10">
      <div class="flex-shrink-0 w-1/3">
        <Select :model-value="ttsProvider" @update:model-value="(newValue) => { if (typeof newValue === 'string') onProviderChange(newValue); }">
          <SelectTrigger id="ttsProvider" class="w-full">
            <SelectValue placeholder="Select TTS Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="azure">Azure TTS</SelectItem>
              <SelectItem value="openai_tts">OpenAI TTS</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <div class="flex-1 flex items-center space-x-4 px-4">
        <!-- Voice Temperature Slider -->
        <div class="flex items-center gap-2 flex-1">
          <Label class="whitespace-nowrap text-sm">Temperature: {{ playgroundStore.synthesisParams.temperature.toFixed(1) }}</Label>
          <Slider
            class="flex-1"
            :model-value="playgroundStore.synthesisParams.temperatureArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ temperature: value[0] }) }"
            :min="0"
            :max="1"
            :step="0.1"
          />
        </div>
        
        <!-- Speech Speed Slider -->
        <div class="flex items-center gap-2 flex-1">
          <Label class="whitespace-nowrap text-sm">Speed: {{ playgroundStore.synthesisParams.speed.toFixed(1) }}x</Label>
          <Slider
            class="flex-1"
            :model-value="playgroundStore.synthesisParams.speedArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ speed: value[0] }) }"
            :min="0.5"
            :max="2"
            :step="0.1"
          />
        </div>
      </div>
    </div>

    <!-- Speaker Voice Assignment -->
    <div v-if="parsedScriptSegments.length > 0" class="border rounded-md p-4 space-y-3">
      <div class="flex items-center justify-between pb-2 border-b">
        <h4 class="font-medium">Voice Assignment</h4>
        <Button 
          variant="outline" 
          size="sm"
          :disabled="!canProceedToPreviewAll"
          @click="handlePreviewAllSegments"
        >
          <Icon name="ph:play" class="w-3.5 h-3.5 mr-1" />
          Preview All
        </Button>
      </div>
      
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        <SegmentVoiceAssignmentItem
          v-for="(segment, index) in enhancedScriptSegments"
          :key="`segment-item-${index}`"
          :segment="segment"
          :segment-index="index"
          :speaker-assignment="speakerAssignments[segment.speakerTag]"
          @update:speaker-assignment="value => speakerAssignments[segment.speakerTag] = value || ''"
          :available-voices="availableVoices"
          :is-loading-voices="isLoadingVoices"
          :is-previewing-this-segment="isPreviewingSegment === index"
          :segment-state="segmentStates[index]"
          :audio-url="segmentPreviews[index]?.audioUrl"
          @preview-segment="previewSegment(previewableEnhancedSegments[index], index)"
          @audio-play="onSegmentPlay(index)"
          @audio-pause-or-end="onSegmentPauseOrEnd(index)"
          :ref="(el: any) => setAudioRef(index, el?.audioPlayerElement)"
        />
      </div>
    </div>

    <!-- Global Preview Area -->
    <div v-if="combinedPreviewUrl" class="border rounded-md p-4 space-y-2">
      <h4 class="font-medium">Full Audio Preview</h4>
      <audio :src="combinedPreviewUrl" controls class="w-full" />
    </div>

    <!-- Role Information Summary -->
    <div v-if="selectedHostPersona || selectedGuestPersonas.length > 0" class="text-xs text-muted-foreground p-3 border rounded-md">
      <span class="font-medium">Roles: </span>
      <span v-if="selectedHostPersona">{{ selectedHostPersona.name }} (Host)</span>
      <span v-if="selectedGuestPersonas.length > 0">
        <template v-if="selectedHostPersona">, </template>
        {{ selectedGuestPersonas.map(g => g.name).join(', ') }}
        (Guest<template v-if="selectedGuestPersonas.length > 1">s</template>)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePlaygroundStore, type Persona } from '../../stores/playground';
import { toast } from 'vue-sonner';
import type { Tables } from '~/types/supabase';

// UI Components are auto-imported by Nuxt (e.g. Label, Select, Slider, Button, Badge)
// Icon component is also auto-imported

import SegmentVoiceAssignmentItem from './SegmentVoiceAssignmentItem.vue';
import { useVoiceManagement, type Voice, type ParsedScriptSegment as VoiceManParsedSegment } from '../../composables/useVoiceManagement';
import { useSegmentPreview, type SegmentState, type SegmentPreviewData, type PreviewableSegment } from '../../composables/useSegmentPreview';

const props = defineProps<{ scriptContent: string }>();
const emit = defineEmits(['update:scriptContent', 'next', 'back']);

const playgroundStore = usePlaygroundStore();

// --- Core Script Parsing and Persona Logic (Remains in component or could be a local composable if very complex) ---

const parsedScriptSegments = computed<VoiceManParsedSegment[]>(() => {
  if (props.scriptContent) {
    const segments: VoiceManParsedSegment[] = [];
    const script = props.scriptContent.trim();
    if (!script) return [];

    const segmentPattern = /^([A-Za-z0-9_\u4e00-\u9fa5]+):\s*([\s\S]*?)(?=(?:^[A-Za-z0-9_\u4e00-\u9fa5]+:|$))/gm;
    let match;
    while ((match = segmentPattern.exec(script)) !== null) {
      const speakerTag = match[1];
      const text = match[2].trim();
      if (text) {
        segments.push({ speakerTag, text });
      }
    }
    return segments;
  }
  return [];
});

const selectedHostPersona = computed<Persona | undefined>(() => {
  if (!playgroundStore.podcastSettings.hostPersonaId) return undefined;
  return playgroundStore.personas.find((p: Persona) => p.persona_id === Number(playgroundStore.podcastSettings.hostPersonaId));
});

const selectedGuestPersonas = computed<Persona[]>(() => {
  if (!playgroundStore.podcastSettings.guestPersonaIds || playgroundStore.podcastSettings.guestPersonaIds.length === 0) return [];
  return playgroundStore.podcastSettings.guestPersonaIds
    .map((id: string | number | undefined) => playgroundStore.personas.find((p: Persona) => p.persona_id === Number(id)))
    .filter((p: Persona | undefined): p is Persona => p !== undefined);
});

const getPersonaForSpeaker = (speakerTag: string): Persona | undefined => {
  const validationInfo = playgroundStore.validationResult?.structuredData?.voiceMap?.[speakerTag];
  if (validationInfo?.personaId) {
    const personaId = Number(validationInfo.personaId);
    const matchingPersona = playgroundStore.personas.find(p => p.persona_id === personaId);
    if (matchingPersona) return matchingPersona;
  }
  
  if (playgroundStore.validationResult?.structuredData?.script) {
    const scriptEntry = playgroundStore.validationResult.structuredData.script.find(
      entry => entry.name === speakerTag
    );
    if (scriptEntry) {
      if (scriptEntry.role === 'host' && selectedHostPersona.value) return selectedHostPersona.value;
      if (scriptEntry.role === 'guest' && selectedGuestPersonas.value.length > 0) {
        // Try to find the guest persona using personaId from voiceMap (if speakerTag is in voiceMap and mapped to a selected guest)
        if (validationInfo?.personaId) {
            const guestFromValidation = selectedGuestPersonas.value.find(p => p.persona_id === Number(validationInfo.personaId));
            if (guestFromValidation) return guestFromValidation;
        }
        // Fallback: if scriptEntry.name (the specific speaker tag name from script) matches a selected guest persona's name
        const guestByNameInScript = selectedGuestPersonas.value.find(p => p.name === scriptEntry.name);
        if (guestByNameInScript) return guestByNameInScript;

        // Fallback: if the generic speakerTag (which might be "Guest1", "Guest2" or a character name used as speaker tag) matches a selected guest's name
        const guestByGenericSpeakerTag = selectedGuestPersonas.value.find(p => p.name === speakerTag);
        if (guestByGenericSpeakerTag) return guestByGenericSpeakerTag;

        // Original simplest fallback: if only one guest is selected, or as a last resort.
        if (selectedGuestPersonas.value.length > 0) return selectedGuestPersonas.value[0];
      }
    }
  }
  
  if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) return selectedHostPersona.value;
  const guestPersona = selectedGuestPersonas.value.find(p => p.name === speakerTag);
  if (guestPersona) return guestPersona;
  return undefined;
};

// This is the segment structure used by SegmentVoiceAssignmentItem.vue
interface EnhancedSegmentForDisplay extends VoiceManParsedSegment {
  persona?: Persona;
  personaId?: number | string | null;
  roleType: 'host' | 'guest';
  personaDetails: {
    id?: number;
    name?: string;
    avatar_url?: string | null;
    voice_model_identifier?: string | null;
    description?: string | null;
  } | null;
  validationVoiceId?: string | null;
}

const enhancedScriptSegments = computed<EnhancedSegmentForDisplay[]>(() => {
  return parsedScriptSegments.value.map(segment => {
    const persona = getPersonaForSpeaker(segment.speakerTag);
    const validationInfo = playgroundStore.validationResult?.structuredData?.voiceMap?.[segment.speakerTag];
    let roleType: 'host' | 'guest' = 'guest';

    if (playgroundStore.validationResult?.structuredData?.script) {
      const scriptEntry = playgroundStore.validationResult.structuredData.script.find(
        entry => entry.name === segment.speakerTag
      );
      if (scriptEntry) roleType = scriptEntry.role;
    } else if (selectedHostPersona.value && selectedHostPersona.value.name === segment.speakerTag) {
      roleType = 'host';
    }
    
    return {
      ...segment,
      persona,
      personaId: persona?.persona_id || validationInfo?.personaId,
      roleType,
      personaDetails: persona ? {
        id: persona.persona_id,
        name: persona.name,
        avatar_url: persona.avatar_url || null,
        voice_model_identifier: persona.voice_model_identifier || null,
        description: persona.description || null,
      } : null,
      validationVoiceId: validationInfo?.voice_model_identifier
    };
  });
});


// --- Voice Management ---
const {
  ttsProvider,
  availableVoices,
  isLoadingVoices,
  speakerAssignments,
  speakersInScript, // Use this from composable
  onProviderChange,
  // autoAssignVoices, // auto-assignment is handled internally by useVoiceManagement based on its watched dependencies
} = useVoiceManagement(
  computed(() => props.scriptContent), // Pass as Ref<string>
  parsedScriptSegments,      // Pass as Ref<VoiceManParsedSegment[]>
  selectedHostPersona,       // Pass as Ref<Persona | undefined>
  selectedGuestPersonas      // Pass as Ref<Persona[]>
);


// --- Segment Preview ---
// Create a computed property that maps enhancedScriptSegments to PreviewableSegment[] for useSegmentPreview
const previewableEnhancedSegments = computed<PreviewableSegment[]>(() => {
  return enhancedScriptSegments.value.map(segment => ({
    ...segment, // Includes speakerTag, text, and other rich details from enhancedScriptSegments
    voiceId: speakerAssignments.value[segment.speakerTag] // Add the currently assigned voiceId
  }));
});

const {
  isPreviewingSegment,
  segmentPreviews,
  segmentStates,
  combinedPreviewUrl,
  // audioPlayingState, // Not directly used in this component's template, but by onSegmentPlay/Pause
  previewSegment,      // Function to call for single segment preview
  previewAllSegments,  // Function to call for "Preview All" button
  onSegmentPlay,
  onSegmentPauseOrEnd,
  setAudioRef
} = useSegmentPreview(
  previewableEnhancedSegments, // Pass as Ref<PreviewableSegment[]>
  speakerAssignments,          // Pass as Ref<Record<string, string>>
  ttsProvider                  // Pass as Ref<string>
);

async function handlePreviewAllSegments() {
    const success = await previewAllSegments(); // This is from useSegmentPreview
    if (success) {
        // toast.success('All segment previews initiated.'); // previewAllSegments already shows toasts
    } else {
        // toast.error('Preview all segments failed. Check individual segments.');
    }
}

// --- Component Lifecycle and Exposed Methods ---

const canProceed = computed(() => {
  if (!ttsProvider.value || isLoadingVoices.value) return false;
  if (speakersInScript.value.length === 0 && parsedScriptSegments.value.length > 0) return false; 
  // Ensure all speakers found in the script have an assignment
  return speakersInScript.value.every(speakerTag =>
    speakerAssignments.value[speakerTag] &&
    availableVoices.value.some(v => v.id === speakerAssignments.value[speakerTag])
  );
});

const canProceedToPreviewAll = computed(() => {
  if (!canProceed.value) return false; // Basic requirements must be met
  // Check if all segments that have a speaker tag actually have a voice assigned.
  return parsedScriptSegments.value.every(seg => {
    const hasSpeaker = speakersInScript.value.includes(seg.speakerTag);
    if (!hasSpeaker) return true; // If for some reason a segment's speaker isn't in speakersInScript, ignore for this check
    return !!speakerAssignments.value[seg.speakerTag];
  });
});


onMounted(() => {
  if (playgroundStore.personas.length === 0) {
    playgroundStore.fetchPersonas();
  }
  // Voice loading and auto-assignment are handled by useVoiceManagement's internal watch effects
  // and its immediate watcher on ttsProvider.
  
  // Initialize segment states if needed (useSegmentPreview also has an immediate watcher)
  // initializeSegmentStates(); //This is now handled by useSegmentPreview internally

  if (playgroundStore.validationResult?.structuredData) {
    toast.info('Pre-validated script data is available and will be used for recommendations.');
  }
});

defineExpose({
  getPerformanceConfig: () => {
    if (!canProceed.value) return null;

    return {
      provider: ttsProvider.value,
      script: props.scriptContent,
      availableVoices: availableVoices.value, // For reference
      assignments: { ...speakerAssignments.value },
      segments: previewableEnhancedSegments.value.map((seg, index) => ({ // Use previewableEnhancedSegments which has voiceId
        speakerTag: seg.speakerTag,
        voiceId: seg.voiceId, // Already includes assigned voiceId
        text: seg.text,
        personaId: enhancedScriptSegments.value[index].personaId, // Get original personaId if needed
        timestamps: segmentPreviews.value[index]?.timestamps || []
      })).filter(seg => seg.voiceId)
    };
  },
  isFormValid: canProceed,
  // generateAudio, // Original function - consider if previewAllSegments is sufficient or if full synthesis is different
  generatePreviewAudio: previewAllSegments // Map to the new composable function
});

</script>
