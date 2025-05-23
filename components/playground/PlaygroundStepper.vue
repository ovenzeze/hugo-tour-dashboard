<template>
  <Stepper :model-value="modelValue" class="block w-full max-w-4xl mx-auto">
    <div class="flex w-full flex-start gap-1 md:gap-2">
      <StepperItem
        v-for="step in definedSteps"
        :key="step.step"
        v-slot="{ state }"
        class="relative flex w-full flex-col items-center justify-center"
        :step="step.step"
      >
        <StepperSeparator
          v-if="step.step !== definedSteps[definedSteps.length - 1].step"
          class="absolute left-[calc(50%+15px)] md:left-[calc(50%+20px)] right-[calc(-50%+8px)] md:right-[calc(-50%+10px)] top-4 md:top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
        />

        <StepperTrigger as-child>
          <Button
            :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
            :size="isMobile ? 'sm' : 'icon'"
            class="z-10 rounded-full shrink-0 h-8 w-8 md:h-10 md:w-10"
            :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
            @click="() => handleStepClick(step.step)"
          >
            <Icon v-if="state === 'completed'" name="ph:check" class="w-3 h-3 md:w-5 md:h-5" />
            <Icon v-if="state === 'active'" name="ph:circle" class="w-3 h-3 md:w-5 md:h-5" />
            <Icon v-if="state === 'inactive'" name="ph:dot" class="w-3 h-3 md:w-5 md:h-5" />
          </Button>
        </StepperTrigger>

        <div class="mt-2 md:mt-5 flex flex-col items-center text-center">
          <StepperTitle
            :class="[state === 'active' && 'text-primary']"
            class="text-xs md:text-sm font-semibold transition lg:text-base"
          >
            <!-- 移动端简化标题 -->
            <span class="md:hidden">{{ step.mobileTitle || step.title.split(' ')[0] }}</span>
            <span class="hidden md:inline">{{ step.title }}</span>
          </StepperTitle>
          <StepperDescription
            :class="[state === 'active' && 'text-primary']"
            class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
          >
            {{ step.description }}
          </StepperDescription>
        </div>
      </StepperItem>
    </div>
  </Stepper>
</template>

<script setup lang="ts">
// Assuming Stepper components are globally registered or auto-imported by Nuxt
// If not, they would need to be imported, e.g., from '@/components/ui/stepper'
// import { Stepper, StepperItem, StepperSeparator, StepperTrigger, StepperTitle, StepperDescription } from '@/components/ui/stepper';
import { Button } from '@/components/ui/button';
import { storeToRefs } from 'pinia';
import { usePlaygroundUIStore } from '@/stores/playgroundUIStore';
import { computed } from 'vue';
// Icon component is likely auto-imported by NuxtIcon or similar
// import Icon from '@/components/ui/Icon.vue';

interface StepDefinition {
  step: number;
  title: string;
  mobileTitle?: string;
  description: string;
}

interface Props {
  modelValue: number;
}

interface Emits {
  (e: 'update:modelValue', value: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 移动端检测
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
});

// Define steps directly in the component or pass as props if they need to be dynamic
// For now, let's assume they are static as per typical stepper usage in this context.
const definedSteps: StepDefinition[] = [
  { 
    step: 1, 
    title: 'Podcast Setup', 
    mobileTitle: 'Setup',
    description: 'Define your podcast and script.' 
  },
  { 
    step: 2, 
    title: 'Voice Configuration', 
    mobileTitle: 'Voice',
    description: 'Assign voices and preview.' 
  },
  { 
    step: 3, 
    title: 'Synthesize & Download', 
    mobileTitle: 'Synthesize',
    description: 'Generate and get your audio.' 
  },
];

const playgroundUIStore = usePlaygroundUIStore();
const { currentStep } = storeToRefs(playgroundUIStore);

const handleStepClick = (step: number) => {
  // Emit update event to let parent component handle step switching logic
  emit('update:modelValue', step);
};
</script>