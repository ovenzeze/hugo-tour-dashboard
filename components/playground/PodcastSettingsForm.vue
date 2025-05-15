<template>
  <div class="space-y-5 p-1">
    <div>
      <Label for="podcastTitle" class="text-base font-semibold">Title</Label>
      <Input
        id="podcastTitle"
        v-model="editableSettings.title"
        placeholder="e.g., The Future of AI"
        class="mt-1.5"
      />
    </div>

    <div>
      <Label for="podcastTopic" class="text-base font-semibold">Topic / Instructions</Label>
      <Textarea
        id="podcastTopic"
        v-model="editableSettings.topic"
        placeholder="Describe in detail what you want the podcast to cover..."
        class="mt-1.5 min-h-[120px]"
      />
    </div>

    <div class="grid grid-cols-1 gap-x-4 gap-y-5">
      <!-- Host Character -->
      <div class="flex items-center border rounded-md p-0 space-x-3 bg-background">
        <Icon name="ph:user-sound" class="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2.5" />
        <Select v-model="editableSettings.hostPersonaId" class="flex-1">
          <SelectTrigger id="hostPersona" class="w-full border-0 focus:ring-0 shadow-none bg-transparent text-sm pl-1 pr-2.5 py-2.5 h-auto">
            <SelectValue placeholder="Select Host Character" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel v-if="personasLoading">Loading...</SelectLabel>
              <SelectLabel v-else-if="!personas || personas.length === 0">No characters available</SelectLabel>
              <SelectItem
                v-for="persona in personas"
                :key="persona.persona_id"
                :value="String(persona.persona_id)"
              >
                {{ persona.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="text-sm font-medium">Guest Characters</Label>
        <ScrollArea class="mt-1.5 h-[100px] w-full rounded-md border">
          <div class="p-3 space-y-2">
            <p v-if="personasLoading" class="text-xs text-muted-foreground px-1">Loading...</p>
            <p v-else-if="!personas || personas.length === 0 || availableGuestPersonas.length === 0" class="text-xs text-muted-foreground px-1">
              {{ !personas || personas.length === 0 ? 'No characters' : 'No other guests' }}
            </p>
            <div v-for="persona in availableGuestPersonas" :key="persona.persona_id" class="flex items-center space-x-2">
              <Checkbox
                :id="'guest-' + persona.persona_id"
                :checked="isGuestSelected(persona.persona_id)"
                @update:checked="(checked: boolean) => toggleGuestPersona(persona.persona_id, checked)"
              />
              <Label :for="'guest-' + persona.persona_id" class="text-sm font-normal cursor-pointer">
                {{ persona.name }}
              </Label>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 pt-2">
      <div>
        <Label for="podcastSegments" class="text-sm font-medium">Number of Segments</Label>
        <Input
          id="podcastSegments"
          type="number"
          v-model.number="editableSettings.numberOfSegments"
          placeholder="e.g., 3"
          class="mt-1.5"
          min="1"
          max="10"
        />
      </div>

      <div>
        <Label for="podcastStyle" class="text-sm font-medium">Style / Tone</Label>
        <Input
          id="podcastStyle"
          v-model="editableSettings.style"
          placeholder="e.g., Casual, Educational, Storytelling"
          class="mt-1.5"
        />
      </div>

      <div>
        <Label for="podcastKeywords" class="text-sm font-medium">Keywords</Label>
        <Input
          id="podcastKeywords"
          v-model="editableSettings.keywords"
          placeholder="Comma-separated, e.g., AI, ML, Future Tech"
          class="mt-1.5"
        />
      </div>
       <div>
        <Label for="backgroundMusic" class="text-sm font-medium">Background Music (Optional)</Label>
        <Input
          id="backgroundMusic"
          v-model="editableSettings.backgroundMusic"
          placeholder="Theme or style, e.g., Upbeat, Chill Tech"
          class="mt-1.5"
        />
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
// Ignore linter errors for type imports
// @ts-ignore
import type { FullPodcastSettings, Persona } from '~/types/playground';

const props = defineProps<{
  modelValue: FullPodcastSettings;
  personas: Persona[];
  personasLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FullPodcastSettings): void;
}>();

const editableSettings = computed({
  get: () => props.modelValue,
  set: (value) => {
    // Ensure correct handling of numeric types
    const processedValue = {
      ...value,
      numberOfSegments: Number(value.numberOfSegments) || 1, 
      hostPersonaId: value.hostPersonaId ? Number(value.hostPersonaId) : undefined,
      // Ensure guestPersonaIds is an array and each element is a number
      guestPersonaIds: Array.isArray(value.guestPersonaIds) ? 
                      value.guestPersonaIds
                        .map((id: string | number | undefined) => Number(id))
                        .filter((id: number) => !isNaN(id) && id > 0) : 
                      []
    };
    console.log('Edit form - Sending update:', {
      originalValue: value,
      processedValue: processedValue,
      guestPersonaIdsType: Array.isArray(processedValue.guestPersonaIds) ?
                         processedValue.guestPersonaIds.map((id: number) => typeof id) : 
                         'not an array'
    });
    emit('update:modelValue', processedValue);
  }
});

const availableGuestPersonas = computed(() => {
  if (!props.personas) return [];
  return props.personas.filter(p => p.persona_id !== Number(editableSettings.value.hostPersonaId));
});

// Check if guest is selected
function isGuestSelected(personaId: number): boolean {
  if (!Array.isArray(editableSettings.value.guestPersonaIds)) {
    return false;
  }
  
  const numericPersonaId = Number(personaId);
  // Ensure using Number() for comparison to avoid type mismatch issues
  return editableSettings.value.guestPersonaIds.some((id: number | string | undefined) => 
    Number(id) === numericPersonaId
  );
}

function toggleGuestPersona(personaId: number, isChecked: boolean) {
  console.log('toggleGuestPersona called:', { personaId, isChecked });
  
  // Get a copy of the current guest list
  let guestPersonaIds = Array.isArray(editableSettings.value.guestPersonaIds) ? 
                        [...editableSettings.value.guestPersonaIds] : 
                        [];
  
  // Ensure all IDs are numbers
  guestPersonaIds = guestPersonaIds.map((id: string | number | undefined) => Number(id))
                                  .filter((id: number) => !isNaN(id));
                        
  console.log('Current guests:', {
    guestPersonaIds, 
    type: typeof guestPersonaIds,
    isArray: Array.isArray(guestPersonaIds),
    length: guestPersonaIds.length
  });
  
  const numericPersonaId = Number(personaId);

  if (isChecked) {
    // Add guest (if not already present)
    if (!guestPersonaIds.includes(numericPersonaId)) {
      guestPersonaIds.push(numericPersonaId);
      console.log('Adding guest:', numericPersonaId);
    }
  } else {
    // Remove guest
    const index = guestPersonaIds.indexOf(numericPersonaId);
    if (index > -1) {
      guestPersonaIds.splice(index, 1);
      console.log('Removing guest:', numericPersonaId);
    }
  }
  
  console.log('Updated guests:', guestPersonaIds);
  
  // Create a new settings object, ensuring guestPersonaIds is a number array
  const updatedSettings = { 
    ...editableSettings.value, 
    guestPersonaIds: guestPersonaIds 
  };
  
  console.log('Sending update:', {
    guestPersonaIds: updatedSettings.guestPersonaIds,
    type: typeof updatedSettings.guestPersonaIds,
    isArray: Array.isArray(updatedSettings.guestPersonaIds)
  });
  
  // Update settings
  emit('update:modelValue', updatedSettings);
}

watch(() => props.modelValue.hostPersonaId, (newHostId: number | string | undefined) => {
  const numericNewHostId = Number(newHostId);
  if (Array.isArray(editableSettings.value.guestPersonaIds) && editableSettings.value.guestPersonaIds.includes(numericNewHostId)) {
    const updatedGuests = editableSettings.value.guestPersonaIds
      .map((id: string | number | undefined) => Number(id)) // Convert all elements to number
      .filter((id: number) => !isNaN(id) && id !== numericNewHostId); // Filter out NaN and the new host ID
    emit('update:modelValue', { ...editableSettings.value, guestPersonaIds: updatedGuests });
  }
});

// Watch for personas to load and set defaults if not already set
watch(() => props.personas, (loadedPersonas) => {
  if (loadedPersonas && loadedPersonas.length > 0) {
    const currentModel = props.modelValue;
    let newHostId = currentModel.hostPersonaId ? String(currentModel.hostPersonaId) : undefined;
    let newGuestIds = Array.isArray(currentModel.guestPersonaIds) && currentModel.guestPersonaIds.length > 0
                      ? currentModel.guestPersonaIds.map(id => String(id)) // Assuming guestPersonaIds are numbers or strings
                      : [];

    let needsUpdate = false;

    // Default Host: if not already set in modelValue and personas are available
    // Assuming 'persona_id' is the correct property on the Persona object.
    if (!newHostId && loadedPersonas.length > 0) {
      const defaultHost = loadedPersonas[0];
      if (defaultHost && typeof defaultHost.persona_id !== 'undefined') { // Check if persona_id exists
        newHostId = String(defaultHost.persona_id);
        needsUpdate = true;
      }
    }

    // Default Guest: if not already set in modelValue, a host is selected/defaulted, and a different persona is available
    // Assuming 'persona_id' is the correct property on the Persona object.
    if (newGuestIds.length === 0 && newHostId && loadedPersonas.length > 0) {
      const potentialGuest = loadedPersonas.find(p => p && typeof p.persona_id !== 'undefined' && String(p.persona_id) !== newHostId);
      if (potentialGuest) {
        newGuestIds = [String(potentialGuest.persona_id)];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      emit('update:modelValue', {
        ...currentModel,
        hostPersonaId: newHostId ? Number(newHostId) : undefined,
        guestPersonaIds: newGuestIds.map(id => Number(id)),
      });
    }
  }
}, { immediate: true, deep: true });

</script>
