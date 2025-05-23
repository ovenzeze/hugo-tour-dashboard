<template>
  <Card class="overflow-hidden h-full bg-gradient-to-br from-card to-card/80 border-border/50 hover:border-border transition-all duration-300 hover:shadow-md group">
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle class="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
        {{ title }}
      </CardTitle>
      <div class="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-all duration-300">
        <Icon :name="icon" class="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent class="pb-4">
      <div class="text-3xl font-bold tracking-tight text-foreground mb-2">{{ formattedValue }}</div>
      <div v-if="change !== undefined" class="text-xs flex items-center space-x-1.5">
        <div class="flex items-center space-x-1" :class="change >= 0 ? 'text-emerald-600' : 'text-rose-600'">
          <Icon 
            :name="change >= 0 ? 'ph:trend-up' : 'ph:trend-down'" 
            class="h-3 w-3" 
          />
          <span class="font-medium">
            {{ Math.abs(change).toFixed(1) }}%
          </span>
        </div>
        <span class="text-muted-foreground">from {{ compareLabel }}</span>
      </div>
      <div v-if="secondaryValue" class="mt-3 pt-3 border-t border-border/50 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-muted-foreground">{{ secondaryLabel }}</span>
          <span class="font-medium text-foreground">{{ secondaryValue }}</span>
        </div>
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
