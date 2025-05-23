<template>
  <div class="enhanced-document">
    <!-- Document header area - Title and metadata -->
    <div class="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700 content-section">
      <!-- Author and metadata information in top bar -->
      <div class="flex flex-wrap items-center justify-between mb-4">
        <div class="mt-6 pt-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2 py-3 w-full backdrop-blur-sm">
          <DocumentMeta :document="document" />
        </div>
      </div>
      
      <!-- Title -->
      <h1 v-if="document.title" class="text-4xl font-bold text-gray-900 dark:text-white mt-4">
        {{ document.title }}
      </h1>
      <h1 v-else class="text-4xl font-bold text-gray-900 dark:text-white mt-4">
        {{ document._path?.split('/').pop() || 'Document' }}
      </h1>
      
      <!-- Description -->
      <p v-if="document.description" class="mt-3 text-lg text-gray-600 dark:text-gray-300">
        {{ document.description }}
      </p>
    </div>
    
    <!-- Document main content -->
    <div class="prose prose-lg prose-preserve-whitespace max-w-none dark:prose-invert content-section">
      <ContentRenderer :value="document" />
    </div>
    
    <!-- Document footer area -->
    <div v-if="(document.meta?.tags && document.meta.tags.length > 0) || (document.tags && document.tags.length > 0) || document.contributors" class="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 content-section">
      <!-- Tags -->
      <div v-if="(document.meta?.tags && document.meta.tags.length > 0) || (document.tags && document.tags.length > 0)" class="flex flex-wrap items-center gap-2 mb-4">
        <Tag class="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <div 
          v-for="tag in (document.meta?.tags || document.tags)" 
          :key="tag" 
          class="px-3 py-1.5 text-xs rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
        >
          {{ tag }}
        </div>
      </div>
      
      <!-- Contributors -->
      <div v-if="document.contributors && document.contributors.length > 0" class="flex flex-wrap items-center gap-2">
        <Users class="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span class="text-sm text-gray-500 dark:text-gray-400">Contributors:</span>
        <div 
          v-for="contributor in document.contributors" 
          :key="contributor" 
          class="text-sm text-gray-600 dark:text-gray-300"
        >
          {{ contributor }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Tag, Users, User } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

defineProps({
  document: {
    type: Object,
    required: true
  }
})

// Control content loading animation
onMounted(() => {
  // Add animation effect class to content after mounting
  setTimeout(() => {
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach((section, index) => {
      setTimeout(() => {
        section.classList.add('content-loaded');
      }, 100 * index); // Sequential loading of sections
    });
  }, 50);
})
</script>

<style scoped>
/* Add content transition animation */
.content-section {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.content-loaded {
  opacity: 1;
  transform: translateY(0);
}

/* Ensure document tables display correctly */
:deep(.prose table) {
  width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
  overflow-x: auto;
}

:deep(.prose table th) {
  background-color: #f3f4f6;
  font-weight: 500;
  padding: 0.5rem;
  text-align: left;
  border: 1px solid #e5e7eb;
}

:deep(.prose table td) {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
}

/* Enhance code block readability */
:deep(.prose pre) {
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

/* Table paragraphs should not use whitespace styling */
:deep(.prose table p) {
  white-space: normal;
}

/* Dark mode adaptations */
@media (prefers-color-scheme: dark) {
  :deep(.prose table th) {
    background-color: #1f2937;
    border-color: #374151;
  }
  
  :deep(.prose table td) {
    border-color: #374151;
  }
}
</style> 