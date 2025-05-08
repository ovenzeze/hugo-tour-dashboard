<template>
  <div>
    <audio ref="previewAudioPlayer" style="display: none;" @ended="handleAudioEnded" @play="handleAudioPlayed" @pause="handleAudioPaused"></audio>
    <audio ref="audioPlayer" style="display: none;" @ended="handleAudioEnded" @play="handleAudioPlayed" @pause="handleAudioPaused"></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

import { toast } from 'vue-sonner';

const props = defineProps<{
  toolbarRef: any;
  textToSynthesize: string;
  selectedPersonaId: number | null;
  selectedProvider: string | undefined;
  synthesisParams: {
    temperature: number;
    speed: number;
  };
  outputFilename: string;
}>();

const emit = defineEmits<{
  (e: 'error', message: string): void;
  (e: 'success', message: string): void;
  (e: 'audio-synthesized', url: string): void;
}>();

const previewAudioPlayer = ref<HTMLAudioElement | null>(null);
const audioPlayer = ref<HTMLAudioElement | null>(null);
const isSynthesizing = ref(false);
const audioUrl = ref<string | null>(null);

const selectedPersonaVoiceId = computed(() => {
  // TODO: Implement voice ID selection logic
  return props.selectedPersonaId?.toString() || null;
});

const handleSynthesize = async () => {
  if (!props.selectedPersonaId || !props.textToSynthesize || isSynthesizing.value) {
    emit('error', 'Please select a persona and enter some text to synthesize.');
    return;
  }

  const voiceId = selectedPersonaVoiceId.value;
  if (!voiceId) {
    emit('error', 'Selected persona does not have an associated voice ID.');
    return;
  }

  isSynthesizing.value = true;
  audioUrl.value = null;
  if (previewAudioPlayer.value) previewAudioPlayer.value.pause();

  try {
    const payload: any = {
      script: props.textToSynthesize,
      persona_id: props.selectedPersonaId,
      voice_service: props.selectedProvider || 'elevenlabs',
      output_format: 'mp3',
      temperature: props.synthesisParams.temperature,
      speed: props.synthesisParams.speed,
    };
    if (props.outputFilename) {
      payload.output_filename = props.outputFilename;
    }

    const response = await fetch('/api/generate-audio.post.ts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    audioUrl.value = objectUrl;
    emit('audio-synthesized', objectUrl);
    emit('success', 'Audio synthesized successfully!');

  } catch (err: any) {
    emit('error', err.message || 'An unexpected error occurred during synthesis.');
  } finally {
    isSynthesizing.value = false;
  }
};

const handleAudioEnded = () => {
  if (props.toolbarRef) {
    props.toolbarRef.setAudioPlayerSource(null);
  }
};

const handleAudioPlayed = () => {
  // Audio started playing
};

const handleAudioPaused = () => {
  // Audio paused
};

const resetAudio = () => {
  audioUrl.value = null;
  if (previewAudioPlayer.value) {
    previewAudioPlayer.value.pause();
    if (previewAudioPlayer.value.src && previewAudioPlayer.value.src.startsWith('blob:')) {
      URL.revokeObjectURL(previewAudioPlayer.value.src);
    }
    previewAudioPlayer.value.src = '';
  }
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    if (audioPlayer.value.src && audioPlayer.value.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioPlayer.value.src);
    }
    audioPlayer.value.src = '';
  }
  if (props.toolbarRef) {
    props.toolbarRef.setAudioPlayerSource(null);
  }
};

// Export methods for parent component to use
defineExpose({
  handleSynthesize,
  resetAudio
});
</script>
