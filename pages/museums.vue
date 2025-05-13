<template>
  <div class="container mx-auto px-4 py-8"
       v-motion
       :initial="{ opacity: 0 }"
       :enter="{ opacity: 1, transition: { duration: 300 } }">
    <h1 class="text-3xl font-bold mb-8">Available Museums</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="museum in museums" :key="museum.id" 
           class="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        <div class="p-6">
          <h2 class="text-xl font-semibold mb-2">{{ museum.name }}</h2>
          <p class="text-gray-600 mb-4">{{ museum.description }}</p>
          <p class="text-sm text-gray-500 mb-4">{{ museum.location }}</p>
          
          <NuxtLink :to="`/tour/${museum.id}`" 
                   class="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
            Start Tour
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTourStore } from '~/stores/tourStore'

// Set page title
useHead({
  title: 'Available Museums - Tour Guide',
  meta: [
    { name: 'description', content: 'Browse and select museums for interactive voice-guided tours' }
  ]
})

// Get museum list
const tourStore = useTourStore()
const { museums } = storeToRefs(tourStore)
</script>