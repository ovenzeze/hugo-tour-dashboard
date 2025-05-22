<script setup lang="ts" generic="T extends Record<string, any>">
import type { BaseChartProps } from '.'
import { type BulletLegendItemInterface, Axis } from '@unovis/ts'
import { VisAxis, VisXYContainer, VisGroupedBar } from '@unovis/vue'
import { useMounted } from '@vueuse/core'
import { useId } from 'reka-ui'
import { type Component, computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import { ChartCrosshair, ChartLegend, defaultColors } from './index'

const props = withDefaults(defineProps<BaseChartProps<T> & {
  /**
   * Render custom tooltip component.
   */
  customTooltip?: Component
  /**
   * Spacing between bars in a group, in percentage of the bar width. E.g. 0.1 means 10% spacing.
   * @default 0.1
   */
  groupPadding?: number
  /**
   * Spacing between groups of bars, in percentage of the bar width. E.g. 0.2 means 20% spacing.
   * @default 0.2
   */
  barPadding?: number
}>(), {
  filterOpacity: 0.2,
  margin: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  showXAxis: true,
  showYAxis: true,
  showTooltip: true,
  showLegend: true,
  showGridLine: true,
  groupPadding: 0.1,
  barPadding: 0.2,
})

const emits = defineEmits<{
  legendItemClick: [d: BulletLegendItemInterface, i: number]
}>()

type KeyOfT = Extract<keyof T, string>
type Data = typeof props.data[number]

const index = computed(() => props.index as KeyOfT)
const colors = computed(() => props.colors?.length ? props.colors : defaultColors(props.categories.length))

const legendItems = ref<BulletLegendItemInterface[]>(props.categories.map((category, i) => ({
  name: category,
  color: colors.value[i],
  inactive: false,
})))

const isMounted = useMounted()

function handleLegendItemClick(d: BulletLegendItemInterface, i: number) {
  emits('legendItemClick', d, i)
}

const yAccessors = computed(() => 
  props.categories.map(category => (d: Data) => d[category])
)

const xAccessor = (d: Data, i: number) => i
</script>

<template>
  <div :class="cn('w-full h-[400px] flex flex-col items-end', $attrs.class ?? '')">
    <ChartLegend v-if="showLegend" v-model:items="legendItems" @legend-item-click="handleLegendItemClick" />

    <VisXYContainer :style="{ height: isMounted ? '100%' : 'auto' }" :margin="{ left: 20, right: 20 }" :data="data">
      <ChartCrosshair v-if="showTooltip" :colors="colors" :items="legendItems" :index="index" :custom-tooltip="customTooltip" />

      <VisGroupedBar 
        :x="xAccessor"
        :y="yAccessors"
        :color="colors"
        :groupPadding="props.groupPadding"
        :barPadding="props.barPadding"
      />

      <VisAxis
        v-if="showXAxis"
        type="x"
        :tick-format="xFormatter ?? ((v: number) => data[v]?.[index])"
        :grid-line="false"
        :tick-line="false"
        tick-text-color="hsl(var(--vis-text-color))"
      />
      <VisAxis
        v-if="showYAxis"
        type="y"
        :tick-line="false"
        :tick-format="yFormatter"
        :domain-line="false"
        :grid-line="showGridLine"
        :attributes="{
          [Axis.selectors.grid]: {
            class: 'text-muted',
          },
        }"
        tick-text-color="hsl(var(--vis-text-color))"
      />

      <slot />
    </VisXYContainer>
  </div>
</template>
