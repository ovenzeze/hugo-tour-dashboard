<template>
  <div class="flex-1 space-y-6 p-4 md:p-8 pt-6">
    <!-- Enhanced Header Section with Better Visual Hierarchy -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p class="text-lg text-muted-foreground font-medium">
          Museum Tour Guide System Overview
        </p>
      </div>
      <div class="flex items-center space-x-3">
        <Button 
          @click="fetchDashboardData" 
          variant="outline" 
          class="gap-2 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
          :disabled="isLoading"
        >
          <Icon 
            name="ph:arrow-counter-clockwise" 
            class="h-4 w-4" 
            :class="{ 'animate-spin': isLoading }"
          />
          <span>{{ isLoading ? 'Refreshing...' : 'Refresh' }}</span>
        </Button>
      </div>
    </div>

    <!-- Enhanced Loading State with Better Animation -->
    <div v-if="isLoading" class="min-h-[400px] flex flex-col items-center justify-center space-y-4">
      <div class="relative">
        <Icon name="ph:spinner" class="h-12 w-12 animate-spin text-primary" />
        <div class="absolute inset-0 h-12 w-12 border-2 border-primary/20 rounded-full animate-pulse"></div>
      </div>
      <p class="text-muted-foreground font-medium animate-pulse">Loading dashboard data...</p>
    </div>

    <!-- Enhanced Error State -->
    <div v-else-if="error" class="min-h-[400px] flex items-center justify-center">
      <div class="text-center space-y-4 p-8 rounded-lg border border-destructive/20 bg-destructive/5">
        <div class="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="ph:warning" class="h-8 w-8 text-destructive" />
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-destructive">Error Loading Dashboard</h3>
          <p class="text-muted-foreground">Unable to fetch dashboard data. Please try again.</p>
        </div>
        <Button variant="outline" size="lg" @click="fetchDashboardData" class="gap-2">
          <Icon name="ph:arrow-counter-clockwise" class="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>

    <!-- Enhanced Main Content with Better Spacing and Visual Effects -->
    <div v-else class="space-y-8">
      <!-- Enhanced Key Metrics Section -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="h-1 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
          <h2 class="text-xl font-semibold text-foreground">Key Metrics</h2>
        </div>
        <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div class="transform hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <MetricCard
              title="Museums"
              :value="keyMetrics.total_museums"
              icon="ph:buildings"
            />
          </div>
          <div class="transform hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <MetricCard
              title="Galleries"
              :value="keyMetrics.total_galleries"
              icon="ph:door-open"
            />
          </div>
          <div class="transform hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <MetricCard
              title="Objects"
              :value="keyMetrics.total_objects"
              icon="ph:image-square"
            />
          </div>
          <div class="transform hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <MetricCard
              title="Audio Guides"
              :value="keyMetrics.total_audios"
              icon="ph:headphones"
            />
          </div>
        </div>
      </div>

      <!-- Enhanced Charts Section with Better Layout -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="h-1 w-8 bg-gradient-to-r from-chart-1 to-chart-2 rounded-full"></div>
          <h2 class="text-xl font-semibold text-foreground">Analytics Overview</h2>
        </div>
        <div class="grid gap-8 grid-cols-1 xl:grid-cols-2">
          <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
            <ChartPanel
              title="Museum Content Distribution"
              description="Statistics of objects, galleries and audio guides per museum"
              :data="museumChartData"
              index-key="label"
              layout="vertical"
              height="380px"
              :y-formatter="(tick, i, ticks) => tick.toString()"
            />
          </div>
          <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
            <ChartPanel
              title="Language Coverage"
              description="Multilingual text and audio content statistics"
              :data="languageChartData"
              index-key="label"
              layout="horizontal"
              height="380px"
              :y-formatter="(tick, i, ticks) => tick.toString()"
            />
          </div>
        </div>
      </div>

      <!-- Enhanced Content and Statistics Section -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="h-1 w-8 bg-gradient-to-r from-chart-3 to-chart-4 rounded-full"></div>
          <h2 class="text-xl font-semibold text-foreground">Recent Activity & Usage</h2>
        </div>
        <div class="grid gap-8 grid-cols-1 xl:grid-cols-2">
          <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
            <ContentTimeline
              title="Recently Added Content"
              description="Recently added or updated museums, objects and audio content"
              :items="recentItems"
              :is-loading="isLoading"
            />
          </div>
          <div class="space-y-6">
            <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
              <Card class="bg-gradient-to-br from-card to-card/50">
                <CardHeader class="pb-4">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-primary/10">
                      <Icon name="ph:user-circle" class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle class="text-lg">Persona Usage Statistics</CardTitle>
                      <CardDescription>Usage statistics for each tour guide persona</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <template v-if="topPersonas && topPersonas.length > 0">
                    <div class="space-y-6">
                      <div 
                        v-for="(persona, index) in topPersonas" 
                        :key="persona.persona_id" 
                        class="group relative p-4 rounded-lg border border-border/50 hover:border-border hover:bg-accent/30 transition-all duration-300"
                        :style="{ animationDelay: `${index * 100}ms` }"
                      >
                        <div class="flex items-center gap-4">
                          <div class="relative">
                            <Avatar class="h-12 w-12 ring-2 ring-border group-hover:ring-primary/50 transition-all duration-300">
                              <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
                              <AvatarFallback class="bg-gradient-to-br from-primary/10 to-primary/5">
                                <Icon name="ph:user-circle" class="h-7 w-7 text-primary/70" />
                              </AvatarFallback>
                            </Avatar>
                            <div class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <span class="text-xs text-primary-foreground font-bold">{{ index + 1 }}</span>
                            </div>
                          </div>
                          <div class="flex-1 space-y-2">
                            <div class="flex items-center justify-between">
                              <h4 class="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                                {{ persona.name }}
                              </h4>
                              <div class="flex items-center gap-3">
                                <span class="text-sm font-medium text-muted-foreground">
                                  {{ persona.total_audios }} audios
                                </span>
                                <Badge variant="secondary" class="text-xs">
                                  {{ persona.museum_count }} museums
                                </Badge>
                              </div>
                            </div>
                            <div class="space-y-2">
                              <div class="flex justify-between text-sm">
                                <span class="text-muted-foreground">Usage Progress</span>
                                <span class="font-medium text-primary">
                                  {{ maxPersonaAudios > 0 ? Math.round((persona.total_audios / maxPersonaAudios) * 100) : 0 }}%
                                </span>
                              </div>
                              <div class="h-2 rounded-full bg-secondary/50 overflow-hidden">
                                <div 
                                  class="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out" 
                                  :style="{ 
                                    width: maxPersonaAudios > 0 ? `${(persona.total_audios / maxPersonaAudios) * 100}%` : '0%',
                                    animationDelay: `${index * 200}ms`
                                  }" 
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-center py-12">
                      <div class="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <Icon name="ph:user-circle" class="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p class="text-muted-foreground font-medium">No persona data available</p>
                      <p class="text-sm text-muted-foreground/70 mt-1">Create personas to see usage statistics</p>
                    </div>
                  </template>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Quick Access Section -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="h-1 w-8 bg-gradient-to-r from-chart-5 to-primary rounded-full"></div>
          <h2 class="text-xl font-semibold text-foreground">Quick Access</h2>
        </div>
        <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div 
            v-for="(item, index) in quickAccessItems"
            :key="item.title"
            class="transform hover:scale-105 transition-all duration-300"
            :style="{ animationDelay: `${index * 100}ms` }"
          >
            <QuickAccessCard
              :title="item.title"
              :icon="item.icon"
              :route="item.route"
              :count="item.count"
            />
          </div>
        </div>
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
import { Badge } from '~/components/ui/badge'

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
