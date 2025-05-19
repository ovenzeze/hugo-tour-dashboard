<template>
  <div class="container mx-auto py-8 px-4">
    <div class="flex flex-col lg:flex-row lg:gap-10">

      <!-- Table of Contents - Desktop Sidebar (Hidden on small screens) -->
      <aside class="lg:block lg:w-72 sticky top-20 self-start h-[calc(100dvh-10rem)] overflow-hidden flex flex-col pr-4">
        <div class="bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
          <!-- Fixed Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="font-bold text-lg text-gray-800 dark:text-gray-200">
              Contents
            </h3>
          </div>
          
          <!-- Scrollable Content Area -->
          <div class="flex-1 overflow-y-auto p-4 toc-content">
            <TableOfContents 
              :links="toc?.links || []" 
              :active-id="activeHeadingId" 
              @link-click="closeSheet"
            />
            <p v-if="!toc?.links?.length" class="text-sm text-muted-foreground">No contents available</p>
          </div>
          
          <!-- Fixed Footer -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto mx-auto">
            <NuxtLink 
              to="/docs" 
              class="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft class="w-4 h-4 mr-1" />
              Back to all documents
            </NuxtLink>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main ref="mainContentRef" class="flex-1 min-w-0 overflow-auto"> 
        
        <!-- Mobile TOC Trigger Button (Visible only on small screens) -->
        <div v-if="toc && toc.links && toc.links.length" class="lg:hidden mb-4">
          <Sheet v-model:open="isSheetOpen">
            <SheetTrigger as-child>
              <Button variant="outline" size="sm" class="flex items-center">
                <Menu class="w-4 h-4 mr-2" />
                View contents
              </Button>
            </SheetTrigger>
            <SheetContent side="left" class="w-72 sm:w-80 p-0">
              <div class="flex flex-col h-full">
                <!-- Fixed Header -->
                <SheetHeader class="p-4 border-b border-gray-200 dark:border-gray-700">
                  <SheetTitle>Contents</SheetTitle>
                </SheetHeader>
                
                <!-- Scrollable Content Area -->
                <div class="flex-1 overflow-y-auto p-4 toc-content">
                  <TableOfContents 
                    :links="toc?.links || []" 
                    :active-id="activeHeadingId" 
                    @link-click="closeSheet"
                  />
                </div>
                
                <!-- Fixed Footer -->
                <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <NuxtLink 
                    to="/docs" 
                    class="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    @click="closeSheet"
                  >
                    <ArrowLeft class="w-4 h-4 mr-1" />
                    Back to index
                  </NuxtLink>
                  
                  <Button variant="ghost" size="sm" @click="closeSheet">
                    <X class="w-4 h-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <!-- Loading and error states -->
        <div v-if="pending" class="flex items-center justify-center py-12 text-gray-500">
          <Loader2 class="w-6 h-6 mr-2 animate-spin" />
          Loading...
        </div>
        <div v-else-if="error" class="flex items-center justify-center py-12 text-red-500">
          <AlertCircle class="w-6 h-6 mr-2" />
          Loading failed: {{ error.message || 'Unknown error' }}
        </div>
        
        <!-- Document content area -->
        <template v-else-if="doc">
          <!-- Use EnhancedDocument component -->
          <EnhancedDocument :document="doc" />
          
          <!-- Document helper tools -->
          <DocumentHelper 
            :document="doc" 
            github-repo="ovenzeze/hugo-tour-guide"
            index-path="/docs"
          />

          <!-- Debug information -->
          <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 my-4 rounded border border-yellow-200 dark:border-yellow-800">
            <h3 class="font-bold mb-2">Debug Information:</h3>
            <div class="text-xs p-2 bg-white dark:bg-gray-800 rounded">
              <p><strong>Author:</strong> {{ doc.meta?.author || doc.author || 'Not found' }}</p>
              <p><strong>Updated:</strong> {{ doc.meta?.updatedAt || doc.updatedAt || doc.meta?.date || doc.date || 'Not found' }}</p>
              <p><strong>Path:</strong> {{ doc._path }}</p>
              <p><strong>Title:</strong> {{ doc.title }}</p>
              <details>
                <summary class="cursor-pointer font-bold">Full Document Structure</summary>
                <pre class="mt-2 overflow-auto p-2 bg-gray-100 dark:bg-gray-900 rounded">{{ JSON.stringify(doc, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </template>
      </main>

    </div>
  </div>
</template>

<script setup>
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu, X, ArrowLeft, Loader2, AlertCircle } from 'lucide-vue-next'
import { useRoute, ref, computed, watch, nextTick, onMounted, onBeforeUnmount, useHead, useAsyncData, queryCollection } from '#imports'
import { useMotion } from '@vueuse/motion'

definePageMeta({
  layout: 'fullscreen',
  pageTransition: {
    name: 'none' // Disable default page transition animation
  }
})

// Get slug from route parameters
const route = useRoute()
const slug = computed(() => {
  let s = route.params.slug
  if (Array.isArray(s)) s = s.join('/')
  return s || 'README'
})

// Fetch document content
const { data: doc, pending, error } = await useAsyncData(
  `docs-${slug.value}`,
  () => queryCollection('docs').path(`/docs/${slug.value}`).first()
)

// Ref for the main page container and animation effect
const mainContentRef = ref(null)
useMotion(mainContentRef, {
  initial: { opacity: 0, y: 20 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  }
})

// Output document debug info to console
watch(doc, (newDoc) => {
  if (newDoc) {
    console.log('Document metadata:', {
      title: newDoc.title,
      author: newDoc.author,
      date: newDoc.date,
      updatedAt: newDoc.updatedAt,
      path: newDoc._path
    })
  }
}, { immediate: true })

// Extract table of contents from document
const toc = computed(() => doc.value?.body?.toc || {})

// Set page metadata
useHead({
  title: computed(() => {
    return doc.value?.title ? `${doc.value.title} - Documentation` : 'Documentation'
  }),
  meta: [
    { name: 'description', content: computed(() => doc.value?.description || 'Documentation page') }
  ]
})

// --- Active Heading Highlight ---
const activeHeadingId = ref(null)
let observer = null

onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined') {
    const callback = (entries) => {
      // Find all intersecting headings and sort by position
      const intersectingHeadings = entries
        .filter(e => e.isIntersecting && e.target.id)
        .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top)
      
      // Set the topmost as active
      if (intersectingHeadings.length > 0) {
        activeHeadingId.value = intersectingHeadings[0].target.id
      }
    }

    // Create observer to watch when headings enter 80% of view
    observer = new IntersectionObserver(callback, {
      rootMargin: '0px 0px -80% 0px',
      threshold: 0.1
    })

    // Watch for document content changes and reset observers
    watch(() => doc.value, () => {
      if (observer) observer.disconnect()
      
      nextTick(() => {
        // Find all h2, h3, h4 headings and observe them
        const headings = document.querySelectorAll('h2[id], h3[id], h4[id]')
        if (headings.length) {
          headings.forEach(heading => observer.observe(heading))
        }
      })
    }, { immediate: true })
  }
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Mobile TOC control
const isSheetOpen = ref(false)
const closeSheet = () => {
  isSheetOpen.value = false
}

// Function to smooth scroll to target position - Using smoother scrolling behavior
const smoothScrollTo = (id) => {
  const element = document.getElementById(id)
  if (element) {
    const yOffset = -80 // Offset to account for fixed navigation bar height
    const y = element.getBoundingClientRect().top + window.scrollY + yOffset
    
    window.scrollTo({
      top: y,
      behavior: 'smooth'
    })
  }
}
</script>

<style>
/* Active TOC item styles */
.text-primary {
  color: #3b82f6;
}

.font-medium {
  font-weight: 500;
}

/* Preserve whitespace in Markdown */
.prose-preserve-whitespace p {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Ensure table content displays correctly */
.prose-preserve-whitespace table p {
  white-space: normal;
}

/* Remove scroll bounce effect */
html {
  scroll-behavior: auto !important;
  overscroll-behavior: none;
}

/* Optimize document content animation effect */
.prose-lg > * {
  transition: opacity 0.2s ease-out;
}

/* Optimize table of contents scrolling behavior */
.toc-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding-right: 10px;
}

/* Animation for items within the table of contents */
.toc-item, .toc-subitem, .toc-subsubitem {
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.toc-item:hover, .toc-subitem:hover, .toc-subsubitem:hover {
  transform: translateX(3px);
}

/* Active item style optimization */
.toc-nav a.active {
  background-color: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
  font-weight: 500;
}
</style>
