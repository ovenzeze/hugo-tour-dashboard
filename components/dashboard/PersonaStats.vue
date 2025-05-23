<template>
  <Card class="h-full">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription v-if="description">{{ description }}</CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <Icon name="ph:spinner" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="!personas || personas.length === 0" class="flex items-center justify-center py-8 text-muted-foreground">
        No personas available
      </div>
      <div v-else class="divide-y">
        <div v-for="persona in personas" :key="persona.persona_id" 
             class="p-4 hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <div class="avatar-container h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
              <img v-if="persona.avatar_url" :src="persona.avatar_url" alt="" class="h-full w-full object-cover" />
              <Icon v-else name="ph:user" class="h-full w-full p-2 text-gray-400" />
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <p class="font-medium">{{ persona.persona_name }}</p>
                <Badge :variant="getStatusVariant(persona.status)">{{ persona.status }}</Badge>
              </div>
              
              <div class="mt-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Audio Count</span>
                  <span class="font-medium">{{ persona.audio_count || 0 }}</span>
                </div>
                
                <div class="mt-1 text-sm flex justify-between">
                  <span class="text-gray-500">Total Duration</span>
                  <span class="font-medium">{{ formatDuration(persona.total_duration_seconds) }}</span>
                </div>
              </div>
              
              <div class="mt-2 flex flex-wrap gap-1">
                <Badge v-for="language in getLanguages(persona.languages_used)" 
                       :key="language" 
                       variant="outline" 
                       class="text-xs">
                  {{ language }}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

// Define Persona interface
interface Persona {
  persona_id: number;
  avatar_url?: string;
  persona_name: string;
  status: string;
  audio_count?: number;
  total_duration_seconds?: number;
  languages_used?: string;
}

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  personas: {
    type: Array as () => Persona[], // Specify array of Persona type
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Format duration in seconds to minutes and seconds
function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '0s'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  if (minutes === 0) {
    return `${remainingSeconds}s`
  }
  
  return `${minutes}m ${remainingSeconds}s`
}

// Get badge variant based on persona status
function getStatusVariant(status: string | undefined): "default" | "secondary" | "outline" | "destructive" {
  switch(status?.toLowerCase()) {
    case 'active':
      return 'default' // Changed to 'default' to match Badge variant type
    case 'inactive':
      return 'secondary'
    case 'pending':
      return 'outline' // Changed to 'outline' to match Badge variant type
    default:
      return 'outline'
  }
}

// Split languages string into array
function getLanguages(languagesString: string | undefined): string[] {
  if (!languagesString) return []
  
  return languagesString.split(', ').filter(Boolean)
}
</script>
