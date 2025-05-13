<template>
  <div class="py-6"
       v-motion
       :initial="{ opacity: 0 }"
       :enter="{ opacity: 1, transition: { duration: 300 } }">

    <!-- Debug Tools Section -->
    <div class="mb-6">
      <button 
        @click="toggleTools = !toggleTools" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold">Debug Tools</span>
        <Icon :name="toggleTools ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleTools" class="space-y-4 p-4  rounded-lg">
          <!-- Safari Guide Popup Debug -->
          <section class="p-4 border border-amber-300 bg-amber-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-amber-800">Safari Guide Popup</h2>
            <p class="text-sm text-gray-700 mb-3">
              Reset the Safari guide popup that prompts users to add the app to their home screen.
            </p>
            <button
              @click="resetGuidePopup"
              class="px-4 py-2 bg-amber-800 text-white rounded hover:bg-amber-700 transition text-sm flex items-center"
            >
              <Icon name="ph:arrow-counter-clockwise" class="mr-2 w-4 h-4" />
              Reset Safari Guide Popup
            </button>
          </section>
          
          <!-- Tour Store Debug -->
          <section class="p-4 border border-blue-300 bg-blue-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-blue-800">Tour Store</h2>
            <p class="text-sm text-gray-700 mb-3">
              Reset the tour store state to its initial values.
            </p>
            <button
              @click="clearStoreState"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center"
            >
              <Icon name="ph:database" class="mr-2 w-4 h-4" />
              Reset Tour Store
            </button>
          </section>
          
          <!-- Voice Navigation Debug -->
          <section class="p-4 border border-green-300 bg-green-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-green-800">Voice Navigation</h2>
            <p class="text-sm text-gray-700 mb-3">
              Test the speech synthesis functionality.
            </p>
            <button
              @click="testSpeak"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm flex items-center"
            >
              <Icon name="ph:speaker-high" class="mr-2 w-4 h-4" />
              Test Speak
            </button>
          </section>
          
          <!-- Notification Debug -->
          <section class="p-4 border border-purple-300 bg-purple-50 rounded-lg">
            <h2 class="text-lg font-semibold mb-2 text-purple-800">Notifications</h2>
            <p class="text-sm text-gray-700 mb-3">
              Test the notification system.
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                @click="testNotification"
                class="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition text-sm flex items-center"
              >
                <Icon name="ph:bell" class="mr-2 w-4 h-4" />
                Default Notification
              </button>
              <button
                @click="() => toast.success('操作成功', { 
                  description: 'Your content has been saved',
                  duration: 4000
                })"
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm flex items-center"
              >
                <Icon name="ph:check-circle" class="mr-2 w-4 h-4" />
                Success Notification
              </button>
              <button
                @click="() => toast.error('操作失败', { 
                  description: 'Please check your input and try again',
                  duration: 4000
                })"
                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center"
              >
                <Icon name="ph:x-circle" class="mr-2 w-4 h-4" />
                Error Notification
              </button>
              <button
                @click="() => toast.info('信息通知', { 
                  description: 'There are new messages to view',
                  duration: 4000
                })"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center"
              >
                <Icon name="ph:info" class="mr-2 w-4 h-4" />
                Info Notification
              </button>
              <button
                @click="() => toast.warning('警告提示', { 
                  description: 'This operation may result in data loss',
                  duration: 4000
                })"
                class="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-sm flex items-center"
              >
                <Icon name="ph:warning" class="mr-2 w-4 h-4" />
                Warning Notification
              </button>
            </div>
          </section>

          <!-- Removed ElevenLabs TTS Section - Moved to /chat page -->
        </div>
      </Transition>
    </div>

    <!-- Environment Info -->
    <div class="mb-6">
      <button 
        @click="toggleEnv = !toggleEnv" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold">Environment Information</span>
        <Icon :name="toggleEnv ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleEnv" class="p-4 border rounded-lg">
          <div class="bg-gray-50 p-4 rounded-lg text-sm border">
            <pre>Mode: {{ runtimeConfig.public.NODE_ENV || 'N/A' }}</pre>
            <pre>SSR: {{ isSSR ? 'Enabled' : 'Disabled' }}</pre>
            <pre>PWA Mode: {{ isPwa ? 'Yes' : 'No' }}</pre>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Store State -->
    <div class="mb-6">
      <button 
        @click="toggleStore = !toggleStore" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold">Tour Store State</span>
        <Icon :name="toggleStore ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleStore" class="p-4 border rounded-lg">
          <div class="bg-gray-50 p-4 rounded-lg text-sm border max-h-60 overflow-auto">
            <pre>{{ JSON.stringify(tourStoreState, null, 2) }}</pre>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Voice Navigation State -->
    <div class="mb-6">
      <button 
        @click="toggleVoice = !toggleVoice" 
        class="flex items-center justify-between w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg mb-2 transition-colors"
      >
        <span class="font-semibold">Voice Navigation State</span>
        <Icon :name="toggleVoice ? 'ph:caret-up' : 'ph:caret-down'" class="w-5 h-5" />
      </button>
      
      <Transition name="slide">
        <div v-show="toggleVoice" class="p-4 border rounded-lg">
          <div class="bg-gray-50 p-4 rounded-lg text-sm border">
            <pre>Listening: {{ voiceNavState?.isListening?.value }}</pre>
            <pre>Speaking: {{ voiceNavState?.isSpeaking?.value }}</pre>
            <pre>Transcript: {{ voiceNavState?.transcript?.value || 'N/A' }}</pre>
            <pre>Recognition Status: {{ voiceNavState?.isListening?.value ? 'Active' : 'Inactive' }}</pre>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTourStore } from '~/stores/tourStore'
import { useVoiceNavigation } from '~/composables/useVoiceNavigation'
import { usePwa } from '~/composables/usePwa'
// Add missing Vue imports
import { ref, computed, onMounted, watch, reactive, getCurrentInstance } from 'vue' 
// Removed TTS Composables and Config
// import { useElevenLabsTTS } from '~/composables/useElevenLabsTTS'
// import elevenlabsConfigImport, { getAllVoices, findVoiceById, updateVoicesFromAPI } from '~/config/elevenlabs' // Import config object directly
// import type { Voice } from '~/types/voice'
// Add missing toast import
import { toast } from 'vue-sonner'

// Shadcn-vue component imports (ensure these are correctly imported/added via CLI)
// Re-add missing shadcn-vue imports
import { Button } from '@/components/ui/button'
// Removed TTS-specific shadcn components
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { Label } from '@/components/ui/label'
// import { Slider } from '@/components/ui/slider'
// import { Switch } from '@/components/ui/switch'
// import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert' // Keep Alert for notifications
// import { getCurrentInstance } from 'vue' // Already added above

// Define page meta for title
definePageMeta({
  title: 'Debug'
})

// Toggle states for collapsible sections
const toggleTools = ref(true)  // Open by default
const toggleEnv = ref(false)
const toggleStore = ref(false)
const toggleVoice = ref(false)

// 获取所有可用的声音配置
// const voices = computed(() => getAllVoices())

const runtimeConfig = useRuntimeConfig()
const tourStore = useTourStore()
const voiceNavState = useVoiceNavigation()
const { isPwa } = usePwa()

// Check if running on server or client
const isSSR = computed(() => process.server)

// Get reactive store state
const tourStoreState = computed(() => tourStore.$state)

// --- Removed ElevenLabs TTS State & Logic ---

// --- Existing Debug Tools Methods ---
const resetGuidePopup = () => {
  localStorage.removeItem('hasShownGuidePopup')
  toast.success('Safari Guide Popup Reset', { 
      description: 'The flag has been cleared. Refresh Safari to see the prompt again.',
      duration: 4000
  });
}

const store = useTourStore()

const clearStoreState = () => {
  store.$reset() // Use Pinia's $reset method
  alert('Tour store state has been reset.')
}

const testSpeak = () => {
  voiceNavState.speak('This is a voice navigation test.')
}

const testNotification = () => {
  console.log('Testing Notification...');
  toast('Default Notification Title', {
    description: 'This is the description text for the default notification',
    duration: 4000
  });
}

// --- Environment Info ---
// const toggleEnv = ref(false) // Remove redundant declaration
// const toggleStore = ref(false) // Remove redundant declaration
// const toggleVoice = ref(false) // Remove redundant declaration

// const runtimeConfig = useRuntimeConfig() // Remove redundant declaration
// const isSSR = computed(() => typeof window === 'undefined') // Remove redundant declaration (keep process.server version)
// const { isPwa } = usePwa() // Remove redundant declaration
// const userLanguage = computed(() => typeof navigator !== 'undefined' ? navigator.language : 'N/A') // Remove redundant declaration (keep useVoiceNavigation version)

</script>

<style scoped>
/* Slide transition for collapsible sections */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
  max-height: 1000px; /* Adjust max-height based on content */
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin-top: 0;
  margin-bottom: 0;
  border-width: 0;
}
/* Style for debug pre blocks */
pre {
  white-space: pre-wrap;       /* CSS 3 */
  white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
  white-space: -pre-wrap;      /* Opera 4-6 */
  white-space: -o-pre-wrap;    /* Opera 7 */
  word-wrap: break-word;       /* Internet Explorer 5.5+ */
  font-family: 'Courier New', Courier, monospace; /* Monospaced font */
  font-size: 0.8rem; /* Slightly smaller font */
}
/* Removed TTS-specific code style */
/*
code {
 font-family: 'Courier New', Courier, monospace; 
}
*/
</style>