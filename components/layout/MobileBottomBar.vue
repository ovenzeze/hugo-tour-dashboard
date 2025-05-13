<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/vue'

const mainLinks = [
  { path: '/dashboard', icon: 'heroicons-outline:chart-bar-square' },
  { path: '/museums', icon: 'heroicons-outline:building-library' },
  { path: '/objects', icon: 'heroicons-outline:archive-box' },
  { path: '/personas', icon: 'heroicons-outline:identification' },
  { path: '/playground', icon: 'heroicons-outline:play' },
  { path: '/users', icon: 'heroicons-outline:users' }
]
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden">
    <div class="flex justify-around py-2">
      <nuxt-link 
        v-for="link in mainLinks"
        :to="link.path"
        class="h-12 w-12"
      >
        <Button variant="ghost" size="icon" class="h-full w-full">
          <Icon :icon="link.icon" class="h-6 w-6" />
        </Button>
      </nuxt-link>
    </div>
  </div>
</template>
