<template>
  <div class="unified-persona-selector">
    <Combobox
      :model-value="props.value"
      :multiple="props.selectionMode === 'multiple'"
      @update:model-value="handleUpdateValue"
    >
      <ComboboxTrigger class="w-full">
        <ComboboxInput
          :placeholder="`Search ${props.personas.length} personas...`"
          class="w-full"
          @input="handleSearchInput"
        />
        <!-- TODO: Add a clear button or loading indicator if needed -->
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxList :is-empty="filteredPersonas.length === 0">
          <ComboboxEmpty>
            <div class="px-4 py-2 text-sm text-muted-foreground">No personas found.</div>
          </ComboboxEmpty>
          <ComboboxItem
            v-for="persona in filteredPersonas"
            :key="persona.persona_id"
            :value="persona.persona_id"
            :disabled="isItemDisabled(persona.persona_id)"
            class="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted"
            @select="item => handleSelectItem(item, persona)"
          >
            <Avatar class="h-8 w-8 border">
              <AvatarImage :src="persona.avatar_url || ''" :alt="persona.name || 'Persona Avatar'" />
              <AvatarFallback>
                <UserCircle2Icon class="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div class="flex-1">
              <p class="font-medium text-sm">{{ persona.name }}</p>
              <p v-if="persona.description || persona.voice_description" class="text-xs text-muted-foreground truncate">
                {{ persona.description || persona.voice_description }}
              </p>
            </div>
            <CheckIcon
              v-if="isSelected(persona.persona_id)"
              class="h-5 w-5 text-primary ml-auto"
            />
          </ComboboxItem>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
    <p v-if="props.selectionMode === 'multiple' && props.maxSelection && selectedInternal.length >= props.maxSelection && !isFullySelectedAndDisabled()" class="mt-2 text-sm text-destructive text-center">
      Maximum {{ props.maxSelection }} Personas can be selected.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CheckIcon, UserCircle2Icon } from 'lucide-vue-next';
// Combobox and its sub-components (ComboboxContent, ComboboxInput, etc.) from '@/components/ui/combobox'
// are expected to be auto-imported by Nuxt, similar to other components in components/ui/.
// Avatar, Badge are auto-imported by Nuxt.

interface PersonaData {
  persona_id: number;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  language_support?: string[] | null;
  voice_description?: string | null;
}

const props = defineProps({
  personas: {
    type: Array as () => PersonaData[],
    required: true,
  },
  selectionMode: {
    type: String as () => 'single' | 'multiple',
    default: 'single',
  },
  value: { // v-model target
    type: [Number, Array, null] as unknown as () => number | number[] | null,
    default: null,
  },
  maxSelection: {
    type: Number,
    default: undefined,
  },
  // availableLanguages prop is temporarily removed for simplicity in Combobox refactor.
  // It can be added back later if needed, potentially integrated into search.
  // availableLanguages: {
  //     type: Array as () => string[],
  //     default: undefined,
  // },
});

const emit = defineEmits(['update:value', 'change']);

const searchTerm = ref('');
const selectedInternal = ref<number[]>([]); // Internal state for selected IDs

// Sync internal selection with external v-model (props.value)
watch(() => props.value, (newValue) => {
  if (props.selectionMode === 'single') {
    selectedInternal.value = newValue === null || newValue === undefined ? [] : [Number(newValue)];
  } else {
    selectedInternal.value = Array.isArray(newValue) ? newValue.map(Number) : [];
  }
}, { immediate: true, deep: true });


const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  searchTerm.value = target.value;
};

const filteredPersonas = computed(() => {
  let items = props.personas;

  // Filter by search term (name and description)
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase();
    items = items.filter(persona =>
      persona.name.toLowerCase().includes(lowerSearchTerm) ||
      (persona.description && persona.description.toLowerCase().includes(lowerSearchTerm)) ||
      (persona.voice_description && persona.voice_description.toLowerCase().includes(lowerSearchTerm))
    );
  }
  
  // TODO: Add language filtering back if needed
  // if (selectedLanguage.value) {
  //   items = items.filter(p =>
  //     p.language_support && p.language_support.some(lang =>
  //       lang.toLowerCase() === selectedLanguage.value.toLowerCase()
  //     )
  //   );
  // }
  return items;
});

const isSelected = (personaId: number): boolean => {
  return selectedInternal.value.includes(personaId);
};

const isItemDisabled = (personaId: number): boolean => {
  if (props.selectionMode !== 'multiple' || props.maxSelection === undefined) {
    return false; // No disable logic for single selection or no max
  }
  return selectedInternal.value.length >= props.maxSelection && !isSelected(personaId);
};

// Helper to prevent showing max selection message when all displayed items are selected and disabled
const isFullySelectedAndDisabled = () => {
  if (props.selectionMode !== 'multiple' || props.maxSelection === undefined) return false;
  if (selectedInternal.value.length < props.maxSelection) return false;
  
  // Check if all *currently visible* (filtered) items are among the selected ones
  // This is a bit tricky as Combobox might virtualize. For now, assume all filteredPersonas are "visible" to the logic.
  const allVisibleSelected = filteredPersonas.value.every(p => isSelected(p.persona_id));
  return allVisibleSelected && filteredPersonas.value.length > 0;
};


const handleUpdateValue = (newVal: number | number[] | null | undefined) => {
  // Reka-UI Combobox might emit undefined if cleared, treat as null
  const emittableValue = newVal === undefined ? null : newVal;

  let changedPersonasPayload: PersonaData | PersonaData[] | null = null;
  if (emittableValue === null) {
    selectedInternal.value = [];
  } else if (props.selectionMode === 'single') {
    selectedInternal.value = [emittableValue as number];
    changedPersonasPayload = props.personas.find(p => p.persona_id === emittableValue) || null;
  } else {
    selectedInternal.value = [...(emittableValue as number[])];
    changedPersonasPayload = props.personas.filter(p => (emittableValue as number[]).includes(p.persona_id));
    if (changedPersonasPayload.length === 0) changedPersonasPayload = null;
  }
  
  emit('update:value', emittableValue);
  emit('change', emittableValue, changedPersonasPayload);
};

// This function is called by ComboboxItem's @select event.
// We use handleUpdateValue which is bound to Combobox's @update:model-value
// for a more centralized update logic, as Reka-UI's Combobox handles
// selection state internally and emits the complete new model value.
// This specific handler might be useful if we need to react to an item *before*
// the model value is updated, but for now, it's not strictly necessary.
const handleSelectItem = (item: { value: number, disabled: boolean }, persona: PersonaData) => {
  // console.log('Item selected:', item, persona);
  // The actual update logic is handled by `handleUpdateValue` via `v-model` on Combobox.
  // If `maxSelection` is hit, Reka's Combobox should prevent selection if `multiple` is true.
  // We re-check `isItemDisabled` here just in case, though Reka should respect :disabled prop.
  if (isItemDisabled(persona.persona_id)) {
    return;
  }
  // For single selection, Reka's Combobox updates the model value directly.
  // For multiple selection, Reka's Combobox updates the model value (array) directly.
};

</script>
