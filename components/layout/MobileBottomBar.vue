<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/vue'

const mainLinks = [
  { path: '/dashboard', icon: 'ph:chart-bar' },
  { path: '/museums', icon: 'ph:bank' },
  { path: '/guide-texts', icon: 'ph:article' },
  { path: '/users', icon: 'ph:users-three' }
]
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden">
    <div class="flex justify-around py-2">
      <Button 
        v-for="link in mainLinks"
        variant="ghost"
        size="icon"
        class="h-12 w-12"
        @click="navigateTo(link.path)"
      >
        <Icon :icon="link.icon" class="h-6 w-6" />
      </Button>
    </div>
  </div>
</template>
