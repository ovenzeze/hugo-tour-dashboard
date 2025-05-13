<template>
  <div class="container mx-auto p-4" 
       v-motion
       :initial="{ opacity: 0 }"
       :enter="{ opacity: 1, transition: { duration: 300 } }">
    <!-- Filter Bar -->
    <div
      class="flex flex-wrap gap-3 items-center mb-4"
      v-motion
      :initial="{ opacity: 0, y: -20 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 0.4 } }"
    >
      <Combobox v-model="selectedType" :options="typeOptions" placeholder="Type" class="w-32" />
      <Combobox v-model="selectedRegion" :options="regionOptions" placeholder="Region" class="w-32" />
      <Select v-model="selectedTime" :options="timeOptions" placeholder="Open Time" class="w-32" />
      <div class="flex items-center gap-1">
        <Checkbox v-model="onlyFavorite" id="onlyFavorite" />
        <label for="onlyFavorite" class="text-sm select-none cursor-pointer">Only Favorites</label>
      </div>
    </div>
    <!-- List Area -->
    <TransitionGroup
      name="list"
      tag="div"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-5"
    >
      <Card
        v-for="(item, index) in filteredList"
        :key="item.id"
        v-motion
        :initial="{ opacity: 0, y: 50 }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: {
            delay: 0.3 + index * 0.05,
            duration: 0.6
          }
        }"
        class="relative group overflow-hidden shadow transition-all duration-300 hover:shadow-xl hover:scale-[1.02] rounded-2xl flex flex-col h-full pt-0 pb-3 gap-0 cursor-pointer"
        @click="navigateToDetail(item)"
      >
        <CardContent class="p-0">
          <div class="relative">
            <img :src="item.cover" class="w-full h-40 object-cover rounded-t-2xl transition-all duration-200" alt="cover" />
            <Button
              variant="ghost"
              size="icon"
              class="absolute top-3 right-3 rounded-full bg-white/80 hover:bg-white"
              @click.stop="toggleFavorite(item)"
              :aria-label="item.favorite ? 'Unfavorite' : 'Favorite'"
              v-motion:click="{ scale: [1, 1.2, 1], transition: { duration: 0.3 } }"
            >
              <span class="sr-only">Favorite</span>
              <div class="group relative">
                <Icon :name="item.favorite ? 'ph:heart-fill' : 'ph:heart'" class="text-red-900 transition-transform group-hover:scale-110" />
                <span class="absolute left-1/2 -translate-x-1/2 top-full mt-4 px-2 py-2 text-xs bg-black/80 text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                  {{ item.favorite ? 'Unfavorite' : 'Favorite' }}
                </span>
              </div>
            </Button>
          </div>
        </CardContent>
        
        <CardHeader class="px-4 py-4">
          <CardTitle class="text-lg font-semibold mb-1">{{ item.name }}</CardTitle>
          <CardDescription class="text-gray-500 line-clamp-2">{{ item.desc }}</CardDescription>
        </CardHeader>
        
        <CardFooter class="px-4 pt-0 mt-auto ">
          <div class="w-full">
            <div class="flex gap-4 mb-3 flex-wrap">
              <Badge v-for="tag in item.tags" :key="tag" variant="secondary" class="text-xs py-0.5">{{ tag }}</Badge>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-400">
              <div class="flex items-center gap-1">
                <Icon name="ph:map-pin" class="w-4 h-4" /> {{ item.distance }}km
              </div>
              <div class="flex items-center gap-1">
                <Icon name="ph:star" class="text-yellow-400 w-4 h-4" /> {{ item.rating }}
              </div>
            </div>
          </div>
        </CardFooter>
        
      </Card>
    </TransitionGroup>
    <!-- Empty State -->
    <div
      v-if="filteredList.length === 0"
      class="flex flex-col items-center justify-center h-60"
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 0.5 } }"
    >
      <div class="text-center p-6">
        <Icon name="ph:map-trifold" class="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <Alert variant="default" class="mt-4 text-center">
          <h3 class="font-medium text-lg mb-2">No items found</h3>
          <p class="text-gray-600">Try adjusting your filters or check back later for new tours.</p>
        </Alert>
        <Button class="mt-6 bg-amber-800 text-white hover:bg-amber-700" size="lg">
          <Icon name="ph:compass" class="mr-2 w-5 h-5" />
          Explore Recommended Tours
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { computed, ref } from 'vue'
import { useMotion } from '@vueuse/motion'
import { Alert } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
import { Combobox } from '~/components/ui/combobox'
import { Select } from '~/components/ui/select'
import { useAsyncData } from '#imports'

const typeOptions = [
  { label: 'All', value: '' }, { label: 'Museum', value: 'museum' }, { label: 'Local', value: 'local' }
]
const regionOptions = [
  { label: 'All', value: '' }, { label: 'Downtown', value: 'downtown' }, { label: 'Suburb', value: 'suburb' }
]
const timeOptions = [
  { label: 'Any', value: '' }, { label: 'Open Now', value: 'open' }, { label: 'Morning', value: 'morning' }
]
const onlyFavorite = ref(false)
const selectedType = ref('')
const selectedRegion = ref('')
const selectedTime = ref('')

// Define item type
interface TourItem {
  id: string
  name: string
  cover: string
  desc: string
  tags: string[]
  distance: number
  rating: number
  favorite: boolean
  type: string
  region: string
}

// Load data using useAsyncData
const { data: items, pending, error } = await useAsyncData(
  'tour-items',
  async () => {
    try {
      const data = await $fetch('/data/mock-data/tour-items.json')
      return data as TourItem[]
    } catch (e) {
      console.error('Error fetching tour items with useAsyncData:', e)
      return []
    }
  },
  { 
    default: () => [],
  }
)

// Handle loading error (optional)
if (error.value) {
  console.error('Failed to load tour items:', error.value)
}

const filteredList = computed(() => {
  const currentItems = Array.isArray(items.value) ? items.value : [];
  return currentItems.filter((item: TourItem) =>
    (!selectedType.value || item.type === selectedType.value) &&
    (!selectedRegion.value || item.region === selectedRegion.value) &&
    (!selectedTime.value || selectedTime.value === 'open') && 
    (!onlyFavorite.value || item.favorite)
  )
})

function toggleFavorite(item: TourItem) {
  const targetItem = items.value?.find((i: TourItem) => i.id === item.id);
  if (targetItem) {
     targetItem.favorite = !targetItem.favorite;
  }
}

// Navigate to detail page
function navigateToDetail(item: TourItem) {
  navigateTo('/tour');
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.list-move {
  transition: transform 0.5s ease;
}
</style>
