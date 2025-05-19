<template>
  <div class="relative h-full w-full bg-gray-50">
    <!-- Welcome Popup -->
    <TourWelcome 
      v-if="!userHasInteracted" 
      @start="startWithUserInteraction" 
      @toggle-mute="setGlobalMute"
      @close="userHasInteracted = true"
      class="absolute inset-0 z-30"
    />

    <!-- Map Component -->
    <TourMap 
      v-model:currentFloor="currentFloor" 
      :museum-id="currentMuseumId"
      ref="mapRef"
      @exhibit-selected="onExhibitSelected" 
      class="absolute inset-0 z-0"
    />

    <!-- Top Navigation Bar -->
    <div class="absolute top-[20px] left-0 right-0  z-10" :class="{ 'top-[60px]': isPwa }">
      <TourHeader 
        :museum-name="museumName"
        @back="goBack"
      />
    </div>

    <!-- Bottom Info Card -->
    <InfoCard 
      v-if="infoCardData" 
      :data="infoCardData"
      :type="infoCardType"
      class="absolute bottom-28 left-4 right-4 z-10"
      @close="closeInfoCard"
      @details="viewExhibitDetails"
      @play-audio="playAudio"
    />

    <!-- Bottom Toolbar -->
    <TourToolbar 
      v-model:currentFloor="currentFloor"
      :is-playing="isPlaying"
      :is-listening="isListening"
      :is-paused="isPaused"
      @ask-guide="openGuideDialog"
      @start-listening="startListening"
      @stop-listening="stopListening"
      @start-tour="startGuidedTour"
      @pause-audio="pauseAudio"
      @resume-audio="resumeAudio"
      class="absolute bottom-[20px] left-0 right-0 z-20 tour-toolbar-container"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTourStore } from '~/stores/tourStore'
import { useVoiceNavigation } from '~/composables/useVoiceNavigation'
import TourWelcome from '~/components/TourWelcome.vue'
import TourHeader from '~/components/TourHeader.vue'
import TourMap from '~/components/TourMap.vue'
import InfoCard from '~/components/InfoCard.vue'
import TourToolbar from '~/components/TourToolbar.vue'

// Page metadata
definePageMeta({
  layout: 'fullscreen-map'
})

// Set page title and metadata
useHead({
  title: 'Museum Tour Guide',
  meta: [
    { name: 'description', content: 'Interactive voice-guided museum tour' }
  ]
})

// Get router
const router = useRouter()

// Use store
const tourStore = useTourStore()
const { currentMuseum } = tourStore
const { isPwa } = usePwa()
// Use voice navigation
const { 
  playWelcomeIntroduction, 
  speak, 
  explainExhibit, 
  isSpeaking,
  isPlaying,
  isListening,
  setGlobalMute,
  isPaused,
  pauseAudio,
  resumeAudio
} = useVoiceNavigation()

// Define interface
interface Exhibit {
  id: number;
  name: string;
  description: string;
  floor?: number;
  image?: string;
}

interface StepData {
  number: number;
  description: string;
  image?: string;
}

interface WelcomeData {
  title: string;
  description: string;
  image?: string;
}

// State management
const userHasInteracted = ref(false)
const currentFloor = ref(1)
const infoCardType = ref<'welcome' | 'exhibit' | 'step'>('welcome')
const infoCardData = ref<Exhibit | StepData | WelcomeData | null>(null)
const mapRef = ref(null)
const currentMuseumId = ref('metropolitan')

// Computed property
const museumName = computed(() => currentMuseum?.name || 'Metropolitan Museum of Art')

// Start tour after user interaction
function startWithUserInteraction() {
  userHasInteracted.value = true
  showWelcomeCard()
  setTimeout(() => {
    playWelcomeIntroduction()
  }, 100)
}

// Handle exhibit selection
function onExhibitSelected(exhibit: Exhibit) {
  if (exhibit) {
    showExhibitCard(exhibit)
    if (userHasInteracted.value) {
      const exhibitInfo = {
        id: exhibit.id,
        name: exhibit.name,
        description: exhibit.description,
        location: '',
        highlight: false,
        floor: exhibit.floor || currentFloor.value
      }
      explainExhibit(exhibitInfo)
    }
  }
}

// Show welcome card
function showWelcomeCard() {
  infoCardType.value = 'welcome'
  infoCardData.value = {
    title: 'Welcome to the Tour',
    description: 'Explore the museum with your personal guide. Tap on map markers to learn about exhibits.',
    image: '/path/to/welcome-image.jpg'
  }
}

// Show exhibit card
function showExhibitCard(exhibit: Exhibit) {
  infoCardType.value = 'exhibit'
  infoCardData.value = {
    id: exhibit.id,
    name: exhibit.name,
    description: exhibit.description || 'No description available.',
    image: exhibit.image || '/path/to/placeholder.jpg'
  }
}

// Show route step card
function showStepCard(step: StepData) {
  infoCardType.value = 'step'
  infoCardData.value = {
    number: step.number,
    description: step.description,
    image: step.image
  }
}

// Close info card
function closeInfoCard() {
  infoCardData.value = null
}

// View exhibit details
function viewExhibitDetails(exhibit: Exhibit) {
  // Can navigate to a detail page or show more information
  console.log('View details for:', exhibit.name)
}

// Start guided tour
function startGuidedTour() {
  const firstStep: StepData = {
    number: 1,
    description: 'Start your tour at the main entrance. Head to the first gallery on your right.',
    image: '/path/to/step1.jpg'
  }
  
  showStepCard(firstStep)
  speak('Starting your guided tour. I\'ll accompany you through the highlights of the collection.')
}

// Start speech recognition
function startListening() {
  // Speech recognition start logic
}

// Stop speech recognition
function stopListening() {
  if (isListening.value) {
    openGuideDialog()
  }
}

// Open guide dialog
function openGuideDialog() {
  // Logic to open the guide dialog
}

// Go back to previous page
function goBack() {
  router.back()
}

function playAudio(data: any) {
  // Placeholder for playing audio
  console.log('Play audio for:', data);
  // Implement actual audio playback logic here using useVoiceNavigation or similar
}

// Lifecycle hook
onMounted(() => {
  // Load Material Icons font
  const link = document.createElement('link')
  link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons'
  link.rel = 'stylesheet'
  document.head.appendChild(link)
})
</script>

<style scoped>
/* Bottom toolbar container, using global variable to add bottom safe area */
.tour-toolbar-container {
  padding-bottom: var(--safe-area-bottom, 0px);
}
</style>
