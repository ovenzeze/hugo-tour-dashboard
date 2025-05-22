<template>
  <NuxtLink :to="route" class="block">
    <Card class="h-full transition-all duration-200 hover:shadow-md hover:translate-y-[-2px]">
      <CardContent class="p-4 flex flex-col items-center text-center">
        <div class="rounded-full p-3 bg-primary/10 mb-3">
          <Icon :name="icon" class="h-5 w-5 text-primary" />
        </div>
        <CardTitle class="text-sm mb-1">{{ title }}</CardTitle>
        <Badge v-if="count !== undefined && count !== null" variant="secondary">
          {{ count }}
        </Badge>
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
</script>
