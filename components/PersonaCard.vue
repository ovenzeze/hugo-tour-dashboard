<template>
  <div class="bg-card text-card-foreground shadow-sm rounded-lg p-4 mb-4 min-w-[360px] border flex flex-col">
    <!-- Header Section -->
    <div class="w-full flex flex-row items-center space-x-3 mb-3 justify-between">
      <Avatar class="h-8 w-8 flex-shrink-0">
        <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
        <AvatarFallback>
          <UserCircle class="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div class="flex-1 overflow-hidden">
        <h3 class="text-base font-semibold truncate leading-tight">{{ persona.name }}</h3>
      </div>
        <Badge :variant="persona.is_active ? 'default' : 'destructive'" :class="persona.is_active ? 'bg-green-500 text-primary-foreground mt-0.5' : 'mt-0.5'">
          {{ persona.is_active ? 'Active' : 'Inactive' }}
        </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground">
            <span class="sr-only">Open menu</span>
            <MoreHorizontal class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="$emit('edit', persona.persona_id)">
            <Icon name="ph:pencil-simple" class="mr-2 h-4 w-4" />
            <span>Edit</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="$emit('view-details', persona.persona_id)">
            <Icon name="ph:eye" class="mr-2 h-4 w-4" />
            <span>View Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="$emit('delete', persona.persona_id)" class="text-destructive hover:!text-destructive-foreground hover:!bg-destructive">
            <Icon name="ph:trash" class="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Content Section -->
    <div class="flex-grow text-sm text-muted-foreground space-y-2.5">
      <div v-if="persona.description">
        <strong class="text-foreground block mb-0.5 text-xs uppercase tracking-wider">Description</strong>
        <p class="max-h-20 overflow-hidden text-ellipsis leading-relaxed text-sm">{{ persona.description }}</p>
      </div>
      <div v-if="persona.system_prompt">
        <strong class="text-foreground block mb-0.5 text-xs uppercase tracking-wider">System Prompt</strong>
        <p class="max-h-12 overflow-hidden text-ellipsis leading-relaxed text-sm">{{ persona.system_prompt }}</p>
      </div>
      <div v-if="persona.voice_settings">
        <strong class="text-foreground block mb-0.5 text-xs uppercase tracking-wider">Voice Settings</strong>
        <p class="max-h-12 overflow-hidden text-ellipsis leading-relaxed text-sm">{{ persona.voice_settings }}</p>
      </div>
      <div v-if="persona.voice_description">
        <strong class="text-foreground block mb-0.5 text-xs uppercase tracking-wider">Voice Description</strong>
        <p class="max-h-12 overflow-hidden text-ellipsis leading-relaxed text-sm">{{ persona.voice_description }}</p>
      </div>

      <!-- TTS Provider and Languages Section -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 py-2">
        <div v-if="persona.tts_provider">
          <div class="flex items-center space-x-1.5">
            <Icon name="ph:speaker-high" size="14" class="text-muted-foreground flex-shrink-0" />
            <strong class="text-foreground text-xs uppercase tracking-wider py-1 rounded-2xl">TTS Provider</strong>
          </div>
          <span class="text-xs mt-0.5 block px-3">{{ persona.tts_provider }}</span>
        </div>
        <div v-if="persona.language_support && persona.language_support.length > 0">
          <div class="flex items-center space-x-1.5 mb-0.5">
            <Icon name="ph:translate" size="14" class="text-muted-foreground flex-shrink-0" />
            <strong class="text-foreground text-xs uppercase tracking-wider py-1">Languages</strong>
          </div>
          <div class="flex flex-wrap gap-1">
            <Badge v-for="lang in persona.language_support" :key="lang" variant="outline" class="text-xs uppercase px-1.5 py-0.5 font-normal">{{ lang }}</Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Section -->
    <div class="mt-auto pt-2.5 border-t text-xs text-muted-foreground">
      <div class="flex justify-between items-center">
        <span v-if="persona.created_at" class="flex items-center space-x-1">
          <Icon name="ph:calendar-plus" class="h-3.5 w-3.5"/> {{ formatDate(persona.created_at) }}
        </span>
        <span v-if="persona.updated_at" class="flex items-center space-x-1">
          <Icon name="ph:clock-counter-clockwise" class="h-3.5 w-3.5"/> {{ formatDate(persona.updated_at) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiPersona } from '~/pages/personas/index.vue';

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

defineProps<{
  persona: ApiPersona;
}>();

defineEmits(['edit', 'delete', 'view-details']);
</script>