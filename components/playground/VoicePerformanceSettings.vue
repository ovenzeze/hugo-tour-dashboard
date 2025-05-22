<template>
  <div class="space-y-4">
    <!-- Top Control Bar -->
    <div class="flex items-center justify-between p-3 border rounded-md bg-muted/10" role="region" aria-label="音频设置控制">
      
      <div class="flex-1 flex items-center space-x-4 px-4">
        <div class="flex items-center gap-2 flex-1" role="group" aria-labelledby="temperature-label">
          <Label id="temperature-label" class="whitespace-nowrap text-sm" for="temperature-slider">Temperature: {{ settingsStore.synthesisParams.temperature?.toFixed(1) ?? 'N/A' }}</Label>
          <Slider
            id="temperature-slider"
            class="flex-1"
            :model-value="temperatureArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) settingsStore.updateSynthesisParams({ temperature: value[0] }) }"
            :min="0"
            :max="1"
            :step="0.1"
            aria-label="Temperature"
            @keydown.left.prevent="decreaseTemperature"
            @keydown.right.prevent="increaseTemperature"
          />
        </div>
        
        <div class="flex items-center gap-2 flex-1" role="group" aria-labelledby="speed-label">
          <Label id="speed-label" class="whitespace-nowrap text-sm" for="speed-slider">Speed: {{ settingsStore.synthesisParams.speed?.toFixed(1) ?? 'N/A' }}x</Label>
          <Slider
            id="speed-slider"
            class="flex-1"
            :model-value="speedArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) settingsStore.updateSynthesisParams({ speed: value[0] }) }"
            :min="0.5"
            :max="2"
            :step="0.1"
            aria-label="Speed"
            @keydown.left.prevent="decreaseSpeed"
            @keydown.right.prevent="increaseSpeed"
          />
        </div>
      </div>
      <div v-if="synthProgress" class="flex items-center space-x-2 text-xs ml-2 min-w-[120px] justify-end">
        <Icon name="ph:check-circle" class="w-4 h-4 text-primary" />
        <span>Synthesized: {{ synthProgress.synthesized }} / {{ synthProgress.total }}</span>
      </div>
    </div>

    <!-- Script Language Display -->
    <div v-if="scriptLanguage" class="flex items-center space-x-2 p-3 border-b bg-muted/10 rounded-md">
      <Icon name="ph:translate" class="w-5 h-5 text-muted-foreground" />
      <span class="text-sm font-medium text-muted-foreground">Script Language:</span>
      <Badge variant="secondary">{{ scriptLanguageDisplayName }}</Badge>
    </div>

    <!-- Speaker Voice Assignment -->
    <div v-if="parsedScriptSegmentsFromStore.length > 0" class="space-y-3" role="region" aria-labelledby="voice-assignment-heading">
      <div class="flex items-center justify-between pb-2 border-b">
        <h4 id="voice-assignment-heading" class="font-medium">Voice Assignment</h4>
      </div>
      
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1" role="list">
        <SegmentVoiceAssignmentItem
          v-for="(segment, index) in previewableEnhancedSegments"
          :key="`segment-item-${index}`"
          :segment="segment"
          :segment-index="index"
          :speaker-assignment="speakerAssignments[segment.speaker]"
          :available-voices="personaCache.personas.value"
          :is-loading-voices="personaCache.isLoading.value"
          :is-previewing-this-segment="isPreviewingSegment === index"
          :is-global-loading="isGlobalPreviewLoading"
          :segment-state="segmentStates[index]"
          :audio-url="segmentPreviews[index]?.audioUrl ?? null"
          @preview-segment="previewSegment(segment, index)"
          @audio-play="onSegmentPlay(index)"
          @audio-pause-or-end="onSegmentPauseOrEnd(index)"
          :ref="(el: any) => setAudioRef(index, el && el.audioPlayerElement && typeof el.audioPlayerElement.value !== 'undefined' ? el.audioPlayerElement.value : null)"
          role="listitem"
          :aria-label="`语音分配项 ${index + 1}: ${segment.speaker}`"
          @keydown.enter="previewSegment(segment, index)"
          @keydown.space.prevent="previewSegment(segment, index)"
          tabindex="0"
        />
      </div>
    </div>

    <!-- Global Preview Area -->
    <div v-if="combinedPreviewUrl" class="border rounded-md p-4 space-y-2" role="region" aria-labelledby="full-audio-preview-heading">
      <h4 id="full-audio-preview-heading" class="font-medium">Full Audio Preview</h4>
      <audio :src="combinedPreviewUrl" controls class="w-full" aria-label="完整音频预览" @keydown.space.prevent="toggleAudioPlayback" ref="fullAudioPreview" />
    </div>

    <!-- Role Information Summary -->
    <div v-if="selectedHostPersona || selectedGuestPersonas.length > 0" class="text-xs text-muted-foreground p-3 border rounded-md">
      <span class="font-medium">Roles: </span>
      <span v-if="selectedHostPersona">{{ selectedHostPersona.name }} (Host)</span>
      <span v-if="selectedGuestPersonas.length > 0">
        <template v-if="selectedHostPersona">, </template>
        {{ selectedGuestPersonas.map((g: Persona) => g.name).join(', ') }}
        (Guest<template v-if="selectedGuestPersonas.length > 1">s</template>)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, toRef, nextTick, onBeforeUnmount } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import type { Persona } from '~/types/persona';
import { usePersonaCache } from '~/composables/usePersonaCache';
import { useSegmentPreview, type PreviewableSegment } from '~/composables/useSegmentPreview';
import { useVoiceManagement } from '~/composables/useVoiceManagement';
import SegmentVoiceAssignmentItem from './SegmentVoiceAssignmentItem.vue';
import { Badge } from '~/components/ui/badge';
import type { ScriptSegment } from '~/types/api/podcast';

// Interface for the objects returned by enhancedScriptSegments.map()
interface InternalEnhancedSegment {
  id: string;
  speaker: string;
  text: string;
  originalText: string;
  currentText: string;
  voiceId: string | null;
  audioUrl: string | null;
  isLoading: boolean;
  isEditing: boolean;
  ttsProvider: string | undefined;
  assignedVoiceName: string;
  roleType: 'host' | 'guest';
  speakerPersonaId: number | null; // Changed from personaId to align with ScriptSegment
  personaLanguage?: string;
  personaAvatarUrl?: string;
  personaMatchStatus?: 'exact' | 'fallback' | 'none'; // From ScriptSegment if available
}

// Props are now sourced from stores
// const props = defineProps<{...}>();
const emit = defineEmits(['update:isValid', 'update:settings']); // Keep emits if parent still needs them for specific actions

const settingsStore = usePlaygroundSettingsStore();
const scriptStore = usePlaygroundScriptStore();
const processStore = usePlaygroundProcessStore();
const uiStore = usePlaygroundUIStore();
const personaCache = usePersonaCache();

// Replace props with computed properties from stores
const scriptContent = computed(() => scriptStore.scriptContent);
const synthProgress = computed(() => { // Example: derive from processStore or uiStore
  // This needs to be defined based on how progress is tracked in new stores
  // For now, a placeholder:
  const synthesizing = processStore.isSynthesizing; // Or a more granular progress from processStore/uiStore
  const total = scriptStore.parsedSegments.length;
  const synthesizedCount = segmentStates.value ? Object.values(segmentStates.value).filter(s => s?.status === 'success').length : 0;
  return synthesizing || total > 0 ? { synthesized: synthesizedCount, total } : undefined;
});
const isGlobalPreviewLoading = computed(() => processStore.isSynthesizing); // Example;

const temperatureArray = computed(() => [settingsStore.synthesisParams.temperature ?? 0.7]);
const speedArray = computed(() => [settingsStore.synthesisParams.speed ?? 1.0]);

// scriptLanguage can be derived from host persona or settings
const scriptLanguage = computed(() => {
    const host = selectedHostPersona.value;
    if (host && host.language_support && host.language_support.length > 0) {
        return host.language_support[0];
    }
    // processStore.scriptApiResponse (PodcastCreateResponse) does not have a language field.
    // The language is part of the request (PodcastCreateRequest) or settings.
    return settingsStore.podcastSettings.language || 'en-US'; // Fallback chain
});

const scriptLanguageDisplayName = computed(() => {
  if (!scriptLanguage.value) return '';
  try {
    return new Intl.DisplayNames([scriptLanguage.value], { type: 'language' }).of(scriptLanguage.value) || scriptLanguage.value;
  } catch (e) {
    return scriptLanguage.value;
  }
});

// Use parsedSegments from scriptStore directly
const parsedScriptSegmentsFromStore = computed(() => scriptStore.parsedSegments);

const selectedHostPersona = computed(() => {
  const hostId = settingsStore.getHostPersonaIdNumeric;
  if (hostId === undefined) return undefined;
  return personaCache.getPersonaById(hostId);
});

const selectedGuestPersonas = computed(() => {
  const guestIds = settingsStore.getGuestPersonaIdsNumeric;
  if (!guestIds || guestIds.length === 0) return [];
  return guestIds
    .map((id: number) => personaCache.getPersonaById(id))
    .filter((p): p is Persona => p !== undefined);
});


const getPersonaForSpeaker = (speakerTag: string, segmentPersonaIdFromScript: number | null): Persona | undefined => {
  // Priority 1: If segment already has a resolved personaId from scriptStore.parsedSegments
  if (segmentPersonaIdFromScript !== null) {
    const persona = personaCache.getPersonaById(segmentPersonaIdFromScript);
    if (persona) return persona;
  }

  // Fallback logic (similar to before, but using new stores)
  // This might be simplified if scriptStore.parsedSegments always provides a reliable speakerPersonaId
  const host = selectedHostPersona.value;
  if (host && host.name === speakerTag) return host;
  
  const guest = selectedGuestPersonas.value.find((p: Persona) => p.name === speakerTag);
  if (guest) return guest;
  
  // Further fallback if speakerTag doesn't match a selected persona's name directly
  // (e.g. if script uses "Narrator" but no "Narrator" persona is selected)
  // This part might need refinement based on how speaker tags are intended to map if not exact names
  return undefined;
}; // End of getPersonaForSpeaker

const enhancedScriptSegments = computed((): InternalEnhancedSegment[] => {
  return parsedScriptSegmentsFromStore.value.map((segment: ScriptSegment, index: number): InternalEnhancedSegment => {
    const personaFromId = segment.speakerPersonaId ? personaCache.getPersonaById(segment.speakerPersonaId) : undefined;
    // Use getPersonaForSpeaker for more robust matching if direct ID doesn't yield a persona or for fallback.
    // However, for enhancedScriptSegments, personaFromId based on segment.speakerPersonaId is primary.
    const persona = personaFromId || getPersonaForSpeaker(segment.speaker, segment.speakerPersonaId);

    const assignment = speakerAssignments.value[segment.speaker];

    let effectiveVoiceId: string | null = assignment?.voiceId || persona?.voice_model_identifier || null;
    let assignedProvider: string | undefined = assignment?.provider || persona?.tts_provider || settingsStore.podcastSettings.ttsProvider || 'elevenlabs';
    let effectiveVoiceName: string = 'Assign Voice';

    let roleType: 'host' | 'guest' = 'guest';
    if (selectedHostPersona.value && segment.speakerPersonaId === selectedHostPersona.value.persona_id) {
      roleType = 'host';
    } else if (selectedGuestPersonas.value.some((g: Persona) => g.persona_id === segment.speakerPersonaId)) {
      roleType = 'guest';
    } else if (segment.speaker === selectedHostPersona.value?.name) { // Fallback by name if ID not matched
      roleType = 'host';
    }

    if (effectiveVoiceId) {
      const voiceOwner = personaCache.personas.value.find(p => p.voice_model_identifier === effectiveVoiceId);
      effectiveVoiceName = voiceOwner?.name || String(effectiveVoiceId);
    } else if (persona) {
      effectiveVoiceName = persona.name;
    }

    return {
      id: `segment-${index}`,
      speaker: segment.speaker,
      text: segment.text,
      originalText: segment.text,
      currentText: segment.text,
      speakerPersonaId: segment.speakerPersonaId,
      // @ts-ignore - personaMatchStatus is optional on ScriptSegment from store but we want to carry it if it exists
      personaMatchStatus: (segment as any).personaMatchStatus,
      voiceId: effectiveVoiceId,
      audioUrl: segmentPreviews.value[index]?.audioUrl || null,
      isLoading: segmentStates.value[index]?.status === 'loading',
      isEditing: false,
      ttsProvider: assignedProvider,
      assignedVoiceName: effectiveVoiceId ? effectiveVoiceName : (persona ? persona.name : 'Assign Voice'),
      roleType: roleType,
      personaLanguage: persona?.language_support && persona.language_support.length > 0 ? persona.language_support[0] : undefined,
      personaAvatarUrl: persona?.avatar_url || undefined,
    }; // Closes the object returned by map's callback
  }); // Closes the .map() method call
}); // Closes the computed() function call for enhancedScriptSegments

// getPersonaForSpeaker is defined above (lines 201-220) and is accessible.

const speakersInScript = computed(() => {
  const speakerNames = new Set<string>();
  // Use parsedSegmentsFromStore which has the speaker names
  parsedScriptSegmentsFromStore.value.forEach(segment => speakerNames.add(segment.speaker));
  return Array.from(speakerNames);
});

const { speakerAssignments } = useVoiceManagement(
  // scriptContent, // Removed: scriptContent is not directly passed anymore
  parsedScriptSegmentsFromStore, // Pass parsed segments from scriptStore (which should be Ref<ScriptSegment[]>)
  selectedHostPersona,
  selectedGuestPersonas
);

const previewableEnhancedSegments = computed<PreviewableSegment[]>(() => {
  return enhancedScriptSegments.value.map((segment: InternalEnhancedSegment): PreviewableSegment => {
    return {
      // Fields required by PreviewableSegment from composables/useSegmentPreview.ts
      id: segment.id,
      originalText: segment.originalText,
      currentText: segment.currentText,
      speaker: segment.speaker, // segment already has .speaker from InternalEnhancedSegment
      text: segment.text,
      voiceId: segment.voiceId,
      audioUrl: segment.audioUrl,
      isLoading: segment.isLoading,
      isEditing: segment.isEditing,
      ttsProvider: segment.ttsProvider,
      assignedVoiceName: segment.assignedVoiceName,
      roleType: segment.roleType,
      // PreviewableSegment expects personaId: string | undefined. InternalEnhancedSegment has speakerPersonaId: number | null.
      personaId: segment.speakerPersonaId !== null && segment.speakerPersonaId !== undefined ? String(segment.speakerPersonaId) : undefined,
      personaLanguage: segment.personaLanguage,
      personaAvatarUrl: segment.personaAvatarUrl,
      // ParsedScriptSegment (base of PreviewableSegment) fields:
      // speakerTag: segment.speaker, // If PreviewableSegment still expects speakerTag, map it from speaker
      // text: segment.text, // Already mapped
    };
  });
});

// voiceOptions computed can be removed if SegmentVoiceAssignmentItem handles voice selection internally using personaCache

const {
  segmentPreviews,
  combinedPreviewUrl,
  segmentStates,
  isPreviewingSegment,
  setAudioRef,
  previewSegment,
  previewAllSegments: previewAllSegmentsFromComposable,
  onSegmentPlay,
  onSegmentPauseOrEnd
} = useSegmentPreview(
  previewableEnhancedSegments,
  speakerAssignments
);

async function handlePreviewAllSegments() {
  const result = await previewAllSegmentsFromComposable();
  if (result === false) {
    // Toast messages are handled within previewAllSegmentsFromComposable
  }
}

const canProceed = computed(() => {
  if (!parsedScriptSegmentsFromStore.value || parsedScriptSegmentsFromStore.value.length === 0) return true; // Allow proceeding if script is empty
  return speakersInScript.value.every(speakerTag =>
    speakerAssignments.value[speakerTag]
  );
});

const canProceedToPreviewAll = computed(() => {
  if (!canProceed.value) return false;
  return parsedScriptSegmentsFromStore.value.every(seg => {
    return !!speakerAssignments.value[seg.speaker];
  });
});

function getRoleType(speakerTag: string): 'host' | 'guest' {
  const host = selectedHostPersona.value;
  if (host && host.name === speakerTag) {
    return 'host';
  }
  // More robust guest check might be needed if speakerTag isn't always a direct guest name
  const isGuest = selectedGuestPersonas.value.some((g: Persona) => g.name === speakerTag);
  return isGuest ? 'guest' : 'guest'; // Default to guest if not host
}


onMounted(() => {
  if (!personaCache.personas.value || personaCache.personas.value.length === 0) {
    if (!personaCache.isLoading.value) personaCache.fetchPersonas();
  }
  emit('update:isValid', canProceed.value);
});

defineExpose({
  isFormValid: canProceed,
  getPerformanceConfig: () => ({
    speakerAssignments: speakerAssignments.value,
    synthesisParams: settingsStore.synthesisParams, // Expose current synthesis params
  }),
  generateAudio: handlePreviewAllSegments,
  areAllSegmentsPreviewed: computed(() => {
    if (!parsedScriptSegmentsFromStore.value || parsedScriptSegmentsFromStore.value.length === 0) {
      return false;
    }
    const generatedSegmentsCount = Object.values(segmentStates.value).filter(state => state?.status === 'success' || state?.status === 'error').length;
    return generatedSegmentsCount === parsedScriptSegmentsFromStore.value.length;
  })
});

const decreaseTemperature = () => {
  const currentTemp = settingsStore.synthesisParams.temperature ?? 0.7;
  const newTemp = Math.max(0, currentTemp - 0.1);
  settingsStore.updateSynthesisParams({ temperature: parseFloat(newTemp.toFixed(1)) });
};

const increaseTemperature = () => {
  const currentTemp = settingsStore.synthesisParams.temperature ?? 0.7;
  const newTemp = Math.min(1, currentTemp + 0.1);
  settingsStore.updateSynthesisParams({ temperature: parseFloat(newTemp.toFixed(1)) });
};

const decreaseSpeed = () => {
  const currentSpeed = settingsStore.synthesisParams.speed ?? 1.0;
  const newSpeed = Math.max(0.5, currentSpeed - 0.1);
  settingsStore.updateSynthesisParams({ speed: parseFloat(newSpeed.toFixed(1)) });
};

const increaseSpeed = () => {
  const currentSpeed = settingsStore.synthesisParams.speed ?? 1.0;
  const newSpeed = Math.min(2, currentSpeed + 0.1);
  settingsStore.updateSynthesisParams({ speed: parseFloat(newSpeed.toFixed(1)) });
};

const focusFirstInteractiveElement = () => {
  nextTick(() => {
    const firstInteractiveElement = document.querySelector('#temperature-slider, #speed-slider, audio, button') as HTMLElement;
    if (firstInteractiveElement) {
      firstInteractiveElement.focus();
    }
  });
};

// 全局音频预览控制
const fullAudioPreview = ref<HTMLAudioElement | null>(null);

const toggleAudioPlayback = () => {
  if (fullAudioPreview.value) {
    if (fullAudioPreview.value.paused) {
      fullAudioPreview.value.play();
    } else {
      fullAudioPreview.value.pause();
    }
  }
};

// 键盘导航
const handleKeyNavigation = (event: KeyboardEvent) => {
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusable = Array.from(document.querySelectorAll(focusableElements));
  const firstFocusable = focusable[0] as HTMLElement;
  const lastFocusable = focusable[focusable.length - 1] as HTMLElement;

  if (event.key === 'Tab') {
    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        event.preventDefault();
      }
    }
  }
};

onMounted(() => {
  if (!personaCache.personas.value || personaCache.personas.value.length === 0) {
    personaCache.fetchPersonas();
  }
  if (false) {
    // Initial fetch of voices if needed, though useVoiceManagement might handle this too.
    // Consider if useVoiceManagement should be the sole responsible party for fetching voices.
  }
  emit('update:isValid', canProceed.value);
  focusFirstInteractiveElement();
  document.addEventListener('keydown', handleKeyNavigation);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyNavigation);
});

</script>

<style scoped>
/* Add any specific styles for this component here */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* 添加焦点样式 */
:focus {
  outline: 2px solid #4a90e2;
  outline-offset: 2px;
}

/* 为可交互元素添加悬停效果 */
button:hover,
[role="button"]:hover,
.interactive:hover {
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
}
</style>
