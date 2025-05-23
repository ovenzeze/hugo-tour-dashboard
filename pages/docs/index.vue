<template>
  <div class="container mx-auto py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <header class="text-center mb-12">
        <h1 class="text-4xl font-bold mb-4">📚 文档中心</h1>
        <p class="text-lg text-muted-foreground">
          Hugo Tour Dashboard 技术文档和指南
        </p>
        <div class="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
          <span>📖 {{ totalDocs }} 篇文档</span>
          <span>🔄 {{ formatDate(lastUpdateDate) }} 更新</span>
        </div>
      </header>

      <!-- 搜索框 -->
      <div class="mb-8">
        <div class="relative max-w-md mx-auto">
          <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档..."
            class="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- 分类导航标签 -->
      <div class="mb-8">
        <div class="flex flex-wrap justify-center gap-2">
          <Button
            v-for="category in categories"
            :key="category.key"
            :variant="selectedCategory === category.key ? 'default' : 'outline'"
            size="sm"
            @click="selectedCategory = category.key"
            class="flex items-center gap-2"
          >
            <Icon :name="category.icon" class="w-4 h-4" />
            {{ category.label }}
            <Badge variant="secondary" class="ml-1">{{ category.count }}</Badge>
          </Button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="pending" class="flex items-center justify-center py-12">
        <Icon name="ph:spinner" class="w-8 h-8 animate-spin text-primary" />
        <span class="ml-2">加载文档中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="text-center py-12">
        <Icon name="ph:warning-circle" class="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h2 class="text-xl font-semibold mb-2">加载失败</h2>
        <p class="text-muted-foreground">{{ error.message }}</p>
      </div>

      <!-- 文档网格 -->
      <div v-else-if="filteredDocs.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          v-for="doc in filteredDocs"
          :key="doc._path"
          class="h-full hover:shadow-lg transition-shadow duration-300 group cursor-pointer"
          @click="navigateToDoc(doc)"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <Icon :name="getCategoryIcon(doc)" class="w-5 h-5 text-primary" />
                <Badge variant="secondary" class="text-xs">
                  {{ getCategoryLabel(doc) }}
                </Badge>
              </div>
              <Icon name="ph:arrow-square-out" class="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <CardTitle class="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {{ doc.title || getDocNameFromPath(doc._path) }}
            </CardTitle>
          </CardHeader>
          <CardContent class="pt-0">
            <p v-if="doc.description" class="text-sm text-muted-foreground line-clamp-3 mb-4">
              {{ doc.description }}
            </p>
            
            <!-- 标签 -->
            <div v-if="doc.tags && doc.tags.length > 0" class="flex flex-wrap gap-1 mb-4">
              <Badge
                v-for="tag in doc.tags.slice(0, 3)"
                :key="tag"
                variant="outline"
                class="text-xs"
              >
                {{ tag }}
              </Badge>
              <Badge v-if="doc.tags.length > 3" variant="outline" class="text-xs">
                +{{ doc.tags.length - 3 }}
              </Badge>
            </div>

            <!-- 元信息 -->
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span v-if="doc.author" class="flex items-center gap-1">
                <Icon name="ph:user" class="w-3 h-3" />
                {{ doc.author }}
              </span>
              <span v-if="doc.updatedAt || doc.date" class="flex items-center gap-1">
                <Icon name="ph:clock" class="w-3 h-3" />
                {{ formatDate(doc.updatedAt || doc.date) }}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-center py-12">
        <Icon name="ph:file-search" class="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 class="text-xl font-semibold mb-2">未找到文档</h2>
        <p class="text-muted-foreground">
          {{ searchQuery ? `没有匹配 "${searchQuery}" 的文档` : '该分类下暂无文档' }}
        </p>
      </div>

      <!-- ElevenLabs 专区 -->
      <div v-if="elevenlabsDocs.length > 0" class="mt-12">
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
          <Icon name="ph:headphones" class="w-6 h-6 text-primary" />
          ElevenLabs 专区
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            v-for="doc in elevenlabsDocs"
            :key="doc._path"
            class="hover:shadow-md transition-shadow duration-200 group cursor-pointer"
            @click="navigateToDoc(doc)"
          >
            <CardContent class="p-4">
              <div class="flex items-start justify-between mb-2">
                <Icon name="ph:speaker-high" class="w-4 h-4 text-purple-600" />
                <Icon name="ph:arrow-square-out" class="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 class="font-medium text-sm mb-1 line-clamp-2">
                {{ doc.title || getDocNameFromPath(doc._path) }}
              </h3>
              <p class="text-xs text-muted-foreground line-clamp-2">
                {{ doc.description }}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '#components'

definePageMeta({
  layout: 'fullscreen'
})

const router = useRouter()

// 搜索和过滤状态
const searchQuery = ref('')
const selectedCategory = ref('all')

// 获取所有文档
const { data: allDocs, pending, error } = await useAsyncData('docs-all', () =>
  queryContent('docs')
    .find()
)

// 计算总文档数
const totalDocs = computed(() => allDocs.value?.length || 0)

// 文档分类定义
const categoryDefinitions = {
  api: {
    keywords: ['api', 'database', 'data', 'process', 'podcast', 'auth'],
    icon: 'ph:database',
    label: 'API & 数据库'
  },
  guide: {
    keywords: ['guide', 'tutorial', 'entry', 'usage'],
    icon: 'ph:book-open',
    label: '使用指南'
  },
  project: {
    keywords: ['project', 'structure', 'plan', 'dev', 'design'],
    icon: 'ph:folder-open',
    label: '项目文档'
  },
  integration: {
    keywords: ['integration', 'implementation', 'fix', 'warning'],
    icon: 'ph:gear',
    label: '集成配置'
  },
  elevenlabs: {
    keywords: ['elevenlabs'],
    icon: 'ph:headphones',
    label: 'ElevenLabs'
  }
}

// 根据文档内容判断分类
function getDocCategory(doc) {
  const title = (doc.title || '').toLowerCase()
  const path = (doc._path || '').toLowerCase()
  const description = (doc.description || '').toLowerCase()
  const tags = (doc.tags || []).map(tag => tag.toLowerCase())
  
  const searchText = [title, path, description, ...tags].join(' ')
  
  // ElevenLabs 特殊处理
  if (path.includes('elevenlabs') || searchText.includes('elevenlabs')) {
    return 'elevenlabs'
  }
  
  // 按优先级检查其他分类
  for (const [category, definition] of Object.entries(categoryDefinitions)) {
    if (definition.keywords.some(keyword => searchText.includes(keyword))) {
      return category
    }
  }
  
  return 'guide' // 默认分类
}

// 计算文档分类
const categorizedDocs = computed(() => {
  if (!allDocs.value) return {}
  
  const categories = {}
  allDocs.value.forEach(doc => {
    const category = getDocCategory(doc)
    if (!categories[category]) categories[category] = []
    categories[category].push(doc)
  })
  
  return categories
})

// 生成分类标签数据
const categories = computed(() => {
  const result = [
    { key: 'all', label: '全部', icon: 'ph:list', count: totalDocs.value }
  ]
  
  Object.entries(categoryDefinitions).forEach(([key, definition]) => {
    const count = categorizedDocs.value[key]?.length || 0
    if (count > 0) {
      result.push({
        key,
        label: definition.label,
        icon: definition.icon,
        count
      })
    }
  })
  
  return result
})

// ElevenLabs 文档
const elevenlabsDocs = computed(() => {
  return categorizedDocs.value.elevenlabs || []
})

// 过滤后的文档
const filteredDocs = computed(() => {
  if (!allDocs.value) return []
  
  let docs = allDocs.value
  
  // 排除 ElevenLabs 文档（在专区显示）
  if (selectedCategory.value !== 'elevenlabs') {
    docs = docs.filter(doc => getDocCategory(doc) !== 'elevenlabs')
  }
  
  // 分类过滤
  if (selectedCategory.value !== 'all') {
    docs = docs.filter(doc => getDocCategory(doc) === selectedCategory.value)
  }
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    docs = docs.filter(doc => {
      const title = (doc.title || '').toLowerCase()
      const description = (doc.description || '').toLowerCase()
      const tags = (doc.tags || []).join(' ').toLowerCase()
      const path = (doc._path || '').toLowerCase()
      
      return title.includes(query) || 
             description.includes(query) || 
             tags.includes(query) ||
             path.includes(query)
    })
  }
  
  return docs
})

// 获取最后更新日期
const lastUpdateDate = computed(() => {
  if (!allDocs.value || allDocs.value.length === 0) return new Date().toISOString()
  
  const dates = allDocs.value
    .map(doc => doc.updatedAt || doc.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))
  
  return dates[0] || new Date().toISOString()
})

// 获取文档分类图标
function getCategoryIcon(doc) {
  const category = getDocCategory(doc)
  return categoryDefinitions[category]?.icon || 'ph:file-text'
}

// 获取文档分类标签
function getCategoryLabel(doc) {
  const category = getDocCategory(doc)
  return categoryDefinitions[category]?.label || '文档'
}

// 从路径获取文档名称
function getDocNameFromPath(path) {
  if (!path) return '未知文档'
  return path.split('/').pop()?.replace('.md', '') || '未知文档'
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch (e) {
    return ''
  }
}

// 导航到文档
function navigateToDoc(doc) {
  if (!doc._path) return
  
  // 移除 /docs 前缀（如果存在）
  let slug = doc._path.replace(/^\/docs\//, '')
  router.push(`/docs/${slug}`)
}

// 页面元信息
useHead({
  title: 'Hugo Tour Dashboard - 文档中心',
  meta: [
    { name: 'description', content: 'Hugo Tour Dashboard 系统文档中心，包含API文档、数据库设计和项目指南' }
  ]
})

// 重置搜索当分类改变时
watch(selectedCategory, () => {
  searchQuery.value = ''
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
