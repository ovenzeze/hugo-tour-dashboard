<template>
  <div class="persona-selector">
    <Label v-if="label" :for="id" class="mb-2 block">
      {{ label }} 
      <span v-if="multiple" class="ml-2 text-xs text-muted-foreground">
        ({{ selectedPersonas.length }} selected)
      </span>
    </Label>
    
    <!-- Selected personas display (for multiple mode) -->
    <div v-if="multiple && Array.isArray(modelValue) && modelValue.length > 0" class="flex flex-wrap gap-1 mb-2">
      <Badge 
        v-for="persona in selectedPersonas" 
        :key="persona.persona_id" 
        variant="secondary"
        class="flex items-center gap-1 px-2 py-1"
      >
        <span>{{ persona.name }}</span>
        <button 
          type="button" 
          class="rounded-full hover:bg-slate-600/70 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          @click="removePersona(persona)"
        >
          <Icon name="ph:x" class="h-3 w-3" />
          <span class="sr-only">Remove {{ persona.name }}</span>
        </button>
      </Badge>
    </div>

    <Combobox v-model="selectedValue" :multiple="multiple">
      <div class="relative">
        <div class="flex items-center">
          <ComboboxInput 
            :id="id"
            :placeholder="placeholder"
            :disabled="disabled"
            class="w-full flex h-9 rounded-md border border-slate-700 bg-slate-800/70 px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            :value="searchQuery"
            @update:modelValue="searchQuery = $event"
          />
          <div class="absolute right-0 top-0 flex h-9 items-center pr-2">
            <ComboboxTrigger>
              <Icon name="ph:caret-down" class="h-4 w-4 opacity-50" />
            </ComboboxTrigger>
          </div>
        </div>
        <ComboboxList class="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-800/95 text-slate-200 shadow-lg backdrop-blur-sm p-2">
          <ComboboxInput 
            v-if="filterable"
            placeholder="Search personas..."
            class="h-9 px-3 py-2 w-full border-b border-slate-600 mb-1 bg-slate-700/50 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <ComboboxEmpty v-if="filteredPersonas.length === 0" class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-slate-400">
            No personas found.
          </ComboboxEmpty>
          <ComboboxViewport>
            <ComboboxItem 
              v-for="persona in filteredPersonas" 
              :key="persona.persona_id" 
              :value="persona.persona_id"
              class="relative flex cursor-default select-none items-center rounded-md px-2 py-2.5 text-sm text-slate-300 outline-none data-[highlighted]:bg-sky-600/30 data-[highlighted]:text-sky-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <div class="flex items-center gap-3 w-full">
                <Avatar class="h-8 w-8 flex-shrink-0">
                  <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
                  <AvatarFallback>
                    <Icon name="ph:user-circle" class="h-5 w-5 text-slate-400" />
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 overflow-hidden">
                  <span class="text-sm font-medium truncate block">{{ persona.name }}</span>
                  <p v-if="persona.description" class="text-xs text-slate-400 truncate block">
                    {{ persona.description }}
                  </p>
                  <p v-if="persona.scenario" class="text-xs text-slate-500 truncate block mt-0.5">
                    <Icon name="ph:target" class="h-3 w-3 mr-1 inline-block align-text-bottom" /> Scenario: {{ persona.scenario }}
                  </p>
                </div>
                <ComboboxItemIndicator>
                  <Icon name="ph:check" class="h-4 w-4" />
                </ComboboxItemIndicator>
              </div>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxList>
      </div>
    </Combobox>
    
    <p v-if="description" class="text-sm text-muted-foreground mt-2">{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
import { computed, ref, watch } from 'vue';

// Import types
import type { ApiPersona } from '~/pages/personas/index.vue';

const props = defineProps<{
  modelValue: number | number[] | null;
  personas?: ApiPersona[];
  multiple?: boolean;
  filterable?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  description?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null];
}>();

// Generate unique ID for the input
const id = `persona-selector-${Math.random().toString(36).substring(2, 9)}`;

// Search query for filtering
const searchQuery = ref('');

// Computed property for the selected value(s)
const selectedValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  }
});

import { onMounted } from 'vue';

const personas = ref<ApiPersona[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Fetch personas from API if not provided as prop
onMounted(async () => {
  if (!props.personas) {
    loading.value = true;
    try {
      const res = await fetch('/api/personas');
      if (!res.ok) {
        throw new Error('Failed to fetch personas');
      }
      const data = await res.json();
      personas.value = data as ApiPersona[];
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch personas';
    } finally {
      loading.value = false;
    }
  } else {
    personas.value = props.personas;
  }
});

// Computed property for the selected personas
const selectedPersonas = computed(() => {
  if (!props.modelValue) return [];
  const source = personas.value;
  if (props.multiple && Array.isArray(props.modelValue)) {
    const modelValueArray = props.modelValue as number[];
    return source.filter(p => modelValueArray.includes(p.persona_id));
  } else if (!props.multiple && typeof props.modelValue === 'number') {
    return source.filter(p => p.persona_id === props.modelValue);
  }
  return [];
});

// Filtered personas based on search query
const filteredPersonas = computed(() => {
  const source = personas.value;
  if (!searchQuery.value) return source;
  const query = searchQuery.value.toLowerCase();
  return source.filter(persona => 
    persona.name.toLowerCase().includes(query) || 
    (persona.description && persona.description.toLowerCase().includes(query)) ||
    (persona.scenario && persona.scenario.toLowerCase().includes(query))
  );
});

// Function to remove a persona from selection (for multiple mode)
const removePersona = (persona: ApiPersona) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const modelValueArray = props.modelValue as number[];
    emit('update:modelValue', modelValueArray.filter(id => id !== persona.persona_id));
  }
};

// Reset search query when dropdown closes
watch(selectedValue, () => {
  searchQuery.value = '';
});
</script>
