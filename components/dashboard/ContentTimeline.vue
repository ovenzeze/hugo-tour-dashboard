<template>
  <Card class="h-full bg-gradient-to-br from-card to-card/80 border-border/50">
    <CardHeader class="pb-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-primary/10">
          <Icon name="ph:clock" class="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle class="text-lg">{{ title }}</CardTitle>
          <CardDescription v-if="description">{{ description }}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="p-0 overflow-auto max-h-[360px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="flex flex-col items-center space-y-3">
          <Icon name="ph:spinner" class="h-8 w-8 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">Loading recent content...</p>
        </div>
      </div>
      <div v-else-if="!items || items.length === 0" class="flex items-center justify-center py-12 text-muted-foreground">
        <div class="text-center space-y-3">
          <div class="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Icon name="ph:files" class="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p class="font-medium">No recent content available</p>
            <p class="text-sm text-muted-foreground/70">Content will appear here once added</p>
          </div>
        </div>
      </div>
      <div v-else class="relative">
        <!-- Timeline line -->
        <div class="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-border via-border to-transparent"></div>
        
        <div class="space-y-1">
          <div 
            v-for="(item, index) in items" 
            :key="item.id || `${item.content_type}-${item.name}`" 
            class="relative group hover:bg-accent/30 transition-all duration-300 cursor-pointer"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <div class="flex items-start gap-4 p-4">
              <!-- Timeline dot -->
              <div class="relative flex-shrink-0 z-10">
                <div 
                  class="rounded-full p-2.5 shadow-sm border-2 border-background group-hover:scale-110 transition-all duration-300" 
                  :class="getIconBgColor(item.content_type)"
                >
                  <Icon :name="getIcon(item.content_type)" class="h-4 w-4 text-white" />
                </div>
                <!-- Pulse effect -->
                <div 
                  class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 animate-ping transition-opacity duration-300"
                  :class="getIconBgColor(item.content_type)"
                ></div>
              </div>
              
              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex justify-between items-start gap-3">
                  <h4 class="font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
                    {{ item.name }}
                  </h4>
                  <time class="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Icon name="ph:clock" class="h-3 w-3" />
                    {{ formatTime(item.created_at) }}
                  </time>
                </div>
                
                <p class="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {{ item.description }}
                </p>
                
                <div class="flex items-center justify-between">
                  <div v-if="item.museum_name" class="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                    <Icon name="ph:buildings" class="h-3 w-3" />
                    <span>{{ item.museum_name }}</span>
                  </div>
                  
                  <div class="flex items-center gap-1">
                    <span 
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
                      :class="getTypeStyle(item.content_type)"
                    >
                      <Icon :name="getIcon(item.content_type)" class="h-3 w-3" />
                      {{ getContentTypeLabel(item.content_type) }}
                    </span>
                  </div>
                </div>
              </div>
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
function getIcon(contentType: string): string {
  const icons: Record<string, string> = {
    museum: 'ph:buildings',
    gallery: 'ph:door-open',
    object: 'ph:image-square',
    audio: 'ph:headphones',
    text: 'ph:file-text',
    default: 'ph:circle'
  }
  return icons[contentType] || icons.default
}

// Get background color for icon based on content type
function getIconBgColor(contentType: string): string {
  const colors: Record<string, string> = {
    museum: 'bg-blue-600',
    gallery: 'bg-teal-600',
    object: 'bg-amber-600',
    audio: 'bg-purple-600',
    text: 'bg-indigo-600',
    default: 'bg-gray-600'
  }
  return colors[contentType] || colors.default
}

// Get type style for badge
function getTypeStyle(contentType: string): string {
  const styles: Record<string, string> = {
    museum: 'bg-blue-50 text-blue-700 border-blue-200',
    gallery: 'bg-teal-50 text-teal-700 border-teal-200',
    object: 'bg-amber-50 text-amber-700 border-amber-200',
    audio: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    default: 'bg-gray-50 text-gray-700 border-gray-200'
  }
  return styles[contentType] || styles.default
}

// Get content type label
function getContentTypeLabel(contentType: string): string {
  const labels: Record<string, string> = {
    museum: 'Museum',
    gallery: 'Gallery',
    object: 'Object',
    audio: 'Audio',
    text: 'Text',
    default: 'Content'
  }
  return labels[contentType] || labels.default
}

// Format timestamp
function formatTime(timestamp: string): string {
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

<style scoped>
/* Custom scrollbar styles */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--border) / 0.8);
}
</style>
