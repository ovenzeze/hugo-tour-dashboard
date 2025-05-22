# Hugo Tour Dashboard 设计方案

## 主题与核心理念

Hugo Tour Dashboard 是为博物馆导览系统设计的管理中心，基于现有数据库结构和应用程序设计，专注于提供综合性的系统状态概览和内容管理入口。本设计以**"内容为中心的数据驱动管理平台"**为核心理念，旨在帮助管理员高效地监控系统状态、管理内容资源，并从数据中获得洞察。

## 设计目标

1. **直观的数据可视化** - 清晰展示关键指标与系统状态
2. **高效的内容管理** - 集中展示博物馆、展厅和展品的统计信息
3. **资源利用监控** - 跟踪音频资源使用情况与语言支持覆盖率
4. **一目了然的最新活动** - 显示最新添加和更新的内容

## Dashboard 页面结构

Dashboard 页面将采用卡片式布局，分为以下几个主要区域：

### 1. 顶部总览区 (Key Metrics)

4-6 个关键指标卡片，呈现系统的核心数据：

- 博物馆总数
- 展厅总数
- 展品总数
- 导览音频总数
- 支持语言数
- 总音频时长

每个卡片展示当前值以及与上一时期的变化百分比，通过趋势图标直观表示增长或减少。

### 2. 博物馆内容分布图 (Museum Content Distribution)

使用组合图表展示博物馆资源分布情况：

- 主图：展示各博物馆的展品、展厅和音频数量
- 迷你圆环图：显示整体资源在各博物馆间的分布比例
- 可筛选：按城市、国家或其他属性筛选

### 3. 内容语言覆盖率 (Language Coverage)

展示多语言支持情况：

- 水平条形图：按语言显示文本和音频数量
- 热力图：展示语言与博物馆的覆盖矩阵
- 完成度指标：显示各语言内容完成度

### 4. 最新添加内容 (Recent Content)

以时间线形式展示最近添加或更新的内容：

- 博物馆新增
- 展品添加
- 音频生成
- 文本更新

### 5. 角色使用统计 (Persona Usage)

展示各导览角色的使用情况：

- 按角色统计的音频数量
- 按角色统计的总时长
- 各角色支持的语言

### 6. 快速访问链接 (Quick Access)

提供对系统其他功能区域的快速访问：

- 博物馆管理
- 展品管理
- 音频生成
- 角色管理
- 系统设置

## 交互设计

整个 Dashboard 将采用以下交互方式：

1. **实时更新** - 关键指标自动更新
2. **日期范围选择** - 可选择不同时间范围查看数据
3. **下钻功能** - 从总体数据点击进入详细视图
4. **过滤与排序** - 灵活调整数据展示方式
5. **导出功能** - 将数据导出为 CSV 或 PDF 报告

## 视觉设计

采用现有应用的设计系统和组件，确保视觉一致性：

1. **配色方案** - 使用中性底色搭配强调色突出重要信息
2. **卡片设计** - 统一的圆角、阴影和内边距
3. **动画效果** - 适度的过渡动画提升用户体验
4. **响应式布局** - 自适应不同屏幕尺寸

## 技术实现

### 数据获取

利用专门设计的 SQL 视图 (`dashboard_combined_view`) 一次性获取所有所需数据：

```typescript
// composables/useDashboardData.ts
import { ref, computed } from "vue";
import { useSupabaseClient } from "@nuxtjs/supabase";

export function useDashboardData() {
  const supabase = useSupabaseClient();
  const dashboardData = ref(null);
  const isLoading = ref(true);
  const error = ref(null);

  const fetchDashboardData = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: err } = await supabase
        .from("dashboard_combined_view")
        .select("*")
        .single();

      if (err) throw err;

      dashboardData.value = data.dashboard_data;
    } catch (err) {
      console.error("获取 Dashboard 数据失败:", err);
      error.value = err;
    } finally {
      isLoading.value = false;
    }
  };

  // 各部分数据的计算属性
  const keyMetrics = computed(() => dashboardData.value?.overall_stats || {});
  const recentItems = computed(() => dashboardData.value?.recent_items || []);
  const topMuseums = computed(() => dashboardData.value?.top_museums || []);
  const languageStats = computed(
    () => dashboardData.value?.language_stats || []
  );
  const topPersonas = computed(() => dashboardData.value?.top_personas || []);

  return {
    fetchDashboardData,
    dashboardData,
    isLoading,
    error,
    keyMetrics,
    recentItems,
    topMuseums,
    languageStats,
    topPersonas,
  };
}
```

### 组件结构

Dashboard 页面将由以下组件构成：

1. **MetricCard** - 单个指标卡片
2. **ChartPanel** - 图表面板，支持多种图表类型
3. **ContentTimeline** - 最近内容时间线
4. **LanguageCoverage** - 语言覆盖率组件
5. **MuseumDistribution** - 博物馆分布组件
6. **PersonaStats** - 角色使用统计组件
7. **QuickAccessPanel** - 快速访问面板

### 主页面实现

```vue
<template>
  <div class="dashboard-container p-4 md:p-6 space-y-6">
    <!-- 页面标题与日期选择器 -->
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
    >
      <h1 class="text-2xl md:text-3xl font-bold">Dashboard</h1>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="refreshData"
          :disabled="isLoading"
        >
          <Icon
            name="ph:refresh"
            class="mr-2 h-4 w-4"
            :class="{ 'animate-spin': isLoading }"
          />
          {{ isLoading ? "加载中..." : "刷新数据" }}
        </Button>
        <DateRangePicker v-model="dateRange" />
      </div>
    </div>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md"
    >
      <p class="font-medium">加载数据时出错</p>
      <p class="text-sm">{{ error.message }}</p>
      <Button
        class="mt-2"
        variant="outline"
        size="sm"
        @click="fetchDashboardData"
        >重试</Button
      >
    </div>

    <!-- 加载状态 -->
    <div
      v-if="isLoading && !dashboardData"
      class="flex justify-center items-center h-60"
    >
      <div class="text-center">
        <Icon
          name="ph:spinner"
          class="animate-spin h-8 w-8 text-primary mx-auto mb-2"
        />
        <p class="text-gray-500">加载数据中...</p>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div v-if="dashboardData" class="space-y-6">
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

      <!-- 两列布局：博物馆分布和语言覆盖 -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ChartPanel
          title="博物馆内容分布"
          :data="museumChartData"
          type="bar"
          height="350px"
        />

        <ChartPanel
          title="语言覆盖率"
          :data="languageChartData"
          type="horizontalBar"
          height="350px"
        />
      </div>

      <!-- 最近内容和角色使用统计 -->
      <div class="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ContentTimeline title="最新添加内容" :items="recentItems" />

        <PersonaStats title="角色使用统计" :personas="topPersonas" />
      </div>

      <!-- 快速访问区域 -->
      <div
        class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
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
import { ref, onMounted, computed } from "vue";
import { useDashboardData } from "~/composables/useDashboardData";

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
} = useDashboardData();

// 日期范围
const dateRange = ref({
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  to: new Date(),
});

// 刷新数据
const refreshData = () => {
  fetchDashboardData();
};

// 博物馆图表数据
const museumChartData = computed(() => ({
  labels: topMuseums.value.map((m) => m.museum_name),
  datasets: [
    {
      label: "展品",
      data: topMuseums.value.map((m) => m.object_count),
      backgroundColor: "#4f46e5",
    },
    {
      label: "展厅",
      data: topMuseums.value.map((m) => m.gallery_count),
      backgroundColor: "#0ea5e9",
    },
    {
      label: "导览音频",
      data: topMuseums.value.map((m) => m.audio_guide_count),
      backgroundColor: "#10b981",
    },
  ],
}));

// 语言图表数据
const languageChartData = computed(() => ({
  labels: languageStats.value.map((l) => l.language),
  datasets: [
    {
      label: "文本",
      data: languageStats.value.map((l) => l.text_count),
      backgroundColor: "#8b5cf6",
    },
    {
      label: "音频",
      data: languageStats.value.map((l) => l.audio_count),
      backgroundColor: "#ec4899",
    },
  ],
}));

// 快速访问项
const quickAccessItems = computed(() => [
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
    title: "音频管理",
    icon: "ph:headphones",
    route: "/audio",
    count: keyMetrics.value?.total_audios || 0,
  },
  {
    title: "角色管理",
    icon: "ph:user",
    route: "/personas",
    count: keyMetrics.value?.total_personas || 0,
  },
]);

// 加载数据
onMounted(() => {
  fetchDashboardData();
});
</script>
```

## 组件示例

### MetricCard 组件

```vue
<template>
  <Card class="overflow-hidden">
    <CardHeader
      class="flex flex-row items-center justify-between space-y-0 pb-2"
    >
      <CardTitle class="text-sm font-medium">{{ title }}</CardTitle>
      <Icon :name="icon" class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div class="text-2xl font-bold">{{ formattedValue }}</div>
      <div
        v-if="change !== undefined"
        class="text-xs text-muted-foreground flex items-center space-x-1"
      >
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
      <div
        v-if="secondaryValue"
        class="mt-2 pt-2 border-t text-xs text-muted-foreground"
      >
        {{ secondaryLabel }}:
        <span class="font-medium">{{ secondaryValue }}</span>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
// 省略属性定义和格式化逻辑
</script>
```

### ChartPanel 组件

```vue
<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="flex flex-row items-center justify-between">
      <div>
        <CardTitle>{{ title }}</CardTitle>
        <CardDescription v-if="description">{{ description }}</CardDescription>
      </div>
      <div v-if="filters" class="flex items-center space-x-2">
        <Button
          v-for="filter in filters"
          :key="filter.value"
          :variant="activeFilter === filter.value ? 'default' : 'outline'"
          size="sm"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </Button>
      </div>
    </CardHeader>
    <CardContent class="flex-1 min-h-[200px]">
      <canvas ref="chartRef" :style="{ height }"></canvas>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
// 省略图表初始化和更新逻辑
</script>
```

### ContentTimeline 组件

```vue
<template>
  <Card class="h-full">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="p-0 overflow-auto max-h-[400px]">
      <div class="divide-y">
        <div
          v-for="item in items"
          :key="item.id"
          class="p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start gap-2">
            <div
              v-if="getIcon(item.content_type)"
              class="rounded-full p-2 flex-shrink-0"
              :class="getIconBgColor(item.content_type)"
            >
              <Icon
                :name="getIcon(item.content_type)"
                class="h-4 w-4 text-white"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <p class="font-medium text-sm truncate">{{ item.name }}</p>
                <time class="text-xs text-gray-500">{{
                  formatTime(item.created_at)
                }}</time>
              </div>
              <p class="text-sm text-gray-600 line-clamp-2">
                {{ item.description }}
              </p>
              <p v-if="item.museum_name" class="text-xs text-gray-500 mt-1">
                {{ item.museum_name }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
// 省略图标和时间格式化逻辑
</script>
```

## 响应式设计

Dashboard 将采用全响应式设计，适应不同屏幕尺寸：

- **移动设备**：单列布局，卡片堆叠展示
- **平板设备**：双列布局，优先展示关键指标
- **桌面设备**：多列布局，充分利用屏幕空间
- **大屏设备**：扩展布局，展示更多详细信息

## 后续优化方向

1. **实时更新**：通过 Supabase 实时订阅功能，实现数据实时更新
2. **自定义面板**：允许用户自定义 Dashboard 布局和显示内容
3. **导出功能**：添加将 Dashboard 数据导出为 CSV 或 PDF 的功能
4. **深度分析**：整合更高级的数据分析和预测功能
5. **提醒系统**：基于关键指标设置预警和通知系统
