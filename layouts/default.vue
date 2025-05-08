<template>
  <div >
    <SidebarProvider>
      <div class="relative flex flex-col md:flex-row w-full">
        <!-- 桌面端侧边栏 -->
        <ClientOnly>
          <aside class="hidden md:flex md:flex-col md:w-50 h-screen border-r bg-card fixed left-0 top-0">
            <SidebarNav :navLinks="navLinks" />
          </aside>
        </ClientOnly>

        <!-- 主体内容，包含实际页面内容 -->
        <div class="flex flex-col flex-1 md:ml-65">
          <!-- PC端顶部栏 - 已移除 -->

          <!-- 移动端顶部栏 -->
          <header class="sticky top-0 z-40 flex h-16 items-center border-b bg-background px-4 md:hidden">
            <ClientOnly>
              <Sheet v-model:open="sidebarOpen">
                <SidebarTrigger as-child>
                  <Button variant="ghost" size="icon" class="mr-2">
                    <Icon icon="ph:list" class="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
                <SheetContent side="left" class="w-[300px] p-0">
                  <SidebarNav :navLinks="navLinks" @close="sidebarOpen = false" />
                </SheetContent>
              </Sheet>
            </ClientOnly>
            <h1 class="text-lg font-semibold">{{ route.meta.title || 'Dashboard' }}</h1>
          </header>

          <!-- 主内容区 -->
          <main class="flex-1 flex flex-col">
            <slot />
          </main>
        </div>

        <!-- 移动端底部导航 -->
        <MobileBottomBar />
      </div>
    </SidebarProvider>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from '#imports'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import MobileBottomBar from '@/components/layout/MobileBottomBar.vue'
import type { NavLink } from '@/components/layout/types'

const route = useRoute()

const navLinks: NavLink[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'heroicons-outline:chart-bar-square' },
  { path: '/museums', label: 'Museums', icon: 'heroicons-outline:building-library' },
  { path: '/galleries', label: 'Galleries', icon: 'heroicons-outline:photo' },
  { path: '/objects', label: 'Objects', icon: 'heroicons-outline:archive-box' },
  { path: '/guide-texts', label: 'Transcripts', icon: 'heroicons-outline:document-text' },
  { path: '/guide-audios', label: 'Voices', icon: 'heroicons-outline:speaker-wave' },
  { path: '/personas', label: 'Personas', icon: 'heroicons-outline:identification' },
  { path: '/playground', label: 'Playground', icon: 'ph:play-circle' },
  { path: '/users', label: 'Users', icon: 'heroicons-outline:users' }
]

const sidebarOpen = ref(false)

defineExpose({
  navLinks,
  route
})
</script>

<style scoped>
.ios-pwa-safe-area .bottom-nav {
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom) * 0.5);
}
.ios-header-safe-area {
  padding-top: env(safe-area-inset-top);
}
.header-wrapper {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
}

/* 阻止全局滚动弹性效果 */
/*
:global(html), :global(body) {
  height: 100%;
  overscroll-behavior: contain; 
}
*/

/* 定制化滚动条样式和行为 */
/*
:global(.overscroll-none) {
  overscroll-behavior: none;
}
*/

:global(::-webkit-scrollbar) {
  width: 6px;
}

:global(::-webkit-scrollbar-track) {
  background: transparent;
}

:global(::-webkit-scrollbar-thumb) {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
}
</style> 