<template>
  <div class="h-full w-full max-h-full relative bg-gray-50" v-motion :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 300 } }">

    <!-- Map Component - Set reasonable padding to avoid being completely covered by other components -->
    <div class="absolute inset-0 z-0">
      <MapSection v-model:currentFloor="currentFloor" ref="mapSectionRef" @exhibit-selected="onExhibitSelected" />
    </div>

    <!-- Top Info Bar -->
    <div class="absolute top-0 left-0 right-0 z-10 bg-white bg-opacity-90 backdrop-blur-sm p-3 shadow-md">
      <div class="flex justify-between items-center max-w-screen-xl mx-auto">
        <div class="flex items-center">
          <Button variant="ghost" size="icon" class="text-blue-500 mr-2" @click="goBack">
            <span class="material-icons">arrow_back</span>
          </Button>
          <h1 class="text-lg font-bold text-gray-900 truncate" v-if="currentMuseum">{{ currentMuseum.name }}</h1>
        </div>
        <div class="flex space-x-2">
          <!-- Floor Switch Buttons - Moved to Top Bar -->
          <div class="flex space-x-1 items-center">
            <Button
              v-for="floor in ['G', '1', '2-3']"
              :key="floor"
              variant="outline"
              size="sm"
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors duration-200"
              :class="currentFloorStr === floor ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
              @click="updateFloor(floor === 'G' ? 0 : floor === '1' ? 1 : 2)"
            >
              {{ floor }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel - Using Collapsible -->
    <Collapsible
      v-model:open="showRoutePanel"
      class="absolute top-16 right-0 bottom-16 z-10 w-80 bg-white border-l border-gray-200 flex flex-col"
    >
      <!-- Content is handled by CollapsibleContent -->
      <CollapsibleContent class="overflow-auto flex-1">
        <div class="p-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
           <h2 class="text-base font-semibold text-gray-900">Recommended Route</h2>
           <CollapsibleTrigger as-child>
             <Button variant="ghost" size="sm" class="text-gray-500">
               <span class="material-icons text-sm">close</span>
             </Button>
           </CollapsibleTrigger>
        </div>
        <div class="divide-y">
          <div v-for="(item, index) in filteredRouteItems" :key="item.id"
            class="p-3 flex bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'bg-blue-50 hover:bg-blue-100': item.highlight }" @click="highlightExhibit(item)">
            <!-- Number Circle -->
            <div class="mr-3 flex-shrink-0">
              <div
                class="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {{ index + 1 }}
              </div>
            </div>

            <!-- Item Info -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 mb-1 text-sm truncate">{{ item.name }}</div>
              <div class="flex items-center text-gray-500 text-xs">
                <span class="material-icons text-xs mr-1">place</span>
                <span class="truncate">{{ item.location }}</span>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
      <!-- CollapsibleTrigger moved to the Floating Action Button -->
    </Collapsible>

    <!-- Exhibit Details Panel - Using BottomDrawer -->
    <BottomDrawer v-model="showExhibitPanel">
      <div v-if="selectedExhibit" class="flex flex-col gap-4">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-2">
           <h2 class="text-lg font-semibold text-gray-900 truncate">{{ selectedExhibit.name }}</h2>
           <Button variant="ghost" size="icon" @click="showExhibitPanel = false" class="-mr-2">
             <span class="material-icons text-lg">close</span>
           </Button>
        </div>
        
        <!-- Description -->
        <p class="text-gray-600 text-sm">{{ selectedExhibit.description || 'No description available.' }}</p>
        
        <!-- Image Gallery Placeholder -->
        <div class="flex gap-3 snap-x snap-mandatory overflow-x-auto hide-scrollbar pb-2">
          <div v-for="(_, i) in 3" :key="i" class="snap-start min-w-[200px] flex-shrink-0 bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
            <span class="text-gray-500 text-sm">Exhibit Image {{ i + 1 }}</span>
          </div>
        </div>
      </div>
      <div v-else class="text-center text-gray-500 py-8">Select an exhibit to see details.</div>
    </BottomDrawer>

    <!-- Floating Control Button Group -->
    <div class="fixed bottom-20 right-4 z-30 flex flex-col gap-2">
       <CollapsibleTrigger as-child>
         <Button
           variant="secondary"
           size="icon"
           class="rounded-full bg-white shadow-lg text-blue-500 hover:bg-blue-50"
           aria-label="Toggle Recommended Route"
         >
           <span class="material-icons">{{ showRoutePanel ? 'format_list_bulleted_off' : 'format_list_bulleted' }}</span>
         </Button>
       </CollapsibleTrigger>
    </div>

    <!-- Tour Toolbar - Updated with Play/Pause -->
    <div class="fixed bottom-0 left-0 right-0 h-14 bg-white bg-opacity-90 backdrop-blur-sm shadow-lg z-40">
      <div class="flex items-center justify-between px-4 h-full max-w-screen-xl mx-auto">
        <!-- Guide Info & Playback Controls -->
        <div class="flex items-center space-x-2">
          <!-- Guide Avatar with Wave -->
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden relative">
            <div class="flex items-center justify-center text-white">
              <span class="material-icons text-sm">{{ isSpeaking ? 'graphic_eq' : 'person' }}</span>
            </div>
            <!-- Voice wave animation -->
            <div v-if="isSpeaking && !isGeneratingAudio" class="absolute inset-0 flex items-center justify-center">
                <div class="voice-wave"></div>
            </div>
             <!-- Loading Indicator -->
            <div v-if="isGeneratingAudio" class="absolute inset-0 flex items-center justify-center bg-black/30">
                <Icon name="svg-spinners:180-ring-with-bg" class="w-5 h-5 text-white" />
            </div>
          </div>
          <!-- Play/Pause Button -->
          <Button 
            variant="ghost" 
            size="icon" 
            @click="togglePlayback" 
            :disabled="isGeneratingAudio || (!isPlaying && !isPaused)" 
            class="w-8 h-8 disabled:opacity-50"
            :aria-label="isPlaying ? 'Pause Guide' : 'Play Guide'">
            <Icon 
              :name="isPlaying ? 'material-symbols:pause-outline-rounded' : 'material-symbols:play-arrow-outline-rounded'" 
              class="w-6 h-6"
            />
          </Button>
           <div class="text-xs text-gray-700 font-medium">Guide</div>
        </div>

        <!-- Status Indicator -->
        <div class="text-center text-xs text-gray-600 flex-1 px-2 truncate">
           <span v-if="isGeneratingAudio">Generating speech...</span>
           <span v-else-if="isPlaying">Speaking...</span>
           <span v-else-if="isPaused">Paused</span>
           <span v-else-if="ttsError" class="text-red-600">Error: {{ ttsError }}</span>
           <span v-else>Ready</span>
        </div>

        <!-- Voice Input Button (User Listening) -->
        <Button 
          variant="default" 
          size="icon"
          class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400"
          @touchstart="startListening"
          @touchend="stopListening"
          @mousedown="startListening"
          @mouseup="stopListening"
          @mouseleave="stopListening"
          :disabled="isSpeaking" 
        >
          <Icon 
            :name="isListening ? 'ph:microphone-fill' : 'ph:microphone'" 
            class="w-5 h-5"
          />
        </Button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '~/stores/chatStore'
import { useTourStore, type ExhibitItem } from '~/stores/tourStore'
import { storeToRefs } from 'pinia'
import { useVoiceNavigation } from '~/composables/useVoiceNavigation'
import type { Ref } from 'vue'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import BottomDrawer from '~/components/ui/bottom-drawer'
import { Button } from '@/components/ui/button'
import { Icon } from '#components'

// Get route parameters
const route = useRoute()
const router = useRouter()
const museumId = computed(() => route.params.id as string)

// Use store
const chatStore = useChatStore()
const tourStore = useTourStore()
const { routeItems, featuredExhibits, currentMuseum } = storeToRefs(tourStore)

// Panel state
const showRoutePanel = ref(false)
const showExhibitPanel = ref(false)
const selectedExhibit = ref<ExhibitItem | null>(null)

// Get updated state and functions from useVoiceNavigation
const {
  isSpeaking, // Computed: Generating OR Playing
  isGeneratingAudio,
  isPlaying,
  isPaused,
  ttsError,
  speak,
  pauseAudio,
  resumeAudio,
  stopAudio, // Use if needed, e.g., on route change or manual stop button
  isListening, // Renamed state from Speech Recognition
  startListening, // Renamed function from Speech Recognition
  stopListening, // Renamed function from Speech Recognition
  playWelcomeIntroduction,
  explainExhibit,
} = useVoiceNavigation()

// Setup current museum on mount
onMounted(() => {
  // Load Material Icons font (Consider moving to nuxt.config or layout)
  const link = document.createElement('link')
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons|Material+Symbols+Outlined' // Add Symbols
  link.rel = 'stylesheet'
  document.head.appendChild(link)
  
  const success = tourStore.setCurrentMuseum(museumId.value)
  if (!success) {
    console.warn(`Museum with ID ${museumId.value} not found, redirecting to default`)
    router.replace(`/tour/${tourStore.currentMuseumId}`) // Redirect to current default
  } else {
      // Play welcome only after museum is successfully set
      // Consider adding a short delay or trigger on user interaction
      setTimeout(() => playWelcomeIntroduction(), 500); 
  }
})

// Dynamic page head
useHead(() => ({
  title: currentMuseum.value ? `${currentMuseum.value.name} - Tour Guide` : 'Museum Tour Guide',
  meta: [
    { 
      name: 'description', 
      content: currentMuseum.value 
        ? `Interactive voice-guided tour of the ${currentMuseum.value.name}` 
        : 'Interactive voice-guided museum tour'
    }
  ]
}))

// Map related state
const currentFloor = ref(1)
const mapSectionRef = ref<any>(null) // Use any or define MapSectionComponent type

// Floor string
const currentFloorStr = computed(() => {
  return currentFloor.value === 0 ? 'G' : 
         currentFloor.value === 1 ? '1' : 
         currentFloor.value === 2 ? '2-3' : '1'
})

// Update floor
function updateFloor(floor: number) {
  currentFloor.value = floor
}

// Computed property: Filter route items
const filteredRouteItems = computed(() => {
  return routeItems.value.filter(item => item.floor === currentFloor.value)
})

// Handle exhibit selection (map click)
function onExhibitSelected(exhibit: ExhibitItem) {
  selectedExhibit.value = exhibit
  showExhibitPanel.value = true
  
  // Explain the exhibit using the new speak function
  explainExhibit(exhibit)
}

// Navigation method
function goBack() {
  stopAudio() // Stop any speech before navigating back
  router.back()
}

// Highlight exhibit (route list click)
function highlightExhibit(item: ExhibitItem) {
  tourStore.highlightExhibit(item) // Use store's highlight method
  currentFloor.value = item.floor
  if (mapSectionRef.value?.highlightExhibit) {
    mapSectionRef.value.highlightExhibit(item.id)
  }
  selectedExhibit.value = item
  showExhibitPanel.value = true
  // Explain exhibit when highlighted from the list as well
  explainExhibit(item) 
}

// Toggle Play/Pause for guide speech
function togglePlayback() {
  if (isPlaying.value) {
    pauseAudio()
  } else if (isPaused.value) {
    resumeAudio()
  }
  // If neither playing nor paused, do nothing (wait for speak to be called)
}

// Component unmount cleanup (additional cleanup in composable)
onBeforeUnmount(() => {
   stopAudio() // Ensure audio stops if component is destroyed
})

</script>

<style scoped>
.hide-scrollbar {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.hide-scrollbar::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

/* Voice wave animation */
.voice-wave {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  animation: voice-wave 1.5s infinite ease-in-out;
}

@keyframes voice-wave {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>