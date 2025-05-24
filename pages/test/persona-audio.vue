<template>
  <div class="container mx-auto py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Persona Audio Preview Test</h1>
        <p class="text-muted-foreground">
          测试Persona语音试听功能。此页面用于验证音频样本获取和播放功能。
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <Icon name="ph:spinner-bold" class="h-8 w-8 animate-spin text-primary" />
        <span class="ml-2 text-lg">Loading personas...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-2 text-destructive">
          <Icon name="ph:warning-circle-bold" class="h-5 w-5" />
          <span class="font-medium">Failed to load personas</span>
        </div>
        <p class="mt-2 text-sm text-destructive/80">{{ error }}</p>
      </div>

      <!-- Personas Grid -->
      <div v-else-if="personas && personas.length > 0" class="space-y-6">
        <!-- Stats -->
        <div class="bg-muted/30 rounded-lg p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-primary">{{ personas.length }}</div>
              <div class="text-sm text-muted-foreground">Total Personas</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-primary">{{ activePersonas.length }}</div>
              <div class="text-sm text-muted-foreground">Active Personas</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-primary">{{ personasWithVoice.length }}</div>
              <div class="text-sm text-muted-foreground">With Voice Config</div>
            </div>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="bg-background border rounded-lg p-4">
          <div class="flex flex-wrap gap-4 items-center">
            <div class="flex items-center gap-2">
              <Label>Status:</Label>
              <Select v-model="statusFilter">
                <SelectTrigger class="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div class="flex items-center gap-2">
              <Label>Voice Config:</Label>
              <Select v-model="voiceFilter">
                <SelectTrigger class="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="with-voice">With Voice</SelectItem>
                  <SelectItem value="no-voice">No Voice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button @click="refreshData" variant="outline" size="sm">
              <Icon name="ph:arrow-clockwise-bold" class="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <!-- Personas Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PersonaCard
            v-for="persona in filteredPersonas"
            :key="persona.persona_id"
            :persona="persona"
            @edit="handleEdit"
            @delete="handleDelete"
            @view-details="handleViewDetails"
            @updated="handleUpdated"
          />
        </div>

        <!-- Empty State for Filtered Results -->
        <div v-if="filteredPersonas.length === 0" class="text-center py-12">
          <Icon name="ph:funnel-bold" class="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 class="text-lg font-medium mb-2">No personas match filters</h3>
          <p class="text-muted-foreground mb-4">Try adjusting your filter criteria.</p>
          <Button @click="clearFilters" variant="outline">Clear Filters</Button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <Icon name="ph:users-three-bold" class="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 class="text-lg font-medium mb-2">No personas found</h3>
        <p class="text-muted-foreground">No personas are available for testing audio preview.</p>
      </div>

      <!-- Debug Info -->
      <div class="mt-12 pt-8 border-t">
        <details class="bg-muted/20 rounded-lg p-4">
          <summary class="cursor-pointer font-medium mb-4">Debug Information</summary>
          <div class="space-y-4 text-sm">
            <div>
              <strong>Audio Preview State:</strong>
              <pre class="mt-2 p-2 bg-muted rounded text-xs overflow-auto">{{ JSON.stringify({
                hasAnyAudio: audioPreview.audioSamples && Object.keys(audioPreview.audioSamples).length > 0,
                currentlyPlaying: audioPreview.currentlyPlaying,
                loadingStates: Object.keys(loadingStates).length > 0 ? loadingStates : 'none'
              }, null, 2) }}</pre>
            </div>
            <div>
              <strong>Filtered Personas:</strong>
              <pre class="mt-2 p-2 bg-muted rounded text-xs overflow-auto">{{ JSON.stringify(filteredPersonas.map(p => ({
                id: p.persona_id,
                name: p.name,
                status: p.status,
                hasVoice: !!(p.voice_model_identifier && p.tts_provider)
              })), null, 2) }}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { usePersonaAudioPreview } from '~/composables/usePersonaAudioPreview'
import type { ApiPersona } from '~/pages/personas/index.vue'

// Page metadata
definePageMeta({
  title: 'Persona Audio Preview Test',
  layout: 'default'
})

// State
const personas = ref<ApiPersona[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const statusFilter = ref('all')
const voiceFilter = ref('all')

// Audio preview composable
const audioPreview = usePersonaAudioPreview()

// Computed properties
const activePersonas = computed(() => 
  personas.value.filter(p => p.status === 'active')
)

const personasWithVoice = computed(() =>
  personas.value.filter(p => p.voice_model_identifier && p.tts_provider)
)

const filteredPersonas = computed(() => {
  let filtered = personas.value

  // Status filter
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(p => p.status === statusFilter.value)
  }

  // Voice filter
  if (voiceFilter.value === 'with-voice') {
    filtered = filtered.filter(p => p.voice_model_identifier && p.tts_provider)
  } else if (voiceFilter.value === 'no-voice') {
    filtered = filtered.filter(p => !p.voice_model_identifier || !p.tts_provider)
  }

  return filtered
})

const loadingStates = computed(() => {
  const states: Record<number, boolean> = {}
  personas.value.forEach(p => {
    const isLoading = audioPreview.isLoading(p.persona_id)
    if (isLoading) {
      states[p.persona_id] = isLoading
    }
  })
  return states
})

// Methods
const fetchPersonas = async () => {
  loading.value = true
  error.value = null
  
  try {
    const data = await $fetch<ApiPersona[]>('/api/personas')
    personas.value = data || []
    
    // Preload audio samples for personas with voice configuration
    const personasToPreload = personas.value
      .filter(p => p.status === 'active' && p.voice_model_identifier && p.tts_provider)
      .map(p => p.persona_id)
    
    if (personasToPreload.length > 0) {
      console.log(`Preloading audio samples for ${personasToPreload.length} personas`)
      await audioPreview.preloadAudioSamples(personasToPreload)
    }
    
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch personas'
    console.error('Failed to fetch personas:', err)
  } finally {
    loading.value = false
  }
}

const refreshData = async () => {
  audioPreview.clearAllCache()
  await fetchPersonas()
  toast.success('Data refreshed')
}

const clearFilters = () => {
  statusFilter.value = 'all'
  voiceFilter.value = 'all'
}

// Event handlers (basic implementations for testing)
const handleEdit = (personaId: number) => {
  toast.info(`Edit persona ${personaId} (test mode - no action taken)`)
}

const handleDelete = (personaId: number) => {
  toast.info(`Delete persona ${personaId} (test mode - no action taken)`)
}

const handleViewDetails = (personaId: number) => {
  const persona = personas.value.find(p => p.persona_id === personaId)
  if (persona) {
    toast.info(`View details for ${persona.name} (test mode)`)
  }
}

const handleUpdated = (updatedPersona: ApiPersona) => {
  const index = personas.value.findIndex(p => p.persona_id === updatedPersona.persona_id)
  if (index !== -1) {
    personas.value[index] = updatedPersona
    toast.success('Persona updated')
  }
}

// Lifecycle
onMounted(() => {
  fetchPersonas()
})
</script> 