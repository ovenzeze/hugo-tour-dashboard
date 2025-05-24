<template>
  <div class="space-y-6 p-4">
    <!-- Top Row: Language and Number of Segments -->
    <div class="grid md:grid-cols-2 gap-x-6 gap-y-5">
      <!-- Podcast Language -->
      <div class="flex items-center gap-3">
        <TooltipProvider :delay-duration="100">
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="ph:globe-simple-bold" class="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Podcast Language</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select v-model="podcastLanguageValue" class="w-48">
          <SelectTrigger class="flex-grow w-48 overflow-hidden">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="lang in SUPPORTED_LANGUAGES"
              :key="lang.code"
              :value="lang.code"
              class="flex items-center"
            >
              <span class="mr-2">{{ languageCodeToEmoji[lang.code] }}</span>
              {{ lang.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Number of Segments -->
      <div class="flex items-center gap-3">
        <TooltipProvider :delay-duration="100">
          <Tooltip>
            <TooltipTrigger as-child>
              <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <Icon name="ph:stack-bold" class="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Number of Segments</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div class="flex w-full gap-2">
          <Input
            type="number"
            :value="segmentCountValue"
            @input="handleSegmentCountInput"
            min="10"
            max="100"
            class="flex-grow hide-spin"
            placeholder="Enter number of segments"
          />
        </div>
      </div>
    </div>

    <!-- Title -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:text-t-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Podcast Title</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Input
        id="podcastTitle"
        v-model="formTitle"
        placeholder="Enter the title for your podcast, e.g., The Future of AI"
        class="flex-grow"
      />
    </div>

    <!-- User Instructions / Topic -->
    <div class="flex items-start gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground pt-2.5">
              <Icon name="ph:lightbulb-filament-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>User Instructions / Podcast Topic</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Textarea
        id="podcastTopic"
        v-model="formTopic"
        placeholder="Describe in detail what the podcast should cover: main points, questions for guests, desired tone, etc."
        class="min-h-[100px] flex-grow"
      />
    </div>

    <!-- Host Character -->
    <div class="flex items-center gap-3">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:user-sound-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Host Character</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <UnifiedPersonaSelector
        id="hostPersonaUnified"
        :value="podcastSettings.hostPersonaId"
        @update:value="handleHostPersonaChange"
        :personas="availableHostPersonas"
        :selection-mode="'single'"
        placeholder="Select Host Persona"
        class="flex-grow"
      />
    </div>

    <!-- Guest Characters -->
    <div class="flex items-center gap-3 w-full">
      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <Icon name="ph:users-three-bold" class="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>Guest Characters (Select one or more)</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <UnifiedPersonaSelector
        id="guestPersonasUnified"
        :value="podcastSettings.guestPersonaIds"
        @update:value="handleGuestPersonasChange"
        :personas="availableGuestPersonas"
        :selection-mode="'multiple'"
        placeholder="Select Guest Persona(s) (Optional)"
        class="flex-grow w-full"
      />
    </div>

    <!-- Advanced Options -->
    <div class="pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4 ml-1">Advanced Options</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <!-- Style / Tone -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:palette-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Style / Tone</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="podcastStyle"
            v-model="formStyle"
            placeholder="e.g., Casual, Educational"
            class="flex-grow"
          />
        </div>

        <!-- Keywords -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:tag-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Keywords (comma-separated)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="podcastKeywords"
            v-model="keywordsForInput"
            placeholder="e.g., AI, Future Tech"
            class="flex-grow"
          />
        </div>

        <!-- Background Music -->
        <div class="flex items-center gap-3">
          <TooltipProvider :delay-duration="100">
            <Tooltip>
              <TooltipTrigger as-child>
                <button type="button" class="flex-shrink-0 text-muted-foreground hover:text-foreground">
                  <Icon name="ph:music-notes-simple-bold" class="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Background Music (Optional)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            id="backgroundMusic"
            v-model="formBackgroundMusic"
            placeholder="Theme or style, e.g., Upbeat"
            class="flex-grow"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Skeleton } from '~/components/ui/skeleton';
import UnifiedPersonaSelector from '~/components/UnifiedPersonaSelector.vue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Button } from '~/components/ui/button';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import type { FullPodcastSettings } from '~/types/playground'; // Corrected import path
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { Persona } from '~/types/persona'; // This is the simplified local type
import type { Database } from '~/types/supabase'; // Import Supabase DB types

// Define PersonaData based on Supabase schema for UnifiedPersonaSelector compatibility
type PersonaData = Database['public']['Tables']['personas']['Row'];

// Inline SUPPORTED_LANGUAGES as a temporary measure
const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English' }, // 更新为en-US以匹配默认值
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  // Add other languages as needed
];

// Mapping from language code to flag emoji
const languageCodeToEmoji: Record<string, string> = {
  'en-US': '🇺🇸',
  'zh-CN': '🇨🇳',
  'ja': '🇯🇵',
  'ko': '🇰🇷',
  'de': '🇩🇪',
  'fr': '🇫🇷',
  'es': '🇪🇸',
  // Add other language codes and their emojis here
};

const segmentOptions = ref([5, 10, 20, 30, 40, 50]);

const settingsStore = usePlaygroundSettingsStore();
const { podcastSettings } = storeToRefs(settingsStore);

const { personas: cachedPersonas, isLoading: personasLoading, fetchPersonas, getFirstRecommendedHost, getFirstRecommendedGuest } = usePersonaCache();
const personaCache = { getFirstRecommendedHost, getFirstRecommendedGuest };

onMounted(() => {
  if (cachedPersonas.value.length === 0) {
    fetchPersonas();
  }
  // Initialize local refs with store values if needed, or bind directly
  // For complex fields like keywords, a local computed might still be useful
});

// Local computed for keywords to handle array-to-string conversion
const keywordsForInput = computed<string>({
  get: () => {
    if (Array.isArray(podcastSettings.value.keywords)) {
      return podcastSettings.value.keywords.join(', ');
    }
    return '';
  },
  set: (newValue) => {
    const newKeywordsArray = newValue.split(',').map(k => k.trim()).filter(k => k);
    settingsStore.updatePodcastSettings({ keywords: newKeywordsArray });
  }
});

// Direct v-model binding for simple properties or use computed for complex ones
const podcastLanguageValue = computed({
  get: () => podcastSettings.value.language,
  set: (newValue) => {
    if (newValue !== podcastSettings.value.language) {
      settingsStore.updatePodcastSettings({ language: newValue });
    }
  }
});

const segmentCountValue = computed({
    get: () => podcastSettings.value.numberOfSegments || 10,
    set: (val) => {
        const numVal = Number(val);
        if (!isNaN(numVal) && numVal > 0 && numVal <= 100) {
            settingsStore.updatePodcastSettings({ numberOfSegments: numVal });
        }
    }
});


function handleSegmentCountInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = parseInt(target.value);
  if (!isNaN(value) && value > 0 && value <= 100) {
    settingsStore.updatePodcastSettings({ numberOfSegments: value });
  } else if (target.value === '') {
    // Allow clearing the input, maybe set to a default or handle as invalid
    // For now, let's assume it might be an intermediate state before typing a valid number
  } else {
    console.warn('[PodcastSettingsForm] 无效的segment数量:', target.value);
  }
}

function handleSegmentCountSelect(value: string | number) { // Select can return string or number
  const numericValue = Number(value);
  if (!isNaN(numericValue) && numericValue > 0 && numericValue <= 100) {
    settingsStore.updatePodcastSettings({ numberOfSegments: numericValue });
  }
}


// For direct v-model on Input/Textarea, ensure they update the store
// Example for title (assuming direct binding in template to podcastSettings.title)
// watch(() => podcastSettings.value.title, (newTitle) => {
// settingsStore.updatePodcastSettings({ title: newTitle });
// });
// This can be simplified by binding v-model="podcastSettings.title" and having a watcher
// on the entire podcastSettings object if granular updates are not needed,
// or by using computed setters for each field.

// For hostPersonaId and guestPersonaIds, v-model on UnifiedPersonaSelector
// will directly update the corresponding fields in podcastSettings.value object.
// The store's updatePodcastSettings action will then be called by a watcher on podcastSettings.

watch(podcastSettings, (newSettings) => {
  // This watcher can be used if UnifiedPersonaSelector modifies podcastSettings directly
  // and we need to ensure the store's action is called.
  // However, it's often cleaner to have components call actions.
  // For now, let's assume UnifiedPersonaSelector's v-model updates a local ref
  // which then calls the store action, or the store action is called directly.
  // If UnifiedPersonaSelector directly mutates the store's ref (via storeToRefs),
  // then this watcher might not be strictly necessary unless for side effects.
  // Let's assume for now that direct binding to storeToRefs objects is fine for simple cases,
  // but for complex updates or side-effects, actions are preferred.
  // The `updatePodcastSettings` action in the store handles parsing and validation.
}, { deep: true });


const availableHostPersonas = computed(() => {
  // 🔧 改进：根据当前选择的语言过滤可用的主播personas
  const currentLanguage = podcastSettings.value.language;
  
  if (!currentLanguage) {
    return cachedPersonas.value; // 如果没有设置语言，显示所有personas
  }
  
  return cachedPersonas.value.filter(persona => {
    if (persona.language_support && Array.isArray(persona.language_support)) {
      return persona.language_support.includes(currentLanguage);
    }
    return false; // 如果没有语言支持信息，则不包含在可选项中
  });
});

const availableGuestPersonas = computed(() => {
  const hostId = podcastSettings.value.hostPersonaId;
  const currentLanguage = podcastSettings.value.language;
  
  let filteredPersonas = cachedPersonas.value;
  
  // 1. 根据语言过滤
  if (currentLanguage) {
    filteredPersonas = filteredPersonas.filter(persona => {
      if (persona.language_support && Array.isArray(persona.language_support)) {
        return persona.language_support.includes(currentLanguage);
      }
      return false;
    });
  }
  
  // 2. 排除已选择的主播
  return filteredPersonas.filter(p => p.persona_id !== hostId);
});

// Watch for changes in hostPersonaId to ensure guest list is updated
watch(() => podcastSettings.value.hostPersonaId, (newHostId) => {
  const numericNewHostId = Number(newHostId);
  if (Array.isArray(podcastSettings.value.guestPersonaIds) && podcastSettings.value.guestPersonaIds.includes(numericNewHostId)) {
    const updatedGuests = podcastSettings.value.guestPersonaIds
      .map(id => Number(id))
      .filter(id => !isNaN(id) && id !== numericNewHostId);
    settingsStore.updatePodcastSettings({ guestPersonaIds: updatedGuests });
  }
}, { deep: true });


// Logic for language change and persona filtering
watch(() => podcastSettings.value.language, (newLanguage) => {
  if (!cachedPersonas.value || cachedPersonas.value.length === 0 || !newLanguage) return;

  const langCodeToFilter = newLanguage;

  const personasSupportingLang = cachedPersonas.value.filter(p =>
    p.language_support &&
    Array.isArray(p.language_support) &&
    p.language_support.includes(langCodeToFilter)
  );

  let needsUpdate = false;
  const newSettings: Partial<FullPodcastSettings> = {};

  if (personasSupportingLang.length > 0) {
    // 检查当前Host是否支持新语言
    const hostPersona = cachedPersonas.value.find(p => p.persona_id === podcastSettings.value.hostPersonaId);
    if (hostPersona && (!hostPersona.language_support || !hostPersona.language_support.includes(langCodeToFilter))) {
      // 🔧 优先尝试使用推荐的Host
      const recommendedHost = personaCache.getFirstRecommendedHost(langCodeToFilter);
      if (recommendedHost) {
        console.log(`[PodcastSettingsForm] Language changed, switching to recommended host: ${recommendedHost.name}`);
        newSettings.hostPersonaId = recommendedHost.persona_id;
      } else {
        // 使用第一个支持新语言的persona
        const firstSupported = personasSupportingLang[0];
        if (firstSupported) {
          console.log(`[PodcastSettingsForm] Language changed, switching to first available host: ${firstSupported.name}`);
          newSettings.hostPersonaId = firstSupported.persona_id;
        } else {
          newSettings.hostPersonaId = undefined;
        }
      }
      needsUpdate = true;
    }

    // 检查当前Guests是否支持新语言
    if (podcastSettings.value.guestPersonaIds && podcastSettings.value.guestPersonaIds.length > 0) {
      const newGuestIds = podcastSettings.value.guestPersonaIds.filter(guestId => {
        const guestPersona = cachedPersonas.value.find(p => p.persona_id === guestId);
        return guestPersona && guestPersona.language_support && guestPersona.language_support.includes(langCodeToFilter);
      });
      
      if (newGuestIds.length !== podcastSettings.value.guestPersonaIds.length) {
        // 如果有些guest被过滤了，尝试添加推荐的guest
        if (newGuestIds.length === 0) {
          const recommendedGuest = personaCache.getFirstRecommendedGuest(langCodeToFilter);
          const currentHostId = newSettings.hostPersonaId || podcastSettings.value.hostPersonaId;
          if (recommendedGuest && recommendedGuest.persona_id !== currentHostId) {
            console.log(`[PodcastSettingsForm] Language changed, adding recommended guest: ${recommendedGuest.name}`);
            newGuestIds.push(recommendedGuest.persona_id);
          }
        }
        newSettings.guestPersonaIds = newGuestIds;
        needsUpdate = true;
      }
    }
  } else {
    if (podcastSettings.value.hostPersonaId !== undefined) {
        newSettings.hostPersonaId = undefined;
        needsUpdate = true;
    }
    if (podcastSettings.value.guestPersonaIds && podcastSettings.value.guestPersonaIds.length > 0) {
        newSettings.guestPersonaIds = [];
        needsUpdate = true;
    }
    console.warn(`No personas found supporting language: ${newLanguage}. Selections cleared.`);
  }

  if (needsUpdate) {
    settingsStore.updatePodcastSettings(newSettings);
  }
}, { deep: true });


// Initialize default host/guest personas when personas are loaded
watch(cachedPersonas, (loadedPersonas) => {
  if (loadedPersonas && loadedPersonas.length > 0) {
    const currentSettings = podcastSettings.value;
    let newHostId = currentSettings.hostPersonaId;
    let newGuestIds = currentSettings.guestPersonaIds || [];
    let needsStoreUpdate = false;

    // Get current language for recommendations
    const currentLanguage = currentSettings.language || 'zh-CN';

    // 🔧 优先使用推荐的Host，如果没有选择Host的话
    if (newHostId === undefined && loadedPersonas.length > 0) {
      // 首先尝试获取推荐的Host
      const recommendedHost = personaCache.getFirstRecommendedHost(currentLanguage);
      if (recommendedHost && recommendedHost.persona_id !== undefined) {
        console.log(`[PodcastSettingsForm] Using recommended host: ${recommendedHost.name} for language: ${currentLanguage}`);
        newHostId = recommendedHost.persona_id;
        needsStoreUpdate = true;
      } else {
        // 如果没有推荐的Host，使用第一个支持该语言的persona
        const languageSupported = loadedPersonas.find(p => 
          p.language_support && 
          Array.isArray(p.language_support) && 
          p.language_support.includes(currentLanguage)
        );
        if (languageSupported && languageSupported.persona_id !== undefined) {
          console.log(`[PodcastSettingsForm] Using first available host for language: ${currentLanguage}`);
          newHostId = languageSupported.persona_id;
          needsStoreUpdate = true;
        } else if (loadedPersonas[0] && loadedPersonas[0].persona_id !== undefined) {
          // 最后的fallback：使用第一个可用的persona
          console.log(`[PodcastSettingsForm] Using fallback first persona as host`);
          newHostId = loadedPersonas[0].persona_id;
          needsStoreUpdate = true;
        }
      }
    }

    // 🔧 优先使用推荐的Guest，如果没有选择Guest的话
    if (newGuestIds.length === 0 && newHostId !== undefined && loadedPersonas.length > 1) {
      // 首先尝试获取推荐的Guest
      const recommendedGuest = personaCache.getFirstRecommendedGuest(currentLanguage);
      if (recommendedGuest && 
          recommendedGuest.persona_id !== undefined && 
          recommendedGuest.persona_id !== newHostId) {
        console.log(`[PodcastSettingsForm] Using recommended guest: ${recommendedGuest.name} for language: ${currentLanguage}`);
        newGuestIds = [recommendedGuest.persona_id];
        needsStoreUpdate = true;
      } else {
        // 如果没有推荐的Guest，使用第一个不是Host的、支持该语言的persona
        const potentialGuest = loadedPersonas.find(p =>
          p.persona_id !== undefined &&
          p.persona_id !== newHostId &&
          p.language_support && 
          Array.isArray(p.language_support) && 
          p.language_support.includes(currentLanguage)
        );
        if (potentialGuest && potentialGuest.persona_id !== undefined) {
          console.log(`[PodcastSettingsForm] Using first available guest for language: ${currentLanguage}`);
          newGuestIds = [potentialGuest.persona_id];
          needsStoreUpdate = true;
        } else {
          // 最后的fallback：使用任何不是Host的persona
          const fallbackGuest = loadedPersonas.find(p =>
            p.persona_id !== undefined &&
            p.persona_id !== newHostId
          );
          if (fallbackGuest && fallbackGuest.persona_id !== undefined) {
            console.log(`[PodcastSettingsForm] Using fallback guest`);
            newGuestIds = [fallbackGuest.persona_id];
            needsStoreUpdate = true;
          }
        }
      }
    }

    if (needsStoreUpdate) {
      settingsStore.updatePodcastSettings({
        hostPersonaId: newHostId,
        guestPersonaIds: newGuestIds,
      });
    }
  }
}, { immediate: true, deep: true });


// Bind v-model for simple inputs directly to podcastSettings.value.propertyName
// e.g., v-model="podcastSettings.title"
// For UnifiedPersonaSelector, v-model="podcastSettings.hostPersonaId" and v-model="podcastSettings.guestPersonaIds"
// The store's updatePodcastSettings action will be triggered by the watcher on podcastSettings or by direct calls.

// Ensure that when UnifiedPersonaSelector updates hostPersonaId or guestPersonaIds,
// the change is propagated to the store. This can be done by:
// 1. Having UnifiedPersonaSelector emit an event that calls `settingsStore.updatePodcastSettings`.
// 2. Binding v-model to a local ref, and then watching that local ref to call the store action.
// 3. Directly mutating the `podcastSettings.value.hostPersonaId` (if storeToRefs allows deep reactivity and mutation,
//    but generally actions are preferred for store mutations).

// For simplicity with v-model and storeToRefs, we can assume direct binding for now,
// and rely on the deep watcher on `podcastSettings` to eventually call `updatePodcastSettings`
// if direct mutation is happening. Or, more robustly, ensure child components call actions.
// Given `UnifiedPersonaSelector` is a custom component, it should ideally emit an update
// that this component then uses to call `settingsStore.updatePodcastSettings`.
// If `UnifiedPersonaSelector` directly modifies the passed `v-model` object (which is `podcastSettings.value`),
// then the deep watch on `podcastSettings` in this component *should* pick it up.

// Let's refine the v-model bindings in the template to directly use podcastSettings.value
// and ensure that changes trigger the store's update action.
// The most straightforward way is to use computed properties with getters/setters for each field
// that needs to update the store.

const formTitle = computed({
    get: () => podcastSettings.value.title,
    set: (val) => settingsStore.updatePodcastSettings({ title: val })
});
const formTopic = computed({
    get: () => podcastSettings.value.topic,
    set: (val) => settingsStore.updatePodcastSettings({ topic: val })
});
const formStyle = computed({
    get: () => podcastSettings.value.style,
    set: (val) => settingsStore.updatePodcastSettings({ style: val })
});
const formBackgroundMusic = computed({
    get: () => podcastSettings.value.backgroundMusic,
    set: (val) => settingsStore.updatePodcastSettings({ backgroundMusic: val })
});
const formHostPersonaId = computed({
    get: () => {
        const value = podcastSettings.value.hostPersonaId;
        console.log(`[PodcastSettingsForm] formHostPersonaId getter called, returning:`, value);
        return value;
    },
    set: (val) => {
        console.log(`[PodcastSettingsForm] formHostPersonaId setter called with:`, val);
        console.log(`[PodcastSettingsForm] Before update, podcastSettings.hostPersonaId:`, podcastSettings.value.hostPersonaId);
        settingsStore.updatePodcastSettings({ hostPersonaId: val });
        console.log(`[PodcastSettingsForm] After update, podcastSettings.hostPersonaId:`, podcastSettings.value.hostPersonaId);
    }
});
const formGuestPersonaIds = computed({
    get: () => {
        const value = podcastSettings.value.guestPersonaIds;
        console.log(`[PodcastSettingsForm] formGuestPersonaIds getter called, returning:`, value);
        return value;
    },
    set: (val) => {
        console.log(`[PodcastSettingsForm] formGuestPersonaIds setter called with:`, val);
        console.log(`[PodcastSettingsForm] Before update, podcastSettings.guestPersonaIds:`, podcastSettings.value.guestPersonaIds);
        settingsStore.updatePodcastSettings({ guestPersonaIds: val });
        console.log(`[PodcastSettingsForm] After update, podcastSettings.guestPersonaIds:`, podcastSettings.value.guestPersonaIds);
    }
});

// 🔧 添加：直接监听组件变化的调试
watch(() => formHostPersonaId.value, (newVal, oldVal) => {
  console.log(`[PodcastSettingsForm] formHostPersonaId computed value changed from ${oldVal} to ${newVal}`);
}, { immediate: true });

watch(() => formGuestPersonaIds.value, (newVal, oldVal) => {
  console.log(`[PodcastSettingsForm] formGuestPersonaIds computed value changed from`, oldVal, 'to', newVal);
}, { immediate: true, deep: true });

// 🔧 添加：直接事件处理函数，绕过computed复杂性
const handleHostPersonaChange = (newValue: number | null) => {
  console.log(`[PodcastSettingsForm] handleHostPersonaChange called with:`, newValue);
  settingsStore.updatePodcastSettings({ hostPersonaId: newValue });
};

const handleGuestPersonasChange = (newValue: number[] | null) => {
  console.log(`[PodcastSettingsForm] handleGuestPersonasChange called with:`, newValue);
  const guestIds = Array.isArray(newValue) ? newValue : [];
  settingsStore.updatePodcastSettings({ guestPersonaIds: guestIds });
};

</script>

<style scoped>
.hide-spin::-webkit-outer-spin-button,
.hide-spin::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.hide-spin[type=number] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield;
}
</style>
