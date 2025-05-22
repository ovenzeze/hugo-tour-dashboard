<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="flex flex-row items-center justify-between">
      <div>
        <CardTitle>{{ title }}</CardTitle>
        <CardDescription v-if="description">{{ description }}</CardDescription>
      </div>
      <div v-if="filters && filters.length" class="flex items-center space-x-2">
        <Button v-for="filter in filters" 
                :key="filter.value" 
                :variant="activeFilter === filter.value ? 'default' : 'outline'"
                size="sm"
                @click="activeFilter = filter.value">
          {{ filter.label }}
        </Button>
      </div>
    </CardHeader>
    <CardContent class="flex-1 min-h-[200px]" :style="{ height: height }">
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <Icon name="ph:spinner" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="!transformedData || transformedData.length === 0" class="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
      <BarChart
        v-else
        :data="transformedData"
        :index="indexKey"
        :categories="categories"
        :layout="layout"
        :y-formatter="yFormatter"
        :colors="chartColors"
        class="w-full h-full"
      />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Icon } from '#components';
import { computed, ref, watch } from 'vue';
import { Button } from '~/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '~/components/ui/card';
import { BarChart, defaultColors } from '@/components/ui/chart'; // Updated import

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  data: { // This will be Chart.js style data initially
    type: Object,
    required: true
  },
  indexKey: { // New prop: key for the x-axis or main category (e.g., 'month', 'label')
    type: String,
    required: true,
  },
  layout: { // Replaces 'type' prop for bar chart orientation
    type: String as () => 'vertical' | 'horizontal',
    default: 'vertical',
    validator: (value: string) => ['vertical', 'horizontal'].includes(value)
  },
  height: {
    type: String,
    default: '300px'
  },
  // 'options' prop from Chart.js is largely replaced by specific BarChart props
  // We might need to extract specific formatters or other relevant info if needed.
  yFormatter: { // Example: Pass a y-axis formatter if needed by BarChart
    type: Function as PropType<(tick: number | Date, i: number, ticks: (number | Date)[]) => string>,
    default: undefined,
  },
  colors: { // Optional: Pass specific colors for the chart
    type: Array as PropType<string[]>,
    default: undefined
  },
  filters: {
    type: Array as PropType<{label: string, value: string}[]>,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const activeFilter = ref(props.filters.length > 0 ? props.filters[0].value : null);

// Computed property to transform Chart.js data to BarChart data format
const transformedData = computed(() => {
  if (!props.data || !props.data.labels || !props.data.datasets) {
    return [];
  }

  const labels = props.data.labels as string[];
  const datasets = props.data.datasets as { label: string; data: number[]; backgroundColor?: string | string[] }[];

  if (!labels.length || !datasets.length) {
    return [];
  }

  return labels.map((label, i) => {
    const dataPoint: Record<string, string | number> = { [props.indexKey]: label };
    datasets.forEach(dataset => {
      dataPoint[dataset.label] = dataset.data[i];
    });
    return dataPoint;
  });
});

const categories = computed(() => {
  if (!props.data || !props.data.datasets) {
    return [];
  }
  const datasets = props.data.datasets as { label: string; data: number[] }[];
  return datasets.map(dataset => dataset.label);
});

const chartColors = computed(() => {
  if (props.colors) {
    return props.colors;
  }
  if (props.data && props.data.datasets) {
    const datasets = props.data.datasets as { label: string; data: number[]; backgroundColor?: string | string[] }[];
    const bgColors = datasets.map(ds => ds.backgroundColor).filter(c => typeof c === 'string') as string[];
    if (bgColors.length > 0 && bgColors.length === categories.value.length) {
        // Try to use colors from original Chart.js data if available and match category count
        const uniqueBgColors = [...new Set(bgColors)];
        if (uniqueBgColors.length === categories.value.length) {
            return uniqueBgColors;
        }
    }
  }
  return defaultColors(categories.value.length); // Fallback to shadcn-vue default colors
});

// Watch for activeFilter changes if you need to refetch or re-filter data
// This part depends on how `filters` are supposed to interact with the data.
// For now, `activeFilter` is just a local ref.
watch(activeFilter, (newValue) => {
  // console.log('Active filter changed to:', newValue);
  // Implement data filtering/refetching logic here if `filters` prop is used
  // to modify the chart data dynamically.
  // This might involve emitting an event to the parent to reload data with new filter.
});

// No need for Chart.js specific onMounted/onUnmounted/watch for chartInstance
</script>
