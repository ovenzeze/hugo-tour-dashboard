<template>
  <Stepper :model-value="modelValue" class="block w-full max-w-3xl mx-auto" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex w-full flex-start gap-2">
      <StepperItem
        v-for="step in steps"
        :key="step.step"
        v-slot="{ state }"
        class="relative flex w-full flex-col items-center justify-center"
        :step="step.step"
      >
        <StepperSeparator
          v-if="step.step !== steps[steps.length - 1].step"
          class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
        />

        <StepperTrigger as-child>
          <Button
            :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
            size="icon"
            class="z-10 rounded-full shrink-0"
            :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
            @click="() => handleStepClick(step.step)"
          >
            <Icon v-if="state === 'completed'" name="ph:check" class="size-5" />
            <Icon v-if="state === 'active'" name="ph:circle" class="size-5" />
            <Icon v-if="state === 'inactive'" name="ph:dot" class="size-5" />
          </Button>
        </StepperTrigger>

        <div class="mt-5 flex flex-col items-center text-center">
          <StepperTitle
            :class="[state === 'active' && 'text-primary']"
            class="text-sm font-semibold transition lg:text-base"
          >
            {{ step.title }}
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
// Icon component is likely auto-imported by NuxtIcon or similar
// import Icon from '@/components/ui/Icon.vue'; 

interface Step {
  step: number;
  title: string;
  description: string;
}

interface Props {
  modelValue: number;
  steps: Step[];
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue']);

const handleStepClick = (step: number) => {
  // Emitting the step directly. Parent component (`pages/playground.vue`)
  // will be responsible for deciding if the step change is allowed.
  emit('update:modelValue', step);
};
</script>