<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-6">Component Library</h1>
    
    <p class="text-gray-600 dark:text-gray-300 mb-6">
      Explore our collection of reusable components designed for consistency and efficiency across the project.
    </p>

    <!-- Featured Audio Synthesis Components -->
    <div class="mb-8">
      <div class="bg-gradient-to-r from-purple-50 via-blue-50 to-emerald-50 dark:from-purple-900/10 dark:via-blue-900/10 dark:to-emerald-900/10 rounded-xl p-4 border border-purple-100 dark:border-purple-800/50">
        <div class="flex items-center mb-3">
          <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
            <Icon name="ph:waveform" class="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">✨ Audio Synthesis Components</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">Real-time audio synthesis with beautiful animations</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-700/40">
            <div class="flex items-center mb-1">
              <Icon name="ph:play-circle" class="h-4 w-4 text-green-600 mr-2" />
              <span class="text-sm font-medium">Live Demo</span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-300">Real-time synthesis visualization</p>
          </div>
          
          <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-700/40">
            <div class="flex items-center mb-1">
              <Icon name="ph:sparkle" class="h-4 w-4 text-purple-600 mr-2" />
              <span class="text-sm font-medium">Beautiful UI</span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-300">Wave effects & progress bars</p>
          </div>
          
          <div class="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-700/40">
            <div class="flex items-center mb-1">
              <Icon name="ph:rocket-launch" class="h-4 w-4 text-blue-600 mr-2" />
              <span class="text-sm font-medium">Full Workflow</span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-300">Complete podcast creation</p>
          </div>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/synthesis-demo" class="inline-flex items-center px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            <Icon name="ph:waveform" class="mr-1.5 h-3.5 w-3.5" />
            View Demo
          </NuxtLink>
          <NuxtLink to="/playground" class="inline-flex items-center px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow-md">
            <Icon name="ph:rocket-launch" class="mr-1.5 h-3.5 w-3.5" />
            Try Playground
          </NuxtLink>
          <button 
            @click="showPodcastsModal = true"
            class="inline-flex items-center px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Icon name="ph:headphones" class="mr-1.5 h-3.5 w-3.5" />
            Browse Podcasts
          </button>
        </div>
      </div>
    </div>
    
    <!-- Component Categories -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Form Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:text-columns" class="mr-2 h-4 w-4" />
            Form Components
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Input controls and form selectors for data collection.
          </p>
          <div class="space-y-1">
            <NuxtLink to="/components/persona-selector" class="flex items-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm">
              <Icon name="ph:user-circle" class="mr-2 h-3.5 w-3.5 text-primary" />
              <span class="flex-1">PersonaSelector</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5">New</Badge>
            </NuxtLink>
          </div>
        </CardContent>
      </Card>
      
      <!-- Data Display Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:table" class="mr-2 h-4 w-4" />
            Data Display
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Tables, lists, and content display components.
          </p>
          <div class="space-y-1">
            <div class="flex items-center p-1.5 text-gray-400 dark:text-gray-500 text-xs">
              <span>Coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <!-- Navigation Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:navigation-arrow" class="mr-2 h-4 w-4" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Menus, tabs, and navigation components.
          </p>
          <div class="space-y-1">
            <div class="flex items-center p-1.5 text-gray-400 dark:text-gray-500 text-xs">
              <span>Coming soon...</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <!-- Feedback Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:bell" class="mr-2 h-4 w-4" />
            Feedback
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Dialogs, notifications, and loading states.
          </p>
          <div class="space-y-1">
            <NuxtLink to="/synthesis-demo" class="flex items-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm">
              <Icon name="ph:waveform" class="mr-2 h-3.5 w-3.5 text-primary" />
              <span class="flex-1">Audio Progress</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">Demo</Badge>
            </NuxtLink>
            <NuxtLink to="/playground" class="flex items-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm">
              <Icon name="ph:rocket-launch" class="mr-2 h-3.5 w-3.5 text-primary" />
              <span class="flex-1">Playground</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">Live</Badge>
            </NuxtLink>
          </div>
        </CardContent>
      </Card>
      
      <!-- Audio Processing Components -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/10 dark:to-blue-950/10 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:microphone" class="mr-2 h-4 w-4 text-purple-600" />
            Audio Processing
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Audio synthesis and podcast creation tools.
          </p>
          <div class="space-y-1">
            <NuxtLink to="/synthesis-demo" class="flex items-center p-1.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors group text-sm">
              <Icon name="ph:waveform" class="mr-2 h-3.5 w-3.5 text-purple-600 group-hover:animate-pulse" />
              <span class="flex-1">Synthesis Demo</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">Demo</Badge>
            </NuxtLink>
            <NuxtLink to="/playground" class="flex items-center p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group text-sm">
              <Icon name="ph:rocket-launch" class="mr-2 h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span class="flex-1">Playground</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">Live</Badge>
            </NuxtLink>
            <NuxtLink to="/tts-debug" class="flex items-center p-1.5 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors group text-sm">
              <Icon name="ph:speaker-high" class="mr-2 h-3.5 w-3.5 text-orange-600 group-hover:animate-bounce" />
              <span class="flex-1">TTS Debug</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-200">Debug</Badge>
            </NuxtLink>
          </div>
        </CardContent>
      </Card>

      <!-- Animation Showcase -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:sparkle" class="mr-2 h-4 w-4 text-emerald-600" />
            Animations
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Interactive animations and visual effects.
          </p>
          <div class="space-y-1">
            <NuxtLink to="/synthesis-demo" class="flex items-center p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors group text-sm">
              <Icon name="ph:circles-three-plus" class="mr-2 h-3.5 w-3.5 text-emerald-600 group-hover:rotate-180 transition-transform duration-500" />
              <span class="flex-1">Wave Effects</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Live</Badge>
            </NuxtLink>
          </div>
        </CardContent>
      </Card>

      <!-- Business Tools -->
      <Card class="overflow-hidden">
        <CardHeader class="bg-primary/5 pb-3">
          <CardTitle class="flex items-center text-base">
            <Icon name="ph:puzzle-piece" class="mr-2 h-4 w-4" />
            Business Tools
          </CardTitle>
        </CardHeader>
        <CardContent class="pt-3 pb-4">
          <p class="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Specialized business components.
          </p>
          <div class="space-y-1">
            <button 
              @click="showPodcastsModal = true"
              class="flex items-center p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors group text-sm w-full text-left"
            >
              <Icon name="ph:headphones" class="mr-2 h-3.5 w-3.5 text-emerald-600" />
              <span class="flex-1">Podcast Browser</span>
              <Badge variant="outline" class="ml-auto text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">New</Badge>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- Development Guide -->
    <div class="mt-8">
      <h2 class="text-xl font-bold mb-3">Development Guide</h2>
      <Card>
        <CardContent class="pt-4 pb-4">
          <div class="space-y-3">
            <div>
              <h3 class="text-base font-semibold mb-2">Design Principles</h3>
              <ul class="list-disc pl-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li>Reusable components with clear responsibilities</li>
                <li>Reasonable defaults and flexible configuration</li>
                <li>Follow project design specifications</li>
                <li>Consider accessibility and internationalization</li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-base font-semibold mb-2">Adding New Components</h3>
              <ol class="list-decimal pl-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li>Create files in the <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">components</code> directory</li>
                <li>Add documentation in <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">pages/components</code></li>
                <li>Include component links in this library</li>
                <li>Document props, events, and usage examples</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Podcasts Modal -->
    <Dialog :open="showPodcastsModal" @update:open="showPodcastsModal = $event">
      <DialogContent class="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[900px] h-[80vh] p-0 flex flex-col">
        <DialogHeader class="p-4 pb-0">
          <DialogTitle class="flex items-center">
            <Icon name="ph:headphones" class="mr-2 h-5 w-5 text-primary" />
            Browse Podcasts
          </DialogTitle>
          <DialogDescription>
            Explore available podcasts, listen to previews, and share with others.
          </DialogDescription>
        </DialogHeader>

        <div class="flex-1 px-4 pb-4 overflow-hidden">
          <div class="h-full">
            <PodcastList
              :podcasts="podcastsData"
              :loading="podcastsLoading"
              :current-previewing-id="currentPreviewingId"
              @select-podcast="handleSelectPodcast"
              @preview-podcast="handlePreviewPodcast"
              @stop-preview="handleStopPreview"
            />
          </div>
        </div>

        <DialogFooter class="p-4 pt-0">
          <Button variant="outline" @click="showPodcastsModal = false">
            <Icon name="ph:x" class="mr-2 h-4 w-4" />
            Close
          </Button>
          <NuxtLink to="/podcasts">
            <Button @click="showPodcastsModal = false">
              <Icon name="ph:arrow-right" class="mr-2 h-4 w-4" />
              View All Podcasts
            </Button>
          </NuxtLink>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PodcastList from '@/components/podcasts/PodcastList.vue';
import { usePodcastDatabase } from '@/composables/usePodcastDatabase';
import { usePodcastPlayer } from '@/composables/usePodcastPlayer';

const selectedPersonaId = ref(null);
const showPodcastsModal = ref(false);

// Podcast data and player
const {
  podcasts: podcastsData,
  loading: podcastsLoading,
  fetchPodcasts
} = usePodcastDatabase();

const podcastPlayer = usePodcastPlayer();
const currentPreviewingId = computed(() => podcastPlayer.currentPlayingPodcastId.value?.toString() || '');

// Podcast handlers
const handleSelectPodcast = (podcastId: string) => {
  showPodcastsModal.value = false;
  navigateTo(`/podcasts`);
};

const handlePreviewPodcast = (podcastId: string) => {
  const podcast = podcastsData.value.find(p => String(p.podcast_id) === String(podcastId));
  if (podcast) {
    podcastPlayer.playPodcast(podcast);
  }
};

const handleStopPreview = () => {
  podcastPlayer.stopPodcast();
};

// Load podcasts when component mounts
onMounted(() => {
  fetchPodcasts();
});

definePageMeta({
  title: 'Component Library'
});
</script>

