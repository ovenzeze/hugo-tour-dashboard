<template>
  <div class="space-y-4">
    <!-- Top Control Bar -->
    <div class="flex items-center justify-between p-3 border rounded-md bg-muted/10" role="region" aria-label="音频设置控制">
      
      <div class="flex-1 flex items-center space-x-4 px-4">
        <div class="flex items-center gap-2 flex-1" role="group" aria-labelledby="temperature-label">
          <Label id="temperature-label" class="whitespace-nowrap text-sm" for="temperature-slider">Temperature: {{ audioStore.synthesisParams.temperature.toFixed(1) }}</Label>
          <Slider
            id="temperature-slider"
            class="flex-1"
            :model-value="audioStore.synthesisParams.temperatureArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) audioStore.updateSynthesisParams({ temperature: value[0] }) }"
            :min="0"
            :max="1"
            :step="0.1"
            aria-label="Temperature"
            @keydown.left.prevent="decreaseTemperature"
            @keydown.right.prevent="increaseTemperature"
          />
        </div>
        
        <div class="flex items-center gap-2 flex-1" role="group" aria-labelledby="speed-label">
          <Label id="speed-label" class="whitespace-nowrap text-sm" for="speed-slider">Speed: {{ audioStore.synthesisParams.speed.toFixed(1) }}x</Label>
          <Slider
            id="speed-slider"
            class="flex-1"
            :model-value="audioStore.synthesisParams.speedArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) audioStore.updateSynthesisParams({ speed: value[0] }) }"
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
    <div v-if="parsedScriptSegments.length > 0" class="space-y-3" role="region" aria-labelledby="voice-assignment-heading">
      <div class="flex items-center justify-between pb-2 border-b">
        <h4 id="voice-assignment-heading" class="font-medium">Voice Assignment</h4>
      </div>
      
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1" role="list">
        <SegmentVoiceAssignmentItem
          v-for="(segment, index) in enhancedScriptSegments"
          :key="`segment-item-${index}`"
          :segment="segment"
          :segment-index="index"
          :speaker-assignment="speakerAssignments[segment.speakerTag]"
          :available-voices="[]"
          :is-loading-voices="false"
          :is-previewing-this-segment="isPreviewingSegment === index"
          :is-global-loading="props.isGlobalPreviewLoading"
          :segment-state="segmentStates[index]"
          :audio-url="segmentPreviews[index]?.audioUrl ?? null"
          @preview-segment="previewSegment(segment, index)"
          @audio-play="onSegmentPlay(index)"
          @audio-pause-or-end="onSegmentPauseOrEnd(index)"
          :ref="(el: any) => setAudioRef(index, el && el.audioPlayerElement && typeof el.audioPlayerElement.value !== 'undefined' ? el.audioPlayerElement.value : null)"
          role="listitem"
          :aria-label="`语音分配项 ${index + 1}: ${segment.speakerTag}`"
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
        {{ selectedGuestPersonas.map(g => g.name).join(', ') }}
        (Guest<template v-if="selectedGuestPersonas.length > 1">s</template>)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, toRef, nextTick, onBeforeUnmount } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundAudioStore } from '../../stores/playgroundAudio';
import { usePlaygroundPersonaStore, type Persona } from '../../stores/playgroundPersona';
import { usePlaygroundSettingsStore } from '../../stores/playgroundSettings';
import { usePlaygroundScriptStore } from '../../stores/playgroundScript';

import { useSegmentPreview, type PreviewableSegment } from '../../composables/useSegmentPreview';
import { useVoiceManagement } from '../../composables/useVoiceManagement';
import SegmentVoiceAssignmentItem from './SegmentVoiceAssignmentItem.vue';
import { Badge } from '~/components/ui/badge'; // Ensure Badge is imported
// Icon component is typically auto-imported by Nuxt if placed in components/global or similar

const props = defineProps<{
  scriptContent: string,
  synthProgress?: { synthesized: number, total: number },
  isGlobalPreviewLoading?: boolean
}>();
// Corrected defineEmits to include 'update:isValid'
// If 'update:scriptContent', 'next', 'back' are confirmed unused, they can be removed later.
const emit = defineEmits(['update:scriptContent', 'next', 'back', 'update:isValid', 'update:settings']);

const audioStore = usePlaygroundAudioStore();
const personaStore = usePlaygroundPersonaStore();
const settingsStore = usePlaygroundSettingsStore();
const scriptStore = usePlaygroundScriptStore();

const scriptContentRef = toRef(props, 'scriptContent');

const scriptLanguage = computed(() => scriptStore.validationResult?.structuredData?.language);

// Optional: For a more user-friendly display of language names
const scriptLanguageDisplayName = computed(() => {
  if (!scriptLanguage.value) return '';
  try {
    // @ts-ignore Intl.DisplayNames might not be recognized by older TS configs but works in modern browsers
    return new Intl.DisplayNames([scriptLanguage.value], { type: 'language' }).of(scriptLanguage.value) || scriptLanguage.value;
  } catch (e) {
    return scriptLanguage.value; // Fallback to language code if DisplayNames is not supported or fails
  }
});

const parsedScriptSegments = computed(() => {
  if (scriptContentRef.value) {
    const segments = [];
    const script = scriptContentRef.value.trim();
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

const selectedHostPersona = computed(() => {
  if (!settingsStore.podcastSettings.hostPersonaId) return undefined;
  return personaStore.personas.find((p: Persona) => p.persona_id === Number(settingsStore.podcastSettings.hostPersonaId));
});

const selectedGuestPersonas = computed(() => {
  if (!settingsStore.podcastSettings.guestPersonaIds || settingsStore.podcastSettings.guestPersonaIds.length === 0) return [];
  return settingsStore.podcastSettings.guestPersonaIds
    .map((id: string | number | undefined) => personaStore.personas.find((p: Persona) => p.persona_id === Number(id)))
    .filter((p: Persona | undefined): p is Persona => p !== undefined);
});

const getPersonaForSpeaker = (speakerTag: string) => {
  const validationInfo = scriptStore.validationResult?.structuredData?.voiceMap?.[speakerTag];
  if (validationInfo?.personaId) {
    const personaId = Number(validationInfo.personaId);
    const matchingPersona = personaStore.personas.find(p => p.persona_id === personaId);
    if (matchingPersona) return matchingPersona;
  }
  
  if (scriptStore.validationResult?.structuredData?.script) {
    const scriptEntry = scriptStore.validationResult.structuredData.script.find(
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

const enhancedScriptSegments = computed(() => {
  return parsedScriptSegments.value.map(segment => {
    const persona = getPersonaForSpeaker(segment.speakerTag);
    const validationInfo = scriptStore.validationResult?.structuredData?.voiceMap?.[segment.speakerTag];

    let effectiveVoiceId = speakerAssignments.value[segment.speakerTag];
    let effectiveVoiceName = 'Assign Voice';
    let assignedProvider = persona?.tts_provider || settingsStore.selectedProvider || 'elevenlabs';
    let roleType: 'host' | 'guest' = 'guest';
    if (scriptStore.validationResult?.structuredData?.script) {
      const scriptEntry = scriptStore.validationResult.structuredData.script.find(
        entry => entry.name === segment.speakerTag
      );
      if (scriptEntry) roleType = scriptEntry.role as 'host' | 'guest';
    } else if (selectedHostPersona.value && selectedHostPersona.value.name === segment.speakerTag) {
      roleType = 'host';
    }

    // 直接使用 voice_model_identifier 作为名称
    if (effectiveVoiceId) {
      effectiveVoiceName = effectiveVoiceId;
    }

    // Determine personaId for this segment
    let segmentPersonaId: string | undefined = undefined;
    if (validationInfo?.personaId) {
      segmentPersonaId = String(validationInfo.personaId);
    } else if (persona) {
      segmentPersonaId = String(persona.persona_id);
    }

    return {
      ...segment,
      id: `segment-${parsedScriptSegments.value.indexOf(segment)}`,
      originalText: segment.text,
      currentText: segment.text,
      voiceId: effectiveVoiceId || null,
      audioUrl: null, 
      isLoading: false,
      isEditing: false,
      ttsProvider: assignedProvider,
      assignedVoiceName: effectiveVoiceId ? effectiveVoiceName : 'Assign Voice',
      roleType: roleType,
      personaId: segmentPersonaId,
      personaLanguage: persona?.language_support && persona.language_support.length > 0 ? persona.language_support[0] : undefined,
      personaAvatarUrl: persona?.avatar_url || undefined
    };
  });
});

const speakersInScript = computed(() => {
  const speakerTags = new Set<string>();
  parsedScriptSegments.value.forEach(segment => speakerTags.add(segment.speakerTag));
  return Array.from(speakerTags);
});

const { speakerAssignments } = useVoiceManagement(
  scriptContentRef, // Pass scriptContent as a ref
  parsedScriptSegments, 
  selectedHostPersona, 
  selectedGuestPersonas
);

const previewableEnhancedSegments = computed<PreviewableSegment[]>(() => {
  // Guard against missing data
  if (!parsedScriptSegments.value || !parsedScriptSegments.value.length || !personaStore.personas.value || !personaStore.personas.value.length) {
    return [];
  }

  return parsedScriptSegments.value.map((parserSegment, index) => {
    const persona = personaStore.personas.value.find((p: Persona) => p.name === parserSegment.speakerTag);
    const roleType = getRoleType(parserSegment.speakerTag);
    const personaId = persona ? String(persona.persona_id) : undefined;

    let finalVoiceId: string | null = persona?.voice_model_identifier || null;
    let finalTtsProvider: string | undefined = persona?.tts_provider;
    let finalVoiceName: string | undefined = persona?.name;

    const systemAssignedVoiceId = speakerAssignments.value[parserSegment.speakerTag];

    if (systemAssignedVoiceId) {
      finalVoiceId = systemAssignedVoiceId;
      finalVoiceName = systemAssignedVoiceId;
    } else if (persona && !finalVoiceId) { // If persona exists but had no default voice, ensure speaker name is used
        // finalVoiceId would be null, finalTtsProvider would be persona's provider or undefined
        // finalVoiceName would be persona's name or speakerTag
    }
    
    if (!finalVoiceName) finalVoiceName = parserSegment.speakerTag; // Fallback voice name

    const currentSegmentState = segmentStates.value[index];

    return {
      // Fields from ParserOutputSegment
      speakerTag: parserSegment.speakerTag,
      text: parserSegment.text,

      // Fields for PreviewableSegment & SegmentData (expected by SegmentVoiceAssignmentItem)
      id: `segment-${index}`,
      originalText: parserSegment.text,
      currentText: parserSegment.text, 
      voiceId: finalVoiceId,
      ttsProvider: finalTtsProvider,
      assignedVoiceName: finalVoiceName,
      roleType: roleType,
      personaId: personaId,
      
      audioUrl: currentSegmentState?.audioUrl || null,
      isLoading: currentSegmentState?.status === 'loading',
      isEditing: false, 
    };
  });
});

const voiceOptions = computed(() => {
  return [];
});

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
  } else {
    // Potentially handle collective success if needed, though individual segment states are updated by the composable
  }
}

const canProceed = computed(() => {
  if (!parsedScriptSegments.value || parsedScriptSegments.value.length === 0) return true;
  if (speakersInScript.value.length === 0 && parsedScriptSegments.value.length > 0) {
    // If there are script segments but no speakers identified (e.g. parsing issue), not valid.
    // Or, if no speakers identified (empty script, etc.) then it's trivially "valid" if no voices needed.
    // This depends on desired behavior for empty/unparseable scripts.
    // Voice assignments are now handled directly in useVoiceManagement
  }
  // Ensure all speakers found in the script have an assignment
  return speakersInScript.value.every(speakerTag =>
    speakerAssignments.value[speakerTag] 
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

// Helper to determine roleType - DEFINED AT SCRIPT SETUP SCOPE
function getRoleType(speakerTag: string): 'host' | 'guest' {
  // Ensure personaStore.hostPersona and its value are accessed correctly
  const host = personaStore.hostPersona; // host is Ref<Persona | undefined>
  if (host && host.value && host.value.name === speakerTag) {
    return 'host';
  }
  return 'guest'; 
}

onMounted(() => {
  if (!personaStore.personas.value || personaStore.personas.value.length === 0) {
    personaStore.fetchPersonas();
  }
  // 不再检查 availableVoices，因为它已被移除
  if (false) {
    // Initial fetch of voices if needed, though useVoiceManagement might handle this too.
    // Consider if useVoiceManagement should be the sole responsible party for fetching voices.
  }
  emit('update:isValid', canProceed.value);
});

// Expose methods for parent component (PlaygroundStep2Panel)
defineExpose({
  isFormValid: canProceed,
  getPerformanceConfig: () => ({
    speakerAssignments: speakerAssignments.value,
    // Note: synthesisParams are now managed by audioStore, not directly part of these settings
  }),
  generateAudio: handlePreviewAllSegments, 
  areAllSegmentsPreviewed: computed(() => {
    if (!parsedScriptSegments.value || parsedScriptSegments.value.length === 0) {
      return false;
    }
    // Check if all segments have been generated (not necessarily previewed)
    // We consider a segment as generated if it has any status (success, error, loading)
    const generatedSegmentsCount = Object.values(segmentStates.value).filter(state => state !== undefined).length;
    return generatedSegmentsCount === parsedScriptSegments.value.length;
  })
});

// 新增键盘导航方法
const decreaseTemperature = () => {
  const currentTemp = audioStore.synthesisParams.temperature;
  const newTemp = Math.max(0, currentTemp - 0.1);
  audioStore.updateSynthesisParams({ temperature: newTemp });
};

const increaseTemperature = () => {
  const currentTemp = audioStore.synthesisParams.temperature;
  const newTemp = Math.min(1, currentTemp + 0.1);
  audioStore.updateSynthesisParams({ temperature: newTemp });
};

const decreaseSpeed = () => {
  const currentSpeed = audioStore.synthesisParams.speed;
  const newSpeed = Math.max(0.5, currentSpeed - 0.1);
  audioStore.updateSynthesisParams({ speed: newSpeed });
};

const increaseSpeed = () => {
  const currentSpeed = audioStore.synthesisParams.speed;
  const newSpeed = Math.min(2, currentSpeed + 0.1);
  audioStore.updateSynthesisParams({ speed: newSpeed });
};

// 焦点管理
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
  if (!personaStore.personas.value || personaStore.personas.value.length === 0) {
    personaStore.fetchPersonas();
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
