<template>
  <div class="flex flex-col items-center justify-center h-full py-20 text-center">
    <Icon name="ph:hourglass" class="w-16 h-16 mb-6 text-muted-foreground animate-pulse" />
    <h2 class="text-2xl font-semibold mb-2">{{ module }} Coming Soon</h2>
    <p class="text-muted-foreground">This module is not yet implemented. Please wait for future updates.</p>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import { Icon } from '@iconify/vue'

defineProps<{ module: string }>()
</script>
