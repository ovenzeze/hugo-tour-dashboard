<template>
  <div class="flex-1 space-y-4 p-4 md:p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p class="text-muted-foreground">
          Museum Tour Guide System Overview
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <Button @click="fetchDashboardData" variant="outline" class="gap-1.5">
          <Icon name="ph:arrow-counter-clockwise" class="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="min-h-[200px] flex items-center justify-center">
      <Icon name="ph:spinner" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="min-h-[200px] flex items-center justify-center">
      <div class="text-center space-y-2">
        <Icon name="ph:warning" class="h-8 w-8 text-destructive mx-auto" />
        <p class="text-muted-foreground">Error loading data</p>
        <Button variant="outline" size="sm" @click="fetchDashboardData">Retry</Button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div v-else class="space-y-6">
      <!-- Key Metrics Section -->
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Museums"
          :value="keyMetrics.total_museums"
          icon="ph:buildings"
        />
        <MetricCard
          title="Galleries"
          :value="keyMetrics.total_galleries"
          icon="ph:door-open"
        />
        <MetricCard
          title="Objects"
          :value="keyMetrics.total_objects"
          icon="ph:image-square"
        />
        <MetricCard
          title="Audio Guides"
          :value="keyMetrics.total_audios"
          icon="ph:headphones"
        />
      </div>

      <!-- Charts Section - Museum Distribution and Language Coverage -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ChartPanel
          title="Museum Content Distribution"
          description="Statistics of objects, galleries and audio guides per museum"
          :data="museumChartData"
          index-key="label"
          layout="vertical"
          height="350px"
          :y-formatter="(value: number) => value.toString()"
        />
        <ChartPanel
          title="Language Coverage"
          description="Multilingual text and audio content statistics"
          :data="languageChartData"
          index-key="label"
          layout="horizontal"
          height="350px"
          :y-formatter="(value: number) => value.toString()"
        />
      </div>

      <!-- Recent Content and Persona Usage Statistics -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ContentTimeline
          title="Recently Added Content"
          description="Recently added or updated museums, objects and audio content"
          :items="recentItems"
          :is-loading="isLoading"
        />
        <div class="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Persona Usage Statistics</CardTitle>
              <CardDescription>Usage statistics for each tour guide persona</CardDescription>
            </CardHeader>
            <CardContent>
              <template v-if="topPersonas && topPersonas.length > 0">
                <div class="space-y-4">
                  <div v-for="persona in topPersonas" :key="persona.persona_id" class="flex items-center gap-4">
                    <Avatar class="h-9 w-9">
                      <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
                      <AvatarFallback>
                        <Icon name="ph:user-circle" class="h-6 w-6 text-muted-foreground/70" />
                      </AvatarFallback>
                    </Avatar>
                    <div class="flex-1 space-y-1">
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-medium leading-none">{{ persona.name }}</p>
                        <span class="text-sm text-muted-foreground">{{ persona.total_audios }} audios</span>
                      </div>
                      <div class="text-xs text-muted-foreground">{{ persona.museum_count }} museums</div>
                      <div class="h-2 rounded-full bg-secondary overflow-hidden">
                        <div 
                          class="h-full bg-primary" 
                          :style="{ width: maxPersonaAudios > 0 ? `${(persona.total_audios / maxPersonaAudios) * 100}%` : '0%' }" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="text-center text-muted-foreground py-4">
                  <p>No persona data available</p>
                </div>
              </template>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Quick Access Section -->
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAccessCard
          v-for="item in quickAccessItems"
          :key="item.title"
          :title="item.title"
          :icon="item.icon"
          :route="item.route"
          :count="item.count"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#components'
import { computed, onMounted } from 'vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

// 导入 Dashboard 组件
import ChartPanel from '~/components/dashboard/ChartPanel.vue'
import ContentTimeline from '~/components/dashboard/ContentTimeline.vue'
import MetricCard from '~/components/dashboard/MetricCard.vue'
import QuickAccessCard from '~/components/dashboard/QuickAccessCard.vue'

import { useDashboardData } from '~/composables/useDashboardData'

interface PersonaStats {
  persona_id: number
  name: string
  avatar_url?: string
  total_audios: number
  museum_count: number
}

interface QuickAccessItem {
  title: string
  icon: string
  route: string
  count: number
}

// 获取数据
const {
  fetchDashboardData,
  dashboardData,
  isLoading,
  error,
  keyMetrics,
  recentItems,
  topMuseums,
  languageStats,
  topPersonas,
  museumChartData,
  languageChartData,
} = useDashboardData()

// 获取最大音频数用于进度条计算
const maxPersonaAudios = computed(() => {
  if (!topPersonas.value?.length) return 0
  const maxAudios = Math.max(...topPersonas.value.map((p: PersonaStats) => p.total_audios))
  return maxAudios > 0 ? maxAudios : 0; // Ensure it's not negative if all audios are 0
})

// 快速访问项
const quickAccessItems = computed<QuickAccessItem[]>(() => [
  {
    title: "Museum Management",
    icon: "ph:buildings",
    route: "/museums",
    count: keyMetrics.value?.total_museums || 0,
  },
  {
    title: "Gallery Management",
    icon: "ph:door-open",
    route: "/galleries",
    count: keyMetrics.value?.total_galleries || 0,
  },
  {
    title: "Object Management",
    icon: "ph:image-square",
    route: "/objects",
    count: keyMetrics.value?.total_objects || 0,
  },
  {
    title: "Persona Management",
    icon: "ph:user",
    route: "/personas",
    count: topPersonas.value?.length || 0, // Use length of topPersonas array
  },
])

// 页面元数据
definePageMeta({
  title: 'Dashboard'
})

// 页面加载时获取数据
onMounted(() => {
  fetchDashboardData()
})
</script>
