<template>
  <div>
    <SidebarProvider>
      <div class="relative flex min-h-screen flex-col md:flex-row w-full">
        <!-- 桌面端侧边栏 -->
        <ClientOnly>
          <aside class="hidden md:flex md:flex-col md:w-50 h-screen border-r bg-card fixed left-0 top-0">
            <SidebarNav :navLinks="navLinks" />
          </aside>
        </ClientOnly>

        <!-- 主体内容，包含PC端顶部栏和实际页面内容 -->
        <div class="flex flex-col flex-1 md:ml-65">
          <!-- PC端顶部栏 -->
          <header class="sticky top-0 z-30 hidden h-16 items-center justify-between bg-background px-6 md:flex">
            <div>
              <!-- 可以放置面包屑导航或页面标题 -->
              <h1 class="text-lg font-semibold">{{ route.meta.title || 'Dashboard' }}</h1>
            </div>
            <div class="flex items-center gap-4">
              <!-- 扩展功能，如通知、帮助等 -->
              <Button variant="ghost" size="icon">
                <Icon icon="ph:bell" class="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarImage src="/images/avatar-default.png" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </header>

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
          <main class="flex-1 p-6 pb-16 md:pb-6">
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar' // 新增 Avatar 导入
import SidebarNav from '@/components/layout/SidebarNav.vue'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import MobileBottomBar from '@/components/layout/MobileBottomBar.vue'
import type { NavLink } from '@/components/layout/types'

const sidebarOpen = ref(false)
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

defineExpose({
  sidebarOpen,
  navLinks,
  route
})
</script>

<style scoped>
.h-dvh { height: 100dvh; }
.bg-card { background: var(--card, #fff); }
@media (max-width: 767px) {
  .h-dvh { height: 100svh; }
}
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
</style>
