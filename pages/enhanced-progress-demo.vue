<template>
  <div class="container mx-auto p-4 md:p-6 max-w-6xl">
    <div class="mb-8 text-center">
      <h1 class="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
        Enhanced Synthesis Progress Demo
      </h1>
      <p class="text-muted-foreground max-w-2xl mx-auto">
        Experience our beautiful gradient cards and enhanced progress indicators with speaker avatars and responsive design.
      </p>
    </div>

    <!-- 控制面板 -->
    <div class="bg-gradient-to-br from-background via-muted/20 to-background border border-border/50 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm mb-8">
      <h2 class="text-xl md:text-2xl font-semibold mb-4 text-center">Demo Controls</h2>
      <div class="flex flex-col sm:flex-row gap-4 items-center justify-center">
        <Button
          @click="startDemo"
          :disabled="isProcessing"
          variant="default"
          size="lg"
          class="bg-gradient-to-r from-primary via-purple-500 to-primary hover:from-primary/90 hover:via-purple-500/90 hover:to-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          <Icon v-if="isProcessing" name="ph:spinner-gap" class="w-5 h-5 mr-2 animate-spin" />
          <Icon v-else name="ph:play-fill" class="w-5 h-5 mr-2" />
          {{ isProcessing ? 'Processing...' : 'Start Demo' }}
        </Button>
        
        <Button
          @click="resetDemo"
          variant="outline"
          size="lg"
          :disabled="isProcessing"
          class="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-muted/30"
        >
          <Icon name="ph:arrow-clockwise" class="w-5 h-5 mr-2" />
          Reset Demo
        </Button>
        
        <Button
          @click="toggleAvatars"
          variant="outline"
          size="lg"
          class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/50 hover:from-amber-100 hover:to-orange-100 text-amber-700 dark:text-amber-300"
        >
          <Icon name="ph:user-circle" class="w-5 h-5 mr-2" />
          {{ showAvatars ? 'Hide' : 'Show' }} Avatars
        </Button>
      </div>
    </div>

    <!-- Enhanced Progress Component -->
    <EnhancedSynthesisProgress 
      :is-processing="isProcessing"
      :progress-data="progressData"
      :show-time-estimate="true"
      :personas="demoPersonas"
    />

    <!-- Status Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <!-- Success Card -->
      <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/50 rounded-2xl p-6 shadow-lg text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
          <Icon name="ph:check-circle" class="w-6 h-6 text-green-500" />
        </div>
        <h3 class="font-semibold text-green-700 dark:text-green-300 mb-2">Success State</h3>
        <p class="text-sm text-green-600 dark:text-green-400">Beautiful gradient success card</p>
      </div>

      <!-- Processing Card -->
      <div class="bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 border border-primary/20 rounded-2xl p-6 shadow-lg text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center relative">
          <Icon name="ph:gear" class="w-6 h-6 text-primary animate-spin" />
          <div class="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
        <h3 class="font-semibold text-primary mb-2">Processing State</h3>
        <p class="text-sm text-muted-foreground">Dynamic processing indicator</p>
      </div>

      <!-- Error Card -->
      <div class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-2xl p-6 shadow-lg text-center">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
          <Icon name="ph:warning-circle" class="w-6 h-6 text-red-500" />
        </div>
        <h3 class="font-semibold text-red-700 dark:text-red-300 mb-2">Error State</h3>
        <p class="text-sm text-red-600 dark:text-red-400">Elegant error indication</p>
      </div>
    </div>

    <!-- Feature Highlights -->
    <div class="bg-gradient-to-br from-background via-muted/30 to-background border border-border/50 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm mt-8">
      <h2 class="text-xl md:text-2xl font-semibold mb-6 text-center">Features</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
            <Icon name="ph:users" class="w-6 h-6 text-blue-500" />
          </div>
          <h3 class="font-medium mb-2">Speaker Avatars</h3>
          <p class="text-sm text-muted-foreground">Beautiful speaker avatar display</p>
        </div>
        
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Icon name="ph:device-mobile" class="w-6 h-6 text-purple-500" />
          </div>
          <h3 class="font-medium mb-2">Responsive Design</h3>
          <p class="text-sm text-muted-foreground">Optimized for all screen sizes</p>
        </div>
        
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <Icon name="ph:palette" class="w-6 h-6 text-green-500" />
          </div>
          <h3 class="font-medium mb-2">Gradient Cards</h3>
          <p class="text-sm text-muted-foreground">Beautiful gradient backgrounds</p>
        </div>
        
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
            <Icon name="ph:magic-wand" class="w-6 h-6 text-orange-500" />
          </div>
          <h3 class="font-medium mb-2">Smooth Animations</h3>
          <p class="text-sm text-muted-foreground">Fluid transitions and effects</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Button } from '@/components/ui/button';
import EnhancedSynthesisProgress from '@/components/playground/EnhancedSynthesisProgress.vue';
import { toast } from 'vue-sonner';

// 设置页面标题
useHead({
  title: 'Enhanced Progress Demo - Beautiful UI Components'
});

// Demo state
const isProcessing = ref(false);
const showAvatars = ref(true);

// Demo personas
const demoPersonas = ref([
  {
    id: 1,
    name: 'Alex Johnson',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 2,
    name: 'Sarah Chen',
    avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 3,
    name: 'Michael Brown',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 4,
    name: 'Emma Wilson',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 5,
    name: 'David Martinez',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
  }
]);

// Progress data
const progressData = reactive({
  completed: 0,
  total: 12,
  currentSegment: undefined as number | undefined,
  segments: [
    { status: 'waiting' as const, speaker: 'Alex Johnson', text: 'Welcome to our podcast! Today we\'ll be discussing the future of AI technology and its impact on our daily lives.', persona: demoPersonas.value[0] },
    { status: 'waiting' as const, speaker: 'Sarah Chen', text: 'Thank you, Alex. I\'m excited to share my insights on machine learning developments.', persona: demoPersonas.value[1] },
    { status: 'waiting' as const, speaker: 'Michael Brown', text: 'The advances in neural networks have been remarkable this year.', persona: demoPersonas.value[2] },
    { status: 'waiting' as const, speaker: 'Emma Wilson', text: 'I agree, Michael. The applications in healthcare have been particularly impressive.', persona: demoPersonas.value[3] },
    { status: 'waiting' as const, speaker: 'Alex Johnson', text: 'Let\'s dive deeper into the specific technologies that are driving this change.', persona: demoPersonas.value[0] },
    { status: 'waiting' as const, speaker: 'David Martinez', text: 'Computer vision has made incredible strides, especially in autonomous vehicles.', persona: demoPersonas.value[4] },
    { status: 'waiting' as const, speaker: 'Sarah Chen', text: 'Natural language processing is another area where we\'ve seen breakthrough innovations.', persona: demoPersonas.value[1] },
    { status: 'waiting' as const, speaker: 'Michael Brown', text: 'The ethical considerations are equally important as we advance these technologies.', persona: demoPersonas.value[2] },
    { status: 'waiting' as const, speaker: 'Emma Wilson', text: 'Privacy and security must be at the forefront of AI development.', persona: demoPersonas.value[3] },
    { status: 'waiting' as const, speaker: 'Alex Johnson', text: 'What about the impact on employment and the future workforce?', persona: demoPersonas.value[0] },
    { status: 'waiting' as const, speaker: 'David Martinez', text: 'Reskilling and adaptation will be crucial for workers in the AI era.', persona: demoPersonas.value[4] },
    { status: 'waiting' as const, speaker: 'Sarah Chen', text: 'Thank you all for this fascinating discussion. The future looks both exciting and challenging!', persona: demoPersonas.value[1] }
  ]
});

async function startDemo() {
  if (isProcessing.value) return;
  
  isProcessing.value = true;
  progressData.completed = 0;
  progressData.currentSegment = 0;
  
  // Reset all segments
  progressData.segments.forEach(segment => {
    segment.status = 'waiting';
  });
  
  toast.success('Demo Started', {
    description: 'Watch the beautiful progress animation!'
  });
  
  // Simulate processing each segment
  for (let i = 0; i < progressData.segments.length; i++) {
    progressData.currentSegment = i;
    progressData.segments[i].status = 'processing';
    
    // Simulate processing time with random duration
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 800));
    
    if (!isProcessing.value) return; // Allow cancellation
    
    progressData.segments[i].status = 'completed';
    progressData.completed = i + 1;
    
    // Add occasional error for demonstration
    if (Math.random() < 0.1 && i > 2) {
      progressData.segments[i].status = 'error';
      await new Promise(resolve => setTimeout(resolve, 500));
      progressData.segments[i].status = 'completed';
    }
  }
  
  isProcessing.value = false;
  progressData.currentSegment = undefined;
  
  toast.success('Demo Completed', {
    description: 'All segments have been processed successfully!'
  });
}

function resetDemo() {
  isProcessing.value = false;
  progressData.completed = 0;
  progressData.currentSegment = undefined;
  
  progressData.segments.forEach(segment => {
    segment.status = 'waiting';
  });
  
  toast.info('Demo Reset', {
    description: 'Ready to start a new demonstration'
  });
}

function toggleAvatars() {
  showAvatars.value = !showAvatars.value;
  
  if (showAvatars.value) {
    progressData.segments.forEach((segment, index) => {
      segment.persona = demoPersonas.value[index % demoPersonas.value.length];
    });
  } else {
    progressData.segments.forEach(segment => {
      segment.persona = undefined;
    });
  }
  
  toast.info(`Avatars ${showAvatars.value ? 'Enabled' : 'Disabled'}`);
}
</script>

<style scoped>
/* Fade animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Custom gradient text */
.bg-clip-text {
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style> 