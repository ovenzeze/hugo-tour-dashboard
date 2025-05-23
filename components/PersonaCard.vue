<template>
  <div class="group border rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-white/95 dark:bg-zinc-900/90 flex flex-col h-full">
    <!-- Header Section with improved spacing and visual hierarchy -->
    <div class="px-4 py-3.5 border-b flex justify-between items-center bg-muted/30 group-hover:bg-muted/50 transition-colors">
      <div class="flex items-center gap-3 flex-1 overflow-hidden">
        <Avatar class="h-10 w-10 flex-shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
          <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
          <AvatarFallback>
            <Icon name="ph:user-circle" class="h-8 w-8 text-primary/70" />
          </AvatarFallback>
        </Avatar>
        <div class="flex-1 overflow-hidden">
          <h3 class="text-base font-semibold truncate leading-tight text-primary group-hover:text-primary/90">{{ persona.name }}</h3>
          <Badge 
            :variant="getStatusVariant(persona.status)" 
            :class="getStatusClass(persona.status)"
          >
            <span class="flex items-center gap-1">
              <Icon :name="getStatusIcon(persona.status)" class="h-3 w-3" />
              {{ getStatusLabel(persona.status) }}
            </span>
          </Badge>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="h-8 w-8 flex-shrink-0 text-primary hover:text-primary-foreground hover:bg-primary rounded-full">
            <span class="sr-only">Open menu</span>
            <Icon name="ph:dots-three-vertical" class="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuItem @click="$emit('edit', persona.persona_id)" class="cursor-pointer font-medium">
            <Icon name="ph:pencil-simple" class="mr-2 h-4 w-4 text-primary" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="$emit('view-details', persona.persona_id)" class="cursor-pointer font-medium">
            <Icon name="ph:eye" class="mr-2 h-4 w-4 text-primary" />
            <span>View Details</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="$emit('delete', persona.persona_id)" class="text-destructive focus:text-destructive-foreground focus:bg-destructive cursor-pointer font-medium">
            <Icon name="ph:trash" class="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Content Section with improved readability -->
    <div class="p-5 flex-grow text-sm text-muted-foreground space-y-4">
      <div v-if="persona.description" class="group/section hover:bg-muted/10 p-2 -mx-2 rounded-md transition-colors">
        <strong class="text-foreground mb-1 text-xs tracking-wide flex items-center gap-1.5">
          <Icon name="ph:info" class="h-3.5 w-3.5 text-primary/70" />
          Description
        </strong>
        <p class="leading-relaxed text-sm line-clamp-3">{{ persona.description }}</p>
      </div>
      
      <div v-if="persona.system_prompt" class="group/section hover:bg-muted/10 p-2 -mx-2 rounded-md transition-colors">
        <strong class="text-foreground mb-1 text-xs tracking-wide flex items-center gap-1.5">
          <Icon name="ph:code" class="h-3.5 w-3.5 text-primary/70" />
          System Prompt
        </strong>
        <p class="leading-relaxed text-sm line-clamp-2">{{ persona.system_prompt }}</p>
      </div>
      
      <div v-if="persona.voice_settings" class="group/section hover:bg-muted/10 p-2 -mx-2 rounded-md transition-colors">
        <strong class="text-foreground mb-1 text-xs tracking-wide flex items-center gap-1.5">
          <Icon name="ph:sliders-horizontal" class="h-3.5 w-3.5 text-primary/70" />
          Voice Settings
        </strong>
        <p class="leading-relaxed text-sm line-clamp-2">{{ persona.voice_settings }}</p>
      </div>
      
      <div v-if="persona.voice_description" class="group/section hover:bg-muted/10 p-2 -mx-2 rounded-md transition-colors">
        <strong class="text-foreground mb-1 text-xs tracking-wide flex items-center gap-1.5">
          <Icon name="ph:microphone" class="h-3.5 w-3.5 text-primary/70" />
          Voice Description
        </strong>
        <p class="leading-relaxed text-sm line-clamp-2">{{ persona.voice_description }}</p>
      </div>

      <!-- TTS Provider and Languages Section with improved layout -->
      <div class="grid sm:grid-cols-2 gap-4 py-2 mt-2 border-t border-muted/20 pt-4">
        <div v-if="persona.tts_provider" class="bg-muted/10 p-2.5 rounded-lg">
          <div class="flex items-center gap-2 mb-1.5">
            <Icon name="ph:speaker-high" class="h-4 w-4 text-primary/70" />
            <strong class="text-foreground text-xs tracking-wide">TTS Provider</strong>
          </div>
          <span class="text-xs block px-1 font-medium">{{ persona.tts_provider }}</span>
        </div>
        
        <div v-if="persona.language_support && persona.language_support.length > 0" class="bg-muted/10 p-2.5 rounded-lg">
          <div class="flex items-center gap-2 mb-1.5">
            <Icon name="ph:translate" class="h-4 w-4 text-primary/70" />
            <strong class="text-foreground text-xs tracking-wide">Languages</strong>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <Badge 
              v-for="lang in persona.language_support" 
              :key="lang" 
              variant="outline" 
              class="text-xs px-2 py-0.5 font-normal bg-background/50 hover:bg-background transition-colors"
            >
              {{ lang }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Section with improved styling -->
    <div class="mt-auto py-3 px-5 border-t text-xs text-muted-foreground bg-muted/5">
      <div class="flex justify-between items-center">
        <span v-if="persona.created_at" class="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <Icon name="ph:calendar-plus" class="h-3.5 w-3.5"/> 
          <span>Created: {{ formatDate(persona.created_at) }}</span>
        </span>
        <span v-if="persona.updated_at" class="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <Icon name="ph:clock-counter-clockwise" class="h-3.5 w-3.5"/> 
          <span>Updated: {{ formatDate(persona.updated_at) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiPersona } from '~/pages/personas/index.vue';

/**
 * Format a date string to a localized format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Get badge variant based on persona status
 */
const getStatusVariant = (status: 'active' | 'inactive' | 'deprecated') => {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'outline';
    case 'deprecated':
      return 'destructive';
    default:
      return 'outline';
  }
};

/**
 * Get badge class based on persona status
 */
const getStatusClass = (status: 'active' | 'inactive' | 'deprecated') => {
  const baseClass = 'text-xs px-2 py-0.5 mt-1 rounded-full';
  switch (status) {
    case 'active':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-200 border-green-300 dark:border-green-700`;
    case 'inactive':
      return `${baseClass} text-muted-foreground border-muted-foreground/50 bg-muted/10`;
    case 'deprecated':
      return `${baseClass} text-destructive-foreground border-destructive/50 bg-destructive/10`;
    default:
      return `${baseClass} text-muted-foreground border-muted-foreground/50 bg-muted/10`;
  }
};

/**
 * Get icon name based on persona status
 */
const getStatusIcon = (status: 'active' | 'inactive' | 'deprecated') => {
  switch (status) {
    case 'active':
      return 'ph:check-circle';
    case 'inactive':
      return 'ph:pause-circle';
    case 'deprecated':
      return 'ph:x-circle';
    default:
      return 'ph:question-mark';
  }
};

/**
 * Get status label based on persona status
 */
const getStatusLabel = (status: 'active' | 'inactive' | 'deprecated') => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'deprecated':
      return 'Deprecated';
    default:
      return 'Unknown';
  }
};

const props = defineProps<{
  persona: ApiPersona;
}>();

defineEmits(['edit', 'delete', 'view-details']);
</script>