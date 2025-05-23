<template>
  <div class="persona-selector">
    <!-- Label with selection count -->
    <Label v-if="label" :for="id" class="mb-2 block">
      {{ label }} 
      <span v-if="multiple" class="ml-2 text-xs text-muted-foreground">
        ({{ selectedPersonas.length }} selected)
      </span>
    </Label>
    
    <!-- Selected personas display (for multiple mode) -->
    <div v-if="multiple && Array.isArray(modelValue) && modelValue.length > 0" class="flex flex-wrap gap-2 mb-3">
      <Badge 
        v-for="persona in selectedPersonas" 
        :key="persona.persona_id" 
        variant="secondary"
        class="flex items-center gap-2 px-3 py-1.5 text-sm"
      >
        <Avatar class="h-5 w-5">
          <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
          <AvatarFallback>
            <Icon name="ph:user" class="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
        <span>{{ persona.name }}</span>
        <button 
          type="button" 
          class="rounded-full hover:bg-destructive/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          @click="removePersona(persona)"
        >
          <Icon name="ph:x" class="h-3 w-3" />
          <span class="sr-only">Remove {{ persona.name }}</span>
        </button>
      </Badge>
    </div>

    <!-- Advanced filters -->
    <div v-if="showFilters" class="mb-4 p-4 border rounded-lg bg-muted/30">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Language filter -->
        <div>
          <Label class="text-xs font-medium mb-1 block">Language</Label>
          <Select v-model="selectedLanguage">
            <SelectTrigger class="h-8">
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              <SelectItem v-for="lang in availableLanguages" :key="lang" :value="lang">
                {{ getLanguageLabel(lang) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Status filter -->
        <div>
          <Label class="text-xs font-medium mb-1 block">Status</Label>
          <Select v-model="selectedStatus">
            <SelectTrigger class="h-8">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- TTS Provider filter -->
        <div>
          <Label class="text-xs font-medium mb-1 block">Provider</Label>
          <Select v-model="selectedProvider">
            <SelectTrigger class="h-8">
              <SelectValue placeholder="All providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              <SelectItem v-for="provider in availableProviders" :key="provider" :value="provider">
                {{ provider }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <!-- Reset filters button -->
      <div class="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" @click="resetFilters">
          <Icon name="ph:x-circle" class="h-4 w-4 mr-1" />
          Reset filters
        </Button>
      </div>
    </div>

    <!-- Main selector -->
    <Combobox v-model="selectedValue" :multiple="multiple">
      <div class="relative" ref="comboboxRef">
        <div class="flex items-center">
          <ComboboxInput
            :id="id"
            :placeholder="placeholder"
            :disabled="disabled"
            class="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :value="searchQuery"
            @update:modelValue="onSearchInputChange"
          />
          <div class="absolute right-0 top-0 flex h-10 items-center pr-3 space-x-1">
            <Button
              v-if="enableFilters"
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0"
              @click="showFilters = !showFilters"
            >
              <Icon name="ph:funnel" class="h-3 w-3" />
              <span class="sr-only">Toggle filters</span>
            </Button>
            <ComboboxTrigger @click="toggleDropdown">
              <Icon 
                name="ph:caret-down" 
                class="h-4 w-4 opacity-50 transition-transform duration-200" 
                :class="{ 'rotate-180': isDropdownOpen }" 
              />
            </ComboboxTrigger>
          </div>
        </div>
        
        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <ComboboxList
            v-show="isDropdownOpen"
            class="absolute z-50 mt-1 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
            :style="{ 
              maxHeight: dropdownMaxHeight + 'px', 
              top: dropdownPosition === 'top' ? 'auto' : '100%', 
              bottom: dropdownPosition === 'top' ? '100%' : 'auto' 
            }"
          >
            <!-- Search input inside dropdown -->
            <div v-if="filterable" class="p-2 border-b">
              <div class="relative">
                <Icon name="ph:magnifying-glass" class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search personas..."
                  class="pl-8 h-9"
                  @input="onSearchInputChange"
                />
              </div>
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="flex items-center justify-center py-6">
              <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                <span>Loading personas...</span>
              </div>
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="p-4 text-center text-sm text-destructive">
              <Icon name="ph:warning-circle" class="h-4 w-4 mx-auto mb-1" />
              <p>{{ error }}</p>
              <Button variant="outline" size="sm" class="mt-2" @click="retryFetch">
                <Icon name="ph:arrow-clockwise" class="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>

            <!-- Empty state -->
            <ComboboxEmpty v-else-if="filteredPersonas.length === 0" class="p-6 text-center">
              <Icon name="ph:user-circle-slash" class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p class="text-sm text-muted-foreground mb-1">No personas found</p>
              <p class="text-xs text-muted-foreground">Try adjusting your search or filters</p>
            </ComboboxEmpty>

            <!-- Personas list -->
            <ComboboxViewport v-else class="p-1">
              <div v-if="showQuickFilters" class="px-2 py-1 mb-1">
                <div class="flex flex-wrap gap-1">
                  <Badge 
                    v-for="lang in topLanguages" 
                    :key="lang"
                    variant="outline"
                    class="cursor-pointer text-xs hover:bg-accent"
                    :class="{ 'bg-accent': selectedLanguage === lang }"
                    @click="selectedLanguage = selectedLanguage === lang ? 'all' : lang"
                  >
                    {{ getLanguageLabel(lang) }}
                  </Badge>
                </div>
              </div>

              <ComboboxItem 
                v-for="persona in paginatedPersonas" 
                :key="persona.persona_id" 
                :value="persona.persona_id"
                class="relative flex cursor-default select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <div class="flex items-center gap-3 w-full">
                  <Avatar class="h-10 w-10 flex-shrink-0 border">
                    <AvatarImage 
                      v-if="persona.avatar_url" 
                      :src="persona.avatar_url" 
                      :alt="persona.name" 
                    />
                    <AvatarFallback class="bg-muted">
                      <Icon name="ph:user-circle" class="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium truncate">{{ persona.name }}</span>
                      <StatusBadge :status="persona.status" />
                    </div>
                    
                    <p v-if="persona.description" class="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {{ persona.description }}
                    </p>
                    
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <span v-if="persona.tts_provider" class="flex items-center gap-1">
                        <Icon name="ph:speaker-high" class="h-3 w-3" />
                        {{ persona.tts_provider }}
                      </span>
                      
                      <div v-if="persona.language_support && persona.language_support.length > 0" class="flex gap-1">
                        <Badge
                          v-for="lang in persona.language_support.slice(0, 2)"
                          :key="lang"
                          variant="secondary"
                          class="px-1 py-0 text-[10px] font-normal"
                        >
                          {{ lang.toUpperCase() }}
                        </Badge>
                        <span v-if="persona.language_support.length > 2" class="text-muted-foreground">
                          +{{ persona.language_support.length - 2 }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <ComboboxItemIndicator>
                    <Icon name="ph:check" class="h-4 w-4 text-primary" />
                  </ComboboxItemIndicator>
                </div>
              </ComboboxItem>

              <!-- Load more button for large datasets -->
              <div v-if="hasMorePersonas" class="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  class="w-full h-8" 
                  @click="loadMorePersonas"
                >
                  <Icon name="ph:arrow-down" class="h-3 w-3 mr-1" />
                  Load more ({{ remainingPersonasCount }} remaining)
                </Button>
              </div>
            </ComboboxViewport>
          </ComboboxList>
        </transition>
      </div>
    </Combobox>
    
    <p v-if="description" class="text-sm text-muted-foreground mt-2">{{ description }}</p>
    
    <!-- Max selection warning -->
    <p v-if="multiple && maxSelection && selectedPersonas.length >= maxSelection" 
       class="text-sm text-warning mt-1 flex items-center gap-1">
      <Icon name="ph:warning" class="h-3 w-3" />
      Maximum {{ maxSelection }} personas can be selected
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';

// Import types using the unified type definition
import type { ApiPersona } from '~/pages/personas/index.vue';

// Component props with enhanced options
const props = defineProps<{
  modelValue: number | number[] | null;
  personas?: ApiPersona[];
  multiple?: boolean;
  filterable?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  description?: string;
  maxSelection?: number;
  enableFilters?: boolean;
  showQuickFilters?: boolean;
  pageSize?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null];
  'change': [selected: ApiPersona | ApiPersona[] | null];
}>();

// Generate unique ID for the input
const id = `persona-selector-${Math.random().toString(36).substring(2, 9)}`;

// Reactive state
const searchQuery = ref('');
const selectedLanguage = ref('all');
const selectedStatus = ref('all');
const selectedProvider = ref('all');
const showFilters = ref(false);
const currentPage = ref(1);
const pageSize = computed(() => props.pageSize || 20);

// Component state
const personas = ref<ApiPersona[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Refs for dropdown positioning
const comboboxRef = ref<HTMLElement | null>(null);
const dropdownPosition = ref<'bottom' | 'top'>('bottom');
const dropdownMaxHeight = ref(400);
const isDropdownOpen = ref(false);

// Computed property for the selected value(s)
const selectedValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
    // Emit change event with full persona objects
    const selectedPersonasData = getSelectedPersonasData(value);
    emit('change', selectedPersonasData);
  }
});

// Helper function to get selected personas data
const getSelectedPersonasData = (value: number | number[] | null): ApiPersona | ApiPersona[] | null => {
  if (!value) return null;
  
  const source = personas.value;
  if (props.multiple && Array.isArray(value)) {
    return source.filter(p => value.includes(p.persona_id));
  } else if (!props.multiple && typeof value === 'number') {
    return source.find(p => p.persona_id === value) || null;
  }
  return null;
};

// Fetch personas from API if not provided as prop
const fetchPersonas = async () => {
  if (props.personas) {
    personas.value = props.personas;
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    const res = await fetch('/api/personas');
    if (!res.ok) {
      throw new Error(`Failed to fetch personas: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    personas.value = data as ApiPersona[];
  } catch (e: any) {
    error.value = e.message || 'Failed to fetch personas';
    console.error('PersonaSelector: Failed to fetch personas', e);
  } finally {
    loading.value = false;
  }
};

// Retry fetch function
const retryFetch = () => {
  fetchPersonas();
};

// Component lifecycle
onMounted(async () => {
  await fetchPersonas();
  window.addEventListener('resize', calculateDropdownPosition);
});

onUnmounted(() => {
  window.removeEventListener('resize', calculateDropdownPosition);
});

// Computed property for the selected personas
const selectedPersonas = computed(() => {
  if (!props.modelValue) return [];
  const source = personas.value;
  if (props.multiple && Array.isArray(props.modelValue)) {
    return source.filter(p => props.modelValue.includes(p.persona_id));
  } else if (!props.multiple && typeof props.modelValue === 'number') {
    return source.filter(p => p.persona_id === props.modelValue);
  }
  return [];
});

// Extract available languages, statuses, and providers
const availableLanguages = computed(() => {
  const languages = new Set<string>();
  personas.value.forEach(persona => {
    if (persona.language_support && Array.isArray(persona.language_support)) {
      persona.language_support.forEach(lang => languages.add(lang));
    }
  });
  return Array.from(languages).sort();
});

const availableProviders = computed(() => {
  const providers = new Set<string>();
  personas.value.forEach(persona => {
    if (persona.tts_provider) {
      providers.add(persona.tts_provider);
    }
  });
  return Array.from(providers).sort();
});

const topLanguages = computed(() => {
  // Show most common languages as quick filters
  const langCounts = new Map<string, number>();
  personas.value.forEach(persona => {
    if (persona.language_support && Array.isArray(persona.language_support)) {
      persona.language_support.forEach(lang => {
        langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
      });
    }
  });
  
  return Array.from(langCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([lang]) => lang);
});

// Filtered personas based on search query and filters
const filteredPersonas = computed(() => {
  let result = personas.value;
  
  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(persona => 
      persona.name?.toLowerCase().includes(query) || 
      persona.description?.toLowerCase().includes(query) ||
      persona.voice_description?.toLowerCase().includes(query) ||
      persona.tts_provider?.toLowerCase().includes(query)
    );
  }
  
  // Language filter
  if (selectedLanguage.value !== 'all') {
    result = result.filter(persona => {
      return persona.language_support && 
             Array.isArray(persona.language_support) && 
             persona.language_support.includes(selectedLanguage.value);
    });
  }
  
  // Status filter
  if (selectedStatus.value !== 'all') {
    result = result.filter(persona => persona.status === selectedStatus.value);
  }
  
  // Provider filter
  if (selectedProvider.value !== 'all') {
    result = result.filter(persona => persona.tts_provider === selectedProvider.value);
  }
  
  return result;
});

// Paginated personas for performance
const paginatedPersonas = computed(() => {
  const endIndex = currentPage.value * pageSize.value;
  return filteredPersonas.value.slice(0, endIndex);
});

const hasMorePersonas = computed(() => {
  return paginatedPersonas.value.length < filteredPersonas.value.length;
});

const remainingPersonasCount = computed(() => {
  return filteredPersonas.value.length - paginatedPersonas.value.length;
});

// Load more personas
const loadMorePersonas = () => {
  currentPage.value += 1;
};

// Search input handling with debounce
const onSearchInputChange = useDebounceFn((value: string) => {
  searchQuery.value = value;
  currentPage.value = 1; // Reset pagination when searching
}, 300);

// Function to remove a persona from selection (for multiple mode)
const removePersona = (persona: ApiPersona) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const newValue = props.modelValue.filter(id => id !== persona.persona_id);
    emit('update:modelValue', newValue);
    emit('change', getSelectedPersonasData(newValue));
  }
};

// Reset all filters
const resetFilters = () => {
  searchQuery.value = '';
  selectedLanguage.value = 'all';
  selectedStatus.value = 'all';
  selectedProvider.value = 'all';
  currentPage.value = 1;
};

// Reset search query and pagination when dropdown closes
watch(isDropdownOpen, (isOpen) => {
  if (!isOpen) {
    currentPage.value = 1;
  }
});

// Reset pagination when filters change
watch([selectedLanguage, selectedStatus, selectedProvider], () => {
  currentPage.value = 1;
});

// Calculate dropdown position and height
const calculateDropdownPosition = () => {
  if (!comboboxRef.value) return;

  const rect = comboboxRef.value.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const spaceBelow = windowHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow < 300 && spaceAbove > spaceBelow) {
    dropdownPosition.value = 'top';
    dropdownMaxHeight.value = Math.min(spaceAbove - 10, 400);
  } else {
    dropdownPosition.value = 'bottom';
    dropdownMaxHeight.value = Math.min(spaceBelow - 10, 400);
  }
};

// Toggle dropdown
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    calculateDropdownPosition();
  }
};

// Close dropdown on outside click
const handleOutsideClick = (event: MouseEvent) => {
  if (comboboxRef.value && !comboboxRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// Helper function for language labels
const getLanguageLabel = (lang: string): string => {
  const languageLabels: Record<string, string> = {
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
  };
  return languageLabels[lang] || lang.toUpperCase();
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>