<template>
  <div class="flex-1 space-y-6 p-4 md:p-6 pt-4">
    <!-- Compact Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p class="text-muted-foreground">
          Museum Tour Guide System Overview
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <Button 
          @click="fetchDashboardData" 
          variant="outline" 
          size="sm"
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

    <!-- Loading State -->
    <div v-if="isLoading" class="min-h-[300px] flex flex-col items-center justify-center space-y-3">
      <div class="relative">
        <Icon name="ph:spinner" class="h-10 w-10 animate-spin text-primary" />
        <div class="absolute inset-0 h-10 w-10 border-2 border-primary/20 rounded-full animate-pulse"></div>
      </div>
      <p class="text-muted-foreground font-medium animate-pulse">Loading dashboard data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="min-h-[300px] flex items-center justify-center">
      <div class="text-center space-y-3 p-6 rounded-lg border border-destructive/20 bg-destructive/5">
        <div class="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="ph:warning" class="h-6 w-6 text-destructive" />
        </div>
        <div class="space-y-2">
          <h3 class="font-semibold text-destructive">Error Loading Dashboard</h3>
          <p class="text-sm text-muted-foreground">Unable to fetch dashboard data. Please try again.</p>
        </div>
        <Button variant="outline" @click="fetchDashboardData" class="gap-2">
          <Icon name="ph:arrow-counter-clockwise" class="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>

    <!-- Main Content with Denser Layout -->
    <div v-else class="space-y-6">
      <!-- Key Metrics Section - More Compact -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <div class="h-1 w-6 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
          <h2 class="text-lg font-semibold text-foreground">Key Metrics</h2>
        </div>
        <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      <!-- Two Column Layout for Better Space Utilization -->
      <div class="grid gap-6 grid-cols-1 xl:grid-cols-3">
        <!-- Left Column - Charts (2/3 width) -->
        <div class="xl:col-span-2 space-y-6">
          <!-- Charts Section -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-1 w-6 bg-gradient-to-r from-chart-1 to-chart-2 rounded-full"></div>
              <h2 class="text-lg font-semibold text-foreground">Analytics Overview</h2>
            </div>
            <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
                <ChartPanel
                  title="Museum Distribution"
                  description="Content statistics per museum"
                  :data="museumChartData"
                  index-key="label"
                  layout="vertical"
                  height="320px"
                  :y-formatter="(tick, i, ticks) => tick.toString()"
                />
              </div>
              <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
                <ChartPanel
                  title="Language Coverage"
                  description="Multilingual content statistics"
                  :data="languageChartData"
                  index-key="label"
                  layout="horizontal"
                  height="320px"
                  :y-formatter="(tick, i, ticks) => tick.toString()"
                />
              </div>
            </div>
          </div>

          <!-- Quick Access Cards - More Compact -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-1 w-6 bg-gradient-to-r from-chart-5 to-primary rounded-full"></div>
              <h2 class="text-lg font-semibold text-foreground">Quick Access</h2>
            </div>
            <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div 
                v-for="(item, index) in quickAccessItems"
                :key="item.title"
                class="transform hover:scale-105 transition-all duration-300"
                :style="{ animationDelay: `${index * 50}ms` }"
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

        <!-- Right Column - Activity & Stats (1/3 width) -->
        <div class="space-y-6">
          <!-- Recent Activity Timeline -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-1 w-6 bg-gradient-to-r from-chart-3 to-chart-4 rounded-full"></div>
              <h2 class="text-lg font-semibold text-foreground">Recent Activity</h2>
            </div>
            <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
              <ContentTimeline
                title="Latest Updates"
                description="Recently added content"
                :items="recentItems"
                :is-loading="isLoading"
              />
            </div>
          </div>

          <!-- Persona Usage Statistics -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-1 w-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <h2 class="text-lg font-semibold text-foreground">Top Personas</h2>
            </div>
            <div class="transform hover:shadow-lg transition-all duration-300 rounded-lg overflow-hidden">
              <Card class="bg-gradient-to-br from-card to-card/50">
                <CardHeader class="pb-3">
                  <div class="flex items-center gap-2">
                    <div class="p-1.5 rounded-lg bg-primary/10">
                      <Icon name="ph:user-circle" class="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle class="text-base">Persona Usage</CardTitle>
                      <CardDescription class="text-xs">Top performing tour guides</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="pt-0">
                  <template v-if="topPersonas && topPersonas.length > 0">
                    <div class="space-y-3">
                      <div 
                        v-for="(persona, index) in topPersonas.slice(0, 5)" 
                        :key="persona.persona_id" 
                        class="group relative p-3 rounded-lg border border-border/50 hover:border-border hover:bg-accent/30 transition-all duration-300"
                        :style="{ animationDelay: `${index * 80}ms` }"
                      >
                        <div class="flex items-center gap-3">
                          <div class="relative">
                            <Avatar class="h-10 w-10 ring-2 ring-border group-hover:ring-primary/50 transition-all duration-300">
                              <AvatarImage v-if="persona.avatar_url" :src="persona.avatar_url" :alt="persona.name" />
                              <AvatarFallback class="bg-gradient-to-br from-primary/10 to-primary/5 text-xs">
                                <Icon name="ph:user-circle" class="h-5 w-5 text-primary/70" />
                              </AvatarFallback>
                            </Avatar>
                            <div class="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                              <span class="text-xs text-primary-foreground font-bold leading-none">{{ index + 1 }}</span>
                            </div>
                          </div>
                          <div class="flex-1 space-y-1.5 min-w-0">
                            <div class="flex items-center justify-between">
                              <h4 class="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                                {{ persona.name }}
                              </h4>
                              <span class="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {{ persona.total_audios }}
                              </span>
                            </div>
                            <div class="flex justify-between text-xs">
                              <span class="text-muted-foreground">{{ persona.museum_count }} museums</span>
                              <span class="font-medium text-primary">
                                {{ maxPersonaAudios > 0 ? Math.round((persona.total_audios / maxPersonaAudios) * 100) : 0 }}%
                              </span>
                            </div>
                            <div class="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                              <div 
                                class="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000 ease-out" 
                                :style="{ 
                                  width: maxPersonaAudios > 0 ? `${(persona.total_audios / maxPersonaAudios) * 100}%` : '0%',
                                  animationDelay: `${index * 150}ms`
                                }" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-center py-8">
                      <div class="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <Icon name="ph:user-circle" class="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p class="text-sm text-muted-foreground font-medium">No persona data available</p>
                      <p class="text-xs text-muted-foreground/70 mt-1">Create personas to see usage statistics</p>
                    </div>
                  </template>
                </CardContent>
              </Card>
            </div>
          </div>

          <!-- Content Summary Card -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-1 w-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              <h2 class="text-lg font-semibold text-foreground">Content Summary</h2>
            </div>
            <Card class="bg-gradient-to-br from-card to-card/50">
              <CardHeader class="pb-3">
                <div class="flex items-center gap-2">
                  <div class="p-1.5 rounded-lg bg-blue-100">
                    <Icon name="ph:chart-pie" class="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle class="text-base">Content Statistics</CardTitle>
                </div>
              </CardHeader>
              <CardContent class="pt-0 space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <div class="text-lg font-bold text-blue-700">{{ keyMetrics.total_museums || 0 }}</div>
                    <div class="text-xs text-blue-600">Museums</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-teal-50 border border-teal-100">
                    <div class="text-lg font-bold text-teal-700">{{ keyMetrics.total_galleries || 0 }}</div>
                    <div class="text-xs text-teal-600">Galleries</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div class="text-lg font-bold text-amber-700">{{ keyMetrics.total_objects || 0 }}</div>
                    <div class="text-xs text-amber-600">Objects</div>
                  </div>
                  <div class="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
                    <div class="text-lg font-bold text-purple-700">{{ keyMetrics.total_audios || 0 }}</div>
                    <div class="text-xs text-purple-600">Audio Guides</div>
                  </div>
                </div>
                <div class="pt-2 border-t border-border/50 space-y-2">
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-muted-foreground">Completion Rate</span>
                    <span class="font-medium text-green-600">
                      {{ keyMetrics.total_objects > 0 ? Math.round((keyMetrics.total_audios / keyMetrics.total_objects) * 100) : 0 }}%
                    </span>
                  </div>
                  <div class="h-2 rounded-full bg-secondary/50 overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000 ease-out"
                      :style="{ 
                        width: keyMetrics.total_objects > 0 ? `${Math.min(100, (keyMetrics.total_audios / keyMetrics.total_objects) * 100)}%` : '0%'
                      }"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- System Status Card -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-1 w-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              <h2 class="text-lg font-semibold text-foreground">System Status</h2>
            </div>
            <Card class="bg-gradient-to-br from-card to-card/50">
              <CardHeader class="pb-3">
                <div class="flex items-center gap-2">
                  <div class="p-1.5 rounded-lg bg-green-100">
                    <Icon name="ph:check-circle" class="h-4 w-4 text-green-600" />
                  </div>
                  <CardTitle class="text-base">All Systems Operational</CardTitle>
                </div>
              </CardHeader>
              <CardContent class="pt-0 space-y-3">
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Database</span>
                    <div class="flex items-center gap-1">
                      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span class="text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">Storage</span>
                    <div class="flex items-center gap-1">
                      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span class="text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">TTS Service</span>
                    <div class="flex items-center gap-1">
                      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span class="text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                </div>
                <div class="pt-2 border-t border-border/50">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground">Last checked</span>
                    <span class="text-muted-foreground">{{ new Date().toLocaleTimeString() }}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
