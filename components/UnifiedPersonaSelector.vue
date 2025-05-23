<template>
  <div class="w-full">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          :class="[
            'w-full justify-between h-12',
            !hasSelection && 'text-muted-foreground'
          ]"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User class="h-4 w-4 text-muted-foreground" />
            </div>
            <span class="truncate text-left font-normal">{{ displayText }}</span>
          </div>
          <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50 ml-3" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent class="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search personas..." class="h-9" />
          <CommandEmpty>No personas found.</CommandEmpty>
          <CommandList class="max-h-[300px]">
            <CommandGroup>
              <CommandItem
                v-for="persona in personas"
                :key="persona.persona_id"
                :value="persona.name"
                @select="() => handleSelect(persona.persona_id)"
                :class="[
                  'flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  isPersonaSelected(persona.persona_id) && 'bg-accent/30'
                ]"
              >
                <!-- Avatar with selection indicator -->
                <div class="relative flex-shrink-0 mt-0.5">
                  <Avatar class="h-11 w-11 ring-2 ring-transparent transition-all duration-200" :class="isPersonaSelected(persona.persona_id) && 'ring-primary/20'">
                    <AvatarImage 
                      :src="persona.avatar_url || ''" 
                      :alt="`${persona.name} avatar`" 
                    />
                    <AvatarFallback class="bg-primary/10 text-primary text-sm font-medium">
                      {{ persona.name?.charAt(0) || 'P' }}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    v-if="isPersonaSelected(persona.persona_id)"
                    class="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm border-2 border-background"
                  >
                    <Check class="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                
                <!-- Content area -->
                <div class="flex-1 min-w-0 space-y-1.5">
                  <!-- Name and provider row -->
                  <div class="flex items-center justify-between gap-2">
                    <h4 class="font-medium text-sm truncate text-foreground">{{ persona.name }}</h4>
                    <Badge 
                      v-if="persona.tts_provider" 
                      variant="secondary"
                      class="text-xs px-2 py-0.5 font-normal"
                    >
                      {{ persona.tts_provider }}
                    </Badge>
                  </div>
                  
                  <!-- Description (if available) -->
                  <p v-if="persona.description" class="text-xs text-muted-foreground line-clamp-1">
                    {{ persona.description }}
                  </p>
                  
                  <!-- Language support with badges -->
                  <div v-if="persona.language_support && persona.language_support.length > 0" class="flex items-center gap-1.5 flex-wrap">
                    <Globe class="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div class="flex gap-1 flex-wrap">
                      <Badge
                        v-for="lang in persona.language_support.slice(0, 4)"
                        :key="lang"
                        variant="outline"
                        class="text-xs px-1.5 py-0 h-5 font-normal border-muted-foreground/30"
                      >
                        {{ formatLanguage(lang) }}
                      </Badge>
                      <Badge
                        v-if="persona.language_support.length > 4"
                        variant="outline"
                        class="text-xs px-1.5 py-0 h-5 font-normal border-muted-foreground/30 text-muted-foreground"
                      >
                        +{{ persona.language_support.length - 4 }}
                      </Badge>
                    </div>
                  </div>
                  
                  <!-- Recommendation badges -->
                  <div v-if="persona.is_recommended_host || persona.is_recommended_guest" class="flex gap-1.5">
                    <Badge 
                      v-if="persona.is_recommended_host"
                      variant="default"
                      class="text-xs px-2 py-0 h-5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    >
                      Host
                    </Badge>
                    <Badge 
                      v-if="persona.is_recommended_guest"
                      variant="default"
                      class="text-xs px-2 py-0 h-5 bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                    >
                      Guest
                    </Badge>
                  </div>
                </div>

                <!-- Selection indicator -->
                <div class="flex-shrink-0 mt-1">
                  <Check
                    :class="[
                      'h-4 w-4 transition-opacity duration-200',
                      isPersonaSelected(persona.persona_id) ? 'opacity-100 text-primary' : 'opacity-0'
                    ]"
                  />
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, ChevronsUpDown, User, Globe } from 'lucide-vue-next'
import type { Database } from '@/types/supabase'

type PersonaData = Database['public']['Tables']['personas']['Row']

const props = defineProps({
  personas: {
    type: Array as () => PersonaData[],
    required: true,
  },
  selectionMode: {
    type: String as () => 'single' | 'multiple',
    default: 'single',
  },
  value: {
    type: [Number, Array, null] as unknown as () => number | number[] | null,
    default: null,
  },
  placeholder: {
    type: String,
    default: 'Select a persona...',
  },
})

const emit = defineEmits(['update:value', 'change'])

const open = ref(false)

const hasSelection = computed(() => {
  if (props.selectionMode === 'single') {
    return props.value !== null && props.value !== undefined
  } else {
    return Array.isArray(props.value) && props.value.length > 0
  }
})

const isPersonaSelected = (personaId: number): boolean => {
  if (props.selectionMode === 'single') {
    return props.value === personaId
  } else {
    return Array.isArray(props.value) ? props.value.includes(personaId) : false
  }
}

const displayText = computed(() => {
  if (props.selectionMode === 'single') {
    if (!props.value) return props.placeholder
    const persona = props.personas.find(p => p.persona_id === props.value)
    return persona ? persona.name : props.placeholder
  } else {
    const selectedCount = Array.isArray(props.value) ? props.value.length : 0
    if (selectedCount === 0) return props.placeholder
    if (selectedCount === 1) {
      const valueArray = props.value as number[]
      const persona = props.personas.find(p => p.persona_id === valueArray[0])
      return persona ? persona.name : props.placeholder
    }
    return `${selectedCount} personas selected`
  }
})

const formatLanguage = (lang: string): string => {
  const langMap: Record<string, string> = {
    'zh-CN': 'CN',
    'zh-TW': 'TW', 
    'en-US': 'EN',
    'en-GB': 'GB',
    'ja-JP': 'JP',
    'ko-KR': 'KR',
    'es-ES': 'ES',
    'fr-FR': 'FR',
    'de-DE': 'DE',
    'it-IT': 'IT',
    'pt-PT': 'PT',
    'ru-RU': 'RU'
  }
  return langMap[lang] || lang.toUpperCase().slice(0, 2)
}

const handleSelect = (personaId: number) => {
  if (props.selectionMode === 'single') {
    emit('update:value', personaId)
    emit('change', personaId)
    open.value = false
  } else {
    const currentValue = Array.isArray(props.value) ? props.value : []
    const index = currentValue.indexOf(personaId)
    
    let newValue: number[]
    if (index > -1) {
      // Remove from selection
      newValue = currentValue.filter(id => id !== personaId)
    } else {
      // Add to selection
      newValue = [...currentValue, personaId]
    }
    
    emit('update:value', newValue)
    emit('change', newValue)
    // Keep popover open for multiple selection
  }
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>



