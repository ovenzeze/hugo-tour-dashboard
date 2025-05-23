<template>
  <NuxtLink :to="route" class="block group">
    <Card class="h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-border/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/50 overflow-hidden relative">
      <!-- Hover effect background -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <CardContent class="relative p-6 flex flex-col items-center text-center space-y-4">
        <div class="relative">
          <div class="rounded-xl p-4 bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/15 group-hover:to-primary/10 transition-all duration-300 transform group-hover:scale-110">
            <Icon :name="icon" class="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
          </div>
          <!-- Pulse effect -->
          <div class="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
        </div>
        
        <div class="space-y-2">
          <CardTitle class="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
            {{ title }}
          </CardTitle>
          
          <div v-if="count !== undefined && count !== null" class="flex items-center justify-center">
            <Badge 
              variant="secondary" 
              class="text-sm font-medium bg-secondary/50 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300"
            >
              {{ formatCount(count) }}
            </Badge>
          </div>
        </div>
        
        <!-- Arrow indicator -->
        <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
          <Icon name="ph:arrow-right" class="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardTitle } from '~/components/ui/card'

defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  route: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: null
  }
})

// Format count with proper number formatting
function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}
</script>
