<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">Recommendation Settings</h3>
      <div class="flex gap-2">
        <Badge v-if="persona.is_recommended_host" variant="default" class="text-xs">
          <Icon name="ph:microphone-bold" class="w-3 h-3 mr-1" />
          Recommended Host
        </Badge>
        <Badge v-if="persona.is_recommended_guest" variant="secondary" class="text-xs">
          <Icon name="ph:users-bold" class="w-3 h-3 mr-1" />
          Recommended Guest
        </Badge>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Host Settings -->
      <div class="flex items-center justify-between p-3 border rounded-md">
        <div class="flex items-center gap-2">
          <Icon name="ph:microphone-bold" class="w-4 h-4 text-primary" />
          <span class="text-sm font-medium">Recommend as Host</span>
        </div>
        <Switch 
          :checked="persona.is_recommended_host" 
          @update:checked="updateHostRecommendation"
          :disabled="isUpdating"
        />
      </div>
      
      <!-- Guest Settings -->
      <div class="flex items-center justify-between p-3 border rounded-md">
        <div class="flex items-center gap-2">
          <Icon name="ph:users-bold" class="w-4 h-4 text-secondary" />
          <span class="text-sm font-medium">Recommend as Guest</span>
        </div>
        <Switch 
          :checked="persona.is_recommended_guest" 
          @update:checked="updateGuestRecommendation"
          :disabled="isUpdating"
        />
      </div>
    </div>
    
    <!-- Priority Settings -->
    <div v-if="persona.is_recommended_host || persona.is_recommended_guest" class="p-3 border rounded-md">
      <div class="flex items-center justify-between mb-2">
        <Label for="priority" class="text-sm font-medium">Recommendation Priority</Label>
        <span class="text-xs text-muted-foreground">{{ persona.recommended_priority || 100 }}</span>
      </div>
      <Slider
        id="priority"
        :model-value="[persona.recommended_priority || 100]"
        @update:model-value="updatePriority"
        :min="1"
        :max="200"
        :step="10"
        :disabled="isUpdating"
        class="w-full"
      />
      <div class="flex justify-between text-xs text-muted-foreground mt-1">
        <span>High Priority (1)</span>
        <span>Low Priority (200)</span>
      </div>
    </div>
    
    <!-- Supported Languages Display -->
    <div class="p-3 bg-muted/50 rounded-md">
      <Label class="text-sm font-medium mb-2 block">Supported Languages</Label>
      <div class="flex flex-wrap gap-1">
        <Badge 
          v-for="lang in persona.language_support"
          :key="lang"
          variant="outline"
          class="text-xs"
        >
          {{ getLanguageName(lang) }}
        </Badge>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Database } from '~/types/supabase';

type PersonaRow = Database['public']['Tables']['personas']['Row'];

interface Props {
  persona: PersonaRow;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  updated: [persona: PersonaRow]
}>();

const isUpdating = ref(false);

// Language name mapping
const languageNames: Record<string, string> = {
  'zh': 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'en': 'English',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'ja': 'Japanese',
  'ko': 'Korean',
  'de': 'German',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian'
};

function getLanguageName(langCode: string): string {
  return languageNames[langCode] || langCode;
}

async function updatePersonaRecommendation(updates: Partial<PersonaRow>) {
  if (isUpdating.value) return;
  
  isUpdating.value = true;
  try {
    const response = await $fetch(`/api/personas/${props.persona.persona_id}`, {
      method: 'PUT',
      body: updates
    });
    
    if (response) {
      emit('updated', response);
      useNuxtApp().$toast.success('Recommendation settings updated');
    } else {
      useNuxtApp().$toast.error('Update failed: No response data');
    }
  } catch (error: any) {
    console.error('Failed to update persona recommendation:', error);
    useNuxtApp().$toast.error('Update failed: ' + error.message);
  } finally {
    isUpdating.value = false;
  }
}

async function updateHostRecommendation(checked: boolean) {
  await updatePersonaRecommendation({ 
    is_recommended_host: checked,
    // If setting as recommended Host and no current priority, set default priority
    recommended_priority: checked && !props.persona.recommended_priority ? 50 : props.persona.recommended_priority
  });
}

async function updateGuestRecommendation(checked: boolean) {
  await updatePersonaRecommendation({ 
    is_recommended_guest: checked,
    // If setting as recommended Guest and no current priority, set default priority
    recommended_priority: checked && !props.persona.recommended_priority ? 50 : props.persona.recommended_priority
  });
}

async function updatePriority(value: number[]) {
  if (value.length > 0) {
    await updatePersonaRecommendation({ 
      recommended_priority: value[0] 
    });
  }
}
</script> 