<template>
  <Card class="h-full">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription v-if="description">{{ description }}</CardDescription>
    </CardHeader>
    <CardContent class="p-0 overflow-auto max-h-[400px]">
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <Icon name="ph:spinner" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="!items || items.length === 0" class="flex items-center justify-center py-8 text-muted-foreground">
        No recent content available
      </div>
      <div v-else class="divide-y">
        <div v-for="item in items" :key="item.id || `${item.content_type}-${item.name}`" 
             class="p-4 hover:bg-gray-50 transition-colors">
          <div class="flex items-start gap-2">
            <div class="rounded-full p-2 flex-shrink-0" :class="getIconBgColor(item.content_type)">
              <Icon :name="getIcon(item.content_type)" class="h-4 w-4 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <p class="font-medium text-sm truncate">{{ item.name }}</p>
                <time class="text-xs text-gray-500">{{ formatTime(item.created_at) }}</time>
              </div>
              <p class="text-sm text-gray-600 line-clamp-2">{{ item.description }}</p>
              <p v-if="item.museum_name" class="text-xs text-gray-500 mt-1">
                {{ item.museum_name }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { format, formatDistance } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

// Get icon name based on content type
function getIcon(contentType) {
  switch(contentType) {
    case 'museum':
      return 'ph:buildings'
    case 'gallery':
      return 'ph:door-open'
    case 'object':
      return 'ph:image-square'
    case 'audio':
      return 'ph:headphones'
    case 'text':
      return 'ph:file-text'
    default:
      return 'ph:circle'
  }
}

// Get background color for icon based on content type
function getIconBgColor(contentType) {
  switch(contentType) {
    case 'museum':
      return 'bg-blue-600'
    case 'gallery':
      return 'bg-teal-600'
    case 'object':
      return 'bg-amber-600'
    case 'audio':
      return 'bg-purple-600'
    case 'text':
      return 'bg-indigo-600'
    default:
      return 'bg-gray-600'
  }
}

// Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return ''
  
  try {
    const date = new Date(timestamp)
    
    // If it's recent (within 7 days), show relative time
    const diffInDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 7) {
      return formatDistance(date, new Date(), { addSuffix: true })
    }
    
    // Otherwise show formatted date
    return format(date, 'MMM d, yyyy')
  } catch (err) {
    console.error('Error formatting timestamp:', err)
    return timestamp
  }
}
</script>
