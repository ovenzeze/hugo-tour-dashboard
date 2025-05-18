import { ref, readonly } from 'vue';

export interface PlaygroundStep {
  step: number;
  title: string;
  description: string;
}

const podcastStepsData: PlaygroundStep[] = [
  { step: 1, title: 'Podcast Setup', description: 'Define your podcast and script.' },
  { step: 2, title: 'Voice Configuration', description: 'Assign voices and preview.' },
  { step: 3, title: 'Synthesize & Download', description: 'Generate and get your audio.' },
];

export function usePlaygroundStepper(initialStep: number = 1) {
  const currentStepIndex = ref(initialStep);
  const podcastSteps = readonly(podcastStepsData);

  function handlePreviousStep() {
    if (currentStepIndex.value > 1) {
      currentStepIndex.value--;
    }
  }

  function goToStep(step: number) {
    if (podcastSteps.some(s => s.step === step)) {
      currentStepIndex.value = step;
    } else {
      console.warn(`[usePlaygroundStepper] Attempted to go to invalid step: ${step}`);
    }
  }

  return {
    currentStepIndex,
    podcastSteps,
    handlePreviousStep,
    goToStep,
  };
}