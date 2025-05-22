<template>
  <Card class="overflow-hidden h-full">
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-sm font-medium">{{ title }}</CardTitle>
      <Icon :name="icon" class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div class="text-2xl font-bold">{{ formattedValue }}</div>
      <div v-if="change !== undefined" class="text-xs text-muted-foreground flex items-center space-x-1">
        <Icon 
          :name="change >= 0 ? 'ph:arrow-up' : 'ph:arrow-down'" 
          class="h-3 w-3" 
          :class="change >= 0 ? 'text-emerald-500' : 'text-rose-500'" 
        />
        <span :class="change >= 0 ? 'text-emerald-500' : 'text-rose-500'">
          {{ Math.abs(change).toFixed(1) }}%
        </span>
        <span>from {{ compareLabel }}</span>
      </div>
      <div v-if="secondaryValue" class="mt-2 pt-2 border-t text-xs text-muted-foreground">
        {{ secondaryLabel }}: <span class="font-medium">{{ secondaryValue }}</span>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  change: {
    type: Number,
    default: undefined
  },
  compareLabel: {
    type: String,
    default: 'last period'
  },
  secondaryValue: {
    type: [Number, String],
    default: null
  },
  secondaryLabel: {
    type: String,
    default: 'Total'
  },
  formatter: {
    type: Function,
    default: null
  }
})

// Format value based on its type or using a custom formatter
const formattedValue = computed(() => {
  if (props.formatter) {
    return props.formatter(props.value)
  }
  
  if (typeof props.value === 'number') {
    // Format with commas for thousands
    return new Intl.NumberFormat().format(props.value)
  }
  
  return props.value
})
</script>
