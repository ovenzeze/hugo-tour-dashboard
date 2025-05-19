<template>
  <div class="unified-persona-selector">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between h-10"
        >
          <span class="truncate">{{ selectedDisplayValue }}</span>
          <ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[--radix-popover-trigger-width] p-0 border-border">
        <Command
          v-model="commandValue"
        >
          <!-- <CommandInput placeholder="Search persona..." /> REMOVED AS PER REQUIREMENT -->
          <!-- <CommandInput placeholder="Search persona..." /> REMOVED AS PER REQUIREMENT -->
          <CommandEmpty>
            <div class="px-3 py-2 text-sm text-muted-foreground">No personas found.</div>
          </CommandEmpty>
          <CommandList class="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <CommandGroup>
              <CommandItem
                v-for="persona in listPersonas"
                :key="persona.persona_id"
                :value="persona.persona_id"
                :disabled="isItemDisabled(persona.persona_id)"
                class="flex items-center gap-2.5 p-2 cursor-pointer"
                @select="(event: CustomEvent<{ value: number }>) => { handleSelectCommandItem(event.detail.value); if (props.selectionMode === 'single') open = false; }"
              >
                <Avatar class="h-9 w-9 border border-border">
                <AvatarImage :src="persona.avatar_url || ''" :alt="persona.name || 'Persona Avatar'" />
                <AvatarFallback>
                  <UserCircle2Icon class="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 flex flex-col gap-0.5">
                <p class="font-medium text-sm leading-tight">{{ persona.name }}</p>
                <p v-if="persona.description || persona.voice_description" class="text-xs text-muted-foreground truncate leading-tight">
                  {{ persona.description || persona.voice_description }}
                </p>
                <p v-if="persona.language_support && persona.language_support.length > 0" class="text-xs text-muted-foreground/80 leading-tight">
                  Languages: {{ persona.language_support.join(', ') }}
                </p>
              </div>
              <CheckIcon
                v-if="isSelected(persona.persona_id)"
                class="h-4 w-4 text-primary ml-auto shrink-0"
              />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <p v-if="props.selectionMode === 'multiple' && props.maxSelection && selectedInternal.length >= props.maxSelection && !isFullySelectedAndDisabled()" class="mt-1.5 text-xs text-destructive text-center px-2">
      Maximum {{ props.maxSelection }} Personas can be selected.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { CheckIcon, UserCircle2Icon, ChevronsUpDownIcon } from 'lucide-vue-next';
// Shadcn/Vue UI components like Button, Popover, Command, Avatar are auto-imported by Nuxt.
import type { Database } from '@/types/supabase';

// Ensure PersonaData matches the structure from Supabase, including all relevant fields.
type PersonaData = Database['public']['Tables']['personas']['Row'];

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
  placeholder: {
    type: String,
    default: 'Select Persona...',
  },
});

const emit = defineEmits(['update:value', 'change']);

const open = ref(false);
console.log('UnifiedPersonaSelector: initial open state in script setup:', open.value);

onMounted(() => {
  console.log('UnifiedPersonaSelector: open state onMounted:', open.value);
});

watch(open, (newValue, oldValue) => {
  console.log(`UnifiedPersonaSelector: open state changed from ${oldValue} to ${newValue}. Stack:`, new Error().stack);
}, { immediate: false }); // Set immediate to false to only log actual changes after setup

const selectedInternal = ref<number[]>([]); // Internal state for selected IDs, mirrors props.value
const commandValue = ref<number | number[] | undefined>(); // Internal state for Command v-model

watch(() => props.value, (newValue) => {
  console.log('UnifiedPersonaSelector: props.value watcher triggered. New value:', newValue, 'Current open state:', open.value);
  if (props.selectionMode === 'single') {
    const val = newValue === null || newValue === undefined ? [] : [Number(newValue)];
    selectedInternal.value = val;
    commandValue.value = val.length > 0 ? val[0] : undefined;
  } else {
    const val = Array.isArray(newValue) ? newValue.map(Number) : [];
    selectedInternal.value = val;
    commandValue.value = val;
  }
}, { immediate: true, deep: true });

// Watch for changes in commandValue to update selectedInternal and emit,
// This is primarily for when Command component itself changes its value (e.g. keyboard nav)
// and needs to reflect back to the parent via v-model on UnifiedPersonaSelector.
// However, since we removed CommandInput, direct changes to commandValue from Command itself are less likely.
// The primary flow is user clicks -> handleSelectCommandItem -> updates selectedInternal -> emits -> props.value changes -> watch(props.value) updates commandValue.
// This watch might be redundant if Command doesn't internally change commandValue without an explicit @select.
// For now, keeping it to ensure two-way sync if Command had more complex internal state changes.
watch(commandValue, (newCmdValue) => {
   if (props.selectionMode === 'single') {
       const currentPropVal = props.value === null || props.value === undefined ? undefined : Number(props.value);
       if (newCmdValue !== undefined && newCmdValue !== currentPropVal) {
           // This case is tricky. If commandValue changes (e.g. from Command's internal logic, not user click),
           // we need to decide if/how to update selectedInternal and emit.
           // For now, our primary update path is through handleSelectCommandItem.
           // Let's assume direct changes to commandValue that don't go through handleSelectCommandItem are not expected
           // with the current setup (no CommandInput).
           // If they were, we'd update selectedInternal and emit here.
       } else if (newCmdValue === undefined && currentPropVal !== undefined) {
           // Command cleared its value, reflect this if different
           // emit('update:value', null);
           // emit('change', null, null);
       }
   } else { // multiple
       // Similar logic for multiple, if commandValue (array) changes independently.
       // For now, relying on handleSelectCommandItem.
   }
}, { deep: true });

const listPersonas = computed(() => {
  return props.personas;
});

const isSelected = (personaId: number): boolean => {
  return selectedInternal.value.includes(personaId);
};

const isItemDisabled = (personaId: number): boolean => {
  if (props.selectionMode !== 'multiple' || props.maxSelection === undefined) {
    return false;
  }
  return selectedInternal.value.length >= props.maxSelection && !isSelected(personaId);
};

const getPersonaById = (id: number): PersonaData | undefined => {
  return props.personas.find(p => p.persona_id === id);
};

const selectedDisplayValue = computed(() => {
  if (props.selectionMode === 'single') {
    if (selectedInternal.value.length > 0) {
      const persona = getPersonaById(selectedInternal.value[0]);
      return persona ? persona.name : props.placeholder;
    }
    return props.placeholder;
  } else { // multiple
    if (selectedInternal.value.length === 0) {
      return props.placeholder;
    }
    if (selectedInternal.value.length === 1) {
      const persona = getPersonaById(selectedInternal.value[0]);
      return persona ? persona.name : props.placeholder;
    }
    return `${selectedInternal.value.length} selected`;
  }
});

const handleSelectCommandItem = (personaId: number) => {
  let newSelectedValue: number | number[] | null = null;
  let changedPersonasPayload: PersonaData | PersonaData[] | null = null;

  if (props.selectionMode === 'single') {
    if (selectedInternal.value.includes(personaId)) {
      // In single select, if already selected, clicking again does nothing or deselects.
      // For now, let's make it so clicking an already selected item in single mode does not change selection, just closes.
      // If deselection is desired, uncomment below:
      // selectedInternal.value = [];
      // newSelectedValue = null;
    } else {
      selectedInternal.value = [personaId];
      newSelectedValue = personaId;
      commandValue.value = personaId; // Sync Command's v-model
    }
    // open.value = false; // Already handled in @select for single mode
  } else { // multiple
    const currentSelected = [...selectedInternal.value];
    const index = currentSelected.indexOf(personaId);
    if (index > -1) {
      currentSelected.splice(index, 1); // Deselect
    } else {
      if (!isItemDisabled(personaId)) {
        currentSelected.push(personaId); // Select
      }
    }
    selectedInternal.value = currentSelected;
    newSelectedValue = [...currentSelected];
    commandValue.value = [...currentSelected]; // Sync Command's v-model
  }

  // Prepare payload for 'change' event
  if (newSelectedValue === null) {
     changedPersonasPayload = null;
  } else if (props.selectionMode === 'single') {
    changedPersonasPayload = getPersonaById(newSelectedValue as number) || null;
  } else { // multiple
    if (Array.isArray(newSelectedValue) && newSelectedValue.length > 0) {
      changedPersonasPayload = props.personas.filter(p => (newSelectedValue as number[]).includes(p.persona_id));
    } else {
      changedPersonasPayload = null;
      newSelectedValue = []; // Ensure empty array for v-model if nothing selected in multi-select
    }
  }
  
  // Emit if the value actually changed or if it's a multi-select update
  // For single select, only emit if newSelectedValue is different from current props.value
  let shouldEmit = true;
  if (props.selectionMode === 'single') {
      if (newSelectedValue === props.value && newSelectedValue !== null) { // if it's null, it means deselection, should emit
          // if the value is the same and not null, it means we just closed the popover.
          // but if newSelectedValue is null (deselected), we should emit.
          // The logic for newSelectedValue being null if deselected is currently commented out.
          // If we are not allowing deselection by re-clicking in single mode, then this check is fine.
      }
  }


  // Always emit for multi-select as the array instance might change or items within it.
  // For single select, if newSelectedValue is set (even if same as before, to confirm selection), emit.
  // If newSelectedValue is null (deselection), emit.
  // The main complexity is when single-select item is re-clicked. If it doesn't change value, do we emit?
  // Let's simplify: always emit the new state. Parent can decide if it's a "real" change.
  emit('update:value', newSelectedValue);
  emit('change', newSelectedValue, changedPersonasPayload);
};

const isFullySelectedAndDisabled = () => {
  if (props.selectionMode !== 'multiple' || props.maxSelection === undefined) return false;
  if (selectedInternal.value.length < props.maxSelection) return false;
  
  const allVisibleSelectedOrDisabled = listPersonas.value.every(p => isSelected(p.persona_id) || isItemDisabled(p.persona_id) );
  return allVisibleSelectedOrDisabled && listPersonas.value.length > 0;
};

</script>
