<template>
  <div class="flex-1 space-y-4 p-4 md:p-8 pt-6">
    <div class="flex items-center justify-between space-y-2">
      <div>
        <h2 class="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p class="text-muted-foreground">
          博物馆导览系统总览
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <Button @click="fetchDashboardData" variant="outline" class="gap-1.5">
          <Icon name="ph:arrow-counter-clockwise" class="h-4 w-4" />
          <span>刷新</span>
        </Button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="min-h-[200px] flex items-center justify-center">
      <Icon name="ph:spinner" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="min-h-[200px] flex items-center justify-center">
      <div class="text-center space-y-2">
        <Icon name="ph:warning" class="h-8 w-8 text-destructive mx-auto" />
        <p class="text-muted-foreground">加载数据时出错</p>
        <Button variant="outline" size="sm" @click="fetchDashboardData">重试</Button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div v-else class="space-y-6">
      <!-- 关键指标区 -->
      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="博物馆"
          :value="keyMetrics.total_museums"
          icon="ph:buildings"
        />
        <MetricCard
          title="展厅"
          :value="keyMetrics.total_galleries"
          icon="ph:door-open"
        />
        <MetricCard
          title="展品"
          :value="keyMetrics.total_objects"
          icon="ph:image-square"
        />
        <MetricCard
          title="导览音频"
          :value="keyMetrics.total_audios"
          icon="ph:headphones"
        />
      </div>

      <!-- 图表区域 - 博物馆分布和语言覆盖 -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ChartPanel
          title="博物馆内容分布"
          description="各博物馆的展品、展厅和导览音频数量统计"
          :data="museumChartData"
          index-key="label"
          layout="vertical"
          height="350px"
          :y-formatter="(value: number) => value.toString()"
        />
        <ChartPanel
          title="语言覆盖率"
          description="多语言文本和音频内容统计"
          :data="languageChartData"
          index-key="label"
          layout="horizontal"
          height="350px"
          :y-formatter="(value: number) => value.toString()"
        />
      </div>

      <!-- 最近内容和角色使用统计 -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ContentTimeline
          title="最新添加内容"
          description="最近添加或更新的博物馆、展品和音频内容"
          :items="recentItems"
          :is-loading="isLoading"
        />
        <div class="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>角色使用统计</CardTitle>
              <CardDescription>各导览角色的使用情况</CardDescription>
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
                        <span class="text-sm text-muted-foreground">{{ persona.total_audios }}个音频</span>
                      </div>
                      <div class="text-xs text-muted-foreground">{{ persona.museum_count }}个博物馆</div>
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
                  <p>暂无角色数据</p>
                </div>
              </template>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- 快速访问区域 -->
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
    title: "博物馆管理",
    icon: "ph:buildings",
    route: "/museums",
    count: keyMetrics.value?.total_museums || 0,
  },
  {
    title: "展厅管理",
    icon: "ph:door-open",
    route: "/galleries",
    count: keyMetrics.value?.total_galleries || 0,
  },
  {
    title: "展品管理",
    icon: "ph:image-square",
    route: "/objects",
    count: keyMetrics.value?.total_objects || 0,
  },
  {
    title: "角色管理",
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
