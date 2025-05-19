<template>
  <div class="container mx-auto py-8 px-4">
    <div class="max-w-5xl mx-auto">
      <header class="text-center mb-12">
        <h1 class="text-3xl font-bold mb-2">Hugo Tour Guide Documentation</h1>
        <p class="text-muted-foreground">
          Technical Documentation and Guides
        </p>
      </header>

      <!-- Mobile Tabs -->
      <div class="block md:hidden mb-8">
        <Tabs default-value="apis" class="w-full">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="apis">API & Data</TabsTrigger>
            <TabsTrigger value="guides">Project Guides</TabsTrigger>
          </TabsList>
          <TabsContent value="apis">
            <div class="grid gap-4">
              <!-- Mobile API Documentation Cards -->
              <Card v-for="doc in apiDocs" :key="doc.slug" class="p-2">
                <CardHeader class="py-4">
                  <CardTitle class="text-base">
                    <NuxtLink :to="`/docs/${doc.slug}`" class="text-primary hover:underline flex gap-1.5 items-center">
                      <FileText class="h-4 w-4" />
                      {{ doc.title }}
                    </NuxtLink>
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0 pb-4">
                  <p class="text-sm text-muted-foreground">{{ doc.description }}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="guides">
            <div class="grid gap-4">
              <!-- Mobile Project Guide Cards -->
              <Card v-for="doc in projectDocs" :key="doc.slug" class="h-full">
                <CardHeader class="py-4">
                  <CardTitle class="text-base">
                    <NuxtLink :to="`/docs/${doc.slug}`" class="text-primary hover:underline flex gap-1.5 items-center">
                      <FileText class="h-4 w-4" />
                      {{ doc.title }}
                    </NuxtLink>
                  </CardTitle>
                </CardHeader>
                <CardContent class="pt-0 pb-4">
                  <p class="text-sm text-muted-foreground">{{ doc.description }}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <!-- Desktop Two-Column Layout -->
      <div class="hidden md:grid md:grid-cols-2 gap-6">
        <!-- API & Database Documentation -->
        <Card class="h-full">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Database class="h-5 w-5" />
              API & Database Documentation
            </CardTitle>
            <CardDescription>API Reference and Data Structure Documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul class="space-y-3">
              <li v-for="doc in apiDocs" :key="doc.slug">
                <NuxtLink :to="`/docs/${doc.slug}`" class="text-primary hover:underline flex gap-1.5 items-center">
                  <FileText class="h-4 w-4" />
                  {{ doc.title }}
                </NuxtLink>
                <p class="text-sm text-muted-foreground ml-5">{{ doc.description }}</p>
              </li>
            </ul>
          </CardContent>
        </Card>

        <!-- Project Guides -->
        <Card class="h-full">
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Book class="h-5 w-5" />
              Project Guides
            </CardTitle>
            <CardDescription>Project Structure and Development Plans</CardDescription>
          </CardHeader>
          <CardContent>
            <ul class="space-y-3">
              <li v-for="doc in projectDocs" :key="doc.slug">
                <NuxtLink :to="`/docs/${doc.slug}`" class="text-primary hover:underline flex gap-1.5 items-center">
                  <FileText class="h-4 w-4" />
                  {{ doc.title }}
                </NuxtLink>
                <p class="text-sm text-muted-foreground ml-5">{{ doc.description }}</p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div class="mt-12 text-center">
        <p class="text-sm text-muted-foreground">
          Last Updated: {{ formatDate(lastUpdateDate) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Book, Database, FileText } from 'lucide-vue-next'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

definePageMeta({
  layout: 'fullscreen'
})

// Date formatting function
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// 自动获取所有文档
const { data: allDocs } = await useAsyncData('docs', () => 
  queryContent('docs')
    .where({ _extension: 'md' })
    .without(['body', '_'])
    .find()
)

// 根据文档的类别标签或元数据将文档分类
const apiDocs = computed(() => {
  return allDocs.value?.filter(doc => {
    // 根据文档的tags或其他元数据判断是否为API文档
    // 如果文档有category字段，则根据category判断
    if (doc.category === 'api') return true
    
    // 如果文档有tags字段，则根据tags判断
    if (doc.tags && Array.isArray(doc.tags)) {
      return doc.tags.some(tag => 
        ['api', 'database', 'data', 'process', 'podcast'].includes(tag.toLowerCase())
      )
    }
    
    // 根据文档标题或slug判断
    const apiKeywords = ['api', 'database', 'data', 'process', 'podcast']
    return apiKeywords.some(keyword => 
      (doc.title && doc.title.toLowerCase().includes(keyword)) || 
      (doc.slug && doc.slug.toLowerCase().includes(keyword))
    )
  }) || []
})

// 项目文档
const projectDocs = computed(() => {
  return allDocs.value?.filter(doc => {
    // 排除已经归类为API文档的文档
    if (apiDocs.value.some(apiDoc => apiDoc._path === doc._path)) {
      return false
    }
    
    // 根据文档的category字段判断
    if (doc.category === 'project') return true
    
    // 根据文档的tags字段判断
    if (doc.tags && Array.isArray(doc.tags)) {
      return doc.tags.some(tag => 
        ['project', 'guide', 'development', 'structure', 'plan'].includes(tag.toLowerCase())
      )
    }
    
    return true // 默认归类为项目文档
  }) || []
})

// 获取最新更新日期
const lastUpdateDate = computed(() => {
  if (!allDocs.value || allDocs.value.length === 0) return new Date().toISOString()
  
  // 找出所有文档中最新的updatedAt日期
  const dates = allDocs.value
    .map(doc => doc.updatedAt || doc.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))
  
  return dates[0] || new Date().toISOString()
})

// Set page metadata
useHead({
  title: 'Hugo Tour Guide - Documentation Center',
  meta: [
    { name: 'description', content: 'Hugo Tour Guide system documentation center, including API documentation, database design, and project guides' }
  ]
})
</script>
