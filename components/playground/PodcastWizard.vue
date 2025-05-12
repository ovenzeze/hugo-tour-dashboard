<template>
  <div class="flex flex-col space-y-6">
    <Stepper v-model:current-step="currentStepValue" class="w-full" orientation="vertical">
      <StepperItem
        v-for="step in steps"
        :key="step.value"
        v-slot="{ state }"
        :value="step.value"
        :disabled="step.disabled && !step.canActivate()"
        class="relative flex w-full flex-col items-start justify-start mb-4"
      >
        <StepperSeparator v-if="step.value !== steps[steps.length - 1].value" class="absolute left-6 right-0 top-6 h-0.5 bg-muted group-data-[state=completed]:bg-primary" />
        <StepperTrigger as-child>
          <Button
            :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
            size="icon"
            class="z-10 rounded-full shrink-0"
            :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
            :disabled="step.disabled && !step.canActivate()"
          >
            <span v-if="state === 'completed'">✓</span>
            <span v-else>{{ step.icon }}</span>
          </Button>
        </StepperTrigger>
        <div class="ml-14 mt-2 flex flex-col items-start text-left w-full">
          <StepperTitle :class="[state === 'active' && 'text-primary']" class="text-base font-semibold transition">
            {{ step.title }}
          </StepperTitle>
          <StepperDescription :class="[state === 'active' && 'text-primary']" class="text-xs text-muted-foreground transition">
            {{ step.getDescription() }}
          </StepperDescription>
          <!-- Step content only visible when active -->
          <div v-if="state === 'active'" class="w-full mt-4">
            <component :is="step.component" v-bind="step.props" />
          </div>
        </div>
      </StepperItem>
    </Stepper>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Stepper,
  StepperItem,
  StepperTrigger,
  StepperSeparator,
  StepperTitle,
  StepperDescription
} from '@/components/ui/stepper';
import { toast } from 'vue-sonner';
import PodcastSettings from '@/components/playground/PodcastSettings.vue';
// import ScriptEditor from '@/components/playground/ScriptEditor.vue'; // Commented out
import AudioSynthesis from '@/components/playground/AudioSynthesis.vue';
import { usePlaygroundStore, type FullPodcastSettings } from '@/stores/playground';
import type { Persona } from '@/types/persona';
import { RotateCcw, Save, ArrowRight } from 'lucide-vue-next';

const props = defineProps<{
  personas: Persona[];
  personasLoading: boolean;
  providers: { id: string; name: string }[];
}>();

const emit = defineEmits<{
  (e: 'audio-synthesized', url: string): void;
  (e: 'script-generated', script: string): void;
}>();

const playgroundStore = usePlaygroundStore();

const currentStepValue = ref('1');

// Step completion status
const scriptGenerated = ref(false);
const transcriptionCompleted = ref(false);
const audioGenerated = ref(false);

// Basic state
const selectedProvider = ref<string | undefined>(playgroundStore.selectedProvider);
const podcastSettings = ref<FullPodcastSettings>(JSON.parse(JSON.stringify(playgroundStore.podcastSettings)));
const scriptContent = ref('');
const outputFilename = ref('');
const audioUrl = ref<string | null>(null);

// Synthesis parameters
const synthesisParams = reactive({
  temperature: 0.5,
  speed: 1.0,
  get temperatureArray() { return [this.temperature]; },
  set temperatureArray(val: number[]) { this.temperature = val[0]; },
  get speedArray() { return [this.speed]; },
  set speedArray(val: number[]) { this.speed = val[0]; },
});

// Loading states
const isGeneratingScript = ref(false);
const isSynthesizing = ref(false);

// Navigation logic
const navigateToStep = (step: string) => {
  if (step === '1') {
    currentStepValue.value = '1';
  } else if (step === '2' && scriptGenerated.value) {
    currentStepValue.value = '2';
  } else if (step === '3' && transcriptionCompleted.value) {
    currentStepValue.value = '3';
  }
};

const updatePodcastSettings = (settings: FullPodcastSettings) => {
  podcastSettings.value = settings;
  playgroundStore.updateFullPodcastSettings(settings);
};

const updateSelectedProvider = (provider: string | undefined) => {
  selectedProvider.value = provider;
  playgroundStore.updateSelectedProvider(provider);
};

const handleGenerateScriptAndProceed = async () => {
  if (isGeneratingScript.value) return;

  const settings = podcastSettings.value;
  if (!settings.title?.trim()) { toast.error('Please enter a Podcast Title.'); return; }
  if (!settings.topic?.trim()) { toast.error('Please enter the Podcast Topic.'); return; }
  if (!settings.hostPersonaId) { toast.error('Please select a Host Persona.'); return; }
  if (!selectedProvider.value) { toast.error('Please select a Voice Provider.'); return; }

  isGeneratingScript.value = true;
  audioUrl.value = null;
  audioGenerated.value = false;
  transcriptionCompleted.value = false; 
  scriptGenerated.value = false; 

  try {
    const response = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: settings.title,
        topic: settings.topic,
        numberOfSegments: settings.numberOfSegments,
        style: settings.style,
        keywords: settings.keywords,
        hostPersonaId: settings.hostPersonaId,
        guestPersonaIds: settings.guestPersonaIds,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to generate script.' }));
      throw new Error(errorData.message || `HTTP Error! Status: ${response.status}`);
    }

    const data = await response.json();
    scriptContent.value = data.script || '';
    
    if (scriptContent.value) {
      toast.success('Script generated successfully!');
      emit('script-generated', scriptContent.value);
      scriptGenerated.value = true;
      currentStepValue.value = '2'; 
    } else {
      throw new Error('Generated script content is empty.');
    }
  } catch (err: any) {
    console.error('Error generating script:', err);
    toast.error('Script Generation Failed', { description: err.message });
  } finally {
    isGeneratingScript.value = false;
  }
};

const handleCompleteTranscriptionAndProceed = () => {
  if (!scriptContent.value.trim()) {
    toast.error('Script content cannot be empty.');
    return;
  }
  transcriptionCompleted.value = true;
  currentStepValue.value = '3'; 
};

const handleSynthesizeAudio = async () => {
  if (isSynthesizing.value || !scriptContent.value.trim()) {
     if (!scriptContent.value.trim()) {
        toast.error('Script content is empty. Please edit the script first.');
        return;
     }
    return;
  }

  isSynthesizing.value = true;
  audioUrl.value = null;
  audioGenerated.value = false;

  try {
    const response = await fetch('/api/synthesize-podcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: scriptContent.value,
        hostPersonaId: podcastSettings.value.hostPersonaId,
        guestPersonaIds: podcastSettings.value.guestPersonaIds,
        temperature: synthesisParams.temperature,
        speed: synthesisParams.speed,
        outputFilename: outputFilename.value || `podcast_${Date.now()}.mp3`,
        provider: selectedProvider.value,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Audio synthesis failed.' }));
      throw new Error(errorData.message || `HTTP Error! Status: ${response.status}`);
    }

    const data = await response.json();
    audioUrl.value = data.audioUrl;
    
    if (audioUrl.value) {
      toast.success('Audio synthesized successfully!');
      emit('audio-synthesized', audioUrl.value);
      audioGenerated.value = true;
    } else {
      throw new Error('Synthesized audio URL is empty.');
    }
  } catch (err: any) {
    console.error('Error synthesizing audio:', err);
    toast.error('Audio Synthesis Failed', { description: err.message });
  } finally {
    isSynthesizing.value = false;
  }
};

const downloadAudio = () => {
  if (!audioUrl.value) {
    toast.info('No audio available for download.');
    return;
  }
  const link = document.createElement('a');
  link.href = audioUrl.value;
  link.download = outputFilename.value || `podcast_audio_${Date.now()}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('Audio download started.');
};

watch(() => playgroundStore.podcastSettings, (newSettings) => {
  podcastSettings.value = JSON.parse(JSON.stringify(newSettings));
}, { deep: true });

watch(currentStepValue, (newStep, oldStep) => {
  if (newStep === oldStep) return; // No change
  const newStepNum = parseInt(newStep);
  const oldStepNum = parseInt(oldStep);

  if (newStepNum < oldStepNum) { 
    if (newStepNum < 3) {
      audioGenerated.value = false;
    }
    if (newStepNum < 2) {
      transcriptionCompleted.value = false;
    }
  }
});

// Add a function to determine step state
const getStepState = (step: string) => {
  if (step === '1') {
    if (scriptGenerated.value) return 'completed';
    if (currentStepValue.value === '1') return 'active';
  } else if (step === '2') {
    if (transcriptionCompleted.value) return 'completed';
    if (currentStepValue.value === '2') return 'active';
  } else if (step === '3') {
    if (audioGenerated.value) return 'completed';
    if (currentStepValue.value === '3') return 'active';
  }
  return undefined;
};

// 步骤配置
const steps = computed(() => [
  {
    value: '1',
    title: '播客设置与脚本生成',
    icon: '🎙️',
    component: PodcastSettings,
    props: {
      modelValue: podcastSettings.value,
      providers: props.providers,
      selectedProvider: selectedProvider.value,
      personas: props.personas,
      personasLoading: props.personasLoading,
      isGenerating: isGeneratingScript.value,
      'onUpdate:modelValue': updatePodcastSettings,
      'onUpdate:selectedProvider': updateSelectedProvider,
      onGenerateScript: handleGenerateScriptAndProceed,
    },
    disabled: false,
    getDescription: () => '配置播客详情并生成初始脚本',
    canActivate: () => true,
  },
  {
    value: '2',
    title: '编辑脚本',
    icon: '✏️',
    component: {
      template: `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Label>脚本编辑器</Label>
            <div class="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                @click="resetScript"
                :disabled="!hasChanges"
              >
                <RotateCcw class="h-4 w-4 mr-1" />
                重置
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                @click="saveScript"
                :disabled="!hasChanges"
              >
                <Save class="h-4 w-4 mr-1" />
                保存
              </Button>
            </div>
          </div>
          <Textarea
            v-model="localScript"
            :placeholder="'在此编辑生成的脚本...'"
            class="font-mono min-h-[400px]"
            :disabled="disabled"
          />
          <div class="flex justify-between items-center">
            <p class="text-sm text-muted-foreground">
              {{ hasChanges ? '有未保存的更改' : '无更改' }}
            </p>
            <Button 
              @click="onNext" 
              :disabled="!localScript.trim() || disabled"
            >
              继续
              <ArrowRight class="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      `,
      props: ['script', 'onNext', 'disabled'],
      setup(props, { emit }) {
        const localScript = ref(props.script || '')
        const hasChanges = computed(() => localScript.value !== props.script)
        
        const resetScript = () => {
          localScript.value = props.script || ''
        }
        
        const saveScript = () => {
          emit('update:script', localScript.value)
        }
        
        watch(() => props.script, (newScript) => {
          if (newScript && !hasChanges.value) {
            localScript.value = newScript
          }
        })
        
        return {
          localScript,
          hasChanges,
          resetScript,
          saveScript
        }
      }
    },
    props: {
      script: scriptContent.value,
      onNext: handleCompleteTranscriptionAndProceed,
      disabled: isGeneratingScript.value,
      'onUpdate:script': (value: string) => {
        scriptContent.value = value
        toast.success('脚本已保存')
      }
    },
    disabled: !scriptGenerated.value,
    getDescription: () => scriptGenerated.value ? '审阅并修改 AI 生成的脚本' : '请先生成脚本',
    canActivate: () => scriptGenerated.value,
  },
  {
    value: '3',
    title: '音频合成与下载',
    icon: '🎧',
    component: AudioSynthesis,
    props: {
      modelValue: audioUrl.value,
      synthesisParams: synthesisParams,
      isLoading: isSynthesizing.value,
      scriptContent: scriptContent.value,
      outputFilename: outputFilename.value,
      'onUpdate:outputFilename': (value: string) => outputFilename.value = value,
      onSynthesize: handleSynthesizeAudio,
      onDownload: downloadAudio,
      disabled: !transcriptionCompleted.value || isSynthesizing.value,
    },
    disabled: !transcriptionCompleted.value,
    getDescription: () => transcriptionCompleted.value ? '合成播客音频并下载文件' : '请先完成脚本编辑',
    canActivate: () => transcriptionCompleted.value,
  },
]);

</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
}
/* Add a subtle transition for panel opening/closing if desired */
/* .p-4 { transition: all 0.3s ease-in-out; } */
</style> 