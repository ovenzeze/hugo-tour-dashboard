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

// Documentation last update date
const lastUpdateDate = '2024-05-02'

// API and Database Documentation
const apiDocs = [
  {
    title: 'Audio API Guide',
    slug: 'audio-api-guide',
    description: 'Detailed guide for audio generation and upload API usage and parameters'
  },
  {
    title: 'Data Entry Guide',
    slug: 'data-entry-guide',
    description: 'Guide for museum, exhibition hall, and exhibit data entry process and best practices'
  },
  {
    title: 'Database Design',
    slug: 'database-design',
    description: 'Database table structure and relationship documentation'
  },
  {
    title: '播客处理流程与相关API文档',
    slug: 'podcast-process-api-docs',
    description: '播客处理流程与相关API文档'
  }
]

// Project Documentation
const projectDocs = [
  {
    title: 'Project Structure',
    slug: 'project-structure',
    description: 'Project file structure and component documentation'
  },
  {
    title: 'Development Plan',
    slug: 'tour-dev-plan',
    description: 'Project feature development planning and progress'
  },
  {
    title: 'Map Fix Plan',
    slug: 'map-fix-plan',
    description: 'Map functionality optimization and fix plan'
  },
  {
    title: 'Requirements',
    slug: 'requirements',
    description: 'System functional requirements specification'
  },
  {
    title: 'Nuxt Warning Fixes',
    slug: 'fix-nuxt-warnings',
    description: 'Solutions for fixing Nuxt-related warnings'
  }
]

// Set page metadata
useHead({
  title: 'Hugo Tour Guide - Documentation Center',
  meta: [
    { name: 'description', content: 'Hugo Tour Guide system documentation center, including API documentation, database design, and project guides' }
  ]
})
</script>
